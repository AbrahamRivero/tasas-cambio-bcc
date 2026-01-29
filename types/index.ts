export interface Moneda {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface TasaCambio {
  _id: string;
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  fechaDesde: string;
  fechaHasta: string;
  fechaDia: string;
  estado: string;
  fechaSubida: string;
  archivoOrigen: string;
  r2Key: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  fechaActivacion: string;
}

export interface TasasActivasResponse {
  tasas: TasaCambio[];
  fechaDia: string;
  fechaHoy: string;
}

export interface TasaCambioHistorico {
  fecha: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export const MONEDAS_PRINCIPALES: Moneda[] = [
  { codigo: 'USD', nombre: 'Dólar Estadounidense', descripcion: 'USD - United States Dollar' },
  { codigo: 'EUR', nombre: 'Euro', descripcion: 'EUR - Euro' },
  { codigo: 'MXN', nombre: 'Peso Mexicano', descripcion: 'MXN - Mexican Peso' },
  { codigo: 'CAD', nombre: 'Dólar Canadiense', descripcion: 'CAD - Canadian Dollar' },
];