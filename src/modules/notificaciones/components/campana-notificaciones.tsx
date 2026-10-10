import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import {
  cambiarLecturaNotificacion,
  listarNotificaciones,
  marcarTodasLasNotificacionesLeidas,
  obtenerResumenNotificaciones,
} from '../notificaciones-api'
import {
  EVENTO_NOTIFICACIONES_ACTUALIZADAS,
  notificarActualizacionDeNotificaciones,
} from '../notificaciones-eventos'
import type { Notificacion, ResumenNotificaciones } from '../notificaciones.types'
import styles from './campana-notificaciones.module.css'

type CampanaNotificacionesProps = {
  onNavegar: (ruta: string) => void
}

const resumenInicial: ResumenNotificaciones = {
  noLeidas: 0,
  criticasNoLeidas: 0,
  ultimaCreadaEn: null,
}

function IconoCampana() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </svg>
  )
}

function etiquetaTiempo(fechaIso: string): string {
  const diferencia = Date.now() - new Date(fechaIso).getTime()
  if (!Number.isFinite(diferencia) || diferencia < 0) {
    return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fechaIso))
  }
  const minutos = Math.floor(diferencia / 60_000)
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `Hace ${dias} d`
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' }).format(new Date(fechaIso))
}

function mensajeError(error: unknown): string {
  return error instanceof ErrorApi
    ? error.message
    : 'No fue posible cargar tus notificaciones.'
}

