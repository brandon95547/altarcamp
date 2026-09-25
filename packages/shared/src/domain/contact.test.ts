import { describe, expect, it } from 'vitest';
import { maskPhone, normalizeEmail, normalizeWebsite, phoneDigits } from './contact.js';

describe('maskPhone — United States', () => {
  const us = (v: string) => maskPhone(v, 'US');

  it('groups progressively as it is typed', () => {
    expect(us('5')).toBe('5');
    expect(us('555')).toBe('555');
    expect(us('5551')).toBe('(555) 1');
    expect(us('555123')).toBe('(555) 123');
    expect(us('5551234')).toBe('(555) 123-4');
    expect(us('5551234567')).toBe('(555) 123-4567');
  });

  it('is stable on its own output, or every keystroke fights the last one', () => {
    expect(us('(555) 123-4567')).toBe('(555) 123-4567');
    expect(us(us('5551234567'))).toBe('(555) 123-4567');
    expect(us('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
  });

  it('stops accepting digits where a US number ends', () => {
    expect(us('555123456789')).toBe('(555) 123-4567');
  });

  it('reads a leading 1 as the country code, from the first keystroke', () => {
    // No NANP area code starts with 1, so "1" is never the start of one. Without this the
    // field would render "(155) 5…" mid-typing and only correct itself at digit eleven.
    expect(us('1')).toBe('+1');
    expect(us('15')).toBe('+1 5');
    expect(us('1555')).toBe('+1 555');
    expect(us('15551234567')).toBe('+1 (555) 123-4567');
    expect(us('+1 555 123 4567')).toBe('+1 (555) 123-4567');
  });

  it('leaves another country code alone — a US resident with a foreign number', () => {
    expect(us('+4915112345678')).toBe('+4915112345678');
    expect(us('+')).toBe('+');
  });

  it('survives empty, spacing, junk and dashes', () => {
    expect(us('')).toBe('');
    expect(us('   ')).toBe('');
    expect(us('abc')).toBe('');
    expect(us('555-123-4567')).toBe('(555) 123-4567');
  });
});

describe('maskPhone — everywhere else', () => {
  it('keeps a national number exactly as it was typed', () => {
    // The old guess crushed this to "02079460958". Its spacing is the UK convention.
    expect(maskPhone('020 7946 0958', 'GB')).toBe('020 7946 0958');
    expect(maskPhone('+44 20 7946 0958', 'GB')).toBe('+44 20 7946 0958');
    expect(maskPhone('030-12345678', 'DE')).toBe('030-12345678');
  });

  it('does not impose the US shape, even on a ten-digit number', () => {
    expect(maskPhone('5551234567', 'CA')).toBe('5551234567');
    expect(maskPhone('5551234567', 'GB')).toBe('5551234567');
  });

  it('removes what is not a phone character, and nothing else', () => {
    expect(maskPhone('020 abc 7946', 'GB')).toBe('020 7946');
    expect(maskPhone('+44+20', 'GB')).toBe('+4420');
    expect(maskPhone('  020  7946', 'GB')).toBe('020 7946');
  });

  it('lets a trailing space through, because the next group is coming', () => {
    expect(maskPhone('020 ', 'GB')).toBe('020 ');
  });

  it('treats an unknown country as not the US', () => {
    expect(maskPhone('5551234567')).toBe('5551234567');
    expect(maskPhone('5551234567', null)).toBe('5551234567');
    expect(maskPhone('5551234567', 'ZZ')).toBe('5551234567');
  });

  it('never exceeds the 40 characters the API accepts', () => {
    expect(maskPhone('1'.repeat(80), 'GB').length).toBeLessThanOrEqual(40);
    expect(maskPhone('+' + '9'.repeat(80), 'US').length).toBeLessThanOrEqual(40);
  });
});

describe('phoneDigits', () => {
  it('reduces two spellings of one number to the same thing', () => {
    expect(phoneDigits('(555) 123-4567')).toBe(phoneDigits('555.123.4567'));
  });
});

describe('normalizeEmail', () => {
  it('trims and folds case so one person reaches one account', () => {
    expect(normalizeEmail('  Sam@Example.COM ')).toBe('sam@example.com');
  });

  it('survives empty', () => {
    expect(normalizeEmail('')).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });
});

describe('normalizeWebsite', () => {
  it('adds a scheme, because a bare host in an href is a relative path', () => {
    expect(normalizeWebsite('altar.camp')).toBe('https://altar.camp');
    expect(normalizeWebsite('  www.example.com/artist ')).toBe('https://www.example.com/artist');
  });

  it('leaves an existing scheme exactly as typed', () => {
    expect(normalizeWebsite('https://example.com')).toBe('https://example.com');
    // Not upgraded: their host may not serve TLS, and breaking the link is worse.
    expect(normalizeWebsite('http://example.com')).toBe('http://example.com');
    expect(normalizeWebsite('mailto:sam@example.com')).toBe('mailto:sam@example.com');
  });

  it('survives empty', () => {
    expect(normalizeWebsite('')).toBe('');
    expect(normalizeWebsite('   ')).toBe('');
  });
});
