import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateMiddle(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  const half = Math.floor(maxLength / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}
