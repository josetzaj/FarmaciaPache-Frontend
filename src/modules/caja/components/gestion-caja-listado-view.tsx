import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { exportarCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import { convertirDiferenciaACentavos, convertirQuetzalesACentavos, etiquetasEstadoConciliacion, etiquetasEstadoConsolidacion, etiquetasEstadoRendicion, etiquetasTipoConciliacion, formatearCentavos, formatearFecha } from '../caja-formatos'
import type { ConciliacionCaja, ConsolidacionDiariaCaja, ConsultaCaja, OpcionesFiltrosCaja, RendicionRepartidor, ResultadoPaginado } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type RecursoGestion = 'rendiciones' | 'conciliaciones' | 'consolidaciones'
type RegistroGestion = RendicionRepartidor | ConciliacionCaja | ConsolidacionDiariaCaja
type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void; recurso: RecursoGestion }

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}

function claseEstado(valor: string): string {
  if (['APROBADA', 'CONCILIADA'].includes(valor)) return styles.estadoExito
  if (['INVESTIGACION', 'DIFERENCIA'].includes(valor)) return styles.estadoPeligro
  if (['PENDIENTE_APROBACION', 'PENDIENTE', 'PARCIAL'].includes(valor)) return styles.estadoAdvertencia
  return styles.estadoNeutral
}

