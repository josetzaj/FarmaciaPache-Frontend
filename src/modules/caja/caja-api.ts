import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'
import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  AbrirTurnoRequest,
  AccionConMotivoRequest,
  AnularVentaCajaRequest,
  ArqueoCaja,
  CerrarTurnoRequest,
  CierreCaja,
  ConciliacionCaja,
  ConsolidacionDiariaCaja,
  CajaConfiguracion,
  CobrarVentaCajaRequest,
  ConfigurarPoliticaCajaRequest,
  CrearCajaRequest,
  CrearCuentaBancariaCajaRequest,
  CrearDenominacionCajaRequest,
  CrearIncidenciaCajaRequest,
  CrearConciliacionRequest,
  CrearTransferenciaRequest,
  CuentaBancariaCaja,
  CompensarMovimientoRequest,
  ConsultaCaja,
  DenominacionCaja,
  DepositoEfectivo,
  EvidenciaCaja,
  FiltrosExportacionCaja,
  MovimientoCaja,
  OpcionesFiltrosCaja,
  PoliticaCaja,
  RecursoCaja,
  RegistrarArqueoRequest,
  PrepararDepositoRequest,
  RecibirTransferenciaRequest,
  RegistrarDepositoRequest,
  RegistrarMovimientoRequest,
  ResultadoPaginado,
  ResultadoOperacionVentaCaja,
  ActualizarCajaRequest,
  ActualizarDenominacionCajaRequest,
  ActualizarIncidenciaCajaRequest,
  IncidenciaCaja,
  GenerarConsolidacionRequest,
  RegistrarRendicionRequest,
  RendicionRepartidor,
  TurnoCaja,
  TransferenciaEfectivo,
} from './caja.types'

type RespuestaApi<T> = { success: true; data: T }

function consultaCaja(parametros: ConsultaCaja): URLSearchParams {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  const agregarLista = (nombre: string, valores?: string[]) => {
    if (valores?.length) consulta.set(nombre, valores.join(','))
  }
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  agregarLista('sucursalIds', parametros.sucursalIds)
  agregarLista('cajaIds', parametros.cajaIds)
  agregarLista('turnoIds', parametros.turnoIds)
  agregarLista('repartidorIds', parametros.repartidorIds)
  agregarLista('estados', parametros.estados)
  agregarLista('severidades', parametros.severidades)
  agregarLista('tipos', parametros.tipos)
  agregarLista('custodias', parametros.custodias)
  if (parametros.desde) consulta.set('desde', parametros.desde)
  if (parametros.hasta) consulta.set('hasta', parametros.hasta)
  if (parametros.montoMinCentavos !== undefined) consulta.set('montoMinCentavos', String(parametros.montoMinCentavos))
  if (parametros.montoMaxCentavos !== undefined) consulta.set('montoMaxCentavos', String(parametros.montoMaxCentavos))
  if (parametros.diferenciaMinCentavos !== undefined) consulta.set('diferenciaMinCentavos', String(parametros.diferenciaMinCentavos))
  if (parametros.diferenciaMaxCentavos !== undefined) consulta.set('diferenciaMaxCentavos', String(parametros.diferenciaMaxCentavos))
  return consulta
}

