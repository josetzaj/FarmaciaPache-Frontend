import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type { ActualizarSucursalRequest, AuditoriaSucursalPaginada, ExportarSucursalesParametros, GuardarSucursalRequest, ListarAuditoriaSucursalParametros, ListarSucursalesParametros, Sucursal, SucursalesPaginadas } from './sucursal.types'

type RespuestaApi<T> = { success: true; data: T }
const fechaArchivoActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function listarSucursales(parametros: ListarSucursalesParametros, signal?: AbortSignal): Promise<SucursalesPaginadas> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.tipos?.length) consulta.set('tipos', parametros.tipos.join(','))
  if (parametros.departamento) consulta.set('departamento', parametros.departamento)
  if (parametros.municipio) consulta.set('municipio', parametros.municipio)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<SucursalesPaginadas>>(`/sucursales/mantenimiento?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function exportarSucursales(parametros: ExportarSucursalesParametros): Promise<void> {
  await descargarArchivoApi('/sucursales/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `sucursales_${fechaArchivoActual()}.${parametros.formato}` })
}
export async function obtenerSucursal(id: string, signal?: AbortSignal): Promise<Sucursal> { const respuesta = await solicitarApi<RespuestaApi<Sucursal>>(`/sucursales/${id}`, { signal }); return respuesta.data }
export async function crearSucursal(datos: GuardarSucursalRequest): Promise<Sucursal> { const respuesta = await solicitarApi<RespuestaApi<Sucursal>>('/sucursales', { method: 'POST', datos }); return respuesta.data }
export async function actualizarSucursal(id: string, datos: ActualizarSucursalRequest): Promise<Sucursal> { const respuesta = await solicitarApi<RespuestaApi<Sucursal>>(`/sucursales/${id}`, { method: 'PUT', datos }); return respuesta.data }
export async function inactivarSucursal(id: string, version: number, motivo: string): Promise<void> { await solicitarApi<null>(`/sucursales/${id}/inactivar`, { method: 'PATCH', datos: { version, motivo } }) }
export async function listarAuditoriaSucursal(id: string, parametros: ListarAuditoriaSucursalParametros, signal?: AbortSignal): Promise<AuditoriaSucursalPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaSucursalPaginada>>(`/sucursales/${id}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}
