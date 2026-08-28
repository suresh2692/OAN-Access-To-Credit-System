import { TablePagination } from '@/components/ui/TablePagination';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import React from 'react';
import {
    selectActivityPage, selectPagedRows, selectPageSize, selectTotalCount, selectTotalPages,
    setActivityPage, setPageSize
} from '../store/loanDashboardSlice';

/**
 * Store-connected binding for the shared table footer. The bar itself lives in
 * components/ui/TablePagination so leads and loans can't drift apart again.
 */
const LoanPagination = React.memo(() => {
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectActivityPage);
  const totalPages = useAppSelector(selectTotalPages);
  const totalCount = useAppSelector(selectTotalCount);
  const pageSize = useAppSelector(selectPageSize);
  const rows = useAppSelector(selectPagedRows);

  return (
    <TablePagination
      visibleCount={rows.length}
      totalCount={totalCount}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      onPageChange={(page) => dispatch(setActivityPage(page))}
      onPageSizeChange={(size) => dispatch(setPageSize(size))}
    />
  );
});

LoanPagination.displayName = 'LoanPagination';
export default LoanPagination;