export async function listarCaja<T extends CajaConfiguracion | PoliticaCaja | DenominacionCaja | TurnoCaja | MovimientoCaja | ArqueoCaja | CierreCaja | TransferenciaEfectivo | CuentaBancariaCaja | DepositoEfectivo | IncidenciaCaja | RendicionRepartidor | ConciliacionCaja | ConsolidacionDiariaCaja>(
  recurso: RecursoCaja,
  parametros: ConsultaCaja,
  signal?: AbortSignal,
): Promise<ResultadoPaginado<T>> {
  const ruta = recurso === 'denominaciones' ? '/caja/denominaciones/listado' : `/caja/${recurso}`
  const respuesta = await solicitarApi<RespuestaApi<ResultadoPaginado<T>>>(
    `${ruta}?${consultaCaja(parametros).toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function obtenerOpcionesCaja(signal?: AbortSignal): Promise<OpcionesFiltrosCaja> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesFiltrosCaja>>('/caja/opciones-filtros', { signal })
  return respuesta.data
}

export async function obtenerDenominacionesCaja(signal?: AbortSignal): Promise<DenominacionCaja[]> {
  const respuesta = await solicitarApi<RespuestaApi<DenominacionCaja[]>>('/caja/denominaciones', { signal })
  return respuesta.data
}

export async function obtenerTurnoCaja(turnoId: string, signal?: AbortSignal): Promise<TurnoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<TurnoCaja>>(`/caja/turnos/${turnoId}`, { signal })
  return respuesta.data
}

export async function obtenerMovimientoCaja(movimientoId: string, signal?: AbortSignal): Promise<MovimientoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<MovimientoCaja>>(`/caja/movimientos/${movimientoId}`, { signal })
  return respuesta.data
}

export async function obtenerArqueoCaja(arqueoId: string, signal?: AbortSignal): Promise<ArqueoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ArqueoCaja>>(`/caja/arqueos/${arqueoId}`, { signal })
  return respuesta.data
}

export async function obtenerCierreCaja(cierreId: string, signal?: AbortSignal): Promise<CierreCaja> {
  const respuesta = await solicitarApi<RespuestaApi<CierreCaja>>(`/caja/cierres/${cierreId}`, { signal })
  return respuesta.data
}

export async function obtenerTransferenciaCaja(transferenciaId: string, signal?: AbortSignal): Promise<TransferenciaEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<TransferenciaEfectivo>>(`/caja/transferencias/${transferenciaId}`, { signal })
  return respuesta.data
}

export async function obtenerDepositoCaja(depositoId: string, signal?: AbortSignal): Promise<DepositoEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<DepositoEfectivo>>(`/caja/depositos/${depositoId}`, { signal })
  return respuesta.data
}

export async function obtenerCajaConfiguracion(cajaId: string, signal?: AbortSignal): Promise<CajaConfiguracion> {
  const respuesta = await solicitarApi<RespuestaApi<CajaConfiguracion>>(`/caja/cajas/${cajaId}`, { signal })
  return respuesta.data
}

export async function obtenerPoliticaCaja(signal?: AbortSignal): Promise<PoliticaCaja | null> {
  const respuesta = await solicitarApi<RespuestaApi<PoliticaCaja | null>>('/caja/politica', { signal })
  return respuesta.data
}

export async function obtenerIncidenciaCaja(incidenciaId: string, signal?: AbortSignal): Promise<IncidenciaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<IncidenciaCaja>>(`/caja/incidencias/${incidenciaId}`, { signal })
  return respuesta.data
}

export async function obtenerRendicionCaja(rendicionId: string, signal?: AbortSignal): Promise<RendicionRepartidor> {
  const respuesta = await solicitarApi<RespuestaApi<RendicionRepartidor>>(`/caja/rendiciones/${rendicionId}`, { signal })
  return respuesta.data
}

export async function obtenerConciliacionCaja(conciliacionId: string, signal?: AbortSignal): Promise<ConciliacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConciliacionCaja>>(`/caja/conciliaciones/${conciliacionId}`, { signal })
  return respuesta.data
}

export async function obtenerConsolidacionCaja(consolidacionId: string, signal?: AbortSignal): Promise<ConsolidacionDiariaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConsolidacionDiariaCaja>>(`/caja/consolidaciones/${consolidacionId}`, { signal })
  return respuesta.data
}

export async function abrirTurnoCaja(datos: AbrirTurnoRequest): Promise<TurnoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<TurnoCaja>>('/caja/turnos/aperturas', { method: 'POST', datos })
  return respuesta.data
}

export async function registrarMovimientoCaja(datos: RegistrarMovimientoRequest): Promise<MovimientoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<MovimientoCaja>>('/caja/movimientos', { method: 'POST', datos })
  return respuesta.data
}

export async function cobrarVentaCaja<TVenta>(datos: CobrarVentaCajaRequest): Promise<ResultadoOperacionVentaCaja<TVenta>> {
  const respuesta = await solicitarApi<RespuestaApi<ResultadoOperacionVentaCaja<TVenta>>>('/caja/ventas/cobros', { method: 'POST', datos })
  return respuesta.data
}

export async function anularVentaCobradaCaja<TVenta>(datos: AnularVentaCajaRequest): Promise<ResultadoOperacionVentaCaja<TVenta>> {
  const respuesta = await solicitarApi<RespuestaApi<ResultadoOperacionVentaCaja<TVenta>>>('/caja/ventas/anulaciones', { method: 'POST', datos })
  return respuesta.data
}

export async function confirmarMovimientoCaja(movimientoId: string, datos: AccionConMotivoRequest): Promise<MovimientoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<MovimientoCaja>>(`/caja/movimientos/${movimientoId}/confirmacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function compensarMovimientoCaja(movimientoId: string, datos: CompensarMovimientoRequest): Promise<MovimientoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<MovimientoCaja>>(`/caja/movimientos/${movimientoId}/compensaciones`, { method: 'POST', datos })
  return respuesta.data
}

export async function reabrirTurnoCaja(turnoId: string, datos: AccionConMotivoRequest): Promise<TurnoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<TurnoCaja>>(`/caja/turnos/${turnoId}/reapertura`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function registrarArqueoCaja(datos: RegistrarArqueoRequest): Promise<ArqueoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ArqueoCaja>>('/caja/arqueos', { method: 'POST', datos })
  return respuesta.data
}

export async function aprobarArqueoCaja(arqueoId: string, datos: AccionConMotivoRequest): Promise<ArqueoCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ArqueoCaja>>(`/caja/arqueos/${arqueoId}/aprobacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function cerrarTurnoCaja(turnoId: string, datos: CerrarTurnoRequest): Promise<{ turno: TurnoCaja; cierre: CierreCaja }> {
  const respuesta = await solicitarApi<RespuestaApi<{ turno: TurnoCaja; cierre: CierreCaja }>>(`/caja/turnos/${turnoId}/cierres`, { method: 'POST', datos })
  return respuesta.data
}

export async function crearTransferenciaCaja(datos: CrearTransferenciaRequest): Promise<TransferenciaEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<TransferenciaEfectivo>>('/caja/transferencias', { method: 'POST', datos })
  return respuesta.data
}

export async function recibirTransferenciaCaja(transferenciaId: string, datos: RecibirTransferenciaRequest): Promise<TransferenciaEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<TransferenciaEfectivo>>(`/caja/transferencias/${transferenciaId}/recepcion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function crearCuentaBancariaCaja(datos: CrearCuentaBancariaCajaRequest): Promise<CuentaBancariaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<CuentaBancariaCaja>>('/caja/cuentas', { method: 'POST', datos })
  return respuesta.data
}

export async function crearCajaConfiguracion(datos: CrearCajaRequest): Promise<CajaConfiguracion> {
  const respuesta = await solicitarApi<RespuestaApi<CajaConfiguracion>>('/caja/cajas', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarCajaConfiguracion(cajaId: string, datos: ActualizarCajaRequest): Promise<CajaConfiguracion> {
  const respuesta = await solicitarApi<RespuestaApi<CajaConfiguracion>>(`/caja/cajas/${cajaId}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function configurarPoliticaCaja(datos: ConfigurarPoliticaCajaRequest, sucursalId?: string): Promise<PoliticaCaja> {
  const ruta = sucursalId ? `/caja/politicas/${sucursalId}` : '/caja/politica'
  const respuesta = await solicitarApi<RespuestaApi<PoliticaCaja>>(ruta, { method: 'PUT', datos })
  return respuesta.data
}

export async function crearDenominacionCaja(datos: CrearDenominacionCajaRequest): Promise<DenominacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<DenominacionCaja>>('/caja/denominaciones', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarDenominacionCaja(denominacionId: string, datos: ActualizarDenominacionCajaRequest): Promise<DenominacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<DenominacionCaja>>(`/caja/denominaciones/${denominacionId}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function crearIncidenciaCaja(datos: CrearIncidenciaCajaRequest): Promise<IncidenciaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<IncidenciaCaja>>('/caja/incidencias', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarIncidenciaCaja(incidenciaId: string, datos: ActualizarIncidenciaCajaRequest): Promise<IncidenciaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<IncidenciaCaja>>(`/caja/incidencias/${incidenciaId}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function registrarRendicionCaja(datos: RegistrarRendicionRequest): Promise<RendicionRepartidor> {
  const respuesta = await solicitarApi<RespuestaApi<RendicionRepartidor>>('/caja/rendiciones', { method: 'POST', datos })
  return respuesta.data
}

export async function aprobarRendicionCaja(rendicionId: string, datos: AccionConMotivoRequest): Promise<RendicionRepartidor> {
  const respuesta = await solicitarApi<RespuestaApi<RendicionRepartidor>>(`/caja/rendiciones/${rendicionId}/aprobacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function crearConciliacionCaja(datos: CrearConciliacionRequest): Promise<ConciliacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConciliacionCaja>>('/caja/conciliaciones', { method: 'POST', datos })
  return respuesta.data
}

export async function confirmarConciliacionCaja(conciliacionId: string, datos: AccionConMotivoRequest): Promise<ConciliacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConciliacionCaja>>(`/caja/conciliaciones/${conciliacionId}/confirmacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function reabrirConciliacionCaja(conciliacionId: string, datos: AccionConMotivoRequest): Promise<ConciliacionCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConciliacionCaja>>(`/caja/conciliaciones/${conciliacionId}/reapertura`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function generarConsolidacionCaja(datos: GenerarConsolidacionRequest): Promise<ConsolidacionDiariaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConsolidacionDiariaCaja>>('/caja/consolidaciones', { method: 'POST', datos })
  return respuesta.data
}

export async function aprobarConsolidacionCaja(consolidacionId: string, datos: AccionConMotivoRequest): Promise<ConsolidacionDiariaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConsolidacionDiariaCaja>>(`/caja/consolidaciones/${consolidacionId}/aprobacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function reabrirConsolidacionCaja(consolidacionId: string, datos: AccionConMotivoRequest): Promise<ConsolidacionDiariaCaja> {
  const respuesta = await solicitarApi<RespuestaApi<ConsolidacionDiariaCaja>>(`/caja/consolidaciones/${consolidacionId}/reapertura`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function prepararDepositoCaja(datos: PrepararDepositoRequest): Promise<DepositoEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<DepositoEfectivo>>('/caja/depositos', { method: 'POST', datos })
  return respuesta.data
}

export async function registrarDepositoCaja(depositoId: string, datos: RegistrarDepositoRequest): Promise<DepositoEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<DepositoEfectivo>>(`/caja/depositos/${depositoId}/registro`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function confirmarDepositoCaja(depositoId: string, datos: AccionConMotivoRequest): Promise<DepositoEfectivo> {
  const respuesta = await solicitarApi<RespuestaApi<DepositoEfectivo>>(`/caja/depositos/${depositoId}/confirmacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function listarEvidenciasCaja(entidadTipo: EvidenciaCaja['entidadTipo'], entidadId: string, signal?: AbortSignal): Promise<EvidenciaCaja[]> {
  const consulta = new URLSearchParams({ entidadTipo, entidadId })
  const respuesta = await solicitarApi<RespuestaApi<EvidenciaCaja[]>>(`/caja/evidencias?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function subirEvidenciaCaja(entidadTipo: EvidenciaCaja['entidadTipo'], entidadId: string, categoria: string, descripcion: string, archivo: File): Promise<EvidenciaCaja> {
  const formulario = new FormData()
  formulario.append('entidadTipo', entidadTipo)
  formulario.append('entidadId', entidadId)
  formulario.append('categoria', categoria)
  if (descripcion.trim()) formulario.append('descripcion', descripcion.trim())
  formulario.append('archivo', archivo)
  const respuesta = await solicitarApi<RespuestaApi<EvidenciaCaja>>('/caja/evidencias', { method: 'POST', datos: formulario })
  return respuesta.data
}

export async function exportarCaja(recurso: RecursoCaja, formato: 'xlsx' | 'pdf', filtros: FiltrosExportacionCaja): Promise<void> {
  await descargarArchivoApi('/caja/exportaciones', {
    method: 'POST',
    datos: { recurso, formato: formato === 'xlsx' ? 'XLSX' : 'PDF', filtros },
    nombreArchivoAlternativo: `caja_${recurso}.${formato}`,
  })
}

export async function listarAuditoriaCaja(
  entidad: 'CAJA' | 'POLITICA_CAJA' | 'DENOMINACION_CAJA' | 'TURNO_CAJA' | 'MOVIMIENTO_CAJA' | 'ARQUEO_CAJA' | 'TRANSFERENCIA_EFECTIVO' | 'DEPOSITO_EFECTIVO' | 'INCIDENCIA_CAJA' | 'RENDICION_REPARTIDOR' | 'CONCILIACION_CAJA' | 'CONSOLIDACION_DIARIA_CAJA',
  entidadId: string,
  parametros: ConsultaAuditoria,
  signal?: AbortSignal,
): Promise<AuditoriaPaginada> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    entidad,
    entidadId,
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaPaginada>>(`/caja/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}
