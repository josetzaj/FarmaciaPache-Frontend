import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'

export type EstadoCaja = 'DISPONIBLE' | 'SUSPENDIDA' | 'INACTIVA'
export type TipoCaja = 'VENTAS' | 'CAJA_CHICA'
export type EstadoTurnoCaja = 'ABIERTO' | 'EN_ARQUEO' | 'PENDIENTE_APROBACION' | 'INVESTIGACION' | 'CERRADO' | 'REABIERTO'
export type EstadoMovimientoCaja = 'REGISTRADO' | 'CONFIRMADO' | 'COMPENSADO' | 'INVESTIGACION'
export type EstadoArqueoCaja = 'REGISTRADO' | 'PENDIENTE_APROBACION' | 'APROBADO' | 'INVESTIGACION'
export type TipoArqueoCaja = 'ORDINARIO' | 'CIEGO' | 'SORPRESIVO' | 'INCIDENCIA' | 'CIERRE'
export type EstadoCierreCaja = 'SIN_DIFERENCIA' | 'FALTANTE' | 'SOBRANTE' | 'INVESTIGACION' | 'APROBADO' | 'REABIERTO'
export type EstadoCustodiaEfectivo = 'CAJA' | 'RETIRADO' | 'CAJA_FUERTE' | 'REPARTIDOR' | 'TRANSITO' | 'RECIBIDO' | 'PENDIENTE_DEPOSITO' | 'DEPOSITADO'
export type EstadoTransferenciaEfectivo = 'PREPARADA' | 'ENTREGADA' | 'RECIBIDA' | 'RECHAZADA' | 'CANCELADA'
export type EstadoDepositoEfectivo = 'PREPARADO' | 'EN_CUSTODIA' | 'REGISTRADO' | 'CONFIRMADO' | 'DIFERENCIA' | 'CANCELADO'
export type EstadoIncidenciaCaja = 'ABIERTA' | 'EN_INVESTIGACION' | 'RESUELTA' | 'CERRADA'
export type SeveridadIncidenciaCaja = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type EstadoRendicionRepartidor = 'PENDIENTE_APROBACION' | 'APROBADA' | 'INVESTIGACION'
export type TipoConciliacionCaja = 'TURNO' | 'DEPOSITO' | 'RENDICION'
export type EstadoConciliacionCaja = 'PENDIENTE' | 'PARCIAL' | 'CONCILIADA' | 'DIFERENCIA' | 'REABIERTA'
export type EstadoConsolidacionCaja = 'PENDIENTE_APROBACION' | 'INVESTIGACION' | 'APROBADA' | 'REABIERTA'
export type EntidadIncidenciaCaja = 'TURNO_CAJA' | 'MOVIMIENTO_CAJA' | 'ARQUEO_CAJA' | 'TRANSFERENCIA_EFECTIVO' | 'DEPOSITO_EFECTIVO' | 'RENDICION_REPARTIDOR' | 'CONCILIACION_CAJA' | 'CONSOLIDACION_DIARIA_CAJA'
export type EfectoMovimientoCaja = 'ENTRADA' | 'SALIDA'
export type TipoMovimientoCaja =
  | 'FONDO_INICIAL'
  | 'VENTA_EFECTIVO'
  | 'COBRO_CONTRA_ENTREGA'
  | 'INGRESO_EXTRAORDINARIO'
  | 'EGRESO_AUTORIZADO'
  | 'REINTEGRO_DEVOLUCION'
  | 'ANULACION_VENTA'
  | 'RETIRO_PARCIAL'
  | 'TRANSFERENCIA_ENTRADA'
  | 'TRANSFERENCIA_SALIDA'
  | 'CORRECCION_COMPENSATORIA'

export type DireccionOrdenCaja = 'asc' | 'desc'
export type RecursoCaja = 'cajas' | 'politicas' | 'denominaciones' | 'turnos' | 'movimientos' | 'arqueos' | 'cierres' | 'transferencias' | 'cuentas' | 'depositos' | 'incidencias' | 'rendiciones' | 'conciliaciones' | 'consolidaciones'

export type ReferenciaCaja = { id: string; codigo: string; nombre: string }
export type CajaOpcion = ReferenciaCaja & {
  estado: EstadoCaja
  tipo: TipoCaja
  sucursal: ReferenciaCaja | null
}

