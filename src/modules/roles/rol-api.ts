import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarRolRequest,
  AuditoriaRolPaginada,
  CatalogoPermisos,
  CrearRolRequest,
  ExportarRolesParametros,
  ListarAuditoriaRolParametros,
  ListarRolesParametros,
  Rol,
  RolesPaginados,
} from './rol.types'

type RespuestaApi<T> = { success: true; data: T }

function fechaArchivoActual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function listarRoles(
  parametros: ListarRolesParametros,
  signal?: AbortSignal,
): Promise<RolesPaginados> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.rol) consulta.set('rol', parametros.rol)
  if (parametros.permisoIds?.length) consulta.set('permisoIds', parametros.permisoIds.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)

  const respuesta = await solicitarApi<RespuestaApi<RolesPaginados>>(
    `/seguridad/roles?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function exportarRoles(parametros: ExportarRolesParametros): Promise<void> {
  await descargarArchivoApi('/seguridad/roles/exportaciones', {
    method: 'POST',
    datos: parametros,
    nombreArchivoAlternativo: `roles_y_permisos_${fechaArchivoActual()}.${parametros.formato}`,
  })
}

export async function obtenerRol(rolId: string, signal?: AbortSignal): Promise<Rol> {
  const respuesta = await solicitarApi<RespuestaApi<Rol>>(`/seguridad/roles/${rolId}`, { signal })
  return respuesta.data
}

export async function obtenerCatalogoPermisos(signal?: AbortSignal): Promise<CatalogoPermisos> {
  const respuesta = await solicitarApi<RespuestaApi<CatalogoPermisos>>(
    '/seguridad/permisos/catalogo',
    { signal },
  )
  return respuesta.data
}

export async function crearRol(datos: CrearRolRequest): Promise<Rol> {
  const respuesta = await solicitarApi<RespuestaApi<Rol>>('/seguridad/roles', {
    method: 'POST',
    datos,
  })
  return respuesta.data
}

export async function actualizarRol(rolId: string, datos: ActualizarRolRequest): Promise<Rol> {
  const respuesta = await solicitarApi<RespuestaApi<Rol>>(`/seguridad/roles/${rolId}`, {
    method: 'PUT',
    datos,
  })
  return respuesta.data
}

export async function asignarPermisosRol(
  rolId: string,
  version: number,
  permisosIds: string[],
): Promise<Rol> {
  const respuesta = await solicitarApi<RespuestaApi<Rol>>(`/seguridad/roles/${rolId}/permisos`, {
    method: 'PUT',
    datos: { version, permisosIds },
  })
  return respuesta.data
}

export async function inactivarRol(rolId: string, version: number, motivo: string): Promise<void> {
  await solicitarApi<null>(`/seguridad/roles/${rolId}/inactivar`, {
    method: 'PATCH',
    datos: { version, motivo },
  })
}

export async function listarAuditoriaRol(
  rolId: string,
  parametros: ListarAuditoriaRolParametros,
  signal?: AbortSignal,
): Promise<AuditoriaRolPaginada> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)

  const respuesta = await solicitarApi<RespuestaApi<AuditoriaRolPaginada>>(
    `/seguridad/roles/${rolId}/auditoria?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}
