import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  Activo,
  ActivosPaginados,
  ActualizarActivoRequest,
  AsignacionActivo,
  AsignacionesPaginadas,
  AuditoriaActivoPaginada,
  CambiarSituacionActivoRequest,
  ConsultaAuditoriaActivo,
  CrearAsignacionRequest,
  CrearActivoRequest,
  CrearSolicitudDevolucionRequest,
  DarBajaActivoRequest,
  DevolucionActivo,
  DevolucionesPaginadas,
  ExportarActivosParametros,
  ExportarAsignacionesParametros,
  ExportarDevolucionesParametros,
  ListarActivosParametros,
  ListarAsignacionesParametros,
  ListarDevolucionesParametros,
  OpcionesAsignacionActivo,
  OpcionesRegistroActivo,
  RegistrarRecepcionDevolucionRequest,
  RegistrarRevisionEmpleadoRequest,
  ResolverDevolucionRequest,
} from './activos.types'

type Respuesta<T> = { success: true; data: T }
const fechaArchivo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date())

function consultaAuditoria(parametros: ConsultaAuditoriaActivo): URLSearchParams {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  return consulta
}

export async function listarActivos(parametros: ListarActivosParametros, signal?: AbortSignal): Promise<ActivosPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursalIds?.length) consulta.set('sucursalIds', parametros.sucursalIds.join(','))
  if (parametros.tipoActivoIds?.length) consulta.set('tipoActivoIds', parametros.tipoActivoIds.join(','))
  if (parametros.condicionIds?.length) consulta.set('condicionIds', parametros.condicionIds.join(','))
  if (parametros.situaciones?.length) consulta.set('situaciones', parametros.situaciones.join(','))
  return (await solicitarApi<Respuesta<ActivosPaginados>>(`/activos?${consulta}`, { signal })).data
}

export async function exportarActivos(parametros: ExportarActivosParametros): Promise<void> {
  await descargarArchivoApi('/activos/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `activos_${fechaArchivo()}.${parametros.formato}` })
}

export async function obtenerActivo(id: string, signal?: AbortSignal): Promise<Activo> {
  return (await solicitarApi<Respuesta<Activo>>(`/activos/${id}`, { signal })).data
}

export async function obtenerOpcionesRegistroActivo(signal?: AbortSignal): Promise<OpcionesRegistroActivo> {
  return (await solicitarApi<Respuesta<OpcionesRegistroActivo>>('/activos/opciones-registro', { signal })).data
}

export async function crearActivo(datos: CrearActivoRequest): Promise<Activo> {
  return (await solicitarApi<Respuesta<Activo>>('/activos', { method: 'POST', datos })).data
}

export async function actualizarActivo(id: string, datos: ActualizarActivoRequest): Promise<Activo> {
  return (await solicitarApi<Respuesta<Activo>>(`/activos/${id}`, { method: 'PUT', datos })).data
}

export async function cambiarSituacionActivo(id: string, datos: CambiarSituacionActivoRequest): Promise<Activo> {
  return (await solicitarApi<Respuesta<Activo>>(`/activos/${id}/situacion`, { method: 'PATCH', datos })).data
}

export async function darBajaActivo(id: string, datos: DarBajaActivoRequest): Promise<void> {
  await solicitarApi<null>(`/activos/${id}/baja`, { method: 'PATCH', datos })
}

export async function listarAuditoriaActivo(id: string, parametros: ConsultaAuditoriaActivo, signal?: AbortSignal): Promise<AuditoriaActivoPaginada> {
  return (await solicitarApi<Respuesta<AuditoriaActivoPaginada>>(`/activos/${id}/auditoria?${consultaAuditoria(parametros)}`, { signal })).data
}

export async function listarAsignaciones(parametros: ListarAsignacionesParametros, signal?: AbortSignal): Promise<AsignacionesPaginadas> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.fechaDesde) consulta.set('fechaDesde', parametros.fechaDesde)
  if (parametros.fechaHasta) consulta.set('fechaHasta', parametros.fechaHasta)
  return (await solicitarApi<Respuesta<AsignacionesPaginadas>>(`/activos/asignaciones?${consulta}`, { signal })).data
}

export async function listarMisAsignaciones(parametros: ListarAsignacionesParametros, signal?: AbortSignal): Promise<AsignacionesPaginadas> {
  const consulta = consultaAsignaciones(parametros)
  return (await solicitarApi<Respuesta<AsignacionesPaginadas>>(`/activos/mis-asignaciones?${consulta}`, { signal })).data
}

