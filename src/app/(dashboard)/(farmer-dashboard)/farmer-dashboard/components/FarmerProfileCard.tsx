'use client';

import { selectOfficerName } from '@/features/auth/store/authSlice';
import type { FarmerDashboardProfile } from '@/features/(farmer-application)/types';
import { useAppSelector } from '@/store/hooks';
import { Activity, AlertCircle, CheckCircle2, Leaf, MapPin } from 'lucide-react';

/** First and last initial of a display name, matching the header's avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FM';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase() || 'FM';
}

// The shape is owned by the feature's types module, which mirrors what
// get_dashboard_summary returns — a local copy would drift the moment a field
// is added or dropped on A2C Farmer Profile.
//
// `profile | undefined` rather than a bare optional: exactOptionalPropertyTypes
// distinguishes an omitted prop from one explicitly passed as undefined, and the
// dashboard passes `data?.farmer_profile`, which is the latter.
export default function FarmerProfileCard({
  profile,
}: {
  profile?: FarmerDashboardProfile | undefined;
}) {
  // The name on the account, which is not the name on the profile.
  // get_dashboard_summary finds A2C Farmer Profile by `user`, and most farmers
  // have none bound until a consent creates one — so for them this is the only
  // name the dashboard has, and without it the heading rendered empty.
  const accountName = useAppSelector(selectOfficerName);

  // `{}` is what the endpoint sends for a farmer with no bound profile, and `{}`
  // is truthy — so the `if (!profile) return null` that used to stand here never
  // fired for the case it was written for. The card rendered anyway: blank
  // heading, "FM" avatar, and a Verified badge sitting over no data at all.
  // What makes a profile real is having something in it, not being non-null.
  const hasProfile =
    !!profile &&
    Object.values(profile).some((value) => value !== null && value !== undefined && value !== '');

  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  // Falls back rather than blanks, but never invents: every candidate here is a
  // real stored value, and 'Farmer' is a role, not a name.
  const fullName = profileName || accountName || 'Farmer';
  const initials = initialsOf(fullName);
  // Most specific place first: a kebele means more to a farmer than their region.
  const location = [profile?.kebele, profile?.woreda, profile?.region].filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F1F3F4] p-6 flex flex-col md:flex-row gap-5 items-start h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden z-0">

      {/* Decorative colored design filling the blank space */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-green-50/80 to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-green-100 rounded-full blur-3xl opacity-70 -z-10 pointer-events-none"></div>
      <div className="absolute -bottom-8 -left-12 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-60 -z-10 pointer-events-none"></div>

      {/* Avatar */}
      <div className="w-[72px] h-[72px] rounded-full bg-[#F3F4F6] text-[#374151] font-bold text-xl flex items-center justify-center shrink-0">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col w-full">

        {/* Name and status badge. The badge tracks whether a profile is actually
            bound: "Verified" over an empty profile is the card asserting the one
            thing the farmer has not done yet. */}
        <div className="flex items-center gap-3 mb-1.5">
          <h2 className="text-[22px] font-bold text-[#111827]">{fullName}</h2>
          {hasProfile ? (
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              Profile incomplete
            </span>
          )}
        </div>

        {/* ID and Location. Every value below is a stored A2C Farmer Profile field;
            a pill is omitted when the field is empty rather than defaulted, so the
            card never asserts something the profile does not say. */}
        <div className="flex flex-wrap items-center gap-4 text-[14px] text-[#6B7280] font-medium mb-4">
          {profile?.farmer_id && (
            <span>Farmer ID: <span className="font-bold text-[#4B5563]">{profile.farmer_id}</span></span>
          )}
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#16A34A]" />
              {location}
            </span>
          )}
          {!hasProfile && (
            <span>Your details appear here once you complete a loan application.</span>
          )}
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-4 mt-4">
          {profile?.farmland_size_hectares != null && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#86EFAC] bg-[#F0FDF4] text-[#15803D] text-[15px] font-bold transition-colors hover:bg-[#DCFCE7] shadow-sm">
              <MapPin className="w-5 h-5" />
              <span>Land: {profile.farmland_size_hectares} ha</span>
            </div>
          )}

          {profile?.land_ownership_status && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#86EFAC] bg-[#F0FDF4] text-[#15803D] text-[15px] font-bold transition-colors hover:bg-[#DCFCE7] shadow-sm">
              <Leaf className="w-5 h-5" />
              <span>{profile.land_ownership_status}</span>
            </div>
          )}

          {profile?.source_of_income && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#86EFAC] bg-[#F0FDF4] text-[#15803D] text-[15px] font-bold transition-colors hover:bg-[#DCFCE7] shadow-sm">
              <Activity className="w-5 h-5" />
              <span>{profile.source_of_income}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
