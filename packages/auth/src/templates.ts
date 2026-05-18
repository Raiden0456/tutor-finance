export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

const layout = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f6f7f9; padding:24px; color:#0b1320;">
    <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">${title}</h1>
      ${body}
    </div>
  </body>
</html>`;

const button = (url: string, label: string) => `
  <a href="${url}" style="display:inline-block; padding:12px 20px; background:#111827; color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">${label}</a>`;

export function resetPasswordTemplate(opts: { url: string; appName?: string }): MailContent {
  const appName = opts.appName ?? 'Uchetka';
  return {
    subject: `Reset your ${appName} password`,
    html: layout(
      `Reset your password`,
      `<p>We received a request to reset your password. The link is valid for 1 hour.</p>
       ${button(opts.url, 'Reset password')}
       <p style="margin-top:24px; font-size:13px; color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
       <p style="font-size:13px; color:#6b7280;">Link: <a href="${opts.url}">${opts.url}</a></p>`,
    ),
    text: `Reset your ${appName} password (valid for 1 hour): ${opts.url}\n`,
  };
}

export function verifyEmailTemplate(opts: { url: string; appName?: string }): MailContent {
  const appName = opts.appName ?? 'Uchetka';
  return {
    subject: `Verify your ${appName} email`,
    html: layout(
      `Verify your email`,
      `<p>Confirm this email address to finish setting up your ${appName} account.</p>
       ${button(opts.url, 'Verify email')}
       <p style="margin-top:24px; font-size:13px; color:#6b7280;">If you did not create this account, you can safely ignore this email.</p>
       <p style="font-size:13px; color:#6b7280;">Link: <a href="${opts.url}">${opts.url}</a></p>`,
    ),
    text: `Verify your ${appName} email: ${opts.url}\n`,
  };
}
