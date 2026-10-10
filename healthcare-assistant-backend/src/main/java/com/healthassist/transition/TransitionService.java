package com.healthassist.transition;

import com.healthassist.transition.cms.CmsUnavailableException;
import com.healthassist.transition.cms.MarketplaceClient;
import com.healthassist.transition.cms.MarketplaceClient.County;
import com.healthassist.transition.cms.MarketplaceClient.DrugSuggestion;
import com.healthassist.transition.cms.MarketplaceClient.PlanQuery;
import com.healthassist.transition.cms.MarketplaceClient.ProviderSuggestion;
import com.healthassist.transition.engine.DeadlineCalculator;
import com.healthassist.transition.engine.InvalidTransitionInputException;
import com.healthassist.transition.engine.MarketplaceSnapshot;
import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;
import com.healthassist.transition.engine.ResolvedLocation;
import com.healthassist.transition.engine.TransitionAnalyzer;
import com.healthassist.transition.location.ZipStateLookup;
import com.healthassist.transition.model.TransitionInput;
import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionResult;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryTypes.ExchangeInfo;
import com.healthassist.transition.regdata.RegulatoryTypes.ExchangeType;
import com.healthassist.transition.regdata.RegulatoryTypes.StateInfo;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates one stateless analysis: resolve location, fetch plan data for
 * this request only, run the rules engine. PRIVACY: nothing here is stored or
 * logged; inputs and results live only for the duration of the request.
 */
@Service
public class TransitionService {

    private final RegulatoryData data;
    private final TransitionAnalyzer analyzer;
    private final MarketplaceClient cms;
    private final Clock clock;

    public TransitionService(RegulatoryData data, TransitionAnalyzer analyzer, MarketplaceClient cms, Clock transitionClock) {
        this.data = data;
        this.analyzer = analyzer;
        this.cms = cms;
        this.clock = transitionClock;
    }

    public record LocationResponse(String state, String stateName, List<County> counties, String exchangeType,
                                   String exchangeName, String exchangeUrl, PlanDataSource planDataSource) {
    }

    public record SearchResponse<T>(boolean available, String message, List<T> results) {
    }

    public record MetaResponse(String dataVersion, List<Integer> planYears, PlanDataSource planDataSource) {
    }

    public MetaResponse meta() {
        return new MetaResponse(data.dataVersion(), data.planYears(), cms.source());
    }

    public LocationResponse location(String zip) {
        List<County> counties = counties(zip);
        String state = stateFor(zip, null, counties);
        StateInfo info = data.state(state).orElseThrow();
        ExchangeInfo ex = info.exchange().value();
        return new LocationResponse(state, info.name(), counties.stream().filter(c -> state.equals(c.state())).toList(),
                ex.type().name(), ex.name(), ex.url(), ex.type() == ExchangeType.STATE ? PlanDataSource.NOT_APPLICABLE : cms.source());
    }

    public SearchResponse<DrugSuggestion> drugs(String query) {
        try {
            return new SearchResponse<>(true, null, cms.drugAutocomplete(query));
        } catch (CmsUnavailableException e) {
            return new SearchResponse<>(false, e.getMessage(), List.of());
        }
    }

    public SearchResponse<ProviderSuggestion> providers(String query, String zip) {
        try {
            return new SearchResponse<>(true, null, cms.providerSearch(query, zip));
        } catch (CmsUnavailableException e) {
            return new SearchResponse<>(false, e.getMessage(), List.of());
        }
    }

    public TransitionResult analyze(TransitionInput in) {
        DeadlineCalculator.requireDates(in.dates());
        LocalDate today = LocalDate.now(clock);
        ResolvedLocation loc = resolve(in);
        return analyzer.analyze(in, loc, marketplace(in, loc), today);
    }

