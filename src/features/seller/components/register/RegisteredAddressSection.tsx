import { POSTAL_CODE_MAX_LENGTH } from '@/features/seller/constants/field-limits';
import { FormCard } from './FormCard';
import { InputField } from './InputField';

export interface RegisteredAddressFields {
  registered_street: string;
  registered_zone: string;
  registered_region: string;
  registered_country: string;
  registered_postal_code: string;
  website: string;
}

interface RegisteredAddressSectionProps {
  fields: RegisteredAddressFields;
  onChange: (fields: Partial<RegisteredAddressFields>) => void;
  errors?: Record<string, string>;
}

export function RegisteredAddressSection({ fields, onChange, errors = {} }: RegisteredAddressSectionProps) {
  return (
    <FormCard title="Registered Address" bodyClassName="space-y-5">
      <InputField
        label="Street address"
        required
        placeholder="Enter Street address"
        value={fields.registered_street}
        onChange={(e) => onChange({ registered_street: e.target.value })}
        error={errors.registered_street}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField
          label="Kebele / Village"
          placeholder="Enter Kebele / Village"
        />
        <InputField
          label="Woreda / District"
          placeholder="Enter Woreda / District"
        />
        <InputField
          label="Zone"
          required
          placeholder="Enter Zone"
          value={fields.registered_zone}
          onChange={(e) => onChange({ registered_zone: e.target.value })}
          error={errors.registered_zone}
        />
        <InputField
          label="Region"
          required
          placeholder="Enter Region"
          value={fields.registered_region}
          onChange={(e) => onChange({ registered_region: e.target.value })}
          error={errors.registered_region}
        />
        <InputField
          label="Country"
          required
          placeholder="Enter Country"
          value={fields.registered_country}
          onChange={(e) => onChange({ registered_country: e.target.value })}
          error={errors.registered_country}
        />
        <InputField
          label="Postal code"
          required
          placeholder="Enter Postal code"
          maxLength={POSTAL_CODE_MAX_LENGTH}
          value={fields.registered_postal_code}
          onChange={(e) => onChange({ registered_postal_code: e.target.value })}
          error={errors.registered_postal_code}
        />
        <InputField
          label="Website"
          type="text"
          placeholder="Enter Website"
          hint="Your website - used as your network address - can be added later"
          value={fields.website}
          onChange={(e) => onChange({ website: e.target.value })}
          error={errors.website}
        />
      </div>
    </FormCard>
  );
}
