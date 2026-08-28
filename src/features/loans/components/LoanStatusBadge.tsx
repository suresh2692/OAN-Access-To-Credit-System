import { getStageStyle } from '../utils/stageStyles';
import { STATUS_CFG } from '../constants/loans.constants';

interface LoanStatusBadgeProps {
  status: string;
  label?: string;
}

/**
 * Renders a colored status pill badge for a loan application status or dynamic stage.
 */
function LoanStatusBadge({ status, label }: LoanStatusBadgeProps) {
  const displayLabel = label || status;
  const cfg = STATUS_CFG[status] ?? getStageStyle(displayLabel);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

export default LoanStatusBadge;

