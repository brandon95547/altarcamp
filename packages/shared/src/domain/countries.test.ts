import { describe, expect, it } from 'vitest';
import { COUNTRIES, countryByCode, countryByName } from './countries.js';

describe('COUNTRIES', () => {
  it('is the 249 ISO codes plus Kosovo, and nothing else', () => {
    expect(COUNTRIES).toHaveLength(250);
    expect(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code))).toBe(true);
  });

  it('lists no country twice', () => {
    // Enumerating every region ICU names produced two Frances, two Germanies and two
    // United Kingdoms, from deprecated codes (FX, DD, UK) aliased to living ones.
    const names = COUNTRIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const dead of ['DD', 'FX', 'UK', 'YU', 'SU', 'ZR', 'CS', 'AN', 'TP', 'BU']) {
      expect(countryByCode(dead)).toBeUndefined();
    }
  });

  it('is sorted by name, so the dropdown reads in order', () => {
    const names = COUNTRIES.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });

  it('stores "United States", the value the form has always defaulted to', () => {
    // artists.country holds names. If this string drifted, every existing row would stop
    // matching an option in the dropdown.
    expect(countryByCode('US')?.name).toBe('United States');
  });
});

describe('countryByName', () => {
  it('finds a stored name regardless of case', () => {
    expect(countryByName('united kingdom')?.code).toBe('GB');
    expect(countryByName('  United States ')?.code).toBe('US');
  });

  it('reads the ways people typed the US into the old free-text field', () => {
    for (const v of ['USA', 'US', 'U.S.', 'u.s.a.', 'United States of America', 'America']) {
      expect(countryByName(v)?.code).toBe('US');
    }
  });

  it('returns nothing rather than guessing', () => {
    expect(countryByName('')).toBeUndefined();
    expect(countryByName('Narnia')).toBeUndefined();
  });
});
