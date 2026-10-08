import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarEstadoCatalogoRequest,
  AuditoriaEstadoCatalogoPaginada,
  EstadoCatalogo,
  EstadosCatalogoPaginados,
  ExportarEstadosCatalogoParametros,
  GuardarEstadoCatalogoRequest,
  ListarAuditoriaEstadoCatalogoParametros,
  ListarEstadosCatalogoParametros,
} from './estado-catalogo.types'

type RespuestaApi<T> = { success: true; data: T }

function fechaArchivoActual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function agregarFiltros(consulta: URLSearchParams, parametros: Omit<ListarEstadosCatalogoParametros, 'pagina' | 'tamanoPagina'>) {
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.estado) consulta.set('estado', parametros.estado)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
}

export async function listarEstadosCatalogo(
  parametros: ListarEstadosCatalogoParametros,
  signal?: AbortSignal,
): Promise<EstadosCatalogoPaginados> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  agregarFiltros(consulta, parametros)
  const respuesta = await solicitarApi<RespuestaApi<EstadosCatalogoPaginados>>(
    `/catalogos/estados?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function exportarEstadosCatalogo(parametros: ExportarEstadosCatalogoParametros): Promise<void> {
  await descargarArchivoApi('/catalogos/estados/exportaciones', {
    method: 'POST',
    datos: parametros,
    nombreArchivoAlternativo: `catalogo_estados_${fechaArchivoActual()}.${parametros.formato}`,
  })
}

export async function obtenerEstadoCatalogo(estadoId: string, signal?: AbortSignal): Promise<EstadoCatalogo> {
  const respuesta = await solicitarApi<RespuestaApi<EstadoCatalogo>>(`/catalogos/estados/${estadoId}`, { signal })
  return respuesta.data
}

export async function crearEstadoCatalogo(datos: GuardarEstadoCatalogoRequest): Promise<EstadoCatalogo> {
  const respuesta = await solicitarApi<RespuestaApi<EstadoCatalogo>>('/catalogos/estados', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarEstadoCatalogo(
  estadoId: string,
  datos: ActualizarEstadoCatalogoRequest,
): Promise<EstadoCatalogo> {
  const respuesta = await solicitarApi<RespuestaApi<EstadoCatalogo>>(`/catalogos/estados/${estadoId}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function inactivarEstadoCatalogo(estadoId: string, version: number, motivo: string): Promise<void> {
  await solicitarApi<null>(`/catalogos/estados/${estadoId}/inactivar`, {
    method: 'PATCH', datos: { version, motivo },
  })
}

export async function listarAuditoriaEstadoCatalogo(
  estadoId: string,
  parametros: ListarAuditoriaEstadoCatalogoParametros,
  signal?: AbortSignal,
): Promise<AuditoriaEstadoCatalogoPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaEstadoCatalogoPaginada>>(
    `/catalogos/estados/${estadoId}/auditoria?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}
