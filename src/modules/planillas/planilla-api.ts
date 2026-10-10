import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarDetallesPlanillaRequest,
  AuditoriaPlanillaPaginada,
  ConfiguracionSalarialDetalle,
  ConfiguracionSalarialPaginada,
  ConsultaAuditoriaPlanilla,
  GenerarPeriodoPlanillaRequest,
  ListarConfiguracionSalarialParametros,
  ListarPeriodosPlanillaParametros,
  OpcionesPlanilla,
  PeriodoPlanillaDetalle,
  PeriodosPlanillaPaginados,
  RegistrarCondicionSalarialRequest,
} from './planilla.types'

type RespuestaApi<T> = { success: true; data: T }

function agregarLista(consulta: URLSearchParams, nombre: string, valores?: readonly (string | number)[]) {
  if (valores?.length) consulta.set(nombre, valores.join(','))
}

function consultaAuditoria(parametros: ConsultaAuditoriaPlanilla): URLSearchParams {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  agregarLista(consulta, 'operaciones', parametros.operaciones)
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  return consulta
}

export async function obtenerOpcionesPlanilla(signal?: AbortSignal): Promise<OpcionesPlanilla> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesPlanilla>>('/planillas/opciones', { signal })
  return respuesta.data
}

export async function listarConfiguracionSalarial(
  parametros: ListarConfiguracionSalarialParametros,
  signal?: AbortSignal,
): Promise<ConfiguracionSalarialPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  agregarLista(consulta, 'estadosConfiguracion', parametros.estadosConfiguracion)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<ConfiguracionSalarialPaginada>>(`/planillas/configuracion-salarial?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function obtenerConfiguracionSalarial(
  empleadoId: string,
  signal?: AbortSignal,
): Promise<ConfiguracionSalarialDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<ConfiguracionSalarialDetalle>>(`/planillas/configuracion-salarial/${empleadoId}`, { signal })
  return respuesta.data
}

export async function registrarCondicionSalarial(
  empleadoId: string,
  datos: RegistrarCondicionSalarialRequest,
): Promise<ConfiguracionSalarialDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<ConfiguracionSalarialDetalle>>(`/planillas/configuracion-salarial/${empleadoId}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function listarAuditoriaSalarial(
  empleadoId: string,
  parametros: ConsultaAuditoriaPlanilla,
  signal?: AbortSignal,
): Promise<AuditoriaPlanillaPaginada> {
  const consulta = consultaAuditoria(parametros)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaPlanillaPaginada>>(`/planillas/configuracion-salarial/${empleadoId}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function listarPeriodosPlanilla(
  parametros: ListarPeriodosPlanillaParametros,
  signal?: AbortSignal,
): Promise<PeriodosPlanillaPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.anio) consulta.set('anio', String(parametros.anio))
  agregarLista(consulta, 'meses', parametros.meses)
  agregarLista(consulta, 'estados', parametros.estados)
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<PeriodosPlanillaPaginados>>(`/planillas/periodos?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function generarPeriodoPlanilla(datos: GenerarPeriodoPlanillaRequest): Promise<PeriodoPlanillaDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<PeriodoPlanillaDetalle>>('/planillas/periodos', { method: 'POST', datos })
  return respuesta.data
}

export async function obtenerPeriodoPlanilla(periodoId: string, signal?: AbortSignal): Promise<PeriodoPlanillaDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<PeriodoPlanillaDetalle>>(`/planillas/periodos/${periodoId}`, { signal })
  return respuesta.data
}

export async function actualizarDetallesPlanilla(
  periodoId: string,
  datos: ActualizarDetallesPlanillaRequest,
): Promise<PeriodoPlanillaDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<PeriodoPlanillaDetalle>>(`/planillas/periodos/${periodoId}/detalles`, { method: 'PUT', datos })
  return respuesta.data
}

export async function cerrarPeriodoPlanilla(periodoId: string, version: number): Promise<PeriodoPlanillaDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<PeriodoPlanillaDetalle>>(`/planillas/periodos/${periodoId}/cierre`, { method: 'POST', datos: { version } })
  return respuesta.data
}

export async function exportarPeriodoPlanilla(periodoId: string, formato: 'xlsx' | 'pdf'): Promise<void> {
  await descargarArchivoApi(`/planillas/periodos/${periodoId}/exportaciones`, {
    method: 'POST',
    datos: { formato },
    nombreArchivoAlternativo: `planilla.${formato}`,
  })
}

export async function listarAuditoriaPeriodo(
  periodoId: string,
  parametros: ConsultaAuditoriaPlanilla,
  signal?: AbortSignal,
): Promise<AuditoriaPlanillaPaginada> {
  const consulta = consultaAuditoria(parametros)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaPlanillaPaginada>>(`/planillas/periodos/${periodoId}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}

