import { describe, expect, it } from 'vitest';
import { maskPhone, normalizeEmail, normalizeWebsite, phoneDigits } from './contact.js';

describe('maskPhone', () => {
  it('groups a NANP number progressively as it is typed', () => {
    expect(maskPhone('5')).toBe('5');
    expect(maskPhone('555')).toBe('555');
    expect(maskPhone('5551')).toBe('(555) 1');
    expect(maskPhone('555123')).toBe('(555) 123');
    expect(maskPhone('5551234')).toBe('(555) 123-4');
    expect(maskPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('keeps a NANP number stable once it is already formatted', () => {
    // Re-masking its own output must be a no-op, or every keystroke fights the last one.
    expect(maskPhone('(555) 123-4567')).toBe('(555) 123-4567');
    expect(maskPhone(maskPhone('5551234567'))).toBe('(555) 123-4567');
  });

  it('reads eleven digits beginning with 1 as NANP with its country code', () => {
    expect(maskPhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('leaves an international number alone rather than inventing grouping', () => {
    // The point of the whole function: signup asks for a country, so not every number is
    // American, and forcing this into (49) 151-1234 would corrupt it.
    expect(maskPhone('+4915112345678')).toBe('+4915112345678');
    expect(maskPhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(maskPhone('+')).toBe('+');
  });

  it('leaves an unmarked long number as digits rather than forcing a shape', () => {
    expect(maskPhone('4915112345678')).toBe('4915112345678');
  });

  it('survives empty, spacing and junk', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('   ')).toBe('');
    expect(maskPhone('abc')).toBe('');
    expect(maskPhone('555-123-4567')).toBe('(555) 123-4567');
  });

  it('never exceeds the 40 characters the API accepts', () => {
    expect(maskPhone('+' + '9'.repeat(60)).length).toBeLessThanOrEqual(40 + 21);
    // The realistic worst case is what matters: a full international number.
    expect(maskPhone('+4915112345678').length).toBeLessThanOrEqual(40);
    expect(maskPhone('15551234567').length).toBeLessThanOrEqual(40);
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
