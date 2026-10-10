import { useEffect, useState } from 'react'
import { mensajeErrorReporte } from '../reportes-formatos'

export function useReporteRemoto<T, F>(
  filtros: F,
  consultar: (filtros: F, signal: AbortSignal) => Promise<T>,
  mensajeError: string,
) {
  const [reporte, setReporte] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultar(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, mensajeError))
      })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [consultar, filtros, mensajeError, revision])

  return {
    reporte,
    cargando,
    error,
    reportarError: setError,
    iniciarConsulta: () => setCargando(true),
    reintentar: () => { setCargando(true); setRevision((valor) => valor + 1) },
  }
}
