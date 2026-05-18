import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

export interface MailerOptions {
  provider: 'smtp' | 'resend';
  from: string;
  smtp?: SmtpConfig;
  resendApiKey?: string;
}

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type SendMail = (args: SendArgs) => Promise<void>;

export function createMailer(opts: MailerOptions): SendMail {
  if (opts.provider === 'resend') {
    if (!opts.resendApiKey) {
      throw new Error('AUTH_EMAIL_PROVIDER=resend requires RESEND_API_KEY');
    }
    const resend = new Resend(opts.resendApiKey);
    return async ({ to, subject, html, text }) => {
      const { data, error } = await resend.emails.send({
        from: opts.from,
        to,
        subject,
        html,
        text: text ?? '',
      });

      if (error) {
        throw new Error(`Resend failed to send email: ${error.name}: ${error.message}`);
      }

      console.log(`Email sent via Resend: ${data?.id ?? 'unknown id'}`);
    };
  }

  if (!opts.smtp) {
    throw new Error('AUTH_EMAIL_PROVIDER=smtp requires SMTP_HOST configuration');
  }
  const auth =
    opts.smtp.user && opts.smtp.pass ? { user: opts.smtp.user, pass: opts.smtp.pass } : undefined;
  const transport = nodemailer.createTransport({
    host: opts.smtp.host,
    port: opts.smtp.port,
    secure: opts.smtp.secure,
    auth,
  });
  return async ({ to, subject, html, text }) => {
    await transport.sendMail({ from: opts.from, to, subject, html, text });
  };
}
