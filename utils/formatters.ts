import { MONEDAS_PRINCIPALES } from '../types';

export const formatCurrency = (value: number, decimals = 2): string => {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDateShort = (dateString: string, includeTime = false): string => {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleDateString('es-ES', options);
  } catch {
    return dateString;
  }
};

export const getCurrencyFlag = (codigo: string): string => {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    MLC: '🇨🇺',
    CAD: '🇨🇦',
    MXN: '🇲🇽',
    GBP: '🇬🇧',
    CHF: '🇨🇭',
    JPY: '🇯🇵',
    CNY: '🇨🇳',
    AUD: '🇦🇺',
    DKK: '🇩🇰',
    NOK: '🇳🇴',
    SEK: '🇸🇪',
    RUB: '🇷🇺',
  };
  return flags[codigo.toUpperCase()] || '💱';
};

// Single source of truth for currency priority, derived from
// MONEDAS_PRINCIPALES so every screen orders currencies the same way.
const PRIORITY_CURRENCIES: string[] = MONEDAS_PRINCIPALES.map((m) => m.codigo);

export const sortCurrencies = (currencies: string[]): string[] => {
  return [...currencies].sort((a, b) => {
    const aIndex = PRIORITY_CURRENCIES.indexOf(a);
    const bIndex = PRIORITY_CURRENCIES.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return a.localeCompare(b);
  });
};