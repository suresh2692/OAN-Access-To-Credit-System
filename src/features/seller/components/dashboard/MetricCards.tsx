'use client';

import { useCarouselScroll } from '@/hooks/useCarouselScroll';
import { CountingNumber } from '@/components/motion/CountingNumber';
import { MotionEffect } from '@/components/motion/MotionEffect';
import { CheckCircle2, FileCheck, FileText, LucideIcon, Package, Users } from 'lucide-react';

interface MetricCard {
  label: string;
  /** Kept as the raw prop value, so a non-numeric figure still renders as given. */
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface MetricCardsProps {
  pendingLabel?: string;
  pendingValue?: string;
  /** Applications filed — a farmer who applies three times counts three times. */
  totalApplications?: number;
  /** Distinct farmers behind those applications — that same farmer counts once. */
  totalApplicants?: number;
  activeProducts?: number;
  totalProducts?: number;
}

/**
 * Parses a figure for the counter. Returns null when the value isn't a plain
 * number — `pendingValue` is typed as a string and callers are free to pass
 * something like "—", which must be printed verbatim rather than counted to NaN.
 */
function asNumber(value: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MetricCards({
  pendingLabel = 'Pending Approvals',
  pendingValue,
  totalApplications = 0,
  totalApplicants = 0,
  activeProducts = 0,
  totalProducts = 0,
}: MetricCardsProps) {
  const metrics: MetricCard[] = [
    { label: 'Active Products', value: activeProducts.toString(), icon: CheckCircle2, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
    { label: 'Total Products', value: totalProducts.toString(), icon: Package, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
    { label: 'Total Applications', value: totalApplications.toString(), icon: FileText, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-500' },
    { label: 'Total Applicants', value: totalApplicants.toString(), icon: Users, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
    { label: pendingLabel, value: pendingValue ?? '0', icon: FileCheck, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  ];

  const { scrollRef, activeIndex, scrollTo } = useCarouselScroll({ enableWheelScroll: true });

  // Five cards: on xl and up they are a grid. On smaller screens, they are a snap-scrolling flex container.
  return (
    <div className="relative">

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .hide-scrollbar::-webkit-scrollbar-track { display: none !important; }
        .hide-scrollbar::-webkit-scrollbar-thumb { display: none !important; }
        .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
      <div
        ref={scrollRef}
        className="flex xl:grid xl:grid-cols-5 gap-4 xl:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar pb-2 xl:pb-1 px-1 xl:px-0"
      >
        {/* The animated element *is* the card — no wrapper. */}
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const numeric = asNumber(metric.value);
          return (
            <MotionEffect
              key={metric.label}
              delay={index * 70}
              slide={{ direction: 'up', offset: 14 }}
              className="group w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-center xl:snap-align-none bg-white border border-[#F1F3F4] rounded-xl p-5 flex items-center justify-between shadow-sm shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <div>
                <p className="text-[14px] font-semibold text-[#6B7280] mb-1">{metric.label}</p>
                <h4 className="text-[32px] font-bold text-[#1F2937] leading-none">
                  {numeric === null ? metric.value : <CountingNumber value={numeric} />}
                </h4>
              </div>
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md ${metric.iconBg}`}>
                <Icon size={32} className={`${metric.iconColor} transition-transform duration-300`} />
              </div>
            </MotionEffect>
          );
        })}
      </div>

      {/* Pagination Dots (Mobile & Tablet) */}
      <div className="flex xl:hidden justify-center items-center gap-2 mt-4">
        {[0, 1, 2].map((dotIndex) => {
          // Map the 5 active states to 3 dots:
          // Cards 0,1 -> Dot 0
          // Card 2    -> Dot 1
          // Cards 3,4 -> Dot 2
          const isActive =
            (dotIndex === 0 && activeIndex <= 1) ||
            (dotIndex === 1 && activeIndex === 2) ||
            (dotIndex === 2 && activeIndex >= 3);

          return (
            <button
              key={dotIndex}
              type="button"
              onClick={() => scrollTo(dotIndex * 2)}
              className={`transition-all duration-300 rounded-full ${isActive
                  ? 'bg-[#16A34A] w-6 h-2'
                  : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                }`}
              aria-label={`Go to page ${dotIndex + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
