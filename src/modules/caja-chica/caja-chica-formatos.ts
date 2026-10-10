import type { EstadoCajaChica, EstadoLiquidacionCajaChica, EstadoMovimientoCajaChica, EstadoReposicionCajaChica, NaturalezaMovimientoCajaChica } from './caja-chica.types'

export const etiquetasEstadoCajaChica: Record<EstadoCajaChica, string> = { DISPONIBLE: 'Disponible', SUSPENDIDA: 'Suspendida', INACTIVA: 'Inactiva' }
export const etiquetasEstadoLiquidacion: Record<EstadoLiquidacionCajaChica, string> = { SOLICITADA: 'Solicitada', ABIERTA: 'Abierta', CERRADA: 'Cerrada' }
export const etiquetasEstadoMovimiento: Record<EstadoMovimientoCajaChica, string> = { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado' }
export const etiquetasEstadoReposicion: Record<EstadoReposicionCajaChica, string> = { AUTORIZADA: 'Autorizada', RECIBIDA: 'Recibida' }
export const etiquetasNaturaleza: Record<NaturalezaMovimientoCajaChica, string> = { EGRESO: 'Aumento del gasto', RECUPERACION: 'Recuperación de efectivo' }

export function formatearCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return 'Pendiente'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(centavos / 100)
}

export function convertirQuetzalesACentavos(valor: string, permitirCero = false): number | null {
  const normalizado = valor.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) return null
  const [entero, decimales = ''] = normalizado.split('.')
  const centavos = Number(entero) * 100 + Number(decimales.padEnd(2, '0'))
  if (!Number.isSafeInteger(centavos) || (permitirCero ? centavos < 0 : centavos <= 0)) return null
  return centavos
}

export function formatearFecha(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

export function formatearFechaHora(valor: string | null): string {
  if (!valor) return 'Pendiente'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

export function nombreMes(mes: number, anio?: number): string {
  const texto = new Intl.DateTimeFormat('es-GT', { month: 'long', ...(anio ? { year: 'numeric' as const } : {}), timeZone: 'UTC' }).format(new Date(Date.UTC(anio ?? 2024, mes - 1, 1)))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function fechaActualGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function crearClaveIdempotencia(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`
}

export function tamanoArchivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
