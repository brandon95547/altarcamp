/**
 * Contact details, normalised.
 *
 * Pure string work, so it sits here rather than in the web app: the API wants the same
 * reading of an email when it looks an account up that the form used when it created one,
 * and a mask that only exists in a component cannot be shared or tested.
 */

/**
 * A phone number, masked for the country it belongs to.
 *
 * The country decides, because the form asks for one. The previous version guessed from
 * the digits — ten or fewer read as American — which meant a UK number typed as
 * "020 7946 0958" was crushed to "02079460958" and a short number from anywhere was
 * wrapped in American parentheses. Knowing the country removes the guess.
 *
 * United States: a real mask. NANP grouping, applied as it is typed, and capped at ten
 * digits so the field stops accepting input where a US number ends. A leading 1 is always
 * the country code — no NANP area code starts with 1 — so it becomes "+1 " rather than
 * being read as the first digit of the area code. A leading "+" with any other code is
 * left alone: that is a US resident giving a foreign number, and the escape hatch.
 *
 * Everywhere else: NOT reformatted. There are dozens of national conventions and none of
 * them is ours to impose; the number is kept exactly as typed, minus anything that is not a
 * phone character. An unknown country is treated as "everywhere else" — imposing the US
 * shape without knowing the country is what this function stopped doing.
 *
 * The API stores whatever this returns (`phone` is a free string capped at 40), so the mask
 * is presentation and never a gate.
 */
export function maskPhone(input: string, countryCode?: string | null): string {
  return countryCode?.toUpperCase() === 'US' ? maskUsPhone(input) : sanitizePhone(input);
}

function maskUsPhone(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';

  const plus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (plus && !digits.startsWith('1')) return `+${digits}`.slice(0, 40);

  let prefix = '';
  if (digits.startsWith('1')) {
    prefix = '+1 ';
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (!digits) return prefix ? '+1' : plus ? '+' : '';
  if (digits.length <= 3) return `${prefix}${digits}`;
  if (digits.length <= 6) return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function sanitizePhone(input: string): string {
  let s = (input ?? '').replace(/^\s+/, '');
  s = s.replace(/[^\d+\-\s().]/g, '');
  s = s.replace(/(?!^)\+/g, '');
  // Doubled spaces collapse, but a single trailing one survives: someone typing
  // "020 " is about to type the next group, and trimming it would fight them.
  s = s.replace(/\s{2,}/g, ' ');
  return s.slice(0, 40);
}

/** The digits behind a masked number, for comparing two numbers written differently. */
export function phoneDigits(input: string): string {
  return (input ?? '').replace(/\D/g, '');
}

/**
 * An email as it should be stored.
 *
 * Applied on BLUR rather than on every keystroke: lowercasing under the cursor makes the
 * field feel broken while someone is still typing, and the only thing that matters is what
 * is submitted.
 *
 * The local part of an address is technically case-sensitive and effectively never is —
 * every provider Altar will meet folds it — and an artist who signs up as `Sam@` and later
 * types `sam@` must reach their own contracts.
 */
export function normalizeEmail(input: string): string {
  return (input ?? '').trim().toLowerCase();
}

/**
 * A website as typed, made into something a browser will open.
 *
 * `altar.camp` in an href is a relative path, so a profile link typed without a scheme
 * points at a page on this site that does not exist. Anything already carrying a scheme is
 * left exactly as it is, including `http://` — upgrading someone's link to a scheme their
 * host may not serve is not ours to do.
 */
export function normalizeWebsite(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  // A bare "mailto:" or similar scheme without slashes is left alone too.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  return `https://${raw}`;
}
