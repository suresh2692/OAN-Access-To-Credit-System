import React from 'react';

interface FormCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export function FormCard({
  title,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}: FormCardProps) {
  return (
    <div className={`bg-white rounded-xl overflow-hidden border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl ${className}`}>
      {title && (
        <div className={`px-6 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA] ${headerClassName}`}>
          <h2 className="text-[16px] font-bold text-[#1F2937]">{title}</h2>
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
