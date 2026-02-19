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

    public void sendPaidBookingConfirmation(String toEmail, String clientName,
                                             String dateTime, String service) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setCc(ccEmail);
            helper.setSubject("Zumanely 1-Hour Consultation Confirmed - " + dateTime);

            String html = """
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #F9A826, #E8941A); padding: 32px; border-radius: 16px 16px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">⭐ Paid Consultation Confirmed!</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Zumanely Holistic Wellness — 1-Hour Session</p>
                    </div>
                    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 16px 16px;">
                        <p style="color: #1E293B; font-size: 16px;">Hi %s,</p>
                        <p style="color: #64748B;">Your 1-hour specialist consultation has been scheduled:</p>
                        <div style="background: #FFF8EB; border-left: 4px solid #F9A826; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #1B3A5C; font-weight: 600;">%s</p>
                            <p style="margin: 4px 0 0; color: #64748B;">Service: %s</p>
                            <p style="margin: 4px 0 0; color: #F9A826; font-weight: 600;">Duration: 1 Hour</p>
                        </div>
                        <p style="color: #64748B;">Payment of $19.99 has been received. You'll receive a calendar invite shortly.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 13px;">Zumanely | (408) 982-6644 | zumanely0@gmail.com</p>
                    </div>
                </div>
                """.formatted(clientName, dateTime, service != null ? service : "General Consultation");

            helper.setText(html, true);
            mailSender.send(message);
            logger.info("Paid booking confirmation sent to: " + toEmail);

        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to send paid confirmation email: " + e.getMessage(), e);
        }
    }
}
