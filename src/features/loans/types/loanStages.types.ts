import type { LoanStage, LoanStagesData } from '@/lib/api/api.schemas';

export type { LoanStage, LoanStagesData };

export interface StageStyle {
  badge: string;
  dot: string;
  color: string;
  tone: 'success' | 'info' | 'danger' | 'neutral';
}

export interface StageFilterOption {
  value: string;
  label: string;
  color: string;
  dot: string;
  archetype_state?: string;
  sequence?: number;
  stage_id?: string;
  application_count?: number;
}