export async function exportarAsignaciones(parametros: ExportarAsignacionesParametros): Promise<void> {
  await descargarArchivoApi('/activos/asignaciones/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `asignaciones_activos_${fechaArchivo()}.${parametros.formato}` })
}

export async function obtenerAsignacion(id: string, signal?: AbortSignal): Promise<AsignacionActivo> {
  return (await solicitarApi<Respuesta<AsignacionActivo>>(`/activos/asignaciones/${id}`, { signal })).data
}

export async function obtenerMiAsignacion(id: string, signal?: AbortSignal): Promise<AsignacionActivo> {
  return (await solicitarApi<Respuesta<AsignacionActivo>>(`/activos/mis-asignaciones/${id}`, { signal })).data
}

export async function obtenerOpcionesAsignacion(parametros: { sucursalId?: string } = {}, signal?: AbortSignal): Promise<OpcionesAsignacionActivo> {
  const consulta = new URLSearchParams()
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  const sufijo = consulta.size ? `?${consulta}` : ''
  return (await solicitarApi<Respuesta<OpcionesAsignacionActivo>>(`/activos/opciones-asignacion${sufijo}`, { signal })).data
}

export async function crearAsignacion(datos: CrearAsignacionRequest): Promise<AsignacionActivo> {
  return (await solicitarApi<Respuesta<AsignacionActivo>>('/activos/asignaciones', { method: 'POST', datos })).data
}

export async function descargarPdfAsignacion(id: string, numeroActa?: string): Promise<void> {
  await descargarArchivoApi(`/activos/asignaciones/${id}/documento-pdf`, {
    method: 'GET',
    nombreArchivoAlternativo: `asignacion_activos_${numeroActa ?? id}.pdf`,
  })
}

export async function registrarRevisionEmpleado(id: string, datos: RegistrarRevisionEmpleadoRequest): Promise<AsignacionActivo> {
  return (await solicitarApi<Respuesta<AsignacionActivo>>(`/activos/mis-asignaciones/${id}/revision`, { method: 'POST', datos })).data
}

export async function crearSolicitudDevolucion(id: string, datos: CrearSolicitudDevolucionRequest): Promise<DevolucionActivo> {
  return (await solicitarApi<Respuesta<DevolucionActivo>>(`/activos/mis-asignaciones/${id}/devoluciones`, { method: 'POST', datos })).data
}

export async function listarAuditoriaAsignacion(id: string, parametros: ConsultaAuditoriaActivo, signal?: AbortSignal): Promise<AuditoriaActivoPaginada> {
  return (await solicitarApi<Respuesta<AuditoriaActivoPaginada>>(`/activos/asignaciones/${id}/auditoria?${consultaAuditoria(parametros)}`, { signal })).data
}

function consultaAsignaciones(parametros: ListarAsignacionesParametros): URLSearchParams {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.fechaDesde) consulta.set('fechaDesde', parametros.fechaDesde)
  if (parametros.fechaHasta) consulta.set('fechaHasta', parametros.fechaHasta)
  return consulta
}

function consultaDevoluciones(parametros: ListarDevolucionesParametros): URLSearchParams {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursalIds?.length) consulta.set('sucursalIds', parametros.sucursalIds.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.fechaDesde) consulta.set('fechaDesde', parametros.fechaDesde)
  if (parametros.fechaHasta) consulta.set('fechaHasta', parametros.fechaHasta)
  return consulta
}

export async function listarDevoluciones(parametros: ListarDevolucionesParametros, signal?: AbortSignal): Promise<DevolucionesPaginadas> {
  return (await solicitarApi<Respuesta<DevolucionesPaginadas>>(`/activos/devoluciones?${consultaDevoluciones(parametros)}`, { signal })).data
}

export async function listarMisDevoluciones(parametros: ListarDevolucionesParametros, signal?: AbortSignal): Promise<DevolucionesPaginadas> {
  return (await solicitarApi<Respuesta<DevolucionesPaginadas>>(`/activos/mis-devoluciones?${consultaDevoluciones(parametros)}`, { signal })).data
}

export async function exportarDevoluciones(parametros: ExportarDevolucionesParametros): Promise<void> {
  await descargarArchivoApi('/activos/devoluciones/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `devoluciones_activos_${fechaArchivo()}.${parametros.formato}` })
}

export async function obtenerDevolucion(id: string, signal?: AbortSignal): Promise<DevolucionActivo> {
  return (await solicitarApi<Respuesta<DevolucionActivo>>(`/activos/devoluciones/${id}`, { signal })).data
}

export async function obtenerMiDevolucion(id: string, signal?: AbortSignal): Promise<DevolucionActivo> {
  return (await solicitarApi<Respuesta<DevolucionActivo>>(`/activos/mis-devoluciones/${id}`, { signal })).data
}

export async function registrarRecepcionDevolucion(id: string, datos: RegistrarRecepcionDevolucionRequest): Promise<DevolucionActivo> {
  return (await solicitarApi<Respuesta<DevolucionActivo>>(`/activos/devoluciones/${id}/recepcion`, { method: 'PATCH', datos })).data
}

export async function resolverDevolucion(id: string, datos: ResolverDevolucionRequest): Promise<DevolucionActivo> {
  return (await solicitarApi<Respuesta<DevolucionActivo>>(`/activos/devoluciones/${id}/resolucion`, { method: 'PATCH', datos })).data
}

export async function descargarPdfDevolucion(id: string, numero?: string, propia = false): Promise<void> {
  const base = propia ? '/activos/mis-devoluciones' : '/activos/devoluciones'
  await descargarArchivoApi(`${base}/${id}/documento-pdf`, { method: 'GET', nombreArchivoAlternativo: `devolucion_activos_${numero ?? id}.pdf` })
}

export async function listarAuditoriaDevolucion(id: string, parametros: ConsultaAuditoriaActivo, signal?: AbortSignal): Promise<AuditoriaActivoPaginada> {
  return (await solicitarApi<Respuesta<AuditoriaActivoPaginada>>(`/activos/devoluciones/${id}/auditoria?${consultaAuditoria(parametros)}`, { signal })).data
}
