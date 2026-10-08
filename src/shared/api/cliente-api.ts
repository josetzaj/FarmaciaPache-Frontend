import { env } from '../../config/env'
import { iniciarCargaGlobal } from '../carga/estado-carga-global'

export type DetalleErrorApi = {
  campo: string
  mensaje: string
}

type RespuestaErrorApi = {
  success?: false
  error?: {
    code?: string
    message?: string
    details?: DetalleErrorApi[]
  }
}

type OpcionesSolicitud = Omit<RequestInit, 'body'> & {
  datos?: unknown
}

export class ErrorApi extends Error {
  public readonly codigo: string
  public readonly estadoHttp: number
  public readonly detalles: readonly DetalleErrorApi[]

  constructor(
    codigo: string,
    estadoHttp: number,
    detalles: readonly DetalleErrorApi[] = [],
    mensaje = 'No fue posible completar la solicitud.',
  ) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.codigo = codigo
    this.estadoHttp = estadoHttp
    this.detalles = detalles
  }
}

export function construirUrlApi(ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta
  if (ruta.startsWith('/api/')) return new URL(ruta, env.apiUrl).toString()

  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`
  return `${env.apiUrl}${rutaNormalizada}`
}

async function leerRespuesta(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contenido = await response.text()
  return contenido ? JSON.parse(contenido) : null
}

export async function solicitarApi<T>(
  ruta: string,
  opciones: OpcionesSolicitud = {},
): Promise<T> {
  const finalizarCarga = iniciarCargaGlobal()
  const { datos, headers: headersIniciales, ...requestInit } = opciones
  const headers = new Headers(headersIniciales)
  const esFormulario = datos instanceof FormData
  headers.set('Accept', 'application/json')

  if (datos !== undefined && !esFormulario) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(construirUrlApi(ruta), {
      ...requestInit,
      headers,
      credentials: 'include',
      body: datos === undefined
        ? undefined
        : esFormulario
          ? datos
          : JSON.stringify(datos),
    })

    const contenido = await leerRespuesta(response)

    if (!response.ok) {
      const respuestaError = contenido as RespuestaErrorApi | null
      throw new ErrorApi(
        respuestaError?.error?.code ?? 'ERROR_HTTP',
        response.status,
        respuestaError?.error?.details ?? [],
        respuestaError?.error?.message ?? `La API respondió con estado ${response.status}.`,
      )
    }

    return contenido as T
  } finally {
    finalizarCarga()
  }
}
