import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { exportarCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import { convertirDiferenciaACentavos, convertirQuetzalesACentavos, etiquetasCustodia, etiquetasEstadoDeposito, etiquetasEstadoTransferencia, formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { ConsultaCaja, DepositoEfectivo, EstadoDepositoEfectivo, EstadoTransferenciaEfectivo, OpcionesFiltrosCaja, ResultadoPaginado, TransferenciaEfectivo } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
type RecursoCustodia = 'transferencias' | 'depositos'
type RegistroCustodia = TransferenciaEfectivo | DepositoEfectivo
const opcionesIniciales: OpcionesFiltrosCaja = {
  cajas: { opciones: [], estados: [], tipos: [] }, sucursales: [], turnos: { estados: [] }, movimientos: { estados: [], tipos: [] },
  arqueos: { estados: [], tipos: [] }, cierres: { estados: [] }, transferencias: { estados: [], custodias: [] }, depositos: { estados: [] }, tamanosPagina: [50, 100, 150, 200],
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}
function claseTransferencia(estado: EstadoTransferenciaEfectivo): string {
  if (estado === 'RECIBIDA') return styles.estadoExito
  if (estado === 'RECHAZADA' || estado === 'CANCELADA') return styles.estadoPeligro
  if (estado === 'ENTREGADA') return styles.estadoAdvertencia
  return styles.estadoInfo
}
function claseDeposito(estado: EstadoDepositoEfectivo): string {
  if (estado === 'CONFIRMADO') return styles.estadoExito
  if (estado === 'DIFERENCIA' || estado === 'CANCELADO') return styles.estadoPeligro
  if (estado === 'PREPARADO' || estado === 'EN_CUSTODIA') return styles.estadoAdvertencia
  return styles.estadoInfo
}

function CustodiaListadoView({ recurso, permisos, onNavegar }: Props & { recurso: RecursoCustodia }) {
  const esTransferencia = recurso === 'transferencias'
  const [resultado, setResultado] = useState<ResultadoPaginado<RegistroCustodia> | null>(null)
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

  const parametros = useMemo<ConsultaCaja>(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined, sucursalIds: valoresFiltro(filtros, 'sucursal'), estados: valoresFiltro(filtros, 'estado'),
    custodias: esTransferencia ? valoresFiltro(filtros, 'custodia') : undefined,
    desde: desde || undefined, hasta: hasta || undefined,
    montoMinCentavos: montoMinimo ? convertirQuetzalesACentavos(montoMinimo) ?? undefined : undefined,
    montoMaxCentavos: montoMaximo ? convertirQuetzalesACentavos(montoMaximo) ?? undefined : undefined,
    diferenciaMinCentavos: !esTransferencia && diferenciaMinima ? convertirDiferenciaACentavos(diferenciaMinima) ?? undefined : undefined,
    diferenciaMaxCentavos: !esTransferencia && diferenciaMaxima ? convertirDiferenciaACentavos(diferenciaMaxima) ?? undefined : undefined,
    orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, desde, diferenciaMaxima, diferenciaMinima, esTransferencia, filtros, hasta, montoMaximo, montoMinimo, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ recurso, parametros, revision }), [parametros, recurso, revision])
  const cargando = solicitudFinalizada !== claveSolicitud
  useEffect(() => { const controlador = new AbortController(); void obtenerOpcionesCaja(controlador.signal).then((dato) => { setOpciones(dato); setErrorOpciones(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorOpciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las opciones de filtros.') }); return () => controlador.abort() }, [revision])
  useEffect(() => { const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400); return () => window.clearTimeout(temporizador) }, [busquedaEntrada])
  useEffect(() => { const controlador = new AbortController(); void listarCaja<RegistroCustodia>(recurso, parametros, controlador.signal).then((dato) => { if (dato.totalPaginas > 0 && pagina > dato.totalPaginas) { setPagina(dato.totalPaginas); return } setResultado(dato); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : `No fue posible cargar ${esTransferencia ? 'las transferencias' : 'los depósitos'}.`) }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) }); return () => controlador.abort() }, [claveSolicitud, esTransferencia, pagina, parametros, recurso])

  const opcionesSucursales = useMemo(() => opciones.sucursales.map((item) => ({ valor: item.id, etiqueta: item.nombre, descripcion: item.codigo })), [opciones.sucursales])
  const columnaSucursal = useMemo(() => opcionesSucursales.length ? [{ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item: RegistroCustodia) => opciones.sucursales.find((x) => x.id === item.sucursalId)?.nombre ?? item.sucursalId, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: opcionesSucursales }, celda: (item: RegistroCustodia) => opciones.sucursales.find((x) => x.id === item.sucursalId)?.nombre ?? item.sucursalId }] : [], [opciones.sucursales, opcionesSucursales])
  const columnasTransferencias = useMemo<ColumnaTabla<TransferenciaEfectivo>[]>(() => [
    { id: 'numero', titulo: 'Transferencia', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <strong>{item.numero}</strong> },
    { id: 'origen', titulo: 'Turno origen', obtenerValor: (item) => item.turnoOrigenNumero ?? item.turnoOrigenId ?? '', celda: (item) => item.turnoOrigenNumero ?? item.turnoOrigenId ?? 'Sin turno' },
    { id: 'custodia', titulo: 'Destino', obtenerValor: (item) => item.custodiaDestino, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar custodias', multiple: true, opciones: opciones.transferencias.custodias.map((estado) => ({ valor: estado, etiqueta: etiquetasCustodia[estado] })) }, celda: (item) => <div className={styles.identidad}><strong>{etiquetasCustodia[item.custodiaDestino]}</strong><small>{item.cajaDestino?.nombre ?? 'Sin caja destino'}</small></div> },
    ...columnaSucursal as ColumnaTabla<TransferenciaEfectivo>[],
    { id: 'monto', titulo: 'Monto', obtenerValor: (item) => item.montoCentavos, ordenable: true, celda: (item) => <strong>{formatearCentavos(item.montoCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.transferencias.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoTransferencia[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseTransferencia(item.estado)}`}>{etiquetasEstadoTransferencia[item.estado]}</span> },
    { id: 'fecha', titulo: 'Entrega', obtenerValor: (item) => item.entregadoEn ?? item.creadoEn, ordenable: true, celda: (item) => formatearFechaHora(item.entregadoEn ?? item.creadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver transferencia ${item.numero}`} onClick={() => onNavegar(`/caja/transferencias/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones.transferencias])
  const columnasDepositos = useMemo<ColumnaTabla<DepositoEfectivo>[]>(() => [
    { id: 'numero', titulo: 'Depósito', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.numero}</strong><small>{item.referenciaBancaria ?? 'Sin referencia bancaria'}</small></div> },
    { id: 'cuenta', titulo: 'Cuenta bancaria', obtenerValor: (item) => item.cuenta?.alias ?? item.cuentaBancariaId, celda: (item) => <div className={styles.identidad}><strong>{item.cuenta?.alias ?? 'Cuenta'}</strong><small>{item.cuenta ? `${item.cuenta.banco} · ${item.cuenta.cuentaEnmascarada}` : item.cuentaBancariaId}</small></div> },
    ...columnaSucursal as ColumnaTabla<DepositoEfectivo>[],
    { id: 'monto', titulo: 'Preparado', obtenerValor: (item) => item.montoPreparadoCentavos, ordenable: true, celda: (item) => formatearCentavos(item.montoPreparadoCentavos) },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferenciaCentavos ?? 0, ordenable: true, celda: (item) => <strong className={item.diferenciaCentavos ? styles.montoSalida : undefined}>{formatearCentavos(item.diferenciaCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.depositos.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoDeposito[estado] })) }, celda: (item) => <span className={`${styles.estado} ${claseDeposito(item.estado)}`}>{etiquetasEstadoDeposito[item.estado]}</span> },
    { id: 'fecha', titulo: 'Preparación', obtenerValor: (item) => item.preparadoEn, ordenable: true, celda: (item) => formatearFechaHora(item.preparadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver depósito ${item.numero}`} onClick={() => onNavegar(`/caja/depositos/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [columnaSucursal, onNavegar, opciones.depositos])

  const hayFiltros = Boolean(busqueda || desde || hasta || montoMinimo || montoMaximo || diferenciaMinima || diferenciaMaxima || filtros.length)
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setMontoMinimo(''); setMontoMaximo(''); setDiferenciaMinima(''); setDiferenciaMaxima(''); setFiltros([]); setPagina(1) }
  const exportar = async (formato: FormatoExportacion) => { const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros; setErrorExportacion(null); try { await exportarCaja(recurso, formato, filtrosExportacion) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la exportación.') } }
  const puedeCrear = permisos.includes(esTransferencia ? 'CAJA.TRANSFERENCIAS.CREAR' : 'CAJA.DEPOSITOS.PREPARAR')
  const puedeExportar = permisos.includes(esTransferencia ? 'CAJA.TRANSFERENCIAS.EXPORTAR' : 'CAJA.DEPOSITOS.EXPORTAR')
  const titulo = esTransferencia ? 'Custodia y transferencias' : 'Depósitos bancarios'
  const rutaNueva = esTransferencia ? '/caja/transferencias/nueva' : '/caja/depositos/nuevo'
  return <section className={styles.pagina} aria-labelledby="titulo-listado-custodia"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion={titulo} onNavegar={onNavegar} /><div className={styles.filaCabecera}><div><h1 id="titulo-listado-custodia">{titulo}</h1><p>{esTransferencia ? 'Controla entregas, recepción y ubicación física del efectivo.' : 'Controla preparación, registro bancario, evidencia y confirmación.'}</p></div>{puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar(rutaNueva)}><img src={iconoAgregar} alt="" />{esTransferencia ? 'Nueva transferencia' : 'Preparar depósito'}</button>}{puedeExportar && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<label className={styles.busquedaGeneral}><span>Búsqueda general</span><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder={esTransferencia ? 'Número, bolsa, sello o motivo' : 'Número, referencia, bolsa o sello'} onChange={(e) => setBusquedaEntrada(e.target.value)} /></span></label></div></header>
    <div className={`${styles.filtrosGenerales} ${!esTransferencia ? styles.filtrosSeis : ''}`} aria-label="Filtros generales"><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(e) => { setDesde(e.target.value); setPagina(1) }} /></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(e) => { setHasta(e.target.value); setPagina(1) }} /></label><label>Monto mínimo (Q)<input type="number" min="0" step="0.01" value={montoMinimo} placeholder="0.00" onChange={(e) => { setMontoMinimo(e.target.value); setPagina(1) }} /></label><label>Monto máximo (Q)<input type="number" min="0" step="0.01" value={montoMaximo} placeholder="0.00" onChange={(e) => { setMontoMaximo(e.target.value); setPagina(1) }} /></label>{!esTransferencia && <><label>Diferencia mínima (Q)<input type="number" step="0.01" value={diferenciaMinima} placeholder="-100.00" onChange={(e) => { setDiferenciaMinima(e.target.value); setPagina(1) }} /></label><label>Diferencia máxima (Q)<input type="number" step="0.01" value={diferenciaMaxima} placeholder="100.00" onChange={(e) => { setDiferenciaMaxima(e.target.value); setPagina(1) }} /></label></>}</div>
    {errorOpciones && <div className={styles.alertaError} role="alert"><p>{errorOpciones}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}{error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>{titulo}</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros y la exportación se procesan en el servidor.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} registros</span>}{hayFiltros && <button type="button" onClick={limpiar}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion={`${titulo} con filtros por columna`} datos={resultado.items} columnas={(esTransferencia ? columnasTransferencias : columnasDepositos) as ColumnaTabla<RegistroCustodia>[]} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(s) => { setFiltros(s); setPagina(1) }} onOrdenamientoChange={(s) => { setOrdenamiento(s.length ? s : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={esTransferencia ? 'transferencia' : 'depósito'} unidadPlural={esTransferencia ? 'transferencias' : 'depósitos'} onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : `No hay ${esTransferencia ? 'transferencias' : 'depósitos'} registrados`}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : `Los ${esTransferencia ? 'traslados de custodia' : 'depósitos bancarios'} aparecerán al registrar la primera operación.`}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar(rutaNueva)}>{esTransferencia ? 'Nueva transferencia' : 'Preparar depósito'}</button>}</div> : null}</article>
    <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
  </section>
}
export function TransferenciaListadoView(props: Props) { return <CustodiaListadoView {...props} recurso="transferencias" /> }
export function DepositoListadoView(props: Props) { return <CustodiaListadoView {...props} recurso="depositos" /> }
