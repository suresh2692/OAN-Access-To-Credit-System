"use client";
import { formatAmount, formatRate, formatTenure } from '../../format';
import type { DetailedLoanProduct, BankDetails } from '../../types';
import { Landmark, Globe, MapPin, Building2, Tag } from 'lucide-react';

interface ApplicationHeaderProps {
  loan: DetailedLoanProduct;
  bankDetails?: BankDetails | null;
}

export default function ApplicationHeader({ loan, bankDetails }: ApplicationHeaderProps) {
  const bankDisplayName = bankDetails?.brand_name || bankDetails?.bank_name || loan.bank;
  const logoSrc = bankDetails?.logo_url || loan.image;

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      {/* Top Header: Logo + Title + Bank Info */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shrink-0 relative">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={bankDisplayName}
              className="w-full h-full object-contain p-1 z-10"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-blue-50 text-blue-400 flex items-center justify-center z-0">
            <Landmark className="w-7 h-7" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">{loan.product_name}</h2>
            {loan.status && (
              <span className="bg-[#F0FDF4] text-[#16A34A] text-xs font-semibold px-2.5 py-1 rounded-md border border-[#DCFCE7]">
                {loan.status}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium mt-1 mb-2">
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              {bankDisplayName}
            </span>

            {bankDetails?.entity_type && (
              <span className="text-xs text-gray-400 font-normal">
                • {bankDetails.entity_type}
              </span>
            )}

            {(bankDetails?.region || bankDetails?.country) && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {[bankDetails.region, bankDetails.country].filter(Boolean).join(', ')}
              </span>
            )}

            {bankDetails?.website && (
              <a
                href={bankDetails.website.startsWith('http') ? bankDetails.website : `https://${bankDetails.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                Website
              </a>
            )}
          </div>

          {/* Categories & Tags */}
          {((loan.categories && loan.categories.length > 0) || (loan.tags && loan.tags.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {loan.categories?.map((cat) => (
                <span
                  key={cat}
                  className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
                >
                  {cat}
                </span>
              ))}
              {loan.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-[#F0FDF4] text-[#16A34A] text-xs font-medium px-2.5 py-0.5 rounded-full border border-[#DCFCE7]"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {loan.description && (
        <p className="text-sm text-gray-600 mb-5 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
          {loan.description}
        </p>
      )}

      {/* Key Financial Terms Grid */}
      <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl flex items-center justify-between p-6 w-full flex-wrap gap-4">
        <div className="flex flex-col items-center flex-1 min-w-[120px]">
          <div className="text-xl font-bold text-[#16A34A]">{formatAmount(loan.max_amount)}</div>
          <div className="text-sm text-gray-500 font-medium mt-1">Max Amount</div>
        </div>
        <div className="flex flex-col items-center flex-1 min-w-[120px]">
          <div className="text-xl font-bold text-[#16A34A]">
            {loan.min_interest_rate !== undefined && loan.max_interest_rate !== undefined && loan.min_interest_rate !== loan.max_interest_rate
              ? `${formatRate(loan.min_interest_rate)} - ${formatRate(loan.max_interest_rate)}`
              : formatRate(loan.min_interest_rate ?? loan.max_interest_rate)}
          </div>
          <div className="text-sm text-gray-500 font-medium mt-1">Interest p.a</div>
        </div>
        <div className="flex flex-col items-center flex-1 min-w-[120px]">
          <div className="text-xl font-bold text-[#16A34A]">{formatTenure(loan.tenure_months)}</div>
          <div className="text-sm text-gray-500 font-medium mt-1">Tenure</div>
        </div>
        <div className="flex flex-col items-center flex-1 min-w-[120px]">
          <div className="text-xl font-bold text-[#16A34A]">{loan.min_amount ? `ETB ${loan.min_amount.toLocaleString()}` : 'None'}</div>
          <div className="text-sm text-gray-500 font-medium mt-1">Min Amount</div>
        </div>
      </div>

      {/* Product Metadata & Custom Attributes */}
      {((loan.product_meta && loan.product_meta.length > 0) || (loan.attributes && Object.keys(loan.attributes).length > 0)) && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-600">
          {loan.product_meta?.map((m) => (
            <div key={m.meta_key} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              <span className="text-gray-400 block font-medium capitalize">
                {m.meta_key.replace(/_/g, ' ')}
              </span>
              <span className="text-gray-800 font-semibold mt-0.5 block">
                {m.meta_value}
              </span>
            </div>
          ))}
          {loan.attributes && Object.entries(loan.attributes).map(([k, v]) => (
            <div key={k} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              <span className="text-gray-400 block font-medium capitalize">
                {k.replace(/_/g, ' ')}
              </span>
              <span className="text-gray-800 font-semibold mt-0.5 block">
                {Array.isArray(v) ? v.join(', ') : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
