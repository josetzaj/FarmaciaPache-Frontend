import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { exportarCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import { convertirDiferenciaACentavos, etiquetasEntidadIncidencia, etiquetasEstadoIncidencia, etiquetasSeveridadIncidencia, formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { ConsultaCaja, IncidenciaCaja, OpcionesFiltrosCaja, ReferenciaCaja, ResultadoPaginado } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
const entidades = Object.entries(etiquetasEntidadIncidencia).map(([valor, etiqueta]) => ({ valor, etiqueta }))

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}

function claseEstado(estado: IncidenciaCaja['estado']): string {
  if (estado === 'CERRADA' || estado === 'RESUELTA') return styles.estadoExito
  if (estado === 'ABIERTA') return styles.estadoPeligro
  return styles.estadoAdvertencia
}

function claseSeveridad(severidad: IncidenciaCaja['severidad']): string {
  if (severidad === 'CRITICA' || severidad === 'ALTA') return styles.estadoPeligro
  if (severidad === 'MEDIA') return styles.estadoAdvertencia
  return styles.estadoInfo
}

export function IncidenciaListadoView({ permisos, onNavegar }: Props) {
  const [resultado, setResultado] = useState<ResultadoPaginado<IncidenciaCaja> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja['incidencias']>({ estados: [], severidades: [] })
  const [sucursales, setSucursales] = useState<ReferenciaCaja[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [diferenciaMinima, setDiferenciaMinima] = useState('')
  const [diferenciaMaxima, setDiferenciaMaxima] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const parametros = useMemo<ConsultaCaja>(() => ({
    pagina,
    tamanoPagina,
    busqueda: busqueda || undefined,
    estados: valoresFiltro(filtros, 'estado'),
    severidades: valoresFiltro(filtros, 'severidad'),
    tipos: valoresFiltro(filtros, 'entidad'),
    sucursalIds: valoresFiltro(filtros, 'sucursal'),
    diferenciaMinCentavos: diferenciaMinima ? convertirDiferenciaACentavos(diferenciaMinima) ?? undefined : undefined,
    diferenciaMaxCentavos: diferenciaMaxima ? convertirDiferenciaACentavos(diferenciaMaxima) ?? undefined : undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    orden: ordenamiento[0]?.id ?? 'fecha',
    direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, desde, diferenciaMaxima, diferenciaMinima, filtros, hasta, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesCaja(controlador.signal).then((dato) => { setOpciones(dato.incidencias ?? { estados: [], severidades: [] }); setSucursales(dato.sucursales) }).catch(() => undefined)
    return () => controlador.abort()
  }, [revision])
  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])
  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<IncidenciaCaja>('incidencias', parametros, controlador.signal)
      .then((dato) => { if (dato.totalPaginas > 0 && pagina > dato.totalPaginas) { setPagina(dato.totalPaginas); return } setResultado(dato); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las incidencias.') })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, pagina, parametros])

  const columnas = useMemo<ColumnaTabla<IncidenciaCaja>[]>(() => [
    { id: 'numero', titulo: 'Incidencia', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <strong>{item.numero}</strong> },
    { id: 'entidad', titulo: 'Origen', obtenerValor: (item) => item.entidadTipo, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar orígenes', multiple: true, opciones: entidades }, celda: (item) => <div className={styles.identidad}><strong>{etiquetasEntidadIncidencia[item.entidadTipo]}</strong><small>{item.entidadId}</small></div> },
    ...(sucursales.length ? [{ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item: IncidenciaCaja) => sucursales.find((sucursal) => sucursal.id === item.sucursalId)?.nombre ?? item.sucursalId, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })) }, celda: (item: IncidenciaCaja) => sucursales.find((sucursal) => sucursal.id === item.sucursalId)?.nombre ?? item.sucursalId }] : []),
    { id: 'severidad', titulo: 'Severidad', obtenerValor: (item) => item.severidad, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar severidades', multiple: true, buscable: false, opciones: opciones?.severidades.map((valor) => ({ valor, etiqueta: etiquetasSeveridadIncidencia[valor] })) ?? [] }, celda: (item) => <span className={`${styles.estado} ${claseSeveridad(item.severidad)}`}>{etiquetasSeveridadIncidencia[item.severidad]}</span> },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos ?? 0, celda: (item) => <strong className={item.diferenciaCentavos ? styles.montoSalida : undefined}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones?.estados.map((valor) => ({ valor, etiqueta: etiquetasEstadoIncidencia[valor] })) ?? [] }, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstadoIncidencia[item.estado]}</span> },
    { id: 'fecha', titulo: 'Creada', obtenerValor: (item) => item.creadoEn, ordenable: true, celda: (item) => formatearFechaHora(item.creadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver incidencia ${item.numero}`} onClick={() => onNavegar(`/caja/incidencias/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, opciones, sucursales])

  const hayFiltros = Boolean(busqueda || desde || hasta || diferenciaMinima || diferenciaMaxima || filtros.length)
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setDiferenciaMinima(''); setDiferenciaMaxima(''); setFiltros([]); setPagina(1) }
  const exportar = async (formato: FormatoExportacion) => { const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros; setErrorExportacion(null); try { await exportarCaja('incidencias', formato, filtrosExportacion) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar las incidencias.') } }

  return <section className={styles.pagina} aria-labelledby="titulo-incidencias"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Incidencias" onNavegar={onNavegar} /><div className={styles.filaCabecera}><div><h1 id="titulo-incidencias">Incidencias</h1><p>Investiga y resuelve diferencias sin modificar el historial financiero.</p></div>{permisos.includes('CAJA.INCIDENCIAS.CREAR') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/caja/incidencias/nueva')}><img src={iconoAgregar} alt="" />Nueva incidencia</button>}{permisos.includes('CAJA.INCIDENCIAS.EXPORTAR') && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<label className={styles.busquedaGeneral}><span>Búsqueda general</span><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder="Número, descripción o resolución" onChange={(e) => setBusquedaEntrada(e.target.value)} /></span></label></div></header>
    <div className={styles.filtrosGenerales} aria-label="Filtros generales"><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(e) => { setDesde(e.target.value); setPagina(1) }} /></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(e) => { setHasta(e.target.value); setPagina(1) }} /></label><label>Diferencia mínima (Q)<input type="number" step="0.01" value={diferenciaMinima} onChange={(e) => { setDiferenciaMinima(e.target.value); setPagina(1) }} /></label><label>Diferencia máxima (Q)<input type="number" step="0.01" value={diferenciaMaxima} onChange={(e) => { setDiferenciaMaxima(e.target.value); setPagina(1) }} /></label></div>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Incidencias registradas</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros y la exportación se procesan en el servidor.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} registros</span>}{hayFiltros && <button type="button" onClick={limpiar}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Incidencias de caja con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="incidencia" unidadPlural="incidencias" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay incidencias registradas'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Las diferencias operativas y los registros manuales aparecerán aquí.'}</p></div> : null}</article>
    <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
  </section>
}
