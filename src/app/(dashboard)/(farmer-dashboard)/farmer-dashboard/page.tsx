'use client';

import { DiscoverLoansCta } from '@/components/DiscoverLoansCta';
import { MotionEffects } from '@/components/motion/MotionEffect';
import { PanelLoader } from '@/components/ui/Loader';
import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import AvailableLoanTypes from './components/AvailableLoanTypes';
import FarmerProfileCard from './components/FarmerProfileCard';
import RecentApplicationsList from './components/RecentApplicationsList';
import TopLoanOffersCard from './components/TopLoanOffersCard';
import { rankTopOffers, TOP_OFFER_CANDIDATE_LIMIT, TOP_OFFER_COUNT, type TopOffer } from './components/topOffers';
import { getCatalog, getDashboardSummary } from '@/features/(farmer-application)/api/farmerApi';
import type { FarmerDashboardSummary } from '@/features/(farmer-application)/types';

export default function FarmerDashboard() {
  const [data, setData] = useState<FarmerDashboardSummary | null>(null);
  const [offers, setOffers] = useState<TopOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const [summaryResult, catalogResult] = await Promise.allSettled([
          getDashboardSummary(),
          // Ranked here rather than server-side: `get_dashboard_summary` has
          // never sent `top_loan_offers`, so the fallback below was always the
          // real code path, and it was ordering by `newest` — the most recently
          // published loan is not the best one. `interest_low_high` shares its
          // primary sort key with `rankTopOffers`, so this asks the catalogue
          // for the cheapest candidates and settles the ties on the client.
          getCatalog({ sort_by: 'interest_low_high', limit: TOP_OFFER_CANDIDATE_LIMIT }),
        ]);

        if (!isMounted) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value.data) {
          setData(summaryResult.value.data);
          if (summaryResult.value.data.top_loan_offers?.length) {
            // Sliced here as well as in `rankTopOffers`: the carousel's length
            // cap is the component's own constraint, not the ranking's, so it
            // has to hold on whatever the endpoint sends the day it starts
            // sending its own list.
            setOffers(summaryResult.value.data.top_loan_offers.slice(0, TOP_OFFER_COUNT));
          }
        } else if (summaryResult.status === 'rejected') {
          logger.error('Failed to load dashboard summary', summaryResult.reason);
        }

        // Still deferential to the endpoint: if it ever does start sending its
        // own ranked offers, those win and this ranking stands down.
        if (catalogResult.status === 'fulfilled' && catalogResult.value.data?.products) {
          const products = catalogResult.value.data.products;
          if (products.length > 0) {
            setOffers((existing) => (existing.length > 0 ? existing : rankTopOffers(products)));
          }
        } else if (catalogResult.status === 'rejected') {
          logger.error('Failed to load loan products from catalog', catalogResult.reason);
        }
      } catch (error) {
        logger.error('Unexpected error loading farmer dashboard data', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <PanelLoader label="Loading your dashboard…" />;
  }

  return (
    <div className="space-y-6">
      {/* Each row arrives just after the one above it. `MotionEffects` gives each
          child its own wrapper, so they stay direct children of this container
          and `space-y-6` keeps applying between them. */}
      <MotionEffects slide={{ direction: 'up', offset: 12 }} stagger={80}>
        {/* Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FarmerProfileCard profile={data?.farmer_profile} />
          </div>
          <div className="lg:col-span-1">
            <TopLoanOffersCard offers={offers} />
          </div>
        </div>

        {/* The way into the catalogue. Sits directly under the loan types so the
            row that shows what is on offer is followed by the way to browse it. */}
        <DiscoverLoansCta href="/discover-loans" />

        {/* Middle Row */}
        <AvailableLoanTypes types={data?.available_loan_types || []} />

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <RecentApplicationsList applications={data?.recent_applications || []} />
          </div>
        </div>
      </MotionEffects>
    </div>
  );
}
