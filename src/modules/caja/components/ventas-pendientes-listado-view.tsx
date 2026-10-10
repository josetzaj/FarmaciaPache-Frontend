import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import type { ConsultaComercial, VentaComercial } from '../../comercial/comercial.types'
import { listarVentasPendientesCaja, obtenerResumenVentasPendientesCaja } from '../caja-api'
import { formatearCentavos } from '../caja-formatos'
import { CajaBreadcrumb } from './caja-breadcrumb'
import { ResumenOperativoCaja } from './resumen-operativo-caja'
import styles from './caja.module.css'

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor)
const fecha = (valor: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))

export function VentasPendientesListadoView({ onNavegar }: { onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarVentasPendientesCaja>> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<Awaited<ReturnType<typeof obtenerResumenVentasPendientesCaja>> | null>(null)
  const [solicitudResumenFinalizada, setSolicitudResumenFinalizada] = useState('')
  const [errorResumen, setErrorResumen] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const parametros = useMemo<ConsultaComercial>(() => ({
    pagina,
    tamanoPagina,
    busqueda: busqueda || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    orden: ordenamiento[0]?.id ?? 'fecha',
    direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, desde, hasta, ordenamiento, pagina, tamanoPagina])
  const claveResumen = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargandoResumen = solicitudResumenFinalizada !== claveResumen

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' '))
      setPagina(1)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarVentasPendientesCaja(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }
        setResultado(respuesta)
        setError(null)
      })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar los cobros pendientes.')
      })
    return () => controlador.abort()
  }, [pagina, parametros, revision])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerResumenVentasPendientesCaja(parametros, controlador.signal)
      .then((datos) => { setResumen(datos); setErrorResumen(null) })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setErrorResumen(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar el resumen de cobros pendientes.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudResumenFinalizada(claveResumen) })
    return () => controlador.abort()
  }, [claveResumen, parametros])

  const columnas = useMemo<ColumnaTabla<VentaComercial>[]>(() => [
    { id: 'numero', titulo: 'Venta', obtenerValor: (venta) => venta.numero, ordenable: true, celda: (venta) => <strong>{venta.numero}</strong> },
    { id: 'cliente', titulo: 'Cliente / identificación', obtenerValor: (venta) => venta.cliente, ordenable: true, celda: (venta) => <div className={styles.identidad}><strong>{venta.cliente}</strong><small>{venta.tipoIdentificacionFiscal}: {venta.identificacionFiscal}</small></div> },
    { id: 'total', titulo: 'Total a cobrar', obtenerValor: (venta) => venta.total, ordenable: true, celda: (venta) => <strong>{moneda(venta.total)}</strong> },
    { id: 'fecha', titulo: 'Registrada', obtenerValor: (venta) => venta.creadoEn, ordenable: true, celda: (venta) => fecha(venta.creadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (venta) => <div className={styles.accionesFila}><button type="button" title="Ver venta" aria-label={`Ver venta ${venta.numero}`} onClick={() => onNavegar(`/caja/ventas-pendientes/${venta.id}`)}><img src={iconoVer} alt="" /></button><button type="button" title="Cobrar venta" aria-label={`Cobrar venta ${venta.numero}`} onClick={() => onNavegar(`/caja/ventas-pendientes/${venta.id}/cobrar`)}><IconoAccion nombre="cobrar" /></button></div> },
  ], [onNavegar])

  const hayFiltros = Boolean(busqueda || desde || hasta)
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setPagina(1) }

  return <section className={styles.pagina} aria-labelledby="titulo-ventas-pendientes">
    <header className={styles.cabeceraPagina}>
      <CajaBreadcrumb seccion="Cobros pendientes" onNavegar={onNavegar} />
      <div className={styles.filaCabecera}>
        <h1 id="titulo-ventas-pendientes">Cobros pendientes</h1>
        <div className={styles.busquedaGeneral} role="search">
          <div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-ventas-pendientes" type="search" value={busquedaEntrada} maxLength={200} placeholder="Número, cliente o identificación" aria-label="Buscar venta o cliente" onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></div>
        </div>
      </div>
      <div className={styles.filtrosGenerales}>
        <label>Desde<input type="date" value={desde} onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} /></label>
        <label>Hasta<input type="date" value={hasta} onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} /></label>
      </div>
    </header>
    <ResumenOperativoCaja
      cargando={cargandoResumen}
      error={cargandoResumen ? null : errorResumen}
      onReintentar={() => setRevision((valor) => valor + 1)}
      indicadores={[
        { etiqueta: 'Ventas pendientes', valor: String(resumen?.ventasCantidad ?? 0), detalle: 'Ventas listas para cobro con los filtros actuales', tono: 'informacion' },
        { etiqueta: 'Monto pendiente', valor: formatearCentavos(resumen?.montoPendienteCentavos ?? 0), detalle: 'Total aún pendiente de cobro', tono: 'salida' },
      ]}
    />
    <article className={styles.panelTabla}>
      <div className={styles.resumenTabla}><div><strong>Por cobrar</strong><small>Solo se muestran ventas listas para cobro de la sucursal activa.</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} ventas</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
      {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar las ventas</h2><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>
        : resultado?.items.length ? <><TablaDatos descripcion="Cobros pendientes" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(venta) => venta.id} onFiltrosChange={() => undefined} onOrdenamientoChange={(valor) => { setOrdenamiento(valor); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="venta" unidadPlural="ventas" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></>
        : resultado ? <div className={styles.estadoVacio}><h2>Sin cobros pendientes</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'Las nuevas ventas aparecerán aquí cuando Atención al cliente las deje listas para cobro.'}</p></div>
        : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando cobros pendientes</h2></div>}
    </article>
  </section>
}
