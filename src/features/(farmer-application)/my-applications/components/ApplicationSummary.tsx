import { getStageCardIcon } from '@/features/loans';
import { Users, type LucideIcon } from 'lucide-react';
import { ALL_TAB, type StageTab } from '../counts';

/**
 * One card per stage, plus a total.
 *
 * The five fixed cards this replaced — Total / Drafts / Under Review /
 * Disbursed / Rejected — were counting statuses the API does not produce, so
 * four of the five sat at zero for every farmer. Stage names belong to the banks
 * the farmer applied to and arrive from `get_loan_metadata`.
 */
export default function ApplicationSummary({
  activeTab,
  onTabChange,
  total,
  tabs,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  total: number;
  tabs: StageTab[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <SummaryCard
        label="Total"
        value={total}
        icon={Users}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        isActive={activeTab === ALL_TAB}
        onClick={() => onTabChange(ALL_TAB)}
      />
      {tabs.map((tab) => {
        const { icon, iconBgColor, iconColor } = getStageCardIcon(tab.label, tab.archetype);
        return (
          <SummaryCard
            key={tab.value}
            label={tab.label}
            value={tab.count}
            icon={icon}
            iconBgColor={iconBgColor}
            iconColor={iconColor}
            isActive={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
          />
        );
      })}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`bg-white rounded-xl p-5 flex w-full items-center justify-between text-left border shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group ${isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-[#F1F3F4]'}`}
    >
      <div className="min-w-0">
        <p className="text-md text-gray-500 font-semibold mb-1 truncate">{label}</p>
        <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
      </div>
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300 ${iconBgColor}`}>
        <Icon className={`w-8 h-8 group-hover:rotate-12 transition-transform duration-300 ${iconColor}`} />
      </div>
    </button>
  );
}
