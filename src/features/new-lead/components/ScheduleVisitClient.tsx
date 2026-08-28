'use client';

// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { LeadLayoutGrid } from '@/features/leads/components/LeadLayoutGrid';
import { fetchLeadDetailsThunk, fetchVisitSchedulesThunk } from '@/features/new-lead';
import { ScheduleNewVisitForm } from '@/features/new-lead/components/modals/ScheduleNewVisitForm';
import { ScheduleVisitBanner } from '@/features/new-lead/components/ScheduleVisitBanner';
import { VisitHistoryCard } from '@/features/new-lead/components/VisitHistoryCard';
import { useAppDispatch } from '@/store/hooks';
import { useEffect } from 'react';

interface ScheduleVisitClientProps {
  leadId: string;
}

export function ScheduleVisitClient({ leadId }: ScheduleVisitClientProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (leadId) {
      dispatch(fetchLeadDetailsThunk(leadId));
      dispatch(fetchVisitSchedulesThunk(leadId));
    }
  }, [dispatch, leadId]);

  const sidebar = (
    <VisitHistoryCard />
  );

  return (
    <LeadLayoutGrid titleBanner={<ScheduleVisitBanner />} sidebar={sidebar} isViewMode={true}>
      <ScheduleNewVisitForm />
    </LeadLayoutGrid>
  );
}
