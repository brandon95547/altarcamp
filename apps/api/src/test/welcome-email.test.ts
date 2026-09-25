import type { SessionUser } from '@altar/shared';
import { describe, expect, it } from 'vitest';
import { welcomeEmail } from '../modules/auth/welcome-email.js';

const user: SessionUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'tamsin@example.com',
  legalName: 'Tamsin Oyelaran',
  role: 'artist',
  artistId: '00000000-0000-4000-8000-000000000002',
  artistName: '<b>Tamsin & "O"</b>',
  emailVerified: false,
  mfaRequired: false,
};

describe('welcome email', () => {
  const email = welcomeEmail(user, 'https://altar.skylanex.com/');

  it('goes to the new account, under an Altar.Camp subject', () => {
    expect(email.to).toBe('tamsin@example.com');
    expect(email.subject).toMatch(/^Welcome to Altar\.Camp/);
  });

  it('carries the account details and where to sign in', () => {
    for (const body of [email.text, email.html]) {
      expect(body).toContain('tamsin@example.com');
      expect(body).toContain('Tamsin Oyelaran');
      expect(body).toContain('https://altar.skylanex.com/login');
    }
    expect(email.text).toMatch(/^Hi Tamsin,/);
  });

  it('escapes what the artist typed before it goes into HTML', () => {
    expect(email.html).not.toContain('<b>Tamsin');
    expect(email.html).toContain('&lt;b&gt;Tamsin &amp; &quot;O&quot;&lt;/b&gt;');
    // The plain-text part is not HTML, so it keeps the name exactly as entered.
    expect(email.text).toContain('<b>Tamsin & "O"</b>');
  });

  it('never contains a password', () => {
    expect(email.text.toLowerCase()).not.toMatch(/password:/);
    expect(email.html.toLowerCase()).not.toMatch(/password<\/td>/);
  });
});