    private ResolvedLocation resolve(TransitionInput in) {
        List<County> counties = counties(in.zip());
        String state = stateFor(in.zip(), in.state(), counties);
        StateInfo info = data.state(state).orElseThrow();
        List<County> inState = counties.stream().filter(c -> state.equals(c.state())).toList();
        Optional<County> county = inState.stream().filter(c -> c.fips().equals(in.countyFips())).findFirst();
        if (county.isEmpty() && inState.size() == 1) {
            county = Optional.of(inState.get(0));
        }
        return new ResolvedLocation(state, info, county.map(County::fips).orElse(null), county.map(County::name).orElse(null));
    }

    private String stateFor(String zip, String hint, List<County> counties) {
        Optional<String> state = Optional.ofNullable(hint).map(String::toUpperCase).filter(s -> data.state(s).isPresent());
        if (state.isEmpty() && !counties.isEmpty()) {
            state = Optional.of(counties.get(0).state());
        }
        if (state.isEmpty()) {
            state = ZipStateLookup.stateFor(zip);
        }
        return state.filter(s -> data.state(s).isPresent()).orElseThrow(() -> new InvalidTransitionInputException(
                "We couldn't match that ZIP code to a state. Check the ZIP code or choose your state.", List.of("zip", "state")));
    }

    private List<County> counties(String zip) {
        try {
            return cms.countiesByZip(zip);
        } catch (CmsUnavailableException e) {
            return List.of();
        }
    }

    private MarketplaceSnapshot marketplace(TransitionInput in, ResolvedLocation loc) {
        if (loc.stateInfo().exchange().value().type() == ExchangeType.STATE) {
            return MarketplaceSnapshot.none(PlanDataSource.NOT_APPLICABLE, null);
        }
        if (cms.source() == PlanDataSource.UNAVAILABLE) {
            return MarketplaceSnapshot.none(PlanDataSource.UNAVAILABLE, "Live plan data isn't set up yet.");
        }
        if (loc.countyFips() == null) {
            return MarketplaceSnapshot.none(PlanDataSource.UNAVAILABLE, "Choose your county to see plans.");
        }
        int year = DeadlineCalculator.gaplessStart(DeadlineCalculator.lossDate(in.dates())).getYear();
        List<Member> covered = in.members().stream().filter(Member::wasCovered).toList();
        if (covered.isEmpty()) {
            covered = in.members();
        }
        PlanQuery q = new PlanQuery(year, in.zip(), loc.countyFips(), loc.state(),
                covered.stream().map(m -> new MarketplaceClient.Person(m.age(), m.usesTobacco())).toList());
        try {
            List<PlanData> plans = cms.searchPlans(q);
            if (plans.isEmpty()) {
                return MarketplaceSnapshot.none(PlanDataSource.UNAVAILABLE, "No plans were returned for your area.");
            }
            BigDecimal benchmark = cms.benchmarkPremium(q).orElse(null);
            List<String> planIds = plans.stream().map(PlanData::id).toList();
            List<String> rxcuis = in.care().drugs() == null ? List.of()
                    : in.care().drugs().stream().map(TransitionInput.DrugRef::rxcui).distinct().toList();
            List<String> npis = in.care().providers() == null ? List.of()
                    : in.care().providers().stream().map(TransitionInput.ProviderRef::npi).distinct().toList();
            List<CoverageRow> drugRows = rxcuis.isEmpty() ? List.of() : optionalCoverage(() -> cms.drugCoverage(year, rxcuis, planIds));
            List<CoverageRow> providerRows = npis.isEmpty() ? List.of() : optionalCoverage(() -> cms.providerCoverage(year, npis, planIds));
            return new MarketplaceSnapshot(cms.source(), null, plans, benchmark, drugRows, providerRows);
        } catch (CmsUnavailableException e) {
            return MarketplaceSnapshot.none(PlanDataSource.UNAVAILABLE, e.getMessage());
        }
    }

    /** Drug/provider coverage is a nice-to-have; plans still show if it fails. */
    private static List<CoverageRow> optionalCoverage(java.util.function.Supplier<List<CoverageRow>> call) {
        try {
            return call.get();
        } catch (CmsUnavailableException e) {
            return List.of();
        }
    }
}
