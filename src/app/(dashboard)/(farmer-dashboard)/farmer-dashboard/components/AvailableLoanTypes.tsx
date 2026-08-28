import Button from '@/components/ui/Button';
import { ChevronRight, CreditCard, Sprout, Tractor, Wheat } from 'lucide-react';
import Link from 'next/link';

// Helper to assign icons/colors based on loan type keyword
function getTypeStyling(type: string) {
  const t = type.toLowerCase();
  if (t.includes('seed') || t.includes('crop')) {
    return {
      icon: <Sprout className="w-7 h-7 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-100',
      text: 'text-green-700',
      iconBg: 'bg-white',
    };
  }
  if (t.includes('input') || t.includes('fertilizer')) {
    return {
      icon: <Wheat className="w-7 h-7 text-orange-600" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      text: 'text-orange-700',
      iconBg: 'bg-white',
    };
  }
  if (t.includes('equipment') || t.includes('machinery') || t.includes('tractor')) {
    return {
      icon: <Tractor className="w-7 h-7 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-700',
      iconBg: 'bg-white',
    };
  }
  return {
    icon: <CreditCard className="w-7 h-7 text-purple-600" />,
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-700',
    iconBg: 'bg-white',
  };
}

export default function AvailableLoanTypes({ types = [] }: { types?: string[] }) {
  if (types.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F1F3F4] overflow-hidden shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="px-6 py-5 flex items-center justify-between border-b border-gray-200 min-h-[72px]">
        <h3 className="text-lg font-bold text-gray-900">Available Loan Types</h3>
        <Button as={Link} href="/discover-loans" variant="primary" size="md" className="gap-1">
          Discover Loans
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {types.map((type, idx) => {
          const style = getTypeStyling(type);
          return (
            <div key={idx} className={`rounded-xl p-4 flex items-center justify-between ${style.bg} border ${style.border} cursor-pointer hover:-translate-y-0.5 transition-transform shadow-sm`}>
              <div>
                <div className={`font-bold text-[16px] ${style.text} mb-1`}>{type}</div>
                <div className={`text-[12px] font-bold ${style.text} opacity-80`}>View Options</div>
              </div>
              <div className={`w-16 h-16 rounded-xl ${style.iconBg} flex items-center justify-center shadow-sm shrink-0`}>
                {style.icon}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
