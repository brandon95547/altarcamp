import { ALTAR_PROMISE, type SessionUser } from '@altar/shared';
import type { Email } from '../../lib/mailer.js';

/**
 * Email clients support neither CSS variables nor web fonts reliably, so the theme's values
 * are written out here: ink-950, ink-700, ink-200, ink-50 and ember-600 from theme.css.
 */
const INK_950 = '#1b1917';
const INK_700 = '#544d43';
const INK_200 = '#e5e1da';
const INK_50 = '#faf9f7';
const EMBER_600 = '#c2621b';
const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sent once, when an artist creates an account: the details they signed up with, where to
 * sign in, and what comes next. Never the password — it is not ours to send, and a mailbox is
 * not somewhere a password should live.
 */
export function welcomeEmail(user: SessionUser, webUrl: string): Email {
  const firstName = user.legalName.trim().split(/\s+/)[0] ?? user.legalName;
  const signInUrl = `${webUrl.replace(/\/+$/, '')}/login`;
  const details: [string, string][] = [
    ['Name', user.legalName],
    ['Artist name', user.artistName ?? '—'],
    ['Sign-in email', user.email],
  ];
  const next =
    'Finish your profile, tell us about any agreements you already have, then take the five-minute orientation. Nothing asks you to choose a path or agree a percentage before that.';
  const safety =
    'We will never email you your password, and nobody from Altar.Camp will ever ask for it. If you did not create this account, reply to this email and we will close it.';

  const text = [
    `Hi ${firstName},`,
    '',
    'Your Altar.Camp account is ready.',
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `Sign in any time at ${signInUrl}`,
    '',
    'What happens next',
    next,
    '',
    safety,
    '',
    'Altar.Camp',
    ALTAR_PROMISE.join(' '),
  ].join('\n');

  const rows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:${INK_700};white-space:nowrap;">${label}</td>` +
        `<td style="padding:6px 0;color:${INK_950};font-weight:600;word-break:break-word;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Welcome to Altar.Camp</title>
</head>
<body style="margin:0;padding:0;background:${INK_50};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK_50};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${INK_200};border-radius:16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK_700};">
<tr><td style="padding:32px;">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:${INK_950};">Altar<span style="color:${EMBER_600};">.</span>Camp</p>
<p style="margin:0 0 8px;font-size:24px;font-weight:800;line-height:1.2;color:${INK_950};">Your account is ready.</p>
<p style="margin:0 0 20px;">Hi ${escapeHtml(firstName)}, welcome to Altar.Camp. These are the details you signed up with:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:15px;">${rows}</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="border-radius:8px;background:${EMBER_600};">
<a href="${escapeHtml(signInUrl)}" style="display:inline-block;padding:12px 24px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to Altar.Camp</a>
</td></tr></table>
<p style="margin:0 0 4px;font-weight:700;color:${INK_950};">What happens next</p>
<p style="margin:0 0 20px;">${next}</p>
<p style="margin:0;padding-top:20px;border-top:1px solid ${INK_200};font-size:14px;">${safety}</p>
</td></tr>
</table>
<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;color:${INK_700};">${escapeHtml(ALTAR_PROMISE.join(' '))}</p>
</td></tr>
</table>
</body>
</html>`;

  return {
    to: user.email,
    subject: 'Welcome to Altar.Camp — your account is ready',
    text,
    html,
  };
}
