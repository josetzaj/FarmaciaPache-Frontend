import { solicitarApi } from '../../shared/api/cliente-api'
import type { RespuestaApi } from './autenticacion.types'
import type {
  EstadoEnlaceRecuperacion,
  MensajeRecuperacion,
  RestablecerContrasenaRequest,
  SolicitarRecuperacionRequest,
  ValidarEnlaceRecuperacionRequest,
} from './recuperacion.types'

export async function solicitarRecuperacion(
  datos: SolicitarRecuperacionRequest,
): Promise<MensajeRecuperacion> {
  const respuesta = await solicitarApi<RespuestaApi<MensajeRecuperacion>>(
    '/autenticacion/solicitar-recuperacion',
    {
      method: 'POST',
      datos,
    },
  )

  return respuesta.data
}

export async function restablecerContrasena(
  datos: RestablecerContrasenaRequest,
): Promise<void> {
  await solicitarApi<null>('/autenticacion/restablecer-contrasena', {
    method: 'POST',
    datos,
  })
}

export async function activarCuenta(
  datos: RestablecerContrasenaRequest,
): Promise<void> {
  await solicitarApi<null>('/autenticacion/activar-cuenta', {
    method: 'POST',
    datos,
  })
}

export async function validarEnlaceRecuperacion(
  datos: ValidarEnlaceRecuperacionRequest,
  signal?: AbortSignal,
): Promise<EstadoEnlaceRecuperacion> {
  const respuesta = await solicitarApi<RespuestaApi<EstadoEnlaceRecuperacion>>(
    '/autenticacion/validar-enlace-recuperacion',
    {
      method: 'POST',
      datos,
      signal,
    },
  )

  return respuesta.data
}

export async function validarEnlaceActivacion(
  datos: ValidarEnlaceRecuperacionRequest,
  signal?: AbortSignal,
): Promise<EstadoEnlaceRecuperacion> {
  const respuesta = await solicitarApi<RespuestaApi<EstadoEnlaceRecuperacion>>(
    '/autenticacion/validar-enlace-activacion',
    {
      method: 'POST',
      datos,
      signal,
    },
  )

  return respuesta.data
}
