import { cva, type VariantProps } from 'class-variance-authority';

export { default as Badge } from './Badge.vue';

export const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide whitespace-nowrap border',
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-success border-success/20',
        warning: 'bg-warning-bg text-warning border-warning/20',
        info: 'bg-info-bg text-info border-info/20',
        danger: 'bg-danger-bg text-danger border-danger/20',
        neutral: 'bg-white/[0.04] text-t-4 border-b-2',
        brand: 'bg-brand-bg text-brand border-brand/20',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
