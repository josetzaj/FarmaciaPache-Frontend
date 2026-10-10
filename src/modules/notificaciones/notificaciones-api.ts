import { solicitarApi } from '../../shared/api/cliente-api'
import type {
  ConsultaNotificaciones,
  Notificacion,
  NotificacionesPaginadas,
  ResumenNotificaciones,
} from './notificaciones.types'

type RespuestaApi<T> = { success: true; data: T }

function construirConsulta(parametros: ConsultaNotificaciones): string {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.estadoLectura) consulta.set('estadoLectura', parametros.estadoLectura)
  if (parametros.incluirArchivadas !== undefined) consulta.set('incluirArchivadas', String(parametros.incluirArchivadas))
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.prioridades?.length) consulta.set('prioridades', parametros.prioridades.join(','))
  if (parametros.modulos?.length) consulta.set('modulos', parametros.modulos.join(','))
  if (parametros.tipos?.length) consulta.set('tipos', parametros.tipos.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  return consulta.toString()
}

export async function obtenerResumenNotificaciones(signal?: AbortSignal): Promise<ResumenNotificaciones> {
  const respuesta = await solicitarApi<RespuestaApi<ResumenNotificaciones>>('/notificaciones/resumen', {
    signal,
    mostrarCargaGlobal: false,
  })
  return respuesta.data
}

export async function listarNotificaciones(
  parametros: ConsultaNotificaciones,
  signal?: AbortSignal,
  mostrarCargaGlobal = true,
): Promise<NotificacionesPaginadas> {
  const respuesta = await solicitarApi<RespuestaApi<NotificacionesPaginadas>>(
    `/notificaciones?${construirConsulta(parametros)}`,
    { signal, mostrarCargaGlobal },
  )
  return respuesta.data
}

export async function cambiarLecturaNotificacion(id: string, leida: boolean): Promise<Notificacion> {
  const respuesta = await solicitarApi<RespuestaApi<Notificacion>>(`/notificaciones/${id}/lectura`, {
    method: 'PATCH',
    datos: { leida },
  })
  return respuesta.data
}

export async function cambiarArchivoNotificacion(id: string, archivada: boolean): Promise<Notificacion> {
  const respuesta = await solicitarApi<RespuestaApi<Notificacion>>(`/notificaciones/${id}/archivo`, {
    method: 'PATCH',
    datos: { archivada },
  })
  return respuesta.data
}

export async function marcarTodasLasNotificacionesLeidas(): Promise<{ actualizadas: number }> {
  const respuesta = await solicitarApi<RespuestaApi<{ actualizadas: number }>>('/notificaciones/leer-todas', {
    method: 'POST',
  })
  return respuesta.data
}