export type CajaConfiguracion = ReferenciaCaja & {
  sucursalId: string
  sucursal: ReferenciaCaja | null
  tipo: TipoCaja
  moneda: 'GTQ'
  estado: EstadoCaja
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type PoliticaCaja = {
  id: string
  sucursalId: string
  sucursal: ReferenciaCaja | null
  horaInicioDia: string
  horaFinDia: string
  fondoMaximoCentavos: number | null
  saldoMaximoCentavos: number | null
  reintegroMaximoCentavos: number | null
  movimientoExtraordinarioMaximoCentavos: number | null
  umbralDiferenciaCentavos: number | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type DenominacionCaja = {
  id: string
  moneda: 'GTQ'
  nombre: string
  valorCentavos: number
  orden: number
  activa: boolean
  version: number
}

export type FondoDenominacionTurno = {
  id: string
  denominacionId: string
  valorCentavos: number
  cantidad: number
  subtotalCentavos: number
  denominacion?: DenominacionCaja
}

export type TurnoCaja = {
  id: string
  numero: string
  cajaId: string
  caja: (ReferenciaCaja & { tipo?: TipoCaja }) | null
  sucursalId: string
  responsableId: string
  responsableNombre: string
  fechaNegocio: string
  estado: EstadoTurnoCaja
  fondoInicialCentavos: number
  saldoConfirmadoCentavos: number
  abiertoEn: string
  cerradoEn: string | null
  versionCierre: number
  fondoDenominaciones?: FondoDenominacionTurno[]
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type MovimientoCaja = {
  id: string
  numero: string
  turnoId: string
  turnoNumero: string | null
  caja: (ReferenciaCaja & { tipo: TipoCaja }) | null
  sucursalId: string
  tipo: TipoMovimientoCaja
  efecto: EfectoMovimientoCaja
  estado: EstadoMovimientoCaja
  montoCentavos: number
  saldoAnteriorCentavos: number | null
  saldoPosteriorCentavos: number | null
  fechaNegocio: string
  ocurridoEn: string
  origenModulo: string
  referenciaTipo: string
  referenciaId: string
  referenciaNumero: string | null
  compensaMovimientoId: string | null
  motivo: string
  confirmadoPorId: string | null
  confirmadoEn: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type DetalleArqueoCaja = {
  denominacionId: string
  nombre?: string
  valorCentavos: number
  cantidad: number
  subtotalCentavos: number
}

export type ArqueoCaja = {
  id: string
  numero: string
  turnoId: string
  turnoNumero: string | null
  caja: (ReferenciaCaja & { tipo: TipoCaja }) | null
  sucursalId: string
  tipo: TipoArqueoCaja
  estado: EstadoArqueoCaja
  esCiego: boolean
  esperadoCentavos: number
  declaradoCentavos: number
  diferenciaCentavos: number
  explicacion: string | null
  declaradoPorId: string
  aprobadoPorId: string | null
  aprobadoEn: string | null
  ocurridoEn: string
  detalles?: DetalleArqueoCaja[]
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type CierreCaja = {
  id: string
  numero: string
  turnoId: string
  turnoNumero: string | null
  caja: (ReferenciaCaja & { tipo: TipoCaja }) | null
  sucursalId: string
  arqueoId: string
  arqueoNumero: string | null
  versionCierre: number
  estado: EstadoCierreCaja
  esperadoCentavos: number
  declaradoCentavos: number
  diferenciaCentavos: number
  explicacion: string | null
  aprobadoPorId: string | null
  aprobadoEn: string | null
  cerradoEn: string
  reabiertoEn: string | null
  motivoReapertura: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type TransferenciaEfectivo = {
  id: string
  numero: string
  sucursalId: string
  turnoOrigenId: string | null
  turnoOrigenNumero: string | null
  cajaDestinoId: string | null
  cajaDestino: ReferenciaCaja | null
  custodiaOrigen: EstadoCustodiaEfectivo
  custodiaDestino: EstadoCustodiaEfectivo
  montoCentavos: number
  estado: EstadoTransferenciaEfectivo
  bolsa: string | null
  sello: string | null
  transporte: string | null
  receptorId: string | null
  receptorNombre: string | null
  motivo: string
  movimientoSalidaId: string | null
  movimientoEntradaId: string | null
  entregadoPorId: string | null
  entregadoEn: string | null
  recibidoPorId: string | null
  recibidoEn: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type CuentaBancariaCaja = {
  id: string
  banco: string
  alias: string
  ultimosCuatro: string
  cuentaEnmascarada: string
  titular: string
  moneda: 'GTQ'
  activa: boolean
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type DepositoEfectivo = {
  id: string
  numero: string
  sucursalId: string
  cuentaBancariaId: string
  cuenta: { id: string; banco: string; alias: string; cuentaEnmascarada: string } | null
  transferenciaId: string | null
  transferenciaNumero: string | null
  fechaNegocio: string
  estado: EstadoDepositoEfectivo
  montoPreparadoCentavos: number
  montoDepositadoCentavos: number | null
  diferenciaCentavos: number | null
  bolsa: string
  sello: string
  transporte: string | null
  referenciaBancaria: string | null
  responsableDepositoId: string | null
  preparadoEn: string
  entregadoEn: string | null
  depositadoEn: string | null
  confirmadoPorId: string | null
  confirmadoEn: string | null
  observacionDiferencia: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type EvidenciaCaja = {
  id: string
  entidadTipo: 'TRANSFERENCIA_EFECTIVO' | 'DEPOSITO_EFECTIVO' | 'INCIDENCIA_CAJA' | 'RENDICION_REPARTIDOR' | 'CONCILIACION_CAJA' | 'CONSOLIDACION_DIARIA_CAJA'
  entidadId: string
  categoria: string
  descripcion: string | null
  tipoMime: string
  tamanoBytes: number
  cargadoPorId: string
  cargadoEn: string
}

export type IncidenciaCaja = {
  id: string
  numero: string
  sucursalId: string
  entidadTipo: EntidadIncidenciaCaja
  entidadId: string
  severidad: SeveridadIncidenciaCaja
  estado: EstadoIncidenciaCaja
  descripcion: string
  diferenciaCentavos: number | null
  responsableId: string | null
  resolucion: string | null
  resueltoPorId: string | null
  resueltoEn: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type RendicionRepartidor = {
  id: string
  numero: string
  sucursalId: string
  repartidorId: string
  repartidorNombre: string
  turnoDestinoId: string
  turnoDestinoNumero: string | null
  cajaDestino: (ReferenciaCaja & { tipo?: TipoCaja }) | null
  fechaNegocio: string
  referenciaOperativa: string
  estado: EstadoRendicionRepartidor
  cantidadEntregas: number
  fondoCambioCentavos: number
  cobradoCentavos: number
  cambioEntregadoCentavos: number
  esperadoCentavos: number
  efectivoEntregadoCentavos: number
  diferenciaCentavos: number
  explicacion: string | null
  movimientoIngresoId: string | null
  recibidoPorId: string
  recibidoEn: string
  aprobadoPorId: string | null
  aprobadoEn: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type ConciliacionCaja = {
  id: string
  numero: string
  sucursalId: string
  sucursal: ReferenciaCaja | null
  fechaNegocio: string
  tipo: TipoConciliacionCaja
  referenciaId: string
  referenciaNumero: string
  estado: EstadoConciliacionCaja
  esperadoCentavos: number
  registradoCentavos: number | null
  diferenciaCentavos: number | null
  observacion: string | null
  conciliadoPorId: string | null
  conciliadoEn: string | null
  reabiertoPorId: string | null
  reabiertoEn: string | null
  motivoReapertura: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type ConsolidacionDiariaCaja = {
  id: string
  numero: string
  sucursalId: string
  sucursal: ReferenciaCaja | null
  fechaNegocio: string
  versionConsolidacion: number
  estado: EstadoConsolidacionCaja
  totalTurnos: number
  turnosCerrados: number
  fondoInicialCentavos: number
  ingresosCentavos: number
  egresosCentavos: number
  saldoTeoricoCentavos: number
  efectivoDeclaradoCentavos: number
  diferenciaCierresCentavos: number
  rendidoCentavos: number
  depositoPreparadoCentavos: number
  depositadoCentavos: number
  diferenciaDepositoCentavos: number
  incidenciasAbiertas: number
  generadoPorId: string
  generadoEn: string
  aprobadoPorId: string | null
  aprobadoEn: string | null
  reabiertoPorId: string | null
  reabiertoEn: string | null
  motivoReapertura: string | null
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type ResultadoPaginado<T> = {
  items: T[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ConsultaCaja = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalIds?: string[]
  cajaIds?: string[]
  turnoIds?: string[]
  repartidorIds?: string[]
  estados?: string[]
  severidades?: string[]
  tipos?: string[]
  custodias?: string[]
  desde?: string
  hasta?: string
  montoMinCentavos?: number
  montoMaxCentavos?: number
  diferenciaMinCentavos?: number
  diferenciaMaxCentavos?: number
  orden: string
  direccion: DireccionOrdenCaja
}

export type FiltrosExportacionCaja = Omit<ConsultaCaja, 'pagina' | 'tamanoPagina'>

export type OpcionesFiltrosCaja = {
  cajas: { opciones: CajaOpcion[]; estados: EstadoCaja[]; tipos: TipoCaja[] }
  sucursales: ReferenciaCaja[]
  repartidores?: Array<{ id: string; codigo: string; nombre: string }>
  turnos: { estados: EstadoTurnoCaja[] }
  movimientos: { estados: EstadoMovimientoCaja[]; tipos: TipoMovimientoCaja[] }
  arqueos: { estados: EstadoArqueoCaja[]; tipos: TipoArqueoCaja[] }
  cierres: { estados: EstadoCierreCaja[] }
  transferencias: { estados: EstadoTransferenciaEfectivo[]; custodias: EstadoCustodiaEfectivo[] }
  depositos: { estados: EstadoDepositoEfectivo[] }
  incidencias?: { estados: EstadoIncidenciaCaja[]; severidades: SeveridadIncidenciaCaja[] }
  rendiciones?: { estados: EstadoRendicionRepartidor[] }
  conciliaciones?: { estados: EstadoConciliacionCaja[]; tipos: TipoConciliacionCaja[] }
  consolidaciones?: { estados: EstadoConsolidacionCaja[] }
  tamanosPagina: number[]
}

export type ConteoDenominacionRequest = { denominacionId: string; cantidad: number }
export type AbrirTurnoRequest = {
  cajaId: string
  fondoInicialCentavos: number
  conteo: ConteoDenominacionRequest[]
  claveIdempotencia: string
}

export type RegistrarMovimientoRequest = {
  turnoId: string
  tipo: TipoMovimientoCaja
  montoCentavos: number
  referenciaTipo: string
  referenciaId: string
  referenciaNumero?: string | null
  motivo: string
  claveIdempotencia: string
}

export type CobrarVentaCajaRequest = {
  turnoId: string
  ventaId: string
  ventaVersion: number
  recibidoCentavos: number
  cambioCentavos: number
  claveIdempotencia: string
}

export type AnularVentaCajaRequest = {
  turnoId: string
  ventaId: string
  ventaVersion: number
  motivo: string
  claveIdempotencia: string
}

export type ResultadoOperacionVentaCaja<TVenta> = {
  movimiento: MovimientoCaja
  venta?: TVenta
  ventaId?: string
}

export type AccionConMotivoRequest = { version: number; motivo: string }
export type CompensarMovimientoRequest = AccionConMotivoRequest & { claveIdempotencia: string }
export type RegistrarArqueoRequest = {
  turnoId: string
  tipo: TipoArqueoCaja
  conteo: ConteoDenominacionRequest[]
  explicacion?: string | null
  claveIdempotencia: string
}
export type CerrarTurnoRequest = { arqueoId: string; arqueoVersion: number; motivo: string }
export type CrearTransferenciaRequest = {
  turnoOrigenId: string
  cajaDestinoId?: string | null
  custodiaDestino: EstadoCustodiaEfectivo
  montoCentavos: number
  bolsa: string
  sello: string
  transporte?: string | null
  motivo: string
  claveIdempotencia: string
}
export type RecibirTransferenciaRequest = { turnoDestinoId?: string | null; version: number; motivo: string }
export type CrearCuentaBancariaCajaRequest = { banco: string; alias: string; ultimosCuatro: string; titular: string }
export type PrepararDepositoRequest = { cuentaBancariaId: string; transferenciaId?: string | null; montoPreparadoCentavos: number; bolsa: string; sello: string; transporte?: string | null }
export type RegistrarDepositoRequest = { version: number; montoDepositadoCentavos: number; referenciaBancaria: string; observacionDiferencia?: string | null }
export type CrearCajaRequest = { codigo: string; nombre: string; tipo: TipoCaja }
export type ActualizarCajaRequest = CrearCajaRequest & { estado: EstadoCaja; motivo: string; version: number }
export type ConfigurarPoliticaCajaRequest = Omit<PoliticaCaja, 'id' | 'sucursalId' | 'sucursal' | 'creadoEn' | 'actualizadoEn' | 'version'> & { motivo: string; version?: number }
export type CrearDenominacionCajaRequest = { nombre: string; valorCentavos: number; orden: number }
export type ActualizarDenominacionCajaRequest = CrearDenominacionCajaRequest & { activa: boolean; motivo: string; version: number }
export type CrearIncidenciaCajaRequest = { entidadTipo: EntidadIncidenciaCaja; entidadId: string; severidad: SeveridadIncidenciaCaja; descripcion: string; diferenciaCentavos?: number | null }
export type ActualizarIncidenciaCajaRequest = { estado: EstadoIncidenciaCaja; resolucion?: string | null; responsableId?: string | null; motivo: string; version: number }
export type RegistrarRendicionRequest = { repartidorId: string; turnoDestinoId: string; referenciaOperativa: string; cantidadEntregas: number; fondoCambioCentavos: number; cobradoCentavos: number; cambioEntregadoCentavos: number; efectivoEntregadoCentavos: number; explicacion?: string | null; claveIdempotencia: string }
export type CrearConciliacionRequest = { tipo: TipoConciliacionCaja; referenciaId: string; observacion?: string | null; claveIdempotencia: string }
export type GenerarConsolidacionRequest = { fechaNegocio: string; claveIdempotencia: string }
export type ConsultaAuditoriaCaja = ConsultaAuditoria
export type AuditoriaCajaPaginada = AuditoriaPaginada
