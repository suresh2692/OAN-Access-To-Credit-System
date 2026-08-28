// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectOfficerName } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import { memo } from 'react';

const LoanDashboardHeader = memo(() => {
  const officerName = useAppSelector(selectOfficerName);

  return (
    <header className="flex flex-col mb-4 bg-white p-5 sm:p-8 rounded-xl border border-gray-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {officerName || 'Abebe'}
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">Manage, filter and process the loan applications pipeline.</p>
      </div>
    </header>
  );
});

LoanDashboardHeader.displayName = 'LoanDashboardHeader';
export default LoanDashboardHeader;
