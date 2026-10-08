import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type { ActualizarUsuarioRequest, AsignarRolesUsuarioRequest, AuditoriaUsuarioPaginada, CrearUsuarioRequest, ExportarUsuariosParametros, ListarAuditoriaUsuarioParametros, ListarUsuariosParametros, OpcionesFormularioUsuario, Usuario, UsuarioCreado, UsuariosPaginados } from './usuario.types'
type RespuestaApi<T> = { success: true; data: T }
const fechaArchivoActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export async function listarUsuarios(parametros: ListarUsuariosParametros, signal?: AbortSignal): Promise<UsuariosPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.empleado) consulta.set('empleado', parametros.empleado)
  if (parametros.rolIds?.length) consulta.set('rolIds', parametros.rolIds.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<UsuariosPaginados>>(`/seguridad/usuarios?${consulta.toString()}`, { signal })
  return respuesta.data
}
export async function obtenerOpcionesUsuario(signal?: AbortSignal): Promise<OpcionesFormularioUsuario> { const respuesta = await solicitarApi<RespuestaApi<OpcionesFormularioUsuario>>('/seguridad/usuarios/opciones-formulario', { signal }); return respuesta.data }
export async function exportarUsuarios(parametros: ExportarUsuariosParametros): Promise<void> { await descargarArchivoApi('/seguridad/usuarios/exportaciones', { method: 'POST', datos: parametros, nombreArchivoAlternativo: `usuarios_${fechaArchivoActual()}.${parametros.formato}` }) }
export async function obtenerUsuario(id: string, signal?: AbortSignal): Promise<Usuario> { const respuesta = await solicitarApi<RespuestaApi<Usuario>>(`/seguridad/usuarios/${id}`, { signal }); return respuesta.data }
export async function crearUsuario(datos: CrearUsuarioRequest): Promise<UsuarioCreado> { const respuesta = await solicitarApi<RespuestaApi<UsuarioCreado>>('/seguridad/usuarios', { method: 'POST', datos }); return respuesta.data }
export async function actualizarUsuario(id: string, datos: ActualizarUsuarioRequest): Promise<Usuario> { const respuesta = await solicitarApi<RespuestaApi<Usuario>>(`/seguridad/usuarios/${id}`, { method: 'PUT', datos }); return respuesta.data }
export async function asignarRolesUsuario(id: string, datos: AsignarRolesUsuarioRequest): Promise<Usuario> { const respuesta = await solicitarApi<RespuestaApi<Usuario>>(`/seguridad/usuarios/${id}/roles`, { method: 'PUT', datos }); return respuesta.data }
export async function inactivarUsuario(id: string, version: number, motivo: string): Promise<void> { await solicitarApi<null>(`/seguridad/usuarios/${id}/inactivar`, { method: 'PATCH', datos: { version, motivo } }) }
export async function reenviarActivacionUsuario(id: string): Promise<void> { await solicitarApi<null>(`/seguridad/usuarios/${id}/reenviar-activacion`, { method: 'POST' }) }
export async function listarAuditoriaUsuario(id: string, parametros: ListarAuditoriaUsuarioParametros, signal?: AbortSignal): Promise<AuditoriaUsuarioPaginada> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina) })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaUsuarioPaginada>>(`/seguridad/usuarios/${id}/auditoria?${consulta.toString()}`, { signal })
  return respuesta.data
}
