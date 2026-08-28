/**
 * Single source of truth for "has this farmer's consent been approved".
 *
 * This used to be reimplemented independently in three components
 * (ConsentFinalizationSection, ConsentManagementSection, CreditInformation)
 * plus a fourth, slightly different copy inside the consent slice reducer —
 * the reducer's copy had already drifted, missing the `consentDate` fallback
 * clause the other three carried. Route every check through here instead.
 */
export interface ConsentApprovalInput {
  consent_request_status?: string | null | undefined;
  farmer_profile_created?: boolean | null | undefined;
  firstName?: string | null | undefined;
}

export function isConsentApproved(
  details: ConsentApprovalInput | null | undefined,
  consentDate?: string | null | undefined,
): boolean {
  return (
    details?.consent_request_status === 'Approved' ||
    (details?.farmer_profile_created === true && !!details?.firstName) ||
    !!consentDate
  );
}
