import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  // Handle CORS options
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { toEmail, pdfBase64, monthLabel, reportId } = req.body;
    if (!toEmail) {
      return res.status(400).json({ error: "Recipient email address is required" });
    }
    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF document data is required" });
    }

    // Attempt to convert the base64 string back into a Buffer for attaching
    const cleanBase64 = pdfBase64.includes("base64,") 
      ? pdfBase64.split("base64,")[1] 
      : pdfBase64;
    
    const buffer = Buffer.from(cleanBase64, 'base64');

    const host = (process.env.SMTP_HOST || "").trim();
    const portStr = (process.env.SMTP_PORT || "").trim();
    const port = parseInt(portStr || "587");
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    
    // Dynamically align the FROM address to match the authenticated user for perfect SPF/DKIM/DMARC server delivery.
    let from = (process.env.SMTP_FROM || "").trim();
    if (!from) {
      if (user && user.includes("@")) {
        from = `"Portfolio Ledger" <${user}>`;
      } else {
        from = '"Portfolio Ledger" <no-reply@portfolioledger.com>';
      }
    }

    const subject = `Ledger Financial Statement [Period: ${monthLabel || "Monthly Report"}]`;
    const htmlBody = `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #1e3a8a; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Ledger Statement Dispatch</h2>
          <p style="font-size: 11px; color: #64748b; font-weight: bold; margin: 2px 0 0 0; font-family: monospace;">FINANCIAL SUMMARY REPORT</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.5; color: #334155;">Hello,</p>
        
        <p style="font-size: 14px; line-height: 1.5; color: #1e293b; font-weight: 600;">Your requested Ledger financial statement has been successfully compiled and sent.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Report Period:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #1e293b;">${monthLabel || "Monthly Statement"}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Document ID:</td>
              <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #0284c7;">${reportId || "LGR-RPT-N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Sent Timestamp:</td>
              <td style="padding: 4px 0; text-align: right; color: #475569;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 13px; line-height: 1.5; color: #475569;">The secure PDF report has been compiled and is attached directly to this email for your immediate review, offline saving, or printing.</p>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; font-family: monospace;">
          <p style="margin: 0; font-weight: bold;">PORTFOLIO CLIENT LEDGER</p>
          <p style="margin: 2px 0 0 0;">This transmission is intended solely for the recipient.</p>
        </div>
      </div>
    `;

    console.log(`[SMTP INFO] Host: "${host}", Port: ${port}, User: "${user}", Pass configured: ${!!pass}, From: "${from}"`);

    if (host && user && pass) {
      // Use configured SMTP credentials
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `Ledger_Financial_Statement_${monthLabel || "report"}.pdf`,
            content: buffer,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log(`Email compiled and sent successfully via SMTP to ${toEmail}`);
      return res.status(200).json({ 
        success: true, 
        message: `Financial snapshot report for ${monthLabel} compiled and dispatched successfully via secure SMTP transport to ${toEmail}.`,
        details: "SMTP transmission successfully closed."
      });
    } else {
      // Graceful offline simulated delivery fallback (extremely useful for test sandboxes)
      console.log(`[SIMULATED EMAIL DISPATCH] Recipient: ${toEmail}`);
      console.log(`[SIMULATED EMAIL DISPATCH] Subject: ${subject}`);
      console.log(`[SIMULATED EMAIL DISPATCH] PDF attached: (${buffer.length} bytes base64)`);
      
      await new Promise(resolve => setTimeout(resolve, 1550));

      const missingVars = [];
      if (!host) missingVars.push("SMTP_HOST");
      if (!user) missingVars.push("SMTP_USER");
      if (!pass) missingVars.push("SMTP_PASS");

      return res.status(200).json({
        success: true,
        isSimulated: true,
        message: `Financial snapshot report for ${monthLabel} compiled and dispatched successfully (simulated) to ${toEmail}.`,
        details: `Notice: Offline simulation mode fallback activated because these SMTP environment variables were not defined or empty: ${missingVars.join(", ")}. Check your app variables setup.`
      });
    }

  } catch (error: any) {
    console.error("Email dispatch error:", error);
    return res.status(500).json({ error: error?.message || "Internal issue dispatching executive statement email." });
  }
}
