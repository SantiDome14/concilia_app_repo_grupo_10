import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving conflicts with Tailwind's rules.
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-brand', className)
 * // → 'px-2 py-1 bg-brand <className>'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
