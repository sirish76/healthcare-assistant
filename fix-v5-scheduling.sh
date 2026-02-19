#!/bin/bash
# ==============================================================
# Fix v5: Calendar Scheduling Feature
# Run from project root: bash fix-v5-scheduling.sh
# ==============================================================

set -e
BASE="healthcare-assistant-backend/src/main/java/com/healthassist"
FE="healthcare-assistant-frontend/src"

echo "========================================="
echo "  Fix v5: Calendar Scheduling"
echo "========================================="

# ─── 1. Update pom.xml with Google Calendar + Mail dependencies ───
echo "=== 1. Updating pom.xml ==="
cat > "healthcare-assistant-backend/pom.xml" << 'POMEOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.3</version>
        <relativePath/>
    </parent>

    <groupId>com.healthassist</groupId>
    <artifactId>healthcare-assistant-backend</artifactId>
    <version>1.0.0</version>
    <name>Healthcare Assistant Backend</name>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.google.api-client</groupId>
            <artifactId>google-api-client</artifactId>
            <version>2.2.0</version>
        </dependency>
        <dependency>
            <groupId>com.google.apis</groupId>
            <artifactId>google-api-services-calendar</artifactId>
            <version>v3-rev20231123-2.0.0</version>
        </dependency>
        <dependency>
            <groupId>com.google.auth</groupId>
            <artifactId>google-auth-library-oauth2-http</artifactId>
            <version>1.20.0</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
POMEOF

# ─── 2. Create CalendarService.java ───
echo "=== 2. Creating CalendarService.java ==="
cat > "$BASE/service/CalendarService.java" << 'JAVAEOF'
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

            // Add attendees
            List<EventAttendee> attendees = new ArrayList<>();
            attendees.add(new EventAttendee().setEmail(clientEmail));
            attendees.add(new EventAttendee().setEmail(calendarEmail));
            event.setAttendees(attendees);

            // Send notifications
            Event created = calendarService.events()
                    .insert(calendarEmail, event)
                    .setSendUpdates("all")
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
}
JAVAEOF

# ─── 3. Create EmailService.java ───
echo "=== 3. Creating EmailService.java ==="
cat > "$BASE/service/EmailService.java" << 'JAVAEOF'
package com.healthassist.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class EmailService {

    private static final Logger logger = Logger.getLogger(EmailService.class.getName());

    private final JavaMailSender mailSender;

    @Value("${scheduling.notification.cc:zumanely0@gmail.com}")
    private String ccEmail;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendBookingConfirmation(String toEmail, String clientName,
                                         String dateTime, String service) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setCc(ccEmail);
            helper.setSubject("Zumanely Consultation Confirmed - " + dateTime);

            String html = """
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1B3A5C, #2AA89A); padding: 32px; border-radius: 16px 16px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Consultation Confirmed!</h1>
                        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Zumanely Holistic Wellness</p>
                    </div>
                    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 16px 16px;">
                        <p style="color: #1E293B; font-size: 16px;">Hi %s,</p>
                        <p style="color: #64748B;">Your 20-minute consultation has been scheduled:</p>
                        <div style="background: #F0FDFA; border-left: 4px solid #2AA89A; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #1B3A5C; font-weight: 600;">%s</p>
                            <p style="margin: 4px 0 0; color: #64748B;">Service: %s</p>
                        </div>
                        <p style="color: #64748B;">You'll receive a calendar invite shortly. If you need to reschedule, please contact us.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 13px;">Zumanely | (408) 982-6644 | zumanely0@gmail.com</p>
                    </div>
                </div>
                """.formatted(clientName, dateTime, service != null ? service : "General Consultation");

            helper.setText(html, true);
            mailSender.send(message);
            logger.info("Booking confirmation sent to: " + toEmail);

        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to send confirmation email: " + e.getMessage(), e);
        }
    }
}
JAVAEOF

# ─── 4. Create SchedulingController.java ───
echo "=== 4. Creating SchedulingController.java ==="
cat > "$BASE/controller/SchedulingController.java" << 'JAVAEOF'
package com.healthassist.controller;

import com.healthassist.service.CalendarService;
import com.healthassist.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduling")
public class SchedulingController {

    private final CalendarService calendarService;
    private final EmailService emailService;

    public SchedulingController(CalendarService calendarService, EmailService emailService) {
        this.calendarService = calendarService;
        this.emailService = emailService;
    }

    @GetMapping("/slots")
    public ResponseEntity<?> getAvailableSlots() {
        List<Map<String, String>> slots = calendarService.getAvailableSlots();
        return ResponseEntity.ok(Map.of("slots", slots));
    }

