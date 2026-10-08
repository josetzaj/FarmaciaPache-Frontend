import { construirUrlApi, ErrorApi } from './cliente-api'
import { iniciarCargaGlobal } from '../carga/estado-carga-global'

type RespuestaErrorApi = {
  error?: {
    code?: string
    message?: string
    details?: Array<{ campo: string; mensaje: string }>
  }
}

type OpcionesDescarga = Omit<RequestInit, 'body'> & {
  datos?: unknown
  nombreArchivoAlternativo: string
}

async function solicitarArchivo(ruta: string, opciones: OpcionesDescarga): Promise<{ archivo: Blob; nombre: string }> {
  const { datos, nombreArchivoAlternativo, headers: headersIniciales, ...requestInit } = opciones
  const headers = new Headers(headersIniciales)
  headers.set('Accept', 'application/pdf, application/octet-stream, application/json')
  if (datos !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(construirUrlApi(ruta), {
    ...requestInit,
    headers,
    credentials: 'include',
    body: datos === undefined ? undefined : JSON.stringify(datos),
  })
  if (!response.ok) throw await crearErrorApi(response)
  return { archivo: await response.blob(), nombre: obtenerNombreArchivo(response, nombreArchivoAlternativo) }
}

function obtenerNombreArchivo(response: Response, alternativo: string): string {
  const disposicion = response.headers.get('Content-Disposition') ?? ''
  const utf8 = disposicion.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const basico = disposicion.match(/filename="([^"]+)"/i)?.[1]
  let nombre = alternativo

  if (utf8) {
    try {
      nombre = decodeURIComponent(utf8)
    } catch {
      nombre = alternativo
    }
  } else if (basico) {
    nombre = basico
  }

  return nombre.replace(/[\\/:*?"<>|]/g, '_')
}

async function crearErrorApi(response: Response): Promise<ErrorApi> {
  let contenido: RespuestaErrorApi | null = null
  try {
    contenido = await response.json() as RespuestaErrorApi
  } catch {
    contenido = null
  }

  return new ErrorApi(
    contenido?.error?.code ?? 'ERROR_HTTP',
    response.status,
    contenido?.error?.details ?? [],
    contenido?.error?.message ?? `La API respondió con estado ${response.status}.`,
  )
}

export async function descargarArchivoApi(
  ruta: string,
  opciones: OpcionesDescarga,
): Promise<void> {
  const finalizarCarga = iniciarCargaGlobal()

  try {
    const { archivo, nombre } = await solicitarArchivo(ruta, opciones)
    const enlace = document.createElement('a')
    const url = URL.createObjectURL(archivo)
    enlace.href = url
    enlace.download = nombre
    enlace.hidden = true
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } finally {
    finalizarCarga()
  }
}

export async function abrirPdfApi(ruta: string, opciones: OpcionesDescarga): Promise<void> {
  const finalizarCarga = iniciarCargaGlobal()
  const ventana = window.open('about:blank', '_blank')
  if (ventana) {
    ventana.opener = null
    ventana.document.title = 'Generando PDF…'
  }
  try {
    const { archivo, nombre } = await solicitarArchivo(ruta, opciones)
    const url = URL.createObjectURL(archivo)
    if (ventana) {
      ventana.location.replace(url)
    } else {
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombre
      enlace.hidden = true
      document.body.append(enlace)
      enlace.click()
      enlace.remove()
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    ventana?.close()
    throw error
  } finally {
    finalizarCarga()
  }
}
