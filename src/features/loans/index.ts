export {
  setAdvancedFilters,
  clearAdvancedFilters,
  selectAdvancedFilters,
  fetchLoanStages,
  selectLoanStages,
  selectLoanStageOptions,
} from './store/loanDashboardSlice';

export {
  fetchBankStages,
  selectBankStages,
  selectBankStageOptions,
} from './store/bankApplicationsSlice';

export { loanStagesService } from './api/loanStages.service';
export { getStageStyle, toStageFilterOptions } from './utils/stageStyles';
export { getStageCardIcon } from './utils/stageIcons';
export type { LoanStage, LoanStagesData, StageFilterOption, StageStyle } from './types/loanStages.types';

// The stage/archetype vocabulary is platform-level, not bank-portal-specific:
// the farmer's own list speaks it too. Exported from the barrel so other
// features consume it as a public API rather than reaching into these paths.
export { ARCHETYPES, archetypeOf, bucketStagesByArchetype, stageToStatusMeta, toPseudoStages, toStatusFilterOptions } from './utils/archetype';
export type { Archetype, ArchetypeCounts } from './utils/archetype';

