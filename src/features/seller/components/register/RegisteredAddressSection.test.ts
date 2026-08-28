import { describe, expect, it } from 'vitest';
import type { RegisterBankPayload } from '../../types/onboarding.types';

describe('Registration payload - Zone and Region replacement & constraints', () => {
  it('constructs a valid bank registration payload with registered_zone and registered_region', () => {
    const payload: RegisterBankPayload = {
      bank_name: 'Commercial Bank of Ethiopia S.C.',
      brand_name: 'CBE AgriCredit',
      entity_type: 'Bank',
      bank_code: 'CBE-001',
      registered_street: 'Bole Road, Tower 2',
      registered_zone: 'Bole Zone',
      registered_region: 'Addis Ababa',
      registered_country: 'Ethiopia',
      registered_postal_code: '1000',
      registered_email: 'support@cbe.com.et',
      registered_phone: '+251911223344',
      website: 'https://www.combanketh.et',
    };

    expect(payload.registered_zone).toBe('Bole Zone');
    expect(payload.registered_region).toBe('Addis Ababa');
    expect(payload.registered_postal_code.length).toBeLessThanOrEqual(10);
  });
});
