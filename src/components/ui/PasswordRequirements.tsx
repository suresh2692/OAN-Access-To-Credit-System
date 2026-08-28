import { PASSWORD_RULES } from '@/lib/api/api.schemas';

interface PasswordRequirementsProps {
  password?: string;
}

/**
 * The live checklist under a password field.
 *
 * The rules come from the same list `strongPasswordSchema` is built from — a
 * local copy meant the checklist could go green on a password the validator
 * would still reject.
 */
export function PasswordRequirements({ password = '' }: PasswordRequirementsProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`text-xs font-medium ${met ? 'text-[#16A34A] dark:text-[#16A34A]' : 'text-gray-400'}`}
          >
            {met ? '✓' : '•'} {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