export function GestionCajaListadoView({ permisos, onNavegar, recurso }: Props) {
  const [resultado, setResultado] = useState<ResultadoPaginado<RegistroGestion> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [montoMinimo, setMontoMinimo] = useState('')
  const [montoMaximo, setMontoMaximo] = useState('')
  const [diferenciaMinima, setDiferenciaMinima] = useState('')
  const [diferenciaMaxima, setDiferenciaMaxima] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const parametros = useMemo<ConsultaCaja>(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined,
    sucursalIds: valoresFiltro(filtros, 'sucursal'),
    repartidorIds: recurso === 'rendiciones' ? valoresFiltro(filtros, 'repartidor') : undefined,
    estados: valoresFiltro(filtros, 'estado'),
    tipos: recurso === 'conciliaciones' ? valoresFiltro(filtros, 'tipo') : undefined,
    desde: desde || undefined, hasta: hasta || undefined,
    montoMinCentavos: montoMinimo ? convertirQuetzalesACentavos(montoMinimo) ?? undefined : undefined,
    montoMaxCentavos: montoMaximo ? convertirQuetzalesACentavos(montoMaximo) ?? undefined : undefined,
    diferenciaMinCentavos: diferenciaMinima ? convertirDiferenciaACentavos(diferenciaMinima) ?? undefined : undefined,
    diferenciaMaxCentavos: diferenciaMaxima ? convertirDiferenciaACentavos(diferenciaMaxima) ?? undefined : undefined,
    orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, desde, diferenciaMaxima, diferenciaMinima, filtros, hasta, montoMaximo, montoMinimo, ordenamiento, pagina, recurso, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ parametros, recurso, revision }), [parametros, recurso, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => { const controlador = new AbortController(); void obtenerOpcionesCaja(controlador.signal).then((dato) => { setOpciones(dato); setErrorOpciones(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorOpciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las opciones de filtros.') }); return () => controlador.abort() }, [revision])
  useEffect(() => { const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400); return () => window.clearTimeout(temporizador) }, [busquedaEntrada])
  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<RegistroGestion>(recurso, parametros, controlador.signal).then((dato) => { if (dato.totalPaginas > 0 && pagina > dato.totalPaginas) { setPagina(dato.totalPaginas); return } setResultado(dato); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la información.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, pagina, parametros, recurso])

  const sucursales = useMemo(() => (opciones?.sucursales ?? []).map((item) => ({ valor: item.id, etiqueta: item.nombre, descripcion: item.codigo })), [opciones])
  const columnaSucursal = useMemo(() => sucursales.length ? [{ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item: RegistroGestion) => opciones?.sucursales.find((sucursal) => sucursal.id === item.sucursalId)?.nombre ?? item.sucursalId, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: sucursales }, celda: (item: RegistroGestion) => opciones?.sucursales.find((sucursal) => sucursal.id === item.sucursalId)?.nombre ?? ('sucursal' in item ? item.sucursal?.nombre : null) ?? 'Sucursal activa' }] : [], [opciones, sucursales])

  const columnasRendicion = useMemo<ColumnaTabla<RendicionRepartidor>[]>(() => [
    { id: 'numero', titulo: 'Rendición', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <strong>{item.numero}</strong> },
    { id: 'repartidor', titulo: 'Repartidor', obtenerValor: (item) => item.repartidorNombre, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar repartidores', multiple: true, opciones: (opciones?.repartidores ?? []).map((item) => ({ valor: item.id, etiqueta: item.nombre, descripcion: item.codigo })) }, celda: (item) => item.repartidorNombre },
    ...columnaSucursal as ColumnaTabla<RendicionRepartidor>[],
    { id: 'monto', titulo: 'Entregado', obtenerValor: (item) => item.efectivoEntregadoCentavos, ordenable: true, celda: (item) => formatearCentavos(item.efectivoEntregadoCentavos) },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos, ordenable: true, celda: (item) => <strong className={item.diferenciaCentavos === 0 ? undefined : styles.montoSalida}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, opciones: (opciones?.rendiciones?.estados ?? []).map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoRendicion[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstadoRendicion[item.estado]}</span> },
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.fechaNegocio, ordenable: true, celda: (item) => formatearFecha(item.fechaNegocio) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver rendición ${item.numero}`} onClick={() => onNavegar(`/caja/rendiciones/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones])

  const columnasConciliacion = useMemo<ColumnaTabla<ConciliacionCaja>[]>(() => [
    { id: 'numero', titulo: 'Conciliación', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <strong>{item.numero}</strong> },
    { id: 'tipo', titulo: 'Origen', obtenerValor: (item) => item.tipo, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar orígenes', multiple: true, opciones: (opciones?.conciliaciones?.tipos ?? []).map((tipo) => ({ valor: tipo, etiqueta: etiquetasTipoConciliacion[tipo] })) }, celda: (item) => <div className={styles.identidad}><strong>{etiquetasTipoConciliacion[item.tipo]}</strong><small>{item.referenciaNumero}</small></div> },
    ...columnaSucursal as ColumnaTabla<ConciliacionCaja>[],
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos, ordenable: true, celda: (item) => <strong className={!item.diferenciaCentavos ? undefined : styles.montoSalida}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, opciones: (opciones?.conciliaciones?.estados ?? []).map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoConciliacion[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstadoConciliacion[item.estado]}</span> },
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.fechaNegocio, ordenable: true, celda: (item) => formatearFecha(item.fechaNegocio) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver conciliación ${item.numero}`} onClick={() => onNavegar(`/caja/conciliaciones/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones])

  const columnasConsolidacion = useMemo<ColumnaTabla<ConsolidacionDiariaCaja>[]>(() => [
    { id: 'numero', titulo: 'Consolidación', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.numero}</strong><small>Versión {item.versionConsolidacion}</small></div> },
    ...columnaSucursal as ColumnaTabla<ConsolidacionDiariaCaja>[],
    { id: 'saldo', titulo: 'Saldo teórico', obtenerValor: (item) => item.saldoTeoricoCentavos, ordenable: true, celda: (item) => formatearCentavos(item.saldoTeoricoCentavos) },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCierresCentavos, ordenable: true, celda: (item) => <strong className={item.diferenciaCierresCentavos === 0 ? undefined : styles.montoSalida}>{formatearCentavos(item.diferenciaCierresCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, opciones: (opciones?.consolidaciones?.estados ?? []).map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoConsolidacion[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstadoConsolidacion[item.estado]}</span> },
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.fechaNegocio, ordenable: true, celda: (item) => formatearFecha(item.fechaNegocio) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver consolidación ${item.numero}`} onClick={() => onNavegar(`/caja/consolidaciones/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones])

  const configuracion = recurso === 'rendiciones'
    ? { seccion: 'Rendiciones' as const, titulo: 'Rendiciones de repartidores', descripcion: 'Recibe, investiga y aprueba el efectivo cobrado por repartidores.', rutaNueva: '/caja/rendiciones/nueva', permisoCrear: 'CAJA.RENDICIONES.REGISTRAR', singular: 'rendición', plural: 'rendiciones', columnas: columnasRendicion as ColumnaTabla<RegistroGestion>[] }
    : recurso === 'conciliaciones'
      ? { seccion: 'Conciliaciones' as const, titulo: 'Conciliaciones formales', descripcion: 'Compara turnos, depósitos y rendiciones conservando sus importes históricos.', rutaNueva: '/caja/conciliaciones/nueva', permisoCrear: 'CAJA.CONCILIACIONES.CREAR', singular: 'conciliación', plural: 'conciliaciones', columnas: columnasConciliacion as ColumnaTabla<RegistroGestion>[] }
      : { seccion: 'Consolidaciones' as const, titulo: 'Consolidaciones diarias', descripcion: permisos.includes('CAJA.CORPORATIVO.VER') ? 'Consulta el cierre diario por sucursal y el alcance corporativo.' : 'Resume turnos, rendiciones, depósitos e incidencias de la sucursal activa.', rutaNueva: '/caja/consolidaciones/nueva', permisoCrear: 'CAJA.CONSOLIDACIONES.GENERAR', singular: 'consolidación', plural: 'consolidaciones', columnas: columnasConsolidacion as ColumnaTabla<RegistroGestion>[] }
  const puedeCrear = permisos.includes(configuracion.permisoCrear)
  const puedeExportar = permisos.includes(`CAJA.${recurso.toUpperCase()}.EXPORTAR`)
  const hayFiltros = Boolean(busqueda || desde || hasta || montoMinimo || montoMaximo || diferenciaMinima || diferenciaMaxima || filtros.length)
  const limpiarFiltros = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setMontoMinimo(''); setMontoMaximo(''); setDiferenciaMinima(''); setDiferenciaMaxima(''); setFiltros([]); setPagina(1) }
  const exportar = async (formato: FormatoExportacion) => { const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros; try { await exportarCaja(recurso, formato, filtrosExportacion) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la exportación.') } }

  return <section className={styles.pagina} aria-labelledby="titulo-listado-gestion-caja"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion={configuracion.seccion} onNavegar={onNavegar} /><div className={styles.filaCabecera}><div><h1 id="titulo-listado-gestion-caja">{configuracion.titulo}</h1><p>{configuracion.descripcion}</p></div>{puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar(configuracion.rutaNueva)}><img src={iconoAgregar} alt="" />{recurso === 'rendiciones' ? 'Registrar rendición' : recurso === 'conciliaciones' ? 'Crear conciliación' : 'Generar consolidación'}</button>}{puedeExportar && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<label className={styles.busquedaGeneral}><span>Búsqueda general</span><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder={recurso === 'rendiciones' ? 'Número, repartidor o referencia' : 'Número o referencia'} onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></span></label></div></header>
    <div className={`${styles.filtrosGenerales} ${styles.filtrosSeis}`} aria-label="Filtros generales"><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} /></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} /></label><label>Monto mínimo (Q)<input type="number" min="0" step="0.01" value={montoMinimo} onChange={(evento) => { setMontoMinimo(evento.target.value); setPagina(1) }} /></label><label>Monto máximo (Q)<input type="number" min="0" step="0.01" value={montoMaximo} onChange={(evento) => { setMontoMaximo(evento.target.value); setPagina(1) }} /></label><label>Diferencia mínima (Q)<input type="number" step="0.01" value={diferenciaMinima} onChange={(evento) => { setDiferenciaMinima(evento.target.value); setPagina(1) }} /></label><label>Diferencia máxima (Q)<input type="number" step="0.01" value={diferenciaMaxima} onChange={(evento) => { setDiferenciaMaxima(evento.target.value); setPagina(1) }} /></label></div>
    {errorOpciones && <div className={styles.alertaError} role="alert"><p>{errorOpciones}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}{error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>{configuracion.titulo}</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros, el ordenamiento y la exportación se procesan en el servidor.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} registros</span>}{hayFiltros && <button type="button" onClick={limpiarFiltros}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion={`${configuracion.titulo} con filtros por columna`} datos={resultado.items} columnas={configuracion.columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={configuracion.singular} unidadPlural={configuracion.plural} onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : `No hay ${configuracion.plural} registradas`}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Los registros aparecerán conforme se complete la operación.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar(configuracion.rutaNueva)}>Iniciar registro</button>}</div> : null}</article>
    <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
  </section>
}

export function RendicionListadoView(props: Omit<Props, 'recurso'>) { return <GestionCajaListadoView {...props} recurso="rendiciones" /> }
export function ConciliacionListadoView(props: Omit<Props, 'recurso'>) { return <GestionCajaListadoView {...props} recurso="conciliaciones" /> }
export function ConsolidacionListadoView(props: Omit<Props, 'recurso'>) { return <GestionCajaListadoView {...props} recurso="consolidaciones" /> }
