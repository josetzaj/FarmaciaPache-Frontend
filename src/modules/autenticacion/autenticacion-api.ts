import { solicitarApi } from '../../shared/api/cliente-api'
import type {
  IniciarSesionRequest,
  RespuestaApi,
  SesionUsuario,
} from './autenticacion.types'

export async function iniciarSesion(
  datos: IniciarSesionRequest,
  signal?: AbortSignal,
): Promise<SesionUsuario> {
  const respuesta = await solicitarApi<RespuestaApi<SesionUsuario>>(
    '/autenticacion/iniciar-sesion',
    {
      method: 'POST',
      datos,
      signal,
    },
  )

  return respuesta.data
}

export async function obtenerSesionActual(signal?: AbortSignal): Promise<SesionUsuario> {
  const respuesta = await solicitarApi<RespuestaApi<SesionUsuario>>(
    '/autenticacion/mi-sesion',
    { signal },
  )

  return respuesta.data
}

export async function cerrarSesion(): Promise<void> {
  await solicitarApi<null>('/autenticacion/cerrar-sesion', { method: 'POST' })
}
