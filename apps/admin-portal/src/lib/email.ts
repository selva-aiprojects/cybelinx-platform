export interface WelcomeEmailParams {
  to: string;
  tenantName: string;
  tenantCode: string;
  productCode: string;
  productName?: string;
  planCode?: string;
  appUrl: string;
  adminEmail: string;
  tempPassword?: string;
  contactName?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Jioplix Onboarding <onboarding@cognivectra.com>';

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const {
      to,
      tenantName,
      tenantCode,
      productCode,
      productName = productCode,
      planCode = 'ENTERPRISE',
      appUrl,
      adminEmail,
      tempPassword = 'Admin@123',
      contactName = 'Administrator'
    } = params;

    if (!to || to.includes('@example.com') || to.includes('@test.com')) {
      console.log(`[EMAIL] Skipping email to placeholder/test recipient: ${to}`);
      return { success: false, error: 'Placeholder recipient skipped' };
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1329; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #111e38; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; text-align: center; }
    .brand { font-size: 26px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 600; color: #f1f5f9; margin-top: 8px; }
    .badge { display: inline-block; background: #0284c7; color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 10px; letter-spacing: 0.5px; }
    .card { background: #070d1f; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1e3a8a; }
    .field-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
    .field-row:last-child { border-bottom: none; }
    .label { color: #94a3b8; font-weight: 500; }
    .value { color: #f8fafc; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .btn { display: block; width: 100%; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff !important; text-align: center; padding: 15px 0; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 24px; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(2, 132, 199, 0.4); }
    .steps { background: #162038; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
    .steps ol { margin: 8px 0 0 0; padding-left: 20px; }
    .steps li { margin-bottom: 6px; }
    .footer { margin-top: 36px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Cybelinx Multi-Tenant Platform</div>
      <div class="title">Your Product Workspace is Ready</div>
      <span class="badge">${productName} · Active</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${contactName}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1;">Congratulations! Your dedicated product workspace for <strong>${tenantName}</strong> has been successfully provisioned and attached on the Cybelinx platform.</p>
    
    <div class="card">
      <div class="field-row">
        <span class="label">Workspace URL</span>
        <span class="value"><a href="${appUrl}" style="color: #38bdf8; text-decoration: none;">${appUrl}</a></span>
      </div>
      <div class="field-row">
        <span class="label">Tenant / Facility</span>
        <span class="value">${tenantName} (${tenantCode})</span>
      </div>
      <div class="field-row">
        <span class="label">Admin Email</span>
        <span class="value">${adminEmail}</span>
      </div>
      <div class="field-row">
        <span class="label">Temporary Password</span>
        <span class="value" style="color: #fbbf24;">${tempPassword}</span>
      </div>
      <div class="field-row">
        <span class="label">Subscription Plan</span>
        <span class="value">${planCode}</span>
      </div>
      <div class="field-row">
        <span class="label">Status</span>
        <span class="value" style="color: #4ade80;">ACTIVE & READY</span>
      </div>
    </div>

    <div class="steps">
      <strong style="color: #f8fafc;">🚀 Next Steps to Get Started:</strong>
      <ol>
        <li>Click the button below to access your workspace.</li>
        <li>Log in using your <strong>Admin Email</strong> and <strong>Temporary Password</strong>.</li>
        <li>Update your password in <strong>Account Settings</strong>.</li>
        <li>Configure staff RBAC, departments, and invite team members.</li>
      </ol>
    </div>

    <a href="${appUrl}" class="btn" target="_blank">Sign In to Your Workspace &rarr;</a>

    <div class="footer">
      This email was dispatched automatically by Cybelinx Control Plane Outbox.<br/>
      Need assistance? Contact support@cybelinx.com or reply to this email.<br/>
      &copy; 2026 Cybelinx Inc. & Cognivectra. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const payload = JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject: `Welcome to ${productName}! Your Workspace is Ready (${tenantName})`,
      html: emailHtml,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload)),
      },
      body: payload,
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[EMAIL] Successfully sent welcome email to ${to} (Message ID: ${data.id})`);
      return { success: true, id: data.id };
    } else {
      console.warn(`[EMAIL] Failed to send email to ${to}:`, data);
      return { success: false, error: data.message || 'Resend API error' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Error dispatching welcome email:`, msg);
    return { success: false, error: msg };
  }
}
