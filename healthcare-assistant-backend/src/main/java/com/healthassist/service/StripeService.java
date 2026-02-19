package com.healthassist.service;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class StripeService {

    private static final Logger logger = Logger.getLogger(StripeService.class.getName());

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${stripe.price-cents:1999}")
    private long priceCents;

    @Value("${stripe.success-url:https://doctors.sirish.world?payment=success&session_id={CHECKOUT_SESSION_ID}}")
    private String successUrl;

    @Value("${stripe.cancel-url:https://doctors.sirish.world?payment=cancelled}")
    private String cancelUrl;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isBlank()) {
            Stripe.apiKey = stripeSecretKey;
            logger.info("Stripe initialized successfully.");
        } else {
            logger.warning("Stripe secret key not configured. Payment features disabled.");
        }
    }

    /**
     * Create a Stripe Checkout Session for a 1-hour paid consultation.
     */
    public Map<String, Object> createCheckoutSession(String customerEmail, String customerName,
                                                      String slotStart, String displayDateTime,
                                                      String phone, String service, String message) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            return Map.of("success", false, "error", "Stripe is not configured");
        }

        try {
            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .setCustomerEmail(customerEmail)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("usd")
                                    .setUnitAmount(priceCents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("1-Hour Specialist Consultation")
                                            .setDescription("Full hour session with a Zumanely healthcare specialist")
                                            .build())
                                    .build())
                            .build());

            // Store booking details in metadata so webhook can book the calendar
            builder.putMetadata("customerName", customerName);
            builder.putMetadata("customerEmail", customerEmail);
            builder.putMetadata("customerPhone", phone != null ? phone : "");
            builder.putMetadata("slotStart", slotStart);
            builder.putMetadata("displayDateTime", displayDateTime != null ? displayDateTime : slotStart);
            builder.putMetadata("service", service != null ? service : "");
            builder.putMetadata("message", message != null ? message : "");
            builder.putMetadata("sessionType", "paid-60");

            Session session = Session.create(builder.build());

            return Map.of(
                    "success", true,
                    "sessionId", session.getId(),
                    "checkoutUrl", session.getUrl()
            );
        } catch (StripeException e) {
            logger.log(Level.SEVERE, "Stripe checkout creation failed: " + e.getMessage(), e);
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    /**
     * Verify and parse a Stripe webhook event.
     */
    public Event verifyWebhookEvent(String payload, String sigHeader) throws SignatureVerificationException {
        return Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
