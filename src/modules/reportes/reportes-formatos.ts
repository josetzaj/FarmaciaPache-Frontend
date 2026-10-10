import { ErrorApi } from '../../shared/api/cliente-api'

export const formatearDinero = (valor: number): string => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(valor)

export const formatearCantidad = (valor: number): string => new Intl.NumberFormat('es-GT', {
  maximumFractionDigits: 2,
}).format(valor)

export const formatearFechaHora = (valor: string): string => {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha disponible'

  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha)
}

export const mensajeErrorReporte = (error: unknown, alternativo: string): string =>
  error instanceof ErrorApi ? error.message : alternativo

export function fechaGuatemala(fecha = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}

export function periodoInicial(): { fechaDesde: string; fechaHasta: string } {
  const ahora = new Date()
  return {
    fechaDesde: fechaGuatemala(new Date(ahora.getTime() - 29 * 86_400_000)),
    fechaHasta: fechaGuatemala(ahora),
  }
}

export const periodoValido = (desde: string, hasta: string): boolean => Boolean(desde && hasta && desde <= hasta)
