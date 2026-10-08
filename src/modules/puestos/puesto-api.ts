import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarPuestoRequest,
  AuditoriaPuestoPaginada,
  DepartamentoDisponiblePuesto,
  ExportarPuestosParametros,
  GuardarPuestoRequest,
  ListarAuditoriaPuestoParametros,
  ListarPuestosParametros,
  Puesto,
  PuestosPaginados,
} from './puesto.types'

type RespuestaApi<T> = { success: true; data: T }
const fechaArchivoActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function listarPuestos(parametros: ListarPuestosParametros, signal?: AbortSignal): Promise<PuestosPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.puesto) consulta.set('puesto', parametros.puesto)
  if (parametros.departamentos?.length) consulta.set('departamentos', parametros.departamentos.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<PuestosPaginados>>(`/puestos/mantenimiento?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function listarDepartamentosParaPuestos(signal?: AbortSignal): Promise<DepartamentoDisponiblePuesto[]> {
  const respuesta = await solicitarApi<RespuestaApi<DepartamentoDisponiblePuesto[]>>('/puestos/opciones-departamentos', { signal })
  return respuesta.data
}

export async function exportarPuestos(parametros: ExportarPuestosParametros): Promise<void> {
  await descargarArchivoApi('/puestos/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `puestos_organizacionales_${fechaArchivoActual()}.${parametros.formato}` })
}

export async function obtenerPuesto(id: string, signal?: AbortSignal): Promise<Puesto> {
  const respuesta = await solicitarApi<RespuestaApi<Puesto>>(`/puestos/${id}`, { signal })
  return respuesta.data
}

export async function crearPuesto(datos: GuardarPuestoRequest): Promise<Puesto> {
  const respuesta = await solicitarApi<RespuestaApi<Puesto>>('/puestos', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarPuesto(id: string, datos: ActualizarPuestoRequest): Promise<Puesto> {
  const respuesta = await solicitarApi<RespuestaApi<Puesto>>(`/puestos/${id}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function inactivarPuesto(id: string, version: number, motivo: string): Promise<void> {
  await solicitarApi<null>(`/puestos/${id}/inactivar`, { method: 'PATCH', datos: { version, motivo } })
}

export async function listarAuditoriaPuesto(id: string, parametros: ListarAuditoriaPuestoParametros, signal?: AbortSignal): Promise<AuditoriaPuestoPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaPuestoPaginada>>(`/puestos/${id}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}
