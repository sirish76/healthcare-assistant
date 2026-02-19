package com.healthassist.controller;

import com.healthassist.service.CalendarService;
import com.healthassist.service.EmailService;
import com.healthassist.service.StripeService;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger logger = Logger.getLogger(PaymentController.class.getName());

    private final StripeService stripeService;
    private final CalendarService calendarService;
    private final EmailService emailService;

    public PaymentController(StripeService stripeService, CalendarService calendarService,
                             EmailService emailService) {
        this.stripeService = stripeService;
        this.calendarService = calendarService;
        this.emailService = emailService;
    }

    /**
     * Create a Stripe Checkout Session for the paid 1-hour consultation.
     */
    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String firstName = body.getOrDefault("firstName", "");
        String lastName = body.getOrDefault("lastName", "");
        String name = (firstName + " " + lastName).trim();
        String slotStart = body.get("slotStart");
        String displayDateTime = body.get("displayDateTime");
        String phone = body.get("phone");
        String service = body.get("service");
        String message = body.get("message");

        if (email == null || email.isBlank() || slotStart == null || slotStart.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email and slotStart are required"));
        }

        Map<String, Object> result = stripeService.createCheckoutSession(
                email, name, slotStart, displayDateTime, phone, service, message);

        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(500).body(result);
        }
    }

    /**
     * Stripe webhook: after successful payment, book the calendar slot.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody String payload,
                                            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            Event event = stripeService.verifyWebhookEvent(payload, sigHeader);

            if ("checkout.session.completed".equals(event.getType())) {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject().orElse(null);

                if (session != null) {
                    Map<String, String> meta = session.getMetadata();
                    String customerName = meta.getOrDefault("customerName", "");
                    String customerEmail = meta.getOrDefault("customerEmail", "");
                    String customerPhone = meta.getOrDefault("customerPhone", "");
                    String slotStart = meta.getOrDefault("slotStart", "");
                    String displayDateTime = meta.getOrDefault("displayDateTime", "");
                    String service = meta.getOrDefault("service", "");
                    String message = meta.getOrDefault("message", "");

                    // Book a 60-minute slot on Google Calendar
                    Map<String, Object> bookingResult = calendarService.bookPaidSlot(
                            slotStart, customerName, customerEmail, customerPhone, service, message);

                    if ((boolean) bookingResult.get("success")) {
                        emailService.sendPaidBookingConfirmation(
                                customerEmail, customerName, displayDateTime, service);
                        logger.info("Paid consultation booked for: " + customerEmail);
                    } else {
                        logger.severe("Failed to book calendar after payment: " + bookingResult.get("error"));
                    }
                }
            }

            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Webhook error: " + e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
}
