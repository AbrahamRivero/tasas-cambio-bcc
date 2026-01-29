export const formatCurrency = (amount: number, currency: string = 'CUP'): string => {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const getMonedaFlag = (codigo: string): string => {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    MXN: '🇲🇽',
    CAD: '🇨🇦',
  };
  return flags[codigo.toUpperCase()] || '🏳️';
};

export const getTasaCambioColor = (tasa: number): string => {
  if (tasa < 100) return 'text-success-600';
  if (tasa < 200) return 'text-warning-600';
  return 'text-error-600';
};