import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import {
  cambiarArchivoNotificacion,
  cambiarLecturaNotificacion,
  listarNotificaciones,
  marcarTodasLasNotificacionesLeidas,
  obtenerResumenNotificaciones,
} from '../notificaciones-api'
import {
  EVENTO_NOTIFICACIONES_ACTUALIZADAS,
  notificarActualizacionDeNotificaciones,
} from '../notificaciones-eventos'
import type {
  EstadoLecturaNotificacion,
  Notificacion,
  NotificacionesPaginadas,
  OrdenNotificacion,
  PrioridadNotificacion,
  ResumenNotificaciones,
} from '../notificaciones.types'
import styles from './notificaciones-view.module.css'

type NotificacionesViewProps = {
  onNavegar: (ruta: string) => void
}

const etiquetasPrioridad: Record<PrioridadNotificacion, string> = {
  INFORMATIVA: 'Informativa',
  ADVERTENCIA: 'Advertencia',
  CRITICA: 'Crítica',
}

const opcionesPrioridad = Object.entries(etiquetasPrioridad).map(([valor, etiqueta]) => ({ valor, etiqueta }))

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}

function fechaCompleta(fechaIso: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

function nombreModulo(codigo: string): string {
  return codigo
    .replaceAll('_', ' ')
    .toLocaleLowerCase('es-GT')
    .replace(/^./, (letra) => letra.toLocaleUpperCase('es-GT'))
}

function Icono({ nombre }: { nombre: 'buscar' | 'campana' | 'abrir' | 'archivo' | 'lectura' }) {
  const trazos = {
    buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    campana: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    abrir: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    archivo: <><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></>,
    lectura: <><path d="M4 12.5 9 17l11-11" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{trazos[nombre]}</svg>
}

export function NotificacionesView({ onNavegar }: NotificacionesViewProps) {
  const [resultado, setResultado] = useState<NotificacionesPaginadas | null>(null)
  const [resumen, setResumen] = useState<ResumenNotificaciones | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState<50 | 100 | 150 | 200>(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estadoLectura, setEstadoLectura] = useState<EstadoLecturaNotificacion>('TODAS')
  const [incluirArchivadas, setIncluirArchivadas] = useState(false)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [error, setError] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const prioridades = useMemo(
    () => valoresFiltro(filtros, 'prioridad') as PrioridadNotificacion[] | undefined,
    [filtros],
  )
  const orden = (ordenamiento[0]?.id ?? 'fecha') as OrdenNotificacion
  const direccion = ordenamiento[0]?.desc === false ? 'asc' : 'desc'
  const hayFiltros = Boolean(busqueda || prioridades?.length || estadoLectura !== 'TODAS' || incluirArchivadas)

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' '))
      setPagina(1)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  useEffect(() => {
    const actualizar = () => setRevision((valor) => valor + 1)
    window.addEventListener(EVENTO_NOTIFICACIONES_ACTUALIZADAS, actualizar)
    return () => window.removeEventListener(EVENTO_NOTIFICACIONES_ACTUALIZADAS, actualizar)
  }, [])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      listarNotificaciones({
        pagina,
        tamanoPagina,
        estadoLectura,
        incluirArchivadas,
        busqueda: busqueda || undefined,
        prioridades,
        orden,
        direccion,
      }, controlador.signal),
      obtenerResumenNotificaciones(controlador.signal),
    ]).then(([lista, resumenActual]) => {
      if (lista.totalPaginas > 0 && pagina > lista.totalPaginas) {
        setPagina(lista.totalPaginas)
        return
      }
      setResultado(lista)
      setResumen(resumenActual)
      setError(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) {
        setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las notificaciones.')
      }
    })
    return () => controlador.abort()
  }, [busqueda, direccion, estadoLectura, incluirArchivadas, orden, pagina, prioridades, revision, tamanoPagina])

  const ejecutarAccion = useCallback(async (clave: string, accion: () => Promise<unknown>) => {
    setAccionEnCurso(clave)
    setErrorAccion(null)
    try {
      await accion()
      notificarActualizacionDeNotificaciones()
      return true
    } catch (errorActual) {
      setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible actualizar la notificación.')
      return false
    } finally {
      setAccionEnCurso(null)
    }
  }, [])

  const abrirNotificacion = useCallback(async (notificacion: Notificacion) => {
    if (!notificacion.leidaEn) {
      await ejecutarAccion(notificacion.id, () => cambiarLecturaNotificacion(notificacion.id, true))
    }
    if (notificacion.ruta) onNavegar(notificacion.ruta)
  }, [ejecutarAccion, onNavegar])

  const columnas = useMemo<ColumnaTabla<Notificacion>[]>(() => [
    {
      id: 'titulo',
      titulo: 'Notificación',
      obtenerValor: (notificacion) => notificacion.titulo,
      ordenable: true,
      celda: (notificacion) => (
        <div className={`${styles.identidadNotificacion} ${!notificacion.leidaEn ? styles.identidadNoLeida : ''}`}>
          <span className={styles.puntoLectura} aria-hidden="true" />
          <strong>{notificacion.titulo}</strong>
          <small>{notificacion.mensaje}</small>
        </div>
      ),
    },
    {
      id: 'prioridad',
      titulo: 'Prioridad',
      obtenerValor: (notificacion) => notificacion.prioridad,
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Prioridad',
        multiple: true,
        buscable: false,
        opciones: opcionesPrioridad,
      },
      celda: (notificacion) => (
        <span className={`${styles.prioridad} ${styles[`prioridad${notificacion.prioridad}`]}`}>
          {etiquetasPrioridad[notificacion.prioridad]}
        </span>
      ),
    },
    {
      id: 'modulo',
      titulo: 'Origen',
      obtenerValor: (notificacion) => notificacion.modulo,
      ordenable: true,
      celda: (notificacion) => (
        <div className={styles.origen}>
          <strong>{nombreModulo(notificacion.modulo)}</strong>
          <small>{notificacion.submodulo ? nombreModulo(notificacion.submodulo) : notificacion.tipo.replaceAll('_', ' ')}</small>
        </div>
      ),
    },
    {
      id: 'fecha',
      titulo: 'Fecha',
      obtenerValor: (notificacion) => notificacion.creadoEn,
      ordenable: true,
      celda: (notificacion) => <time className={styles.fecha} dateTime={notificacion.creadoEn}>{fechaCompleta(notificacion.creadoEn)}</time>,
    },
    {
      id: 'acciones',
      titulo: 'Acciones',
      tituloSoloLectores: true,
      obtenerValor: () => '',
      celda: (notificacion) => (
        <div className={styles.accionesFila}>
          <button
            type="button"
            title={notificacion.leidaEn ? 'Marcar como no leída' : 'Marcar como leída'}
            aria-label={`${notificacion.leidaEn ? 'Marcar como no leída' : 'Marcar como leída'}: ${notificacion.titulo}`}
            disabled={accionEnCurso === notificacion.id}
            onClick={() => void ejecutarAccion(notificacion.id, () => cambiarLecturaNotificacion(notificacion.id, !notificacion.leidaEn))}
          >
            <Icono nombre="lectura" />
          </button>
          <button
            type="button"
            title={notificacion.archivadaEn ? 'Restaurar' : 'Archivar'}
            aria-label={`${notificacion.archivadaEn ? 'Restaurar' : 'Archivar'}: ${notificacion.titulo}`}
            disabled={accionEnCurso === notificacion.id}
            onClick={() => void ejecutarAccion(notificacion.id, () => cambiarArchivoNotificacion(notificacion.id, !notificacion.archivadaEn))}
          >
            <Icono nombre="archivo" />
          </button>
          {notificacion.ruta && (
            <button
              className={styles.accionPrincipal}
              type="button"
              title="Abrir elemento relacionado"
              aria-label={`Abrir elemento relacionado con: ${notificacion.titulo}`}
              disabled={accionEnCurso === notificacion.id}
              onClick={() => void abrirNotificacion(notificacion)}
            >
              <Icono nombre="abrir" />
            </button>
          )}
        </div>
      ),
    },
  ], [accionEnCurso, abrirNotificacion, ejecutarAccion])

  const limpiarFiltros = () => {
    setBusquedaEntrada('')
    setBusqueda('')
    setEstadoLectura('TODAS')
    setIncluirArchivadas(false)
    setFiltros([])
    setPagina(1)
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-notificaciones">
      <header className={styles.cabeceraPagina}>
        <button className={styles.volver} type="button" onClick={() => onNavegar('/')}>
          <span aria-hidden="true">←</span> Inicio
        </button>
        <div className={styles.presentacion}>
          <div className={styles.iconoPrincipal}><Icono nombre="campana" /></div>
          <div>
            <span className={styles.sobretitulo}>Centro de actividad</span>
            <h1 id="titulo-notificaciones">Tus notificaciones</h1>
            <p>Avisos dirigidos a tu usuario según tus permisos y la sucursal de tu sesión.</p>
          </div>
          <div className={styles.metricas} aria-label="Resumen de notificaciones">
            <div><strong>{resumen?.noLeidas ?? 0}</strong><span>Sin leer</span></div>
            <div className={styles.metricaCritica}><strong>{resumen?.criticasNoLeidas ?? 0}</strong><span>Críticas</span></div>
          </div>
        </div>
      </header>

      <div className={styles.barraHerramientas}>
        <div className={styles.estados} aria-label="Filtrar por estado de lectura">
          {([
            ['TODAS', 'Todas'],
            ['NO_LEIDAS', 'No leídas'],
            ['LEIDAS', 'Leídas'],
          ] as const).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              className={estadoLectura === valor ? styles.estadoActivo : undefined}
              aria-pressed={estadoLectura === valor}
              onClick={() => { setEstadoLectura(valor); setPagina(1) }}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <form className={styles.busqueda} role="search" onSubmit={(event) => event.preventDefault()}>
          <label className={styles.soloLectores} htmlFor="buscar-notificaciones">Buscar notificaciones</label>
          <Icono nombre="buscar" />
          <input
            id="buscar-notificaciones"
            type="search"
            maxLength={150}
            value={busquedaEntrada}
            placeholder="Buscar por título, mensaje o tipo"
            onChange={(event) => setBusquedaEntrada(event.target.value)}
          />
          {busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}
        </form>

        <label className={styles.controlArchivadas}>
          <input
            type="checkbox"
            checked={incluirArchivadas}
            onChange={(event) => { setIncluirArchivadas(event.target.checked); setPagina(1) }}
          />
          <span>Mostrar archivadas</span>
        </label>

        {(resumen?.noLeidas ?? 0) > 0 && (
          <button
            className={styles.botonLeidas}
            type="button"
            disabled={accionEnCurso === 'todas'}
            onClick={() => void ejecutarAccion('todas', marcarTodasLasNotificacionesLeidas)}
          >
            <Icono nombre="lectura" />
            {accionEnCurso === 'todas' ? 'Actualizando…' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      {errorAccion && <div className={styles.alertaError} role="alert">{errorAccion}</div>}

      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}>
          <div>
            <strong>Bandeja personal</strong>
            <small>Solo aparecen avisos vigentes que corresponden a tu usuario.</small>
          </div>
          <div className={styles.accionesResumen}>
            <span>{resultado?.total ?? 0} {resultado?.total === 1 ? 'notificación' : 'notificaciones'}</span>
            {hayFiltros && <button type="button" onClick={limpiarFiltros}>Restablecer filtros</button>}
          </div>
        </div>

        {error ? (
          <div className={styles.estadoVacio} role="alert">
            <div className={styles.estadoVacioIcono}><Icono nombre="campana" /></div>
            <h2>No fue posible cargar las notificaciones</h2>
            <p>{error}</p>
            <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>
          </div>
        ) : resultado?.items.length ? (
          <>
            <TablaDatos
              descripcion="Listado de notificaciones personales"
              datos={resultado.items}
              columnas={columnas}
              filtros={filtros}
              ordenamiento={ordenamiento}
              obtenerIdFila={(notificacion) => notificacion.id}
              onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }}
              onOrdenamientoChange={(valor) => {
                setOrdenamiento(valor.length ? valor : [{ id: 'fecha', desc: true }])
                setPagina(1)
              }}
            />
            <PaginacionTabla
              pagina={resultado.pagina}
              tamanoPagina={resultado.tamanoPagina}
              total={resultado.total}
              totalPaginas={resultado.totalPaginas}
              unidadSingular="notificación"
              unidadPlural="notificaciones"
              onPaginaChange={setPagina}
              onTamanoPaginaChange={(valor) => { setTamanoPagina(valor as 50 | 100 | 150 | 200); setPagina(1) }}
            />
          </>
        ) : resultado ? (
          <div className={styles.estadoVacio}>
            <div className={styles.estadoVacioIcono}><Icono nombre="campana" /></div>
            <h2>{hayFiltros ? 'Sin coincidencias' : 'Todo está al día'}</h2>
            <p>{hayFiltros ? 'No encontramos notificaciones con los criterios seleccionados.' : 'Cuando una operación requiera tu atención, aparecerá aquí.'}</p>
            {hayFiltros && <button type="button" onClick={limpiarFiltros}>Restablecer filtros</button>}
          </div>
        ) : (
          <div className={styles.estadoVacio} aria-busy="true">
            <span className={styles.cargador} aria-hidden="true" />
            <h2>Cargando notificaciones</h2>
          </div>
        )}
      </article>
    </section>
  )
}
