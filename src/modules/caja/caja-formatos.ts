import type { EfectoMovimientoCaja, EntidadIncidenciaCaja, EstadoArqueoCaja, EstadoCaja, EstadoCierreCaja, EstadoConciliacionCaja, EstadoConsolidacionCaja, EstadoCustodiaEfectivo, EstadoDepositoEfectivo, EstadoIncidenciaCaja, EstadoMovimientoCaja, EstadoRendicionRepartidor, EstadoTransferenciaEfectivo, EstadoTurnoCaja, SeveridadIncidenciaCaja, TipoArqueoCaja, TipoCaja, TipoConciliacionCaja, TipoMovimientoCaja } from './caja.types'

export const etiquetasEstadoCaja: Record<EstadoCaja, string> = { DISPONIBLE: 'Disponible', SUSPENDIDA: 'Suspendida', INACTIVA: 'Inactiva' }
export const etiquetasEstadoIncidencia: Record<EstadoIncidenciaCaja, string> = { ABIERTA: 'Abierta', EN_INVESTIGACION: 'En investigación', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' }
export const etiquetasSeveridadIncidencia: Record<SeveridadIncidenciaCaja, string> = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' }
export const etiquetasEntidadIncidencia: Record<EntidadIncidenciaCaja, string> = { TURNO_CAJA: 'Turno de caja', MOVIMIENTO_CAJA: 'Movimiento de caja', ARQUEO_CAJA: 'Arqueo', TRANSFERENCIA_EFECTIVO: 'Transferencia de efectivo', DEPOSITO_EFECTIVO: 'Depósito bancario', RENDICION_REPARTIDOR: 'Rendición de repartidor', CONCILIACION_CAJA: 'Conciliación', CONSOLIDACION_DIARIA_CAJA: 'Consolidación diaria' }
export const etiquetasEstadoRendicion: Record<EstadoRendicionRepartidor, string> = { PENDIENTE_APROBACION: 'Pendiente de aprobación', APROBADA: 'Aprobada', INVESTIGACION: 'En investigación' }
export const etiquetasTipoConciliacion: Record<TipoConciliacionCaja, string> = { TURNO: 'Turno de caja', DEPOSITO: 'Depósito bancario', RENDICION: 'Rendición de repartidor' }
export const etiquetasEstadoConciliacion: Record<EstadoConciliacionCaja, string> = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', CONCILIADA: 'Conciliada', DIFERENCIA: 'Con diferencia', REABIERTA: 'Reabierta' }
export const etiquetasEstadoConsolidacion: Record<EstadoConsolidacionCaja, string> = { PENDIENTE_APROBACION: 'Pendiente de aprobación', INVESTIGACION: 'En investigación', APROBADA: 'Aprobada', REABIERTA: 'Reabierta' }

export const etiquetasEstadoTurno: Record<EstadoTurnoCaja, string> = {
  ABIERTO: 'Abierto',
  EN_ARQUEO: 'En arqueo',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  INVESTIGACION: 'En investigación',
  CERRADO: 'Cerrado',
  REABIERTO: 'Reabierto',
}

export const etiquetasEstadoMovimiento: Record<EstadoMovimientoCaja, string> = {
  REGISTRADO: 'Registrado',
  CONFIRMADO: 'Confirmado',
  COMPENSADO: 'Compensado',
  INVESTIGACION: 'En investigación',
}

export const etiquetasEstadoArqueo: Record<EstadoArqueoCaja, string> = {
  REGISTRADO: 'Registrado',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADO: 'Aprobado',
  INVESTIGACION: 'En investigación',
}

export const etiquetasTipoArqueo: Record<TipoArqueoCaja, string> = {
  ORDINARIO: 'Ordinario',
  CIEGO: 'Ciego',
  SORPRESIVO: 'Sorpresivo',
  INCIDENCIA: 'Por incidencia',
  CIERRE: 'De cierre',
}

export const etiquetasEstadoCierre: Record<EstadoCierreCaja, string> = {
  SIN_DIFERENCIA: 'Sin diferencia',
  FALTANTE: 'Faltante',
  SOBRANTE: 'Sobrante',
  INVESTIGACION: 'En investigación',
  APROBADO: 'Aprobado',
  REABIERTO: 'Reabierto',
}

export const etiquetasCustodia: Record<EstadoCustodiaEfectivo, string> = {
  CAJA: 'Caja',
  RETIRADO: 'Retirado',
  CAJA_FUERTE: 'Caja fuerte',
  REPARTIDOR: 'Repartidor',
  TRANSITO: 'En tránsito',
  RECIBIDO: 'Recibido',
  PENDIENTE_DEPOSITO: 'Pendiente de depósito',
  DEPOSITADO: 'Depositado',
}

export const etiquetasEstadoTransferencia: Record<EstadoTransferenciaEfectivo, string> = {
  PREPARADA: 'Preparada',
  ENTREGADA: 'Entregada',
  RECIBIDA: 'Recibida',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
}

export const etiquetasEstadoDeposito: Record<EstadoDepositoEfectivo, string> = {
  PREPARADO: 'Preparado',
  EN_CUSTODIA: 'En custodia',
  REGISTRADO: 'Registrado',
  CONFIRMADO: 'Confirmado',
  DIFERENCIA: 'Con diferencia',
  CANCELADO: 'Cancelado',
}

export const etiquetasTipoMovimiento: Record<TipoMovimientoCaja, string> = {
  FONDO_INICIAL: 'Fondo inicial',
  VENTA_EFECTIVO: 'Venta en efectivo',
  COBRO_CONTRA_ENTREGA: 'Cobro contra entrega',
  INGRESO_EXTRAORDINARIO: 'Ingreso extraordinario',
  EGRESO_AUTORIZADO: 'Egreso autorizado',
  REINTEGRO_DEVOLUCION: 'Reintegro por devolución',
  ANULACION_VENTA: 'Anulación de venta',
  RETIRO_PARCIAL: 'Retiro parcial',
  TRANSFERENCIA_ENTRADA: 'Transferencia de entrada',
  TRANSFERENCIA_SALIDA: 'Transferencia de salida',
  CORRECCION_COMPENSATORIA: 'Corrección compensatoria',
}

export const etiquetasTipoCaja: Record<TipoCaja, string> = {
  VENTAS: 'Caja de ventas',
  CAJA_CHICA: 'Caja chica',
}

export const etiquetasEfecto: Record<EfectoMovimientoCaja, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
}

export function formatearCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return 'Pendiente'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(centavos / 100)
}

export function formatearFechaHora(valor: string | null): string {
  if (!valor) return 'Pendiente'
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

export function formatearFecha(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

export function convertirQuetzalesACentavos(valor: string): number | null {
  const normalizado = valor.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) return null
  const [entero, decimales = ''] = normalizado.split('.')
  const centavos = Number(entero) * 100 + Number(decimales.padEnd(2, '0'))
  return Number.isSafeInteger(centavos) ? centavos : null
}

export function convertirDiferenciaACentavos(valor: string): number | null {
  const normalizado = valor.trim().replace(',', '.')
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalizado)) return null
  const signo = normalizado.startsWith('-') ? -1 : 1
  const [entero, decimales = ''] = normalizado.replace('-', '').split('.')
  const centavos = signo * (Number(entero) * 100 + Number(decimales.padEnd(2, '0')))
  return Number.isSafeInteger(centavos) ? centavos : null
}

export function crearClaveIdempotencia(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`
}