    @PostMapping("/book")
    public ResponseEntity<?> bookSlot(@RequestBody Map<String, String> body) {
        String startTime = body.get("startTime");
        String firstName = body.getOrDefault("firstName", "");
        String lastName = body.getOrDefault("lastName", "");
        String clientName = (firstName + " " + lastName).trim();
        String clientEmail = body.get("email");
        String clientPhone = body.get("phone");
        String service = body.get("service");
        String message = body.get("message");

        if (startTime == null || clientEmail == null || clientName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "startTime, email, and name are required"));
        }

        // Book the slot on Google Calendar
        Map<String, Object> result = calendarService.bookSlot(
                startTime, clientName, clientEmail, clientPhone, service, message);

        if ((boolean) result.get("success")) {
            // Send email confirmation
            String dateTimeDisplay = body.getOrDefault("displayDateTime", startTime);
            emailService.sendBookingConfirmation(clientEmail, clientName, dateTimeDisplay, service);
        }

        return ResponseEntity.ok(result);
    }
}
JAVAEOF

# ─── 5. Update application.yml ───
echo "=== 5. Updating application.yml ==="
cat > "healthcare-assistant-backend/src/main/resources/application.yml" << 'YMLEOF'
server:
  port: 8080

spring:
  application:
    name: healthcare-assistant

  datasource:
    url: jdbc:postgresql://${DB_HOST:postgres}:${DB_PORT:5432}/${DB_NAME:healthassist}
    username: ${DB_USERNAME:healthassist}
    password: ${DB_PASSWORD:healthassist123}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

  # Email (Gmail SMTP)
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${SMTP_EMAIL:zumanely0@gmail.com}
    password: ${SMTP_APP_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enabled: true
            required: true

# Anthropic Claude API
anthropic:
  api:
    key: ${ANTHROPIC_API_KEY:}
    url: https://api.anthropic.com/v1/messages
    model: claude-sonnet-4-5-20250929
    max-tokens: 4096

# Google OAuth
google:
  client:
    id: ${GOOGLE_CLIENT_ID:1045121225058-evthv0bogs2i0k5l015a04eoig1ltsnp.apps.googleusercontent.com}

# Scheduling / Google Calendar
scheduling:
  calendar:
    email: ${CALENDAR_EMAIL:sirish.mandalika@gmail.com}
  service-account:
    key-path: ${GOOGLE_SA_KEY_PATH:/app/config/service-account.json}
  slot-duration-minutes: 20
  timezone: America/Los_Angeles
  business-hours:
    start: 9
    end: 17
  days-ahead: 14
  notification:
    cc: ${NOTIFICATION_CC_EMAIL:zumanely0@gmail.com}

# ZocDoc API
zocdoc:
  api:
    key: ${ZOCDOC_API_KEY:}
    base-url: https://api.zocdoc.com/directory/v2

# Knowledge Service
knowledge:
  service:
    url: ${KNOWLEDGE_SERVICE_URL:http://knowledge:8081}

# CORS
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173,https://doctors.sirish.world}

# Logging
logging:
  level:
    com.healthassist: DEBUG
    org.springframework.web: INFO
YMLEOF

# ─── 6. Create service account key directory and placeholder ───
echo "=== 6. Setting up service account key ==="
mkdir -p healthcare-assistant-backend/config
# The actual key will be mounted via docker-compose

# ─── 7. Update docker-compose.yml ───
echo "=== 7. Updating docker-compose.yml ==="
cat > "docker-compose.yml" << 'DCEOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: healthassist-db
    environment:
      POSTGRES_DB: healthassist
      POSTGRES_USER: healthassist
      POSTGRES_PASSWORD: ${DB_PASSWORD:-healthassist123}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthassist"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./healthcare-assistant-backend
    container_name: healthassist-backend
    ports:
      - "8080:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ZOCDOC_API_KEY=${ZOCDOC_API_KEY:-}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-1045121225058-evthv0bogs2i0k5l015a04eoig1ltsnp.apps.googleusercontent.com}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=healthassist
      - DB_USERNAME=healthassist
      - DB_PASSWORD=${DB_PASSWORD:-healthassist123}
      - CORS_ALLOWED_ORIGINS=https://doctors.sirish.world,http://doctors.sirish.world
      - CALENDAR_EMAIL=${CALENDAR_EMAIL:-sirish.mandalika@gmail.com}
      - GOOGLE_SA_KEY_PATH=/app/config/service-account.json
      - SMTP_EMAIL=${SMTP_EMAIL:-zumanely0@gmail.com}
      - SMTP_APP_PASSWORD=${SMTP_APP_PASSWORD:-}
      - NOTIFICATION_CC_EMAIL=${NOTIFICATION_CC_EMAIL:-zumanely0@gmail.com}
    volumes:
      - ./healthcare-assistant-backend/config:/app/config:ro
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./healthcare-assistant-frontend
    container_name: healthassist-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
DCEOF

# ─── 8. Update frontend api.js ───
echo "=== 8. Updating api.js ==="
cat >> "$FE/services/api.js" << 'APIEOF'

// ─── Scheduling API ───

export const getAvailableSlots = async () => {
  const response = await apiClient.get('/scheduling/slots');
  return response.data;
};

export const bookSlot = async (bookingData) => {
  const response = await apiClient.post('/scheduling/book', bookingData);
  return response.data;
};
APIEOF

# ─── 9. Update ContactPage.jsx ───
echo "=== 9. Updating ContactPage.jsx ==="
cat > "$FE/components/ContactPage.jsx" << 'JSXEOF'
import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  User,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Heart,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAvailableSlots, bookSlot } from '../services/api';

const BRAND = {
  primary: '#1B3A5C',
  accent: '#2AA89A',
  accentLight: '#E6F7F5',
  warm: '#F9A826',
  warmLight: '#FFF8EB',
  bg: '#FAFBFD',
  text: '#1E293B',
  muted: '#64748B',
};

export default function ContactPage({ onBack, onOpenChat }) {
  const [step, setStep] = useState(1); // 1=form, 2=slots, 3=confirmed
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slotsError, setSlotsError] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const data = await getAvailableSlots();
      setSlots(data.slots || []);
      if (data.slots && data.slots.length > 0) {
        setSelectedDate(data.slots[0].date);
      }
      setStep(2);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setSlotsError('Unable to load available time slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const result = await bookSlot({
        startTime: selectedSlot.start,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        service: formData.service,
        message: formData.message,
        displayDateTime: `${selectedSlot.dayOfWeek}, ${selectedSlot.date} at ${selectedSlot.time}`,
      });
      setBookingResult(result);
      if (result.success) {
        setStep(3);
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingResult({ success: false, error: 'Booking failed. Please try again.' });
    } finally {
      setBooking(false);
    }
  };

  // Group slots by date
  const slotsByDate = {};
  slots.forEach((s) => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });
  const availableDates = Object.keys(slotsByDate);

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="font-sans antialiased min-h-screen" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 px-6 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${BRAND.primary} 0%, #0D2640 50%, #134E5E 100%)` }}
      >
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: BRAND.accent }} />

        <button
          onClick={step === 2 ? () => setStep(1) : onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm z-10"
        >
          <ArrowLeft size={18} />
          {step === 2 ? 'Back to Form' : 'Back to Home'}
        </button>

        <div className="relative max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {step === 1 && 'Schedule a Consultation'}
            {step === 2 && 'Pick a Time'}
            {step === 3 && 'You\'re All Set!'}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {step === 1 && 'Fill out the form and choose a convenient 20-minute call with our team.'}
            {step === 2 && 'Select a date and time that works best for you.'}
            {step === 3 && 'Your consultation has been booked. Check your email for confirmation.'}
          </p>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-3 mt-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s ? 'text-white' : 'text-white/30 border border-white/20'
                  }`}
                  style={step >= s ? { background: BRAND.accent } : {}}
                >
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 rounded ${step > s ? 'bg-teal-400' : 'bg-white/15'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-12">
          {/* Left sidebar */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: BRAND.primary }}>Contact Information</h2>
              <div className="space-y-5">
                {[
                  { icon: <Phone size={18} />, label: 'Call Us', value: '(408) 982-6644', href: 'tel:4089826644' },
                  { icon: <Mail size={18} />, label: 'Email Us', value: 'zumanely0@gmail.com', href: 'mailto:zumanely0@gmail.com' },
                  { icon: <MapPin size={18} />, label: 'Visit Us', value: '41079 Bernie St, Fremont, CA 94539' },
                  { icon: <Clock size={18} />, label: 'Hours', value: 'Mon – Fri: 9 AM – 5 PM PST' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: BRAND.accentLight, color: BRAND.accent }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-semibold hover:text-teal-700 transition-colors" style={{ color: BRAND.primary }}>
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: BRAND.primary }}>{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6 border border-white/20" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #0F2B47)` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND.accent}30` }}>
                  <Sparkles size={18} style={{ color: BRAND.accent }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Need instant help?</p>
                  <p className="text-white/50 text-xs">Our AI assistant is available 24/7</p>
                </div>
              </div>
              <button
                onClick={onOpenChat}
                className="w-full px-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
              >
                <MessageSquare size={16} />
                Chat with AI Assistant
              </button>
            </div>
          </div>

          {/* Right - main content area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">

              {/* ── STEP 1: Form ── */}
              {step === 1 && (
                <>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Tell Us About Yourself
                  </h2>
                  <p className="text-gray-400 text-sm mb-8">
                    After filling out the form, you'll be able to pick a convenient time slot.
                  </p>

                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>First Name *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange}
                            placeholder="John"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Last Name *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange}
                            placeholder="Doe"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Email Address *</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="email" name="email" required value={formData.email} onChange={handleChange}
                            placeholder="john@example.com"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Phone Number</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            placeholder="(408) 555-1234"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Service interested in?</label>
                      <select name="service" value={formData.service} onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                        <option value="">Select a service</option>
                        <option value="Complex Care">Complex Care</option>
                        <option value="Stress Management">Stress Management</option>
                        <option value="Personal Health">Personal Health</option>
                        <option value="Visitor Care">Visitor Care</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Message</label>
                      <textarea name="message" rows={4} value={formData.message} onChange={handleChange}
                        placeholder="Tell us about your needs..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all resize-none" />
                    </div>

                    {slotsError && (
                      <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{slotsError}</div>
                    )}

                    <button type="submit" disabled={loadingSlots}
                      className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}>
                      {loadingSlots ? (
                        <><Loader2 size={18} className="animate-spin" /> Loading available times...</>
                      ) : (
                        <><Calendar size={18} /> Schedule a 20-Minute Call</>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ── STEP 2: Slot Picker ── */}
              {step === 2 && (
                <>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Choose a Time Slot
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Select a 20-minute slot that works for you. All times are in Pacific Time (PST).
                  </p>

                  {slots.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No available slots found. Please try again later.</p>
                      <button onClick={() => setStep(1)} className="mt-4 text-sm font-semibold" style={{ color: BRAND.accent }}>
                        ← Back to form
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Date selector - horizontal scroll */}
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
                        {availableDates.map((date) => (
                          <button
                            key={date}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                              selectedDate === date
                                ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                                : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                            }`}
                          >
                            {formatDateLabel(date)}
                          </button>
                        ))}
                      </div>

                      {/* Time slots grid */}
                      {selectedDate && slotsByDate[selectedDate] && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
                          {slotsByDate[selectedDate].map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                                selectedSlot?.start === slot.start
                                  ? 'border-teal-400 bg-teal-50 text-teal-800 shadow-md'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-teal-200 hover:bg-teal-50/50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected slot summary + confirm */}
                      {selectedSlot && (
                        <div className="rounded-2xl p-5 mb-6 border" style={{ background: BRAND.accentLight, borderColor: '#B2DFDB' }}>
                          <div className="flex items-center gap-3 mb-3">
                            <Calendar size={20} style={{ color: BRAND.accent }} />
                            <div>
                              <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>
                                {formatDateLabel(selectedSlot.date)} at {selectedSlot.time}
                              </p>
                              <p className="text-xs text-gray-500">20-minute consultation call</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Booking for: <strong>{formData.firstName} {formData.lastName}</strong> ({formData.email})
                          </p>
                        </div>
                      )}

                      {bookingResult && !bookingResult.success && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">{bookingResult.error}</div>
                      )}

                      <button
                        onClick={handleBookSlot}
                        disabled={!selectedSlot || booking}
                        className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
                      >
                        {booking ? (
                          <><Loader2 size={18} className="animate-spin" /> Booking...</>
                        ) : (
                          <><CheckCircle2 size={18} /> Confirm Booking</>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 3: Confirmation ── */}
              {step === 3 && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: BRAND.accentLight }}>
                    <CheckCircle2 size={40} style={{ color: BRAND.accent }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Consultation Booked!
                  </h3>
                  <p className="text-gray-500 mb-2">
                    Your 20-minute call is confirmed for:
                  </p>
                  {selectedSlot && (
                    <div className="inline-block rounded-xl px-6 py-3 mb-6" style={{ background: BRAND.accentLight }}>
                      <p className="font-bold text-lg" style={{ color: BRAND.primary }}>
                        {formatDateLabel(selectedSlot.date)} at {selectedSlot.time}
                      </p>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
                    A confirmation email and calendar invite have been sent to <strong>{formData.email}</strong>.
                    We look forward to speaking with you!
                  </p>
                  <div className="flex justify-center gap-4">
                    <button onClick={onBack}
                      className="px-6 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                      Back to Home
                    </button>
                    <button onClick={onOpenChat}
                      className="px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}>
                      <MessageSquare size={16} /> Chat with AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: BRAND.primary }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-white/30">
          © 2025 Zumanely. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
JSXEOF

echo ""
echo "========================================="
echo "  All scheduling files created!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Save your service account JSON key to:"
echo "     healthcare-assistant-backend/config/service-account.json"
echo ""
echo "  2. Set up Gmail App Password for SMTP:"
echo "     - Go to myaccount.google.com/apppasswords"
echo "     - Generate an app password for 'Mail'"
echo "     - Add to .env: SMTP_APP_PASSWORD=your-app-password"
echo ""
echo "  3. Rebuild and restart:"
echo "     docker compose down"
echo "     docker compose build --no-cache"
echo "     docker compose up -d"
echo "========================================="

