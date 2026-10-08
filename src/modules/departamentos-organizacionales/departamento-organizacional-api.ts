import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarDepartamentoOrganizacionalRequest,
  AuditoriaDepartamentoOrganizacionalPaginada,
  DepartamentoOrganizacional,
  DepartamentosOrganizacionalesPaginados,
  ExportarDepartamentosOrganizacionalesParametros,
  GuardarDepartamentoOrganizacionalRequest,
  ListarAuditoriaDepartamentoOrganizacionalParametros,
  ListarDepartamentosOrganizacionalesParametros,
} from './departamento-organizacional.types'

type RespuestaApi<T> = { success: true; data: T }
const fechaArchivoActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function listarDepartamentosOrganizacionales(parametros: ListarDepartamentosOrganizacionalesParametros, signal?: AbortSignal): Promise<DepartamentosOrganizacionalesPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.departamento) consulta.set('departamento', parametros.departamento)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<DepartamentosOrganizacionalesPaginados>>(`/departamentos-organizacionales?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function exportarDepartamentosOrganizacionales(parametros: ExportarDepartamentosOrganizacionalesParametros): Promise<void> {
  await descargarArchivoApi('/departamentos-organizacionales/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `departamentos_organizacionales_${fechaArchivoActual()}.${parametros.formato}` })
}

export async function obtenerDepartamentoOrganizacional(id: string, signal?: AbortSignal): Promise<DepartamentoOrganizacional> {
  const respuesta = await solicitarApi<RespuestaApi<DepartamentoOrganizacional>>(`/departamentos-organizacionales/${id}`, { signal })
  return respuesta.data
}

export async function crearDepartamentoOrganizacional(datos: GuardarDepartamentoOrganizacionalRequest): Promise<DepartamentoOrganizacional> {
  const respuesta = await solicitarApi<RespuestaApi<DepartamentoOrganizacional>>('/departamentos-organizacionales', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarDepartamentoOrganizacional(id: string, datos: ActualizarDepartamentoOrganizacionalRequest): Promise<DepartamentoOrganizacional> {
  const respuesta = await solicitarApi<RespuestaApi<DepartamentoOrganizacional>>(`/departamentos-organizacionales/${id}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function inactivarDepartamentoOrganizacional(id: string, version: number, motivo: string): Promise<void> {
  await solicitarApi<null>(`/departamentos-organizacionales/${id}/inactivar`, { method: 'PATCH', datos: { version, motivo } })
}

export async function listarAuditoriaDepartamentoOrganizacional(id: string, parametros: ListarAuditoriaDepartamentoOrganizacionalParametros, signal?: AbortSignal): Promise<AuditoriaDepartamentoOrganizacionalPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaDepartamentoOrganizacionalPaginada>>(`/departamentos-organizacionales/${id}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}
