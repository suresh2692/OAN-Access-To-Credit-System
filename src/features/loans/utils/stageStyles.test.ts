import { describe, expect, it } from 'vitest';
import { getStageStyle, toStageFilterOptions } from './stageStyles';
import type { LoanStage } from '../types/loanStages.types';

describe('stageStyles utility', () => {
  const mockStages: LoanStage[] = [
    {
      name: 'stage-1',
      bank: 'HDFC Bank',
      stage_id: 'LSS-0001',
      label: 'Submitted',
      archetype_state: 'In Transition',
      sequence: 1,
      external_code: 'SUBMITTED',
      description: 'Initial submission',
      application_count: 12,
      creation: '2026-01-01',
      modified: '2026-01-01',
    },
    {
      name: 'stage-2',
      bank: 'HDFC Bank',
      stage_id: 'LSS-0002',
      label: 'Verified',
      archetype_state: 'In Transition',
      sequence: 2,
      external_code: 'DOC_VERIF',
      description: 'Document verification',
      application_count: 8,
      creation: '2026-01-01',
      modified: '2026-01-01',
    },
    {
      name: 'stage-3',
      bank: 'HDFC Bank',
      stage_id: 'LSS-0003',
      label: 'Disbursed',
      archetype_state: 'Completed',
      sequence: 3,
      external_code: 'DISBURSED',
      description: 'Loan disbursed',
      application_count: 14,
      creation: '2026-01-01',
      modified: '2026-01-01',
    },
    {
      name: 'stage-4',
      bank: 'HDFC Bank',
      stage_id: 'LSS-0004',
      label: 'Rejected',
      archetype_state: 'Rejected',
      sequence: 4,
      external_code: 'REJECTED',
      description: 'Application rejected',
      application_count: 2,
      creation: '2026-01-01',
      modified: '2026-01-01',
    },
  ];

  it('correctly maps styles from dynamic stage list', () => {
    const submittedStyle = getStageStyle('Submitted', mockStages);
    expect(submittedStyle.label).toBe('Submitted');
    expect(submittedStyle.tone).toBe('info');

    const verifiedStyle = getStageStyle('Verified', mockStages);
    expect(verifiedStyle.label).toBe('Verified');
    expect(verifiedStyle.tone).toBe('info');

    const disbursedStyle = getStageStyle('Disbursed', mockStages);
    expect(disbursedStyle.label).toBe('Disbursed');
    expect(disbursedStyle.tone).toBe('success');

    const rejectedStyle = getStageStyle('Rejected', mockStages);
    expect(rejectedStyle.label).toBe('Rejected');
    expect(rejectedStyle.tone).toBe('danger');
  });

  it('matches by stage_id or external_code as well as label', () => {
    const byId = getStageStyle('LSS-0002', mockStages);
    expect(byId.label).toBe('Verified');

    const byCode = getStageStyle('DISBURSED', mockStages);
    expect(byCode.label).toBe('Disbursed');
    expect(byCode.tone).toBe('success');
  });

  it('falls back to keyword-based detection when stages list is empty or status is not found', () => {
    const granted = getStageStyle('Granted');
    expect(granted.tone).toBe('success');

    const declined = getStageStyle('Declined');
    expect(declined.tone).toBe('danger');

    const pending = getStageStyle('Pending');
    expect(pending.tone).toBe('neutral');
  });

  it('styles the archetype states the backend actually sends', () => {
    // ARCHETYPE_STATES in oan_a2c/a2c_marketplace/stages.py. 'Active' and
    // 'In Transition' had no entry, so both fell through to the generic default —
    // the same colour an unrecognised stage gets.
    expect(getStageStyle('In Transition').tone).toBe('info');
    expect(getStageStyle('Completed').tone).toBe('success');
    expect(getStageStyle('Rejected').tone).toBe('danger');
    expect(getStageStyle('Cancelled').tone).toBe('danger');

    // 'Active' is what create_loan_application stamps: nobody has acted on it, so
    // it must not read as work already in a bank's pipeline.
    const active = getStageStyle('Active');
    expect(active.tone).toBe('neutral');
    expect(active.tone).not.toBe(getStageStyle('In Transition').tone);
  });

  it('keeps each In Transition stage its own colour', () => {
    // Mapping 'In Transition' ahead of the label would collapse every pipeline
    // step a bank defines into one indistinguishable badge.
    const tones = ['Submitted', 'Verified', 'Disbursed', 'Rejected'].map(
      (label) => getStageStyle(label, mockStages).badge
    );
    expect(new Set(tones).size).toBe(4);
  });

  it('lets a terminal archetype outrank a misleading stage label', () => {
    // A bank names its own stages, so the label cannot be trusted over the
    // archetype: a step called "Approved" that sits in Rejected is a refusal.
    const approvedButRejected: LoanStage = {
      ...mockStages[0]!,
      stage_id: 'LSS-0099',
      label: 'Approved',
      archetype_state: 'Rejected',
      external_code: 'APPROVED_REJ',
    };

    const style = getStageStyle('Approved', [approvedButRejected]);
    expect(style.tone).toBe('danger');
  });

  it('falls back to the archetype when no label keyword matches', () => {
    // 'Processed' matches none of the label nuances, so the archetype decides.
    const processed: LoanStage = {
      ...mockStages[0]!,
      stage_id: 'LSS-0098',
      label: 'Processed',
      archetype_state: 'In Transition',
      external_code: 'PROCESSED',
    };

    expect(getStageStyle('Processed', [processed]).tone).toBe('info');
  });

  it('converts LoanStage array to FilterOptions', () => {
    const filterOptions = toStageFilterOptions(mockStages);
    expect(filterOptions).toHaveLength(4);
    expect(filterOptions[0]).toMatchObject({
      value: 'Submitted',
      label: 'Submitted',
      archetype_state: 'In Transition',
      sequence: 1,
      stage_id: 'LSS-0001',
      application_count: 12,
    });
    expect(filterOptions[2]).toMatchObject({
      value: 'Disbursed',
      label: 'Disbursed',
      archetype_state: 'Completed',
      sequence: 3,
      application_count: 14,
    });
  });
});
