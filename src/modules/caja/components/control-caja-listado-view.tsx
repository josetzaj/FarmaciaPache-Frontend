import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { exportarCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import { convertirDiferenciaACentavos, convertirQuetzalesACentavos, etiquetasEstadoArqueo, etiquetasEstadoCierre, etiquetasTipoArqueo, etiquetasTipoCaja, formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { ArqueoCaja, CierreCaja, ConsultaCaja, EstadoArqueoCaja, EstadoCierreCaja, OpcionesFiltrosCaja, ResultadoPaginado } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
type RecursoControl = 'arqueos' | 'cierres'
type RegistroControl = ArqueoCaja | CierreCaja

const opcionesIniciales: OpcionesFiltrosCaja = {
  cajas: { opciones: [], estados: [], tipos: [] }, sucursales: [], turnos: { estados: [] },
  movimientos: { estados: [], tipos: [] }, arqueos: { estados: [], tipos: [] }, cierres: { estados: [] }, transferencias: { estados: [], custodias: [] }, depositos: { estados: [] },
  tamanosPagina: [50, 100, 150, 200],
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}

function claseEstadoArqueo(estado: EstadoArqueoCaja): string {
  if (estado === 'APROBADO') return styles.estadoExito
  if (estado === 'INVESTIGACION') return styles.estadoPeligro
  if (estado === 'PENDIENTE_APROBACION') return styles.estadoAdvertencia
  return styles.estadoInfo
}

function claseEstadoCierre(estado: EstadoCierreCaja): string {
  if (estado === 'SIN_DIFERENCIA' || estado === 'APROBADO') return styles.estadoExito
  if (estado === 'INVESTIGACION' || estado === 'FALTANTE') return styles.estadoPeligro
  if (estado === 'SOBRANTE') return styles.estadoAdvertencia
  return styles.estadoNeutral
}

function ControlCajaListadoView({ recurso, permisos, onNavegar }: Props & { recurso: RecursoControl }) {
  const esArqueo = recurso === 'arqueos'
  const [resultado, setResultado] = useState<ResultadoPaginado<RegistroControl> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja>(opcionesIniciales)
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

  const cajaIdsFiltradas = useMemo(() => {
    const tiposSeleccionados = valoresFiltro(filtros, 'tipoCaja')
    if (!tiposSeleccionados?.length) return undefined
    return opciones.cajas.opciones.filter((caja) => tiposSeleccionados.includes(caja.tipo)).map((caja) => caja.id)
  }, [filtros, opciones.cajas.opciones])

  const parametros = useMemo<ConsultaCaja>(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined,
    sucursalIds: valoresFiltro(filtros, 'sucursal'),
    cajaIds: cajaIdsFiltradas,
    estados: valoresFiltro(filtros, 'estado'),
    tipos: esArqueo ? valoresFiltro(filtros, 'tipo') : undefined,
    desde: desde || undefined, hasta: hasta || undefined,
    montoMinCentavos: montoMinimo ? convertirQuetzalesACentavos(montoMinimo) ?? undefined : undefined,
    montoMaxCentavos: montoMaximo ? convertirQuetzalesACentavos(montoMaximo) ?? undefined : undefined,
    diferenciaMinCentavos: diferenciaMinima ? convertirDiferenciaACentavos(diferenciaMinima) ?? undefined : undefined,
    diferenciaMaxCentavos: diferenciaMaxima ? convertirDiferenciaACentavos(diferenciaMaxima) ?? undefined : undefined,
    orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, cajaIdsFiltradas, desde, diferenciaMaxima, diferenciaMinima, esArqueo, filtros, hasta, montoMaximo, montoMinimo, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ recurso, parametros, revision }), [parametros, recurso, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesCaja(controlador.signal).then((datos) => { setOpciones(datos); setErrorOpciones(null) }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setErrorOpciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las opciones de filtros.')
    })
    return () => controlador.abort()
  }, [revision])

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<RegistroControl>(recurso, parametros, controlador.signal).then((datos) => {
      if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }
      setResultado(datos); setError(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : `No fue posible cargar ${esArqueo ? 'los arqueos' : 'los cierres'}.`)
    }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, esArqueo, pagina, parametros, recurso])

  const opcionesSucursales = useMemo(() => opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })), [opciones.sucursales])
  const columnaSucursal = useMemo(() => opcionesSucursales.length ? [{
    id: 'sucursal', titulo: 'Sucursal', obtenerValor: (registro: RegistroControl) => opciones.sucursales.find((x) => x.id === ('sucursalId' in registro ? registro.sucursalId : ''))?.nombre ?? '',
    filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: opcionesSucursales },
    celda: (registro: RegistroControl) => opciones.sucursales.find((x) => x.id === ('sucursalId' in registro ? registro.sucursalId : ''))?.nombre ?? 'Sucursal activa',
  }] : [], [opciones.sucursales, opcionesSucursales])
  const columnasArqueos = useMemo<ColumnaTabla<ArqueoCaja>[]>(() => [
    { id: 'numero', titulo: 'Arqueo', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <strong>{item.numero}</strong> },
    { id: 'turno', titulo: 'Turno', obtenerValor: (item) => item.turnoNumero ?? item.turnoId, celda: (item) => item.turnoNumero ?? item.turnoId },
    { id: 'tipoCaja', titulo: 'Tipo de caja', obtenerValor: (item) => item.caja?.tipo ?? '', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos de caja', multiple: true, buscable: false, opciones: opciones.cajas.tipos.map((tipoCaja) => ({ valor: tipoCaja, etiqueta: etiquetasTipoCaja[tipoCaja] })) }, celda: (item) => item.caja?.tipo ? <span className={`${styles.estado} ${item.caja.tipo === 'CAJA_CHICA' ? styles.estadoInfo : styles.estadoNeutral}`}>{etiquetasTipoCaja[item.caja.tipo]}</span> : <span className={styles.sinDato}>No disponible</span> },
    { id: 'tipo', titulo: 'Tipo', obtenerValor: (item) => item.tipo, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos', multiple: true, opciones: opciones.arqueos.tipos.map((tipo) => ({ valor: tipo, etiqueta: etiquetasTipoArqueo[tipo] })) }, celda: (item) => etiquetasTipoArqueo[item.tipo] },
    ...columnaSucursal as ColumnaTabla<ArqueoCaja>[],
    { id: 'monto', titulo: 'Declarado', obtenerValor: (item) => item.declaradoCentavos, celda: (item) => formatearCentavos(item.declaradoCentavos) },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos, ordenable: true, celda: (item) => <strong className={item.diferenciaCentavos === 0 ? undefined : styles.montoSalida}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.arqueos.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoArqueo[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseEstadoArqueo(item.estado)}`}>{etiquetasEstadoArqueo[item.estado]}</span> },
    { id: 'fecha', titulo: 'Registro', obtenerValor: (item) => item.ocurridoEn, ordenable: true, celda: (item) => formatearFechaHora(item.ocurridoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver arqueo ${item.numero}`} onClick={() => onNavegar(`/caja/arqueos/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones.arqueos, opciones.cajas.tipos])
  const columnasCierres = useMemo<ColumnaTabla<CierreCaja>[]>(() => [
    { id: 'numero', titulo: 'Cierre', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.numero}</strong><small>Versión {item.versionCierre}</small></div> },
    { id: 'turno', titulo: 'Turno', obtenerValor: (item) => item.turnoNumero ?? item.turnoId, celda: (item) => item.turnoNumero ?? item.turnoId },
    { id: 'tipoCaja', titulo: 'Tipo de caja', obtenerValor: (item) => item.caja?.tipo ?? '', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos de caja', multiple: true, buscable: false, opciones: opciones.cajas.tipos.map((tipoCaja) => ({ valor: tipoCaja, etiqueta: etiquetasTipoCaja[tipoCaja] })) }, celda: (item) => item.caja?.tipo ? <span className={`${styles.estado} ${item.caja.tipo === 'CAJA_CHICA' ? styles.estadoInfo : styles.estadoNeutral}`}>{etiquetasTipoCaja[item.caja.tipo]}</span> : <span className={styles.sinDato}>No disponible</span> },
    ...columnaSucursal as ColumnaTabla<CierreCaja>[],
    { id: 'monto', titulo: 'Declarado', obtenerValor: (item) => item.declaradoCentavos, ordenable: true, celda: (item) => formatearCentavos(item.declaradoCentavos) },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos, ordenable: true, celda: (item) => <strong className={item.diferenciaCentavos === 0 ? undefined : styles.montoSalida}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.cierres.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoCierre[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseEstadoCierre(item.estado)}`}>{etiquetasEstadoCierre[item.estado]}</span> },
    { id: 'fecha', titulo: 'Cierre', obtenerValor: (item) => item.cerradoEn, ordenable: true, celda: (item) => formatearFechaHora(item.cerradoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver cierre ${item.numero}`} onClick={() => onNavegar(`/caja/cierres/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones.cajas.tipos, opciones.cierres])

  const hayFiltros = Boolean(busqueda || desde || hasta || montoMinimo || montoMaximo || diferenciaMinima || diferenciaMaxima || filtros.length)
  const limpiarFiltros = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setMontoMinimo(''); setMontoMaximo(''); setDiferenciaMinima(''); setDiferenciaMaxima(''); setFiltros([]); setPagina(1) }
  const exportar = async (formato: FormatoExportacion) => {
    setErrorExportacion(null)
    const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros
    try { await exportarCaja(recurso, formato, filtrosExportacion) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la exportación.') }
  }
  const puedeCrear = permisos.includes(esArqueo ? 'CAJA.ARQUEOS.REGISTRAR' : 'CAJA.TURNOS.CERRAR')
  const puedeExportar = permisos.includes(esArqueo ? 'CAJA.ARQUEOS.EXPORTAR' : 'CAJA.CIERRES.EXPORTAR')
  const titulo = esArqueo ? 'Arqueos de caja' : 'Cierres de caja'
  const rutaNueva = esArqueo ? '/caja/arqueos/nuevo' : '/caja/cierres/nuevo'

  return <section className={styles.pagina} aria-labelledby="titulo-listado-control-caja">
    <header className={styles.cabeceraPagina}>
      <CajaBreadcrumb seccion={esArqueo ? 'Arqueos' : 'Cierres'} onNavegar={onNavegar} />
      <div className={styles.filaCabecera}><div><h1 id="titulo-listado-control-caja">{titulo}</h1><p>{esArqueo ? 'Consulta conteos, diferencias, aprobaciones y trazabilidad.' : 'Consulta cierres, reaperturas y versiones conservadas por turno.'}</p></div>
        {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar(rutaNueva)}><img src={iconoAgregar} alt="" />{esArqueo ? 'Registrar arqueo' : 'Cerrar turno'}</button>}
        {puedeExportar && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}
        <label className={styles.busquedaGeneral}><span>Búsqueda general</span><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder={esArqueo ? 'Número o explicación' : 'Número o motivo'} onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></span></label>
      </div>
    </header>
    <div className={`${styles.filtrosGenerales} ${styles.filtrosSeis}`} aria-label="Filtros generales">
      <label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(e) => { setDesde(e.target.value); setPagina(1) }} /></label>
      <label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(e) => { setHasta(e.target.value); setPagina(1) }} /></label>
      <label>Declarado mínimo (Q)<input type="number" min="0" step="0.01" value={montoMinimo} placeholder="0.00" onChange={(e) => { setMontoMinimo(e.target.value); setPagina(1) }} /></label>
      <label>Declarado máximo (Q)<input type="number" min="0" step="0.01" value={montoMaximo} placeholder="0.00" onChange={(e) => { setMontoMaximo(e.target.value); setPagina(1) }} /></label>
      <label>Diferencia mínima (Q)<input type="number" step="0.01" value={diferenciaMinima} placeholder="-100.00" onChange={(e) => { setDiferenciaMinima(e.target.value); setPagina(1) }} /></label>
      <label>Diferencia máxima (Q)<input type="number" step="0.01" value={diferenciaMaxima} placeholder="100.00" onChange={(e) => { setDiferenciaMaxima(e.target.value); setPagina(1) }} /></label>
    </div>
    {errorOpciones && <div className={styles.alertaError} role="alert"><p>{errorOpciones}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>{titulo}</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros y la exportación se procesan en el servidor.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} registros</span>}{hayFiltros && <button type="button" onClick={limpiarFiltros}>Limpiar filtros</button>}</div></div>
      {resultado?.items.length ? <><TablaDatos descripcion={`${titulo} con filtros por columna`} datos={resultado.items} columnas={(esArqueo ? columnasArqueos : columnasCierres) as ColumnaTabla<RegistroControl>[]} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(s) => { setFiltros(s); setPagina(1) }} onOrdenamientoChange={(s) => { setOrdenamiento(s.length ? s : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={esArqueo ? 'arqueo' : 'cierre'} unidadPlural={esArqueo ? 'arqueos' : 'cierres'} onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : `No hay ${esArqueo ? 'arqueos' : 'cierres'} registrados`}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : `Los ${esArqueo ? 'arqueos' : 'cierres'} aparecerán conforme se complete la operación.`}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar(rutaNueva)}>{esArqueo ? 'Registrar arqueo' : 'Cerrar turno'}</button>}</div> : null}
    </article>
    <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
  </section>
}

export function ArqueoListadoView(props: Props) { return <ControlCajaListadoView {...props} recurso="arqueos" /> }
export function CierreListadoView(props: Props) { return <ControlCajaListadoView {...props} recurso="cierres" /> }
