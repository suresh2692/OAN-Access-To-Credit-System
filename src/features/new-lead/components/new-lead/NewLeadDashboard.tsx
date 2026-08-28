'use client';

// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { LeadLayoutGrid } from '@/features/leads/components/LeadLayoutGrid';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { useLeadInitialization } from '@/features/leads/hooks/useLeadInitialization';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectLeads } from '@/features/leads/store/leadSlice';
import {
    fetchActivitiesThunk, fetchLeadDetailsThunk, fetchLeadMetadataThunk, fetchLeadProfileThunk, fetchVisitSchedulesThunk, selectDetailsError, selectFarmerState, selectLeadFirstName,
    selectLeadLastName, selectLeadPhoneNumber, selectLeadStatus, selectVisitState
} from '@/features/new-lead';
import { ActivitySection } from '@/features/new-lead/components/ActivitySection';
import { CallDetailsSection } from '@/features/new-lead/components/CallDetailsSection';
import { ConsentFinalizationSection, ConsentManagementSection, selectConsentState } from '@/features/consent';
import { CreditInformationSection } from '@/features/new-lead/components/CreditInformationSection';
import { FarmerDetailsSection } from '@/features/new-lead/components/FarmerDetailsSection';
import { InteractionTimelineCard } from '@/features/new-lead/components/InteractionTimelineCard';
import { LeadAssignmentCard } from '@/features/new-lead/components/LeadAssignmentCard';
import LeadContextBanner from '@/features/new-lead/components/LeadContextBanner';
import { LeadDashboardActions } from '@/features/new-lead/components/LeadDashboardActions';
import { LeadInfoSection } from '@/features/new-lead/components/LeadInfoSection';
import { ScheduleVisitCard } from '@/features/new-lead/components/ScheduleVisitCard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { notFound } from 'next/navigation';
import { useEffect } from 'react';

interface NewLeadDashboardProps {
    id?: string;
}

export function NewLeadDashboard({ id }: NewLeadDashboardProps) {
    const dispatch = useAppDispatch();
    useLeadInitialization(id);

    useEffect(() => {
        dispatch(fetchLeadMetadataThunk());
        if (id) {
            dispatch(fetchLeadDetailsThunk(id));
            dispatch(fetchVisitSchedulesThunk(id));
            dispatch(fetchLeadProfileThunk(id));
            dispatch(fetchActivitiesThunk(id));
        }
    }, [dispatch, id]);

    const detailsError = useAppSelector(selectDetailsError);
    const leads = useAppSelector(selectLeads);
    const leadStatus = useAppSelector(selectLeadStatus);
    const { farmerDetails } = useAppSelector(selectFarmerState);
    const { visitSchedule } = useAppSelector(selectVisitState);
    const { isOtpVerified, consentDate } = useAppSelector(selectConsentState);
    const leadPhoneNumber = useAppSelector(selectLeadPhoneNumber);
    const leadFirstName = useAppSelector(selectLeadFirstName);
    const leadLastName = useAppSelector(selectLeadLastName);

    // A 403 on a specific lead is rendered as not-found so the existence of a
    // record the user can't access isn't confirmed (vs. an Access Denied screen,
    // which we reserve for feature/role-level denials). Placed after all hooks
    // to keep hook order stable across renders.
    if (id && detailsError === 'FORBIDDEN') {
        notFound();
    }

    const currentLead = id ? leads.find(l => l.id.replace('#', '') === id.replace('#', '')) : null;
    const hasScheduledVisit = Boolean(currentLead?.visitDate) || Boolean(visitSchedule?.id);

    const titleBanner = id ? (
        <LeadContextBanner
            leadId={`#${id}`}
            actionType="view"
            farmerName={leadFirstName ? `${leadFirstName} ${leadLastName}` : undefined}
            location={farmerDetails?.location || undefined}
            phoneNumber={leadPhoneNumber || undefined}
            status={leadStatus}
            actions={<LeadDashboardActions leadId={`#${id}`} status={leadStatus} />}
        />
    ) : (
        <div className="flex flex-row justify-between items-center p-6 w-full bg-white border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col items-start gap-1">
                <h1 className="font-roboto font-bold text-2xl leading-8 text-[#111827]">
                    Create New Lead
                </h1>
                <p className="font-roboto font-normal text-sm leading-5 text-[#6B7280]">
                    Manually enter lead details to begin the qualification process.
                </p>
            </div>
        </div>
    );

    const sidebar = (
        <>
            <ScheduleVisitCard
                isScheduled={hasScheduledVisit}
                visitDate={visitSchedule?.date || undefined}
                location={visitSchedule?.location || undefined}
            />
            {id && <LeadAssignmentCard />}
            {id && <InteractionTimelineCard />}
        </>
    );

    return (
        <LeadLayoutGrid titleBanner={titleBanner} sidebar={sidebar} isViewMode={Boolean(id)}>
            <LeadInfoSection />
            <ConsentManagementSection />
            {isOtpVerified && !consentDate && !farmerDetails?.farmer_profile_created && <ConsentFinalizationSection />}
            <FarmerDetailsSection />
            <CreditInformationSection />
            <CallDetailsSection />
            <ActivitySection />
        </LeadLayoutGrid>
    );
}
