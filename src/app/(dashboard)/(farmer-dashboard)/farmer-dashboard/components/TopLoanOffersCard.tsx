'use client';
import { toProxiedFileUrl } from '@/lib/utils';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TopOffer } from './topOffers';

export type { TopOffer };

const FALLBACK_COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-orange-100 text-orange-800 border-orange-200',
];

function getBankColorClass(bankName: string): string {
  let hash = 0;
  for (let i = 0; i < bankName.length; i++) {
    hash = (hash << 5) - hash + bankName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_COLOR_PALETTES.length;
  return FALLBACK_COLOR_PALETTES[index] ?? 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

function getBankInitials(bankName: string): string {
  const words = bankName.trim().split(/\s+/).filter(Boolean);
  const firstWord = words[0];
  if (!firstWord) return 'BK';
  const secondWord = words[1];
  if (!secondWord) return firstWord.slice(0, 2).toUpperCase();
  const firstChar = firstWord[0] ?? '';
  const secondChar = secondWord[0] ?? '';
  return (firstChar + secondChar).toUpperCase() || 'BK';
}

export default function TopLoanOffersCard({ offers = [] }: { offers?: TopOffer[] | undefined }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  // The carousel advances on its own, which is fine to watch and hostile to
  // click: an offer can slide out from under the pointer mid-reach, and the
  // farmer lands on a loan they were not looking at. Hovering or focusing holds
  // it still — now that a slide is a link, that is the difference between a
  // carousel and a trap.
  const [isPaused, setIsPaused] = useState(false);

  // Automatic scrolling
  useEffect(() => {
    if (offers.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length);
    }, 4000); // changes every 4 seconds
    return () => clearInterval(timer);
  }, [offers.length, isPaused]);

  // Guards against an index left over from a longer list. Nothing shortens the
  // list today, but an out-of-range index slides the track to a blank slot
  // rather than failing loudly, so it is cheap to rule out.
  const activeIndex = offers.length > 0 ? Math.min(currentIndex, offers.length - 1) : 0;

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] p-6 flex flex-col h-full items-center justify-center">
        <p className="text-gray-400 font-medium">No loan offers available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] p-6 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Top Loan Offers</h3>
        {/* The rest of the catalogue, for a farmer who would rather compare than
            take the pick at the top. */}
        <Link
          href="/discover-loans"
          className="inline-flex items-center gap-0.5 text-[13px] font-bold text-[#16A34A] hover:text-[#15803d] transition-colors"
        >
          See all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Carousel Container */}
      <div
        className="border border-gray-100 rounded-xl relative flex-1 flex flex-col overflow-hidden bg-gray-50/30"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >

        {/* Sliding Track */}
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {offers.map((offer, index) => {
            const proxiedBankLogo = toProxiedFileUrl(offer.bank_logo);
            const colorClass = getBankColorClass(offer.bank);
            const initials = getBankInitials(offer.bank);
            const hasValidImage = Boolean(proxiedBankLogo && !imgErrors[offer.id]);
            const isActive = index === activeIndex;

            return (
              /* One click from the dashboard to this loan's application. The
                 whole slide is the target rather than a button in the corner of
                 it: the offer is what the farmer is reading, so the offer is
                 what should be clickable.

                 Off-screen slides are inert. They stay in the DOM because that
                 is what makes the track slide, and without this a farmer tabbing
                 past the carousel would walk through four invisible links to
                 loans they cannot see. */
              <Link
                key={offer.id}
                href={`/discover-loans/apply/${offer.id}`}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                aria-label={`Apply for ${offer.loan_product_name} from ${offer.bank}`}
                className={`group w-full shrink-0 flex flex-col justify-between p-4 h-full rounded-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-inset ${
                  isActive ? '' : 'pointer-events-none'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border ${
                        hasValidImage ? 'bg-white border-gray-100' : colorClass
                      }`}
                    >
                      {hasValidImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proxiedBankLogo}
                          alt={offer.bank}
                          className="w-full h-full object-cover"
                          onError={() => {
                            setImgErrors((prev) => ({ ...prev, [offer.id]: true }));
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider truncate max-w-[150px]">
                        {offer.bank}
                      </div>
                      <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                        {offer.loan_product_name}
                      </div>
                    </div>
                  </div>
                  {/* The position, not a decoration. These are ranked by rate,
                      then amount, then tenure, and "#1" says so where a "Top"
                      pill on every slide said nothing. */}
                  <span className="text-[12px] font-bold px-2 py-1 rounded-full text-green-700 bg-green-50 shrink-0">
                    #{index + 1}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      ETB {offer.max_loan_amount?.toLocaleString() || 0}
                    </div>
                    <div className="text-[12px] font-medium text-gray-400">Max Amount</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{offer.interest_rate}%</div>
                    <div className="text-[12px] font-medium text-gray-400">Interest</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{offer.max_tenure_months} mo</div>
                    <div className="text-[12px] font-medium text-gray-400">Tenure</div>
                  </div>
                </div>

                {/* Sits above the dots, which are absolutely positioned over the
                    bottom of the track. */}
                <div className="flex items-center justify-center gap-1.5 mt-3 mb-2 text-[13px] font-bold text-[#16A34A] opacity-80 group-hover:opacity-100 transition-opacity">
                  Apply now
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Dots */}
        {offers.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {offers.map((offer, i) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeIndex === i ? 'bg-green-500 w-3' : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
