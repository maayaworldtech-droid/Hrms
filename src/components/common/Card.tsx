import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E4E7EC] shadow-xs overflow-hidden transition-all duration-200 ${
        hoverable ? 'hover:border-[#D0D5DD] hover:shadow-sm hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}> = ({ title, subtitle, action, className = '', icon }) => {
  return (
    <div className={`p-5 sm:p-6 border-b border-[#F0F2F5] flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] text-[#2A4FE0] flex items-center justify-center shrink-0 border border-[#BDD3FF]/50">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-[#101828] tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[#475467] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`px-5 py-3.5 sm:px-6 bg-[#F7F8FA] border-t border-[#F0F2F5] flex items-center justify-between text-xs text-[#475467] ${className}`}>
      {children}
    </div>
  );
};
