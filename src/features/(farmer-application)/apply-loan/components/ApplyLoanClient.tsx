'use client';

import { Loader } from '@/components/ui/Loader';
import { logger } from '@/lib/logger';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getProduct } from '../../api/farmerApi';
import ApplicationHeader from './ApplicationHeader';
import ConsentManagement from './ConsentManagement';
import CreditInformation from './CreditInformation';
import type { DetailedLoanProduct } from '../../types';

interface ApplyLoanClientProps {
  productId: string;
}

export default function ApplyLoanClient({ productId }: ApplyLoanClientProps) {
  // Loan product state
  const [loanProduct, setLoanProduct] = useState<DetailedLoanProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setIsLoadingProduct(true);
      setLoadFailed(false);
      try {
        const res = await getProduct(productId);
        const product = res.data?.product;
        if (!isMounted) return;
        if (product) {
          setLoanProduct(product);
        } else {
          // An id that matches nothing in the catalog — archived, withdrawn, or
          // simply mistyped. Not an error to log, but not a page to continue on.
          setLoadFailed(true);
        }
      } catch (e) {
        logger.error('Failed to load loan product details', e);
        if (isMounted) setLoadFailed(true);
      } finally {
        if (isMounted) setIsLoadingProduct(false);
      }
    };
    fetchProduct();
    return () => { isMounted = false; };
  }, [productId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="w-full max-w-4xl mx-auto">
        <Link href="/discover-loans" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {isLoadingProduct ? (
          <div className="mb-6 p-6 bg-white rounded-2xl flex items-center justify-center min-h-[160px] border border-[#F1F3F4]">
            <Loader label="Loading loan details…" />
          </div>
        ) : loanProduct ? (
          <>
            <ApplicationHeader loan={loanProduct} />

            <div className="flex flex-col gap-6 mt-6">
              <ConsentManagement />
              <CreditInformation product={loanProduct} />
            </div>
          </>
        ) : (
          /* The consent and credit-information steps used to render even when the
             product never loaded, so a farmer could hand over consent and credit
             data against a loan the page could not name — and the application
             that step creates needs the product id this page failed to resolve. */
          <div className="p-8 bg-white rounded-2xl border border-[#F1F3F4] flex flex-col items-center text-center gap-3">
            <div className="bg-red-50 rounded-full w-14 h-14 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">We could not open this loan</h2>
            <p className="text-[15px] text-gray-500 max-w-sm leading-relaxed">
              {loadFailed
                ? 'This loan product is no longer available, or it could not be loaded just now.'
                : 'This loan product is no longer available.'}
            </p>
            <Link
              href="/discover-loans"
              className="mt-2 bg-[#16A34A] hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Browse loans
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
