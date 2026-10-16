import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'purple'
  | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = true,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    success: {
      bg: 'bg-[#ECFDF3]',
      text: 'text-[#027A48]',
      dot: 'bg-[#12B76A]',
    },
    warning: {
      bg: 'bg-[#FFFAEB]',
      text: 'text-[#B54708]',
      dot: 'bg-[#F79009]',
    },
    error: {
      bg: 'bg-[#FEF3F2]',
      text: 'text-[#B42318]',
      dot: 'bg-[#F04438]',
    },
    info: {
      bg: 'bg-[#EEF4FF]',
      text: 'text-[#233FB8]',
      dot: 'bg-[#3B68F5]',
    },
    purple: {
      bg: 'bg-[#F4F3FF]',
      text: 'text-[#5925DC]',
      dot: 'bg-[#7A5AF8]',
    },
    cyan: {
      bg: 'bg-[#F0FDF9]',
      text: 'text-[#0E7090]',
      dot: 'bg-[#06AED4]',
    },
    neutral: {
      bg: 'bg-[#F0F2F5]',
      text: 'text-[#344054]',
      dot: 'bg-[#667085]',
    },
  };

  const style = variantStyles[variant] || variantStyles.neutral;
  const heightClass = size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-normal select-none ${style.bg} ${style.text} ${heightClass} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />}
      <span className="truncate">{children}</span>
    </span>
  );
};
