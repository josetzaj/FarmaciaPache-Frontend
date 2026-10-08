import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../api/cliente-api'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../components/tabla-datos'
import type {
  CargarAuditoria,
  ConsultaAuditoria,
  EventoAuditoria,
  OrdenAuditoria,
} from './auditoria.types'
import styles from './pista-auditoria.module.css'

type PistaAuditoriaProps = {
  claveEntidad: string
  descripcion: string
  etiquetasOperacion: Readonly<Record<string, string>>
  cargarEventos: CargarAuditoria
  revision?: string | number
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

function textoFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length > 0 ? valores : undefined
}

function mostrarValor(valor: string | null, tipoDato: string | null): string {
  if (valor === null || valor === '') return 'Sin valor'
  if (tipoDato === 'BOOLEAN') {
    if (valor === 'true' || valor === '1') return 'Sí'
    if (valor === 'false' || valor === '0') return 'No'
  }
  if (tipoDato === 'DATE' || tipoDato === 'TIMESTAMP') {
    const fecha = new Date(valor)
    if (!Number.isNaN(fecha.getTime())) {
      return tipoDato === 'DATE'
        ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' }).format(fecha)
        : fechaHora(valor)
    }
  }
  return valor
}

function DetalleCambios({ evento }: { evento: EventoAuditoria }) {
  return (
    <div className={styles.detalleAuditoria} id={`detalle-auditoria-${evento.id}`}>
      <h3>Cambios registrados</h3>
      <div className={styles.tablaCambiosContenedor}>
        <table>
          <caption className={styles.soloLectores}>Cambios del evento de auditoría</caption>
          <thead>
            <tr><th scope="col">Campo</th><th scope="col">Valor anterior</th><th scope="col">Valor nuevo</th></tr>
          </thead>
          <tbody>
            {evento.detalles.map((detalle) => (
              <tr key={detalle.id}>
                <th scope="row">{detalle.etiquetaPropiedad ?? detalle.nombrePropiedad}</th>
                <td>{mostrarValor(detalle.valorAnterior, detalle.tipoDato)}</td>
                <td>{mostrarValor(detalle.valorNuevo, detalle.tipoDato)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PistaAuditoria({
  claveEntidad,
  descripcion,
  etiquetasOperacion,
  cargarEventos,
  revision = 0,
}: PistaAuditoriaProps) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<CargarAuditoria>> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [reintento, setReintento] = useState(0)

  const parametros = useMemo<ConsultaAuditoria>(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      fecha: textoFiltro(filtros, 'fecha'),
      operaciones: valoresFiltro(filtros, 'operacion'),
      usuario: textoFiltro(filtros, 'usuario'),
      sucursal: textoFiltro(filtros, 'sucursal'),
      resumen: textoFiltro(filtros, 'resumen'),
      orden: (orden?.id ?? 'fecha') as OrdenAuditoria,
      direccion: orden?.desc === false ? 'asc' : 'desc',
    }
  }, [filtros, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(
    () => JSON.stringify({ claveEntidad, parametros, reintento, revision }),
    [claveEntidad, parametros, reintento, revision],
  )
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void cargarEventos(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setResultado(respuesta)
        setExpandido(null)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (controlador.signal.aborted) return
        setError(errorActual instanceof ErrorApi
          ? errorActual.message
          : 'No fue posible cargar la pista de auditoría.')
      })
      .finally(() => {
        if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud)
      })
    return () => controlador.abort()
  }, [cargarEventos, claveSolicitud, pagina, parametros])

  const opcionesOperacion = useMemo(
    () => Object.entries(etiquetasOperacion).map(([valor, etiqueta]) => ({ valor, etiqueta })),
    [etiquetasOperacion],
  )
  const columnas = useMemo<ColumnaTabla<EventoAuditoria>[]>(() => [
    {
      id: 'fecha', titulo: 'Fecha y hora', obtenerValor: (evento) => evento.ocurridoEn,
      ordenable: true, filtro: { tipo: 'fecha', etiqueta: 'Fecha del evento' },
      celda: (evento) => fechaHora(evento.ocurridoEn),
    },
    {
      id: 'operacion', titulo: 'Acción', obtenerValor: (evento) => evento.tipoOperacion,
      ordenable: true,
      filtro: { tipo: 'opciones', etiqueta: 'Seleccionar acciones', buscable: false, opciones: opcionesOperacion },
      celda: (evento) => <span className={styles.accion}>{etiquetasOperacion[evento.tipoOperacion] ?? evento.tipoOperacion}</span>,
    },
    {
      id: 'usuario', titulo: 'Realizado por', obtenerValor: (evento) => evento.usuarioNombre ?? 'SISTEMA',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar usuario', placeholder: 'Nombre de usuario' },
      celda: (evento) => evento.usuarioNombre ?? 'SISTEMA',
    },
    {
      id: 'sucursal', titulo: 'Sucursal', obtenerValor: (evento) => evento.sucursal?.nombre ?? '',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar sucursal', placeholder: 'Nombre o código' },
      celda: (evento) => evento.sucursal
        ? <span className={styles.sucursal}><strong>{evento.sucursal.nombre}</strong><small>{evento.sucursal.codigo}</small></span>
        : <span className={styles.sinDato}>Sin sucursal</span>,
    },
    {
      id: 'resumen', titulo: 'Resumen', obtenerValor: (evento) => evento.resumen ?? '',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar resumen', placeholder: 'Descripción de la acción' },
      celda: (evento) => evento.resumen ?? 'Sin resumen',
    },
    {
      id: 'cambios', titulo: 'Cambios', tituloSoloLectores: true,
      obtenerValor: (evento) => evento.detalles.length,
      celda: (evento) => evento.detalles.length > 0 ? (
        <button
          className={styles.botonCambios}
          type="button"
          aria-expanded={expandido === evento.id}
          aria-controls={`detalle-auditoria-${evento.id}`}
          onClick={() => setExpandido((actual) => actual === evento.id ? null : evento.id)}
        >
          {expandido === evento.id ? 'Ocultar' : `Ver (${evento.detalles.length})`}
        </button>
      ) : <span className={styles.sinDato}>Sin detalle</span>,
    },
  ], [etiquetasOperacion, expandido, opcionesOperacion])

  return (
    <article className={styles.panel} aria-busy={cargando}>
      <header className={styles.cabecera}>
        <div><h2>Pista de auditoría</h2><p>{descripcion}</p></div>
        <div className={styles.resumen}>
          {cargando && <span role="status">Actualizando…</span>}
          {resultado && <span>{resultado.total} {resultado.total === 1 ? 'evento' : 'eventos'}</span>}
          {filtros.length > 0 && (
            <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>
              Limpiar filtros ({filtros.length})
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setReintento((actual) => actual + 1)}>Reintentar</button>
        </div>
      )}
      {!resultado && cargando ? (
        <p className={styles.mensaje}>Cargando pista de auditoría…</p>
      ) : resultado?.items.length ? (
        <div className={styles.tabla}>
          <TablaDatos
            descripcion="Pista de auditoría con filtros por columna"
            datos={resultado.items}
            columnas={columnas}
            filtros={filtros}
            ordenamiento={ordenamiento}
            obtenerIdFila={(evento) => evento.id}
            onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }}
            onOrdenamientoChange={(siguiente) => {
              setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }])
              setPagina(1)
            }}
            renderizarFilaExpandida={(evento) => evento.id === expandido ? <DetalleCambios evento={evento} /> : null}
          />
          <PaginacionTabla
            pagina={resultado.pagina}
            tamanoPagina={resultado.tamanoPagina}
            total={resultado.total}
            totalPaginas={resultado.totalPaginas}
            unidadSingular="evento"
            unidadPlural="eventos"
            onPaginaChange={setPagina}
            onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }}
          />
        </div>
      ) : !error ? (
        <div className={styles.vacio}>
          <h3>{filtros.length ? 'Sin coincidencias' : 'Sin eventos de auditoría'}</h3>
          <p>{filtros.length ? 'Ajusta o limpia los filtros aplicados.' : 'Todavía no hay acciones registradas para este elemento.'}</p>
        </div>
      ) : null}
    </article>
  )
}
