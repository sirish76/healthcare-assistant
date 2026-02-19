package com.healthassist.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.InputStream;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class CalendarService {

    private static final Logger logger = Logger.getLogger(CalendarService.class.getName());

    @Value("${scheduling.calendar.email:}")
    private String calendarEmail;

    @Value("${scheduling.service-account.key-path:}")
    private String serviceAccountKeyPath;

    @Value("${scheduling.slot-duration-minutes:20}")
    private int slotDurationMinutes;

    @Value("${scheduling.timezone:America/Los_Angeles}")
    private String timezone;

    @Value("${scheduling.business-hours.start:9}")
    private int businessHoursStart;

    @Value("${scheduling.business-hours.end:17}")
    private int businessHoursEnd;

    @Value("${scheduling.days-ahead:14}")
    private int daysAhead;

    private Calendar calendarService;

    @PostConstruct
    public void init() {
        if (serviceAccountKeyPath == null || serviceAccountKeyPath.isBlank()) {
            logger.warning("No service account key path configured. Calendar features disabled.");
            return;
        }
        try {
            InputStream keyStream = new FileInputStream(serviceAccountKeyPath);
            GoogleCredentials credentials = ServiceAccountCredentials.fromStream(keyStream)
                    .createScoped(Collections.singletonList("https://www.googleapis.com/auth/calendar"));

            calendarService = new Calendar.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName("HealthAssist Scheduler")
                    .build();

            logger.info("Google Calendar service initialized for: " + calendarEmail);
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to initialize Google Calendar service: " + e.getMessage(), e);
        }
    }

    /**
     * Get available 20-minute slots for the next N days by checking free/busy.
     */
    public List<Map<String, String>> getAvailableSlots() {
        List<Map<String, String>> slots = new ArrayList<>();
        if (calendarService == null || calendarEmail == null || calendarEmail.isBlank()) {
            logger.warning("Calendar service not initialized");
            return slots;
        }

        try {
            ZoneId zone = ZoneId.of(timezone);
            LocalDate today = LocalDate.now(zone);
            // Start from tomorrow
            LocalDate startDate = today.plusDays(1);
            LocalDate endDate = today.plusDays(daysAhead + 1);

            ZonedDateTime rangeStart = startDate.atStartOfDay(zone);
            ZonedDateTime rangeEnd = endDate.atStartOfDay(zone);

            // Query free/busy
            FreeBusyRequest request = new FreeBusyRequest()
                    .setTimeMin(new DateTime(rangeStart.toInstant().toEpochMilli()))
                    .setTimeMax(new DateTime(rangeEnd.toInstant().toEpochMilli()))
                    .setTimeZone(timezone)
                    .setItems(Collections.singletonList(new FreeBusyRequestItem().setId(calendarEmail)));

            FreeBusyResponse response = calendarService.freebusy().query(request).execute();
            List<TimePeriod> busyPeriods = response.getCalendars().get(calendarEmail).getBusy();

            // Generate all possible slots, then filter out busy ones
            DateTimeFormatter isoFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

            for (LocalDate date = startDate; date.isBefore(endDate); date = date.plusDays(1)) {
                // Skip weekends
                if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                    continue;
                }

                LocalTime slotTime = LocalTime.of(businessHoursStart, 0);
                LocalTime endTime = LocalTime.of(businessHoursEnd, 0);

                while (slotTime.plusMinutes(slotDurationMinutes).compareTo(endTime) <= 0) {
                    ZonedDateTime slotStart = ZonedDateTime.of(date, slotTime, zone);
                    ZonedDateTime slotEnd = slotStart.plusMinutes(slotDurationMinutes);

                    // Check if this slot overlaps with any busy period
                    boolean isBusy = false;
                    if (busyPeriods != null) {
                        for (TimePeriod busy : busyPeriods) {
                            long busyStartMs = busy.getStart().getValue();
                            long busyEndMs = busy.getEnd().getValue();
                            long slotStartMs = slotStart.toInstant().toEpochMilli();
                            long slotEndMs = slotEnd.toInstant().toEpochMilli();

                            if (slotStartMs < busyEndMs && slotEndMs > busyStartMs) {
                                isBusy = true;
                                break;
                            }
                        }
                    }

                    if (!isBusy) {
                        Map<String, String> slot = new HashMap<>();
                        slot.put("start", slotStart.format(isoFormatter));
                        slot.put("end", slotEnd.format(isoFormatter));
                        slot.put("date", date.toString());
                        slot.put("time", slotTime.format(DateTimeFormatter.ofPattern("h:mm a")));
                        slot.put("dayOfWeek", date.getDayOfWeek().toString());
                        slots.add(slot);
                    }

                    slotTime = slotTime.plusMinutes(slotDurationMinutes);
                }
            }
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to fetch available slots: " + e.getMessage(), e);
        }

        return slots;
    }

    /**
     * Book a 20-minute slot by creating a calendar event.
     */
    public Map<String, Object> bookSlot(String startTimeIso, String clientName, String clientEmail,
                                         String clientPhone, String service, String message) {
        Map<String, Object> result = new HashMap<>();
        if (calendarService == null) {
            result.put("success", false);
            result.put("error", "Calendar service not available");
            return result;
        }

        try {
            ZonedDateTime startTime = ZonedDateTime.parse(startTimeIso);
            ZonedDateTime endTime = startTime.plusMinutes(slotDurationMinutes);

            Event event = new Event()
                    .setSummary("Zumanely Consultation: " + clientName)
                    .setDescription(String.format(
                            "Client: %s\nEmail: %s\nPhone: %s\nService: %s\nMessage: %s",
                            clientName, clientEmail, clientPhone != null ? clientPhone : "N/A",
                            service != null ? service : "General", message != null ? message : "N/A"))
                    .setStart(new EventDateTime()
                            .setDateTime(new DateTime(startTime.toInstant().toEpochMilli()))
                            .setTimeZone(timezone))
                    .setEnd(new EventDateTime()
                            .setDateTime(new DateTime(endTime.toInstant().toEpochMilli()))
                            .setTimeZone(timezone));


            // Send notifications
            Event created = calendarService.events()
                    .insert(calendarEmail, event)
                    
                    .execute();

            result.put("success", true);
            result.put("eventId", created.getId());
            result.put("htmlLink", created.getHtmlLink());
            result.put("start", startTimeIso);
            result.put("end", endTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));

            logger.info("Booking created: " + created.getId() + " for " + clientEmail);

        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to book slot: " + e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Book a 60-minute paid slot by creating a calendar event.
     */
    public Map<String, Object> bookPaidSlot(String startTimeIso, String clientName, String clientEmail,
                                             String clientPhone, String service, String message) {
        Map<String, Object> result = new HashMap<>();
        if (calendarService == null) {
            result.put("success", false);
            result.put("error", "Calendar service not available");
            return result;
        }

        try {
            ZonedDateTime startTime = ZonedDateTime.parse(startTimeIso);
            ZonedDateTime endTime = startTime.plusMinutes(60); // 1-hour paid session

            Event event = new Event()
                    .setSummary("Zumanely PAID Consultation (1hr): " + clientName)
                    .setDescription(String.format(
                            "⭐ PAID 1-HOUR SESSION\nClient: %s\nEmail: %s\nPhone: %s\nService: %s\nMessage: %s",
                            clientName, clientEmail, clientPhone != null ? clientPhone : "N/A",
                            service != null ? service : "General", message != null ? message : "N/A"))
                    .setStart(new EventDateTime()
                            .setDateTime(new DateTime(startTime.toInstant().toEpochMilli()))
                            .setTimeZone(timezone))
                    .setEnd(new EventDateTime()
                            .setDateTime(new DateTime(endTime.toInstant().toEpochMilli()))
                            .setTimeZone(timezone));

            Event created = calendarService.events()
                    .insert(calendarEmail, event)
                    .execute();

            result.put("success", true);
            result.put("eventId", created.getId());
            result.put("htmlLink", created.getHtmlLink());
            result.put("start", startTimeIso);
            result.put("end", endTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));

            logger.info("PAID 1hr booking created: " + created.getId() + " for " + clientEmail);

        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to book paid slot: " + e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }
}
