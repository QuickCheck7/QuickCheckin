import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWaitTime(minutes: number, t?: any): string {
  if (minutes < 60) {
    return `~${minutes} ${t ? t('min') : 'min'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  const hrString = hours === 1 ? (t ? t('hr') : 'hr') : (t ? t('hrs') : 'hrs');
  
  if (remainingMins === 0) {
    return `~${hours} ${hrString}`;
  }
  
  return `~${hours} ${hrString} ${remainingMins} ${t ? t('min') : 'min'}`;
}
