package com.cybelinx.platform.api.email;

import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Resend Email Notification Service for Product Subscription & Welcome Emails.
 * Dispatches HTML welcome notifications to Tenant Admin contact emails and internal sales.
 */
@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HttpClient httpClient;
    private final String apiKey;
    private final String fromEmail;
    private final String salesEmail;

    public EmailNotificationService(
            @Value("${RESEND_API_KEY:${cybelinx.resend.api-key:}}") String apiKey,
            @Value("${RESEND_FROM:${cybelinx.resend.from:Cybelinx Product Onboarding <onboarding@cybelinx.com>}}") String fromEmail,
            @Value("${RESEND_TO:${cybelinx.resend.to:sales@cybelinx.com}}") String salesEmail) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.fromEmail = fromEmail != null ? fromEmail.trim() : "Cybelinx <onboarding@cybelinx.com>";
        this.salesEmail = salesEmail != null ? salesEmail.trim() : "sales@cybelinx.com";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Dispatch welcome and product subscription confirmation emails upon tenant onboarding.
     */
    public void dispatchOnboardingEmails(GenericOnboardRequest request, GenericOnboardResponse response) {
        if (apiKey.isEmpty() || apiKey.equals("your_resend_api_key_here") || apiKey.startsWith("your_")) {
            log.info("Resend API key is placeholder or empty. Skipping live email dispatch for tenant: {}", request.tenantCode());
            return;
        }

        // 1. Send Welcome & Subscription Confirmation Email to Tenant Contact Email
        if (request.adminEmail() != null && !request.adminEmail().isBlank()) {
            String recipient = request.adminEmail().trim();
            String subject = "Welcome to Cybelinx! Your " + request.productCode() + " Workspace is Active (" + request.tenantName() + ")";
            String htmlBody = buildTenantWelcomeHtml(request, response);
            sendEmailAsync(recipient, subject, htmlBody);
        }

        // 2. Send Internal Sales / Admin Onboarding Notification Email
        if (!salesEmail.isBlank()) {
            String salesSubject = "[Cybelinx Onboarding] New Tenant Provisioned: " + request.tenantCode() + " (" + request.productCode() + ")";
            String salesHtmlBody = buildSalesNotificationHtml(request, response);
            sendEmailAsync(salesEmail, salesSubject, salesHtmlBody);
        }
    }

    private void sendEmailAsync(String to, String subject, String htmlBody) {
        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("from", fromEmail);
                payload.put("to", List.of(to));
                payload.put("subject", subject);
                payload.put("html", htmlBody);

                String jsonBody = MAPPER.writeValueAsString(payload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(RESEND_API_URL))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .timeout(Duration.ofSeconds(15))
                        .build();

                HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

                if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
                    log.info("Successfully dispatched email via Resend to {} (status: {})", to, httpResponse.statusCode());
                } else {
                    log.warn("Failed to dispatch email via Resend to {} (status: {}, response: {})", to, httpResponse.statusCode(), httpResponse.body());
                }
            } catch (Exception e) {
                log.error("Exception sending email via Resend to {}: {}", to, e.getMessage());
            }
        });
    }

    private String buildTenantWelcomeHtml(GenericOnboardRequest request, GenericOnboardResponse response) {
        return """
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
            .header { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px; text-align: center; }
            .brand { font-size: 24px; font-weight: bold; color: #38bdf8; letter-spacing: -0.5px; }
            .title { font-size: 20px; font-weight: 600; color: #f1f5f9; margin-top: 8px; }
            .badge { display: inline-block; background: #0284c7; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
            .card { background: #0f172a; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #334155; }
            .field-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
            .label { color: #94a3b8; font-weight: 500; }
            .value { color: #f8fafc; font-weight: 600; font-family: monospace; }
            .btn { display: block; width: 100%%; background: linear-gradient(135deg, #0284c7, #9333ea); color: #ffffff; text-align: center; padding: 14px 0; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">Cybelinx Multi-Tenant Platform</div>
              <div class="title">Welcome & Subscription Activation</div>
              <span class="badge">Product Workspace Active</span>
            </div>
            
            <p>Dear <strong>%s</strong>,</p>
            <p>Congratulations! Your dedicated product workspace <strong>%s</strong> has been successfully provisioned and attached on the Cybelinx platform.</p>
            
            <div class="card">
              <div class="field-row">
                <span class="label">Tenant Code</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row">
                <span class="label">Product Code</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row">
                <span class="label">Subscription Plan</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row">
                <span class="label">Isolation Mode</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row">
                <span class="label">Database Schema</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row">
                <span class="label">Contact Admin Email</span>
                <span class="value">%s</span>
              </div>
              <div class="field-row" style="border-bottom: none;">
                <span class="label">Onboarding Status</span>
                <span class="value" style="color: #4ade80;">%s</span>
              </div>
            </div>

            <p style="font-size: 14px; color: #cbd5e1;">Your tenant admin identity has been granted <strong>TENANT_ADMIN</strong> role permissions with isolated database access.</p>

            <a href="https://cybelinx-platform-admin-portal.vercel.app" class="btn" target="_blank">Access Your Product Console</a>

            <div class="footer">
              This email was automatically dispatched by Cybelinx Control Plane Outbox Engine.<br/>
              © 2026 Cybelinx Inc. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """.formatted(
                request.adminName() != null && !request.adminName().isBlank() ? request.adminName() : request.adminEmail(),
                request.tenantName(),
                response.tenantCode(),
                response.productCode(),
                response.planCode(),
                request.isolationMode() != null ? request.isolationMode() : "SCHEMA_PER_TENANT",
                response.schemaName() != null ? response.schemaName() : "AUTO_PROVISIONED",
                request.adminEmail(),
                response.status()
        );
    }

    private String buildSalesNotificationHtml(GenericOnboardRequest request, GenericOnboardResponse response) {
        return """
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body { font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 8px; }
            .heading { color: #38bdf8; font-size: 18px; margin-bottom: 16px; }
            table { width: 100%%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid #334155; font-size: 14px; }
            td.label { color: #94a3b8; font-weight: bold; }
            td.val { font-family: monospace; color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="heading">⚡ New Tenant Provisioned Notification</div>
            <table>
              <tr><td class="label">Tenant Code</td><td class="val">%s</td></tr>
              <tr><td class="label">Tenant Name</td><td class="val">%s</td></tr>
              <tr><td class="label">Product Code</td><td class="val">%s</td></tr>
              <tr><td class="label">Plan Code</td><td class="val">%s</td></tr>
              <tr><td class="label">External ID</td><td class="val">%s</td></tr>
              <tr><td class="label">Admin Email</td><td class="val">%s</td></tr>
              <tr><td class="label">Schema Name</td><td class="val">%s</td></tr>
              <tr><td class="label">Status</td><td class="val">%s</td></tr>
            </table>
          </div>
        </body>
        </html>
        """.formatted(
                response.tenantCode(),
                request.tenantName(),
                response.productCode(),
                response.planCode(),
                request.externalId(),
                request.adminEmail(),
                response.schemaName(),
                response.status()
        );
    }
}
