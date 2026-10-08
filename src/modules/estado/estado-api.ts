import { solicitarApi } from '../../shared/api/cliente-api'

export type EstadoApiRespuesta = {
  success: true
  message: string
}

export function obtenerEstadoApi(signal?: AbortSignal): Promise<EstadoApiRespuesta> {
  return solicitarApi<EstadoApiRespuesta>('/health', { signal })
}