export function CampanaNotificaciones({ onNavegar }: CampanaNotificacionesProps) {
  const [abierto, setAbierto] = useState(false)
  const [resumen, setResumen] = useState<ResumenNotificaciones>(resumenInicial)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const cargarResumen = useCallback(async (signal?: AbortSignal) => {
    try {
      setResumen(await obtenerResumenNotificaciones(signal))
    } catch (errorActual) {
      if (!signal?.aborted) setError(mensajeError(errorActual))
    }
  }, [])

  const cargarBandeja = useCallback(async (signal?: AbortSignal) => {
    setCargando(true)
    try {
      const resultado = await listarNotificaciones({
        pagina: 1,
        tamanoPagina: 50,
        estadoLectura: 'TODAS',
        incluirArchivadas: false,
        orden: 'fecha',
        direccion: 'desc',
      }, signal, false)
      setNotificaciones(resultado.items.slice(0, 6))
      setError(null)
    } catch (errorActual) {
      if (!signal?.aborted) setError(mensajeError(errorActual))
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }, [])

  const actualizar = useCallback(() => {
    void cargarResumen()
    if (abierto) void cargarBandeja()
  }, [abierto, cargarBandeja, cargarResumen])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerResumenNotificaciones(controlador.signal)
      .then((resumenActual) => setResumen(resumenActual))
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(mensajeError(errorActual))
      })
    const intervalo = window.setInterval(() => void cargarResumen(), 60_000)
    const alRecuperarFoco = () => void cargarResumen()
    window.addEventListener('focus', alRecuperarFoco)
    window.addEventListener(EVENTO_NOTIFICACIONES_ACTUALIZADAS, actualizar)
    return () => {
      controlador.abort()
      window.clearInterval(intervalo)
      window.removeEventListener('focus', alRecuperarFoco)
      window.removeEventListener(EVENTO_NOTIFICACIONES_ACTUALIZADAS, actualizar)
    }
  }, [actualizar, cargarResumen])

  useEffect(() => {
    if (!abierto) return
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false)
    }
    const cerrarAlExterior = (event: PointerEvent) => {
      if (event.target instanceof Node && !contenedorRef.current?.contains(event.target)) setAbierto(false)
    }
    document.addEventListener('keydown', cerrarConEscape)
    document.addEventListener('pointerdown', cerrarAlExterior)
    return () => {
      document.removeEventListener('keydown', cerrarConEscape)
      document.removeEventListener('pointerdown', cerrarAlExterior)
    }
  }, [abierto])

  const ejecutarYActualizar = async (clave: string, accion: () => Promise<unknown>) => {
    setAccionEnCurso(clave)
    setError(null)
    try {
      await accion()
      notificarActualizacionDeNotificaciones()
    } catch (errorActual) {
      setError(mensajeError(errorActual))
    } finally {
      setAccionEnCurso(null)
    }
  }

  const abrirNotificacion = async (notificacion: Notificacion) => {
    if (!notificacion.leidaEn) {
      await ejecutarYActualizar(notificacion.id, () => cambiarLecturaNotificacion(notificacion.id, true))
    }
    setAbierto(false)
    onNavegar(notificacion.ruta ?? '/notificaciones')
  }

  const cantidadVisible = resumen.noLeidas > 99 ? '99+' : String(resumen.noLeidas)
  const etiquetaCampana = resumen.noLeidas === 0
    ? 'Notificaciones, ninguna pendiente'
    : `Notificaciones, ${resumen.noLeidas} ${resumen.noLeidas === 1 ? 'pendiente' : 'pendientes'}`
  const alternarPanel = () => {
    const siguienteEstado = !abierto
    setAbierto(siguienteEstado)
    if (siguienteEstado) void cargarBandeja()
  }

  return (
    <div className={styles.contenedor} ref={contenedorRef}>
      <button
        className={`${styles.botonCampana} ${abierto ? styles.botonCampanaActivo : ''}`}
        type="button"
        aria-label={etiquetaCampana}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls="panel-notificaciones"
        onClick={alternarPanel}
      >
        <IconoCampana />
        {resumen.noLeidas > 0 && <span className={styles.contador}>{cantidadVisible}</span>}
        {resumen.criticasNoLeidas > 0 && <span className={styles.indicadorCritico} aria-hidden="true" />}
      </button>

      {abierto && (
        <section id="panel-notificaciones" className={styles.panel} role="dialog" aria-label="Notificaciones recientes">
          <header className={styles.cabeceraPanel}>
            <div>
              <span className={styles.sobretitulo}>Centro de actividad</span>
              <h2>Notificaciones</h2>
            </div>
            {resumen.noLeidas > 0 && (
              <button
                className={styles.marcarTodas}
                type="button"
                disabled={accionEnCurso === 'todas'}
                onClick={() => void ejecutarYActualizar('todas', marcarTodasLasNotificacionesLeidas)}
              >
                {accionEnCurso === 'todas' ? 'Actualizando…' : 'Marcar todas como leídas'}
              </button>
            )}
          </header>

          {resumen.criticasNoLeidas > 0 && (
            <div className={styles.resumenCritico} role="status">
              <span aria-hidden="true">!</span>
              <p><strong>{resumen.criticasNoLeidas}</strong> {resumen.criticasNoLeidas === 1 ? 'aviso crítico requiere' : 'avisos críticos requieren'} tu atención.</p>
            </div>
          )}

          {error && (
            <div className={styles.error} role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => void cargarBandeja()}>Reintentar</button>
            </div>
          )}

          <div className={styles.lista} aria-live="polite" aria-busy={cargando}>
            {cargando && notificaciones.length === 0 ? (
              <div className={styles.estadoPanel}><span className={styles.cargador} aria-hidden="true" /><p>Cargando notificaciones…</p></div>
            ) : notificaciones.length === 0 && !error ? (
              <div className={styles.estadoPanel}>
                <span className={styles.estadoIcono} aria-hidden="true"><IconoCampana /></span>
                <strong>Todo está al día</strong>
                <p>No tienes notificaciones pendientes por revisar.</p>
              </div>
            ) : (
              notificaciones.map((notificacion) => (
                <article
                  key={notificacion.id}
                  className={`${styles.notificacion} ${!notificacion.leidaEn ? styles.noLeida : ''}`}
                >
                  <span className={`${styles.marcaPrioridad} ${styles[`prioridad${notificacion.prioridad}`]}`} aria-hidden="true" />
                  <button
                    className={styles.contenidoNotificacion}
                    type="button"
                    disabled={accionEnCurso === notificacion.id}
                    onClick={() => void abrirNotificacion(notificacion)}
                  >
                    <span className={styles.meta}>
                      <span>{notificacion.modulo.replaceAll('_', ' ')}</span>
                      <time dateTime={notificacion.creadoEn}>{etiquetaTiempo(notificacion.creadoEn)}</time>
                    </span>
                    <strong>{notificacion.titulo}</strong>
                    <span className={styles.mensaje}>{notificacion.mensaje}</span>
                  </button>
                  {!notificacion.leidaEn && (
                    <button
                      className={styles.botonLeida}
                      type="button"
                      aria-label={`Marcar como leída: ${notificacion.titulo}`}
                      title="Marcar como leída"
                      disabled={accionEnCurso === notificacion.id}
                      onClick={() => void ejecutarYActualizar(notificacion.id, () => cambiarLecturaNotificacion(notificacion.id, true))}
                    >
                      <span aria-hidden="true">✓</span>
                    </button>
                  )}
                </article>
              ))
            )}
          </div>

          <footer className={styles.piePanel}>
            <button type="button" onClick={() => { setAbierto(false); onNavegar('/notificaciones') }}>
              Ver todas las notificaciones <span aria-hidden="true">→</span>
            </button>
          </footer>
        </section>
      )}
    </div>
  )
}
