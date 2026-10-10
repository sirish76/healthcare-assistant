package com.healthassist.transition.regdata;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.healthassist.transition.regdata.RegulatoryTypes.CommonData;
import com.healthassist.transition.regdata.RegulatoryTypes.PlanYearData;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads {@code common.yaml} and every {@code plan-year-*.yaml} from the given
 * classpath directory. YAML anchors/merge keys are resolved by SnakeYAML;
 * top-level keys starting with "_" hold shared anchors and are dropped.
 */
public final class RegulatoryDataLoader {

    public static final String DEFAULT_LOCATION = "classpath:transition/regulatory/";

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .findAndAddModules()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private RegulatoryDataLoader() {
    }

    public static RegulatoryData load() {
        return load(DEFAULT_LOCATION);
    }

    public static RegulatoryData load(String location) {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        try {
            Map<String, Object> commonRaw = readYaml(resolver.getResource(location + "common.yaml"));
            List<String> review = new ArrayList<>();
            collectReviewItems("common", commonRaw, review);
            CommonData common = MAPPER.convertValue(commonRaw, CommonData.class);

            Map<Integer, PlanYearData> planYears = new HashMap<>();
            for (Resource r : resolver.getResources(location + "plan-year-*.yaml")) {
                Map<String, Object> raw = readYaml(r);
                PlanYearData py = MAPPER.convertValue(raw, PlanYearData.class);
                collectReviewItems("planYear" + py.planYear(), raw, review);
                planYears.put(py.planYear(), py);
            }
            if (planYears.isEmpty()) {
                throw new IllegalStateException("No plan-year-*.yaml files found at " + location);
            }
            return new RegulatoryData(common, planYears, review);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load transition regulatory data", e);
        }
    }

    private static Map<String, Object> readYaml(Resource resource) throws IOException {
        LoaderOptions options = new LoaderOptions();
        options.setMaxAliasesForCollections(2000);
        Yaml yaml = new Yaml(new SafeConstructor(options));
        try (InputStream in = resource.getInputStream()) {
            Map<String, Object> raw = yaml.load(in);
            Map<String, Object> cleaned = new LinkedHashMap<>();
            raw.forEach((k, v) -> {
                if (!k.startsWith("_")) {
                    cleaned.put(k, v);
                }
            });
            return cleaned;
        }
    }

    @SuppressWarnings("unchecked")
    private static void collectReviewItems(String path, Object node, List<String> out) {
        if (node instanceof Map<?, ?> map) {
            if (map.containsKey("sourceUrl")) {
                boolean verified = Boolean.TRUE.equals(map.get("verified"));
                if (!verified || map.get("todo") != null) {
                    out.add(path);
                }
                return;
            }
            ((Map<String, Object>) map).forEach((k, v) -> collectReviewItems(path + "." + k, v, out));
        } else if (node instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                collectReviewItems(path + "[" + i + "]", list.get(i), out);
            }
        }
    }
}
