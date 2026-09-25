/**
 * Contact details, normalised.
 *
 * Pure string work, so it sits here rather than in the web app: the API wants the same
 * reading of an email when it looks an account up that the form used when it created one,
 * and a mask that only exists in a component cannot be shared or tested.
 */

/**
 * A phone number, formatted as it is typed.
 *
 * DELIBERATELY NOT A US-ONLY MASK. Signup asks for a country and Altar is signing artists
 * who are not all in one, so forcing `(555) 123-4567` onto a number from Berlin is not a
 * convenience, it is corruption of the field. The rule:
 *
 *   - anything the user marked international with a leading `+` keeps it, and keeps its
 *     own digits, ungrouped — we do not invent spacing for a plan we cannot identify
 *   - ten digits or fewer with no `+` is read as NANP and grouped progressively
 *   - eleven digits starting with 1 is NANP with its country code
 *   - anything longer, unmarked, is almost certainly a country code typed without its `+`,
 *     and is left as digits rather than forced into a shape it is not
 *
 * The server stores whatever this produces (`phone` is a free string capped at 40), so the
 * mask is presentation and never a gate on what someone can enter.
 */
export function maskPhone(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';

  const international = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return international ? '+' : '';

  if (international) return `+${digits}`;
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits;
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
