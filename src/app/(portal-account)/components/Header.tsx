import { ArrowRight } from 'lucide-react';

import Link from 'next/link';

interface HeaderProps {
  activeTab: 'login' | 'create-account';
}

export function Header({ activeTab }: HeaderProps) {
  return (
    <div className="w-full bg-white border-b border-gray-100 shadow-md relative z-50 py-4 px-6 sm:px-12 flex justify-between items-center">

      <div className="flex items-center space-x-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="OARI Logo" width={1277} height={851} className="h-[28px] sm:h-[34px] w-auto shrink-0" />
        <div className="flex flex-col border-l-2 border-gray-300 pl-3">
          <span className="text-[13px] font-bold text-[#16335A] leading-tight tracking-wide">Ethiopia OpenAgriNet</span>
          <span className="text-[11px] text-gray-500 font-medium leading-tight tracking-wide uppercase">Access to Credit</span>
        </div>
      </div>
      {activeTab === 'create-account' && (
        <div className="flex items-center gap-4">
          <Link href="/login" className="border border-gray-200 hover:border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer shadow-sm bg-white">
            Login
          </Link>
          <Link href="/create-account" className="bg-[#16A34A] hover:bg-[#158e41] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
            Create Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
