import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'

export type EstadoCajaChica = 'DISPONIBLE' | 'SUSPENDIDA' | 'INACTIVA'
export type EstadoLiquidacionCajaChica = 'SOLICITADA' | 'ABIERTA' | 'CERRADA'
export type EstadoReposicionCajaChica = 'AUTORIZADA' | 'RECIBIDA'
export type EstadoMovimientoCajaChica = 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
export type TipoMovimientoCajaChica = 'GASTO' | 'CORRECCION'
export type NaturalezaMovimientoCajaChica = 'EGRESO' | 'RECUPERACION'
export type DireccionOrden = 'asc' | 'desc'

export type SucursalResumen = { id: string; codigo: string; nombre: string }

export type CajaChicaResumen = {
  id: string
  codigo: string
  nombre: string
  estado: EstadoCajaChica
  moneda: string
  fondoAutorizadoCentavos: number
  saldoActualCentavos: number
  efectivoDisponibleCentavos: number
  version: number
  sucursal: SucursalResumen
}

export type TotalesLiquidacionCajaChica = {
  fondoAutorizadoCentavos: number
  saldoInicialCentavos: number
  reposicionesConfirmadasCentavos: number
  egresosAcumuladosCentavos: number
  ajustesCorreccionesCentavos: number
  gastosNetosCentavos: number
  gastosPendientesCentavos: number
  saldoActualCentavos: number
  efectivoDisponibleCentavos: number
}

export type LiquidacionCajaChicaResumen = {
  id: string
  numero: string
  anio: number
  mes: number
  secuencia: number
  estado: EstadoLiquidacionCajaChica
  version: number
  cajaChicaId: string
  sucursal: SucursalResumen
  liquidacionOrigenId: string | null
  saldoFinalCentavos: number | null
  efectivoDeclaradoCentavos: number | null
  totales: TotalesLiquidacionCajaChica
}

export type ReposicionCajaChica = {
  id: string
  estado: EstadoReposicionCajaChica
  montoCentavos: number
  autorizadaPorId: string
  autorizadaPorNombre: string
  autorizadaEn: string
  recibidaPorId: string | null
  recibidaPorNombre: string | null
  recibidaEn: string | null
  referenciaRecepcion: string | null
  version: number
}

export type AuditoriaProcesoLiquidacion = {
  solicitadaPorId: string
  solicitadaPorNombre: string
  solicitadaEn: string
  autorizadaPorId: string | null
  autorizadaPorNombre: string | null
  autorizadaEn: string | null
  cerradaPorId: string | null
  cerradaPorNombre: string | null
  cerradaEn: string | null
}

export type LiquidacionCajaChicaDetalle = LiquidacionCajaChicaResumen & {
  reposicion: ReposicionCajaChica | null
  gastoMensualSucursalCentavos: number
  auditoriaProceso: AuditoriaProcesoLiquidacion
}

export type MovimientoCajaChica = {
  id: string
  numero: string
  tipo: TipoMovimientoCajaChica
  naturaleza: NaturalezaMovimientoCajaChica
  estado: EstadoMovimientoCajaChica
  montoCentavos: number
  fechaGasto: string
  concepto: string
  evidenciaReferencia: string | null
  movimientoOriginalId: string | null
  movimientoOriginalNumero: string | null
  registradoPorId: string
  registradoPorNombre: string
  registradoEn: string
  confirmadoPorId: string | null
  confirmadoPorNombre: string | null
  confirmadoEn: string | null
  canceladoPorId: string | null
  canceladoPorNombre: string | null
  canceladoEn: string | null
  motivoCancelacion: string | null
  version: number
  comprobante: { disponible: true; nombreOriginal: string; tamanoBytes: number } | null
}

export type ResultadoPaginado<T> = {
  items: T[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type OpcionesCajaChica = {
  cajas: Array<Pick<CajaChicaResumen, 'id' | 'codigo' | 'nombre' | 'estado' | 'fondoAutorizadoCentavos' | 'sucursal'>>
  sucursales: SucursalResumen[]
  estadosCaja: EstadoCajaChica[]
  estadosLiquidacion: EstadoLiquidacionCajaChica[]
  estadosMovimiento: EstadoMovimientoCajaChica[]
  tamanosPagina: number[]
}

export type EstadoLiquidacionActiva = {
  puedeSolicitar: boolean
  motivoNoDisponible: 'CAJA_CHICA_NO_CREADA' | 'CAJA_CHICA_NO_DISPONIBLE' | 'LIQUIDACION_ACTIVA_EXISTENTE' | null
  caja: CajaChicaResumen | null
  liquidacion: LiquidacionCajaChicaDetalle | null
}

export type ConsultaCajasChicas = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalIds?: string[]
  estados?: EstadoCajaChica[]
  orden: 'codigo' | 'sucursal' | 'estado' | 'fondo'
  direccion: DireccionOrden
}

export type ConsultaLiquidaciones = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalIds?: string[]
  estados?: EstadoLiquidacionCajaChica[]
  mes?: number
  anio?: number
  orden: 'numero' | 'sucursal' | 'periodo' | 'estado' | 'fondo'
  direccion: DireccionOrden
}

export type ConsultaMovimientos = {
  pagina: number
  tamanoPagina: number
  estados?: EstadoMovimientoCajaChica[]
  orden: 'fecha' | 'numero' | 'concepto' | 'monto' | 'estado'
  direccion: DireccionOrden
}

export type CrearCajaChicaRequest = { sucursalId: string; fondoAutorizadoCentavos: number; claveIdempotencia: string }
export type ModificarFondoRequest = { nuevoFondoCentavos: number; motivo: string; evidenciaReferencia: string; version: number; claveIdempotencia: string }
export type SolicitarLiquidacionRequest = { versionCaja: number; claveIdempotencia: string }
export type AutorizarLiquidacionRequest = { version: number; motivo: string; claveIdempotencia: string }
export type RecibirReposicionRequest = { version: number; referencia: string; claveIdempotencia: string }
export type RegistrarCorreccionRequest = { versionLiquidacion: number; movimientoOriginalId: string; naturaleza: NaturalezaMovimientoCajaChica; montoCentavos: number; fechaGasto: string; motivo: string; evidenciaReferencia: string; claveIdempotencia: string }
export type ResolverMovimientoRequest = { version: number; motivo: string; claveIdempotencia: string }
export type CerrarLiquidacionRequest = { version: number; efectivoDeclaradoCentavos: number; motivo: string; claveIdempotencia: string }

export type AuditoriaCajaChicaPaginada = AuditoriaPaginada
export type ConsultaAuditoriaCajaChica = ConsultaAuditoria
