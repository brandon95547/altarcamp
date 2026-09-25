import type { FastifyBaseLogger } from 'fastify';
import nodemailer, { type Transporter } from 'nodemailer';
import { loadConfig } from '../config.js';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transport: Transporter | null = null;

function smtpTransport(): Transporter {
  const config = loadConfig();
  transport ??= nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    // 465 is TLS from the first byte. 587 is the submission port, where STARTTLS is required
    // rather than hoped for — the account password crosses this connection.
    secure: config.SMTP_PORT === 465,
    requireTLS: config.SMTP_PORT === 587,
    auth: { user: config.SMTP_USER!, pass: config.SMTP_PASS! },
  });
  return transport;
}

/**
 * Sends one transactional email. Mail goes out under the Altar.Camp name from the SMTP
 * account's own address (providers refuse to send as anyone else), with Altar.Camp's
 * support inbox as Reply-To. With MAIL_DRIVER=log nothing is sent and the message is logged.
 */
export async function sendMail(email: Email, log: FastifyBaseLogger): Promise<void> {
  const config = loadConfig();
  if (config.MAIL_DRIVER === 'log') {
    log.info({ mail: { to: email.to, subject: email.subject } }, 'mail not sent (MAIL_DRIVER=log)');
    log.debug({ text: email.text }, 'mail body');
    return;
  }
  await smtpTransport().sendMail({
    from: { name: config.MAIL_FROM_NAME, address: config.MAIL_FROM || config.SMTP_USER! },
    replyTo: config.MAIL_REPLY_TO,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}
