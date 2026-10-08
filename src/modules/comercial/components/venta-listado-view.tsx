import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { exportarComercial, listarVentas, obtenerOpcionesComercial } from '../comercial-api'
import type { ConsultaComercial, EstadoVenta, OpcionesComercial, VentaComercial } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

const etiquetasVenta: Record<EstadoVenta, string> = { BORRADOR: 'Borrador', PENDIENTE_RECETA: 'Pendiente de receta', LISTA_PARA_COBRO: 'Lista para cobro', CONFIRMADA: 'Confirmada', ANULADA: 'Anulada' }
const opcionesBase: OpcionesComercial = { sucursales: [], productos: [], clientes: { tipos: ['PERSONA', 'EMPRESA'], estados: ['ACTIVO', 'INACTIVO'] }, margenes: { alcances: ['GENERAL', 'PRODUCTO'], estados: ['ACTIVO', 'INACTIVO'] }, precios: { estados: ['BORRADOR', 'VIGENTE', 'INACTIVO'] }, ventas: { estados: ['BORRADOR', 'PENDIENTE_RECETA', 'LISTA_PARA_COBRO', 'CONFIRMADA', 'ANULADA'], estadosPago: ['PENDIENTE', 'PAGADO', 'REVERTIDO'], estadosDispensacion: ['PENDIENTE', 'DISPENSADA', 'REVERTIDA'], estadosFiscales: ['PENDIENTE', 'EMITIDA', 'ANULADA', 'ERROR'] } }
const valores = (f: ColumnFiltersState, id: string) => { const x = f.find((i) => i.id === id)?.value; return Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : undefined }
const numero = (v: string) => v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined
const moneda = (v: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v)
const fecha = (v: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(v))
const claseEstado = (estado: EstadoVenta) => estado === 'CONFIRMADA' ? styles.estadoActivo : estado === 'ANULADA' ? styles.estadoPeligro : ['PENDIENTE_RECETA', 'LISTA_PARA_COBRO'].includes(estado) ? styles.estadoAdvertencia : styles.estadoInactivo

export function VentaListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarVentas>> | null>(null); const [opciones, setOpciones] = useState(opcionesBase)
  const [pagina, setPagina] = useState(1); const [tamanoPagina, setTamanoPagina] = useState(50); const [busquedaEntrada, setBusquedaEntrada] = useState(''); const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState(''); const [totalMin, setTotalMin] = useState(''); const [totalMax, setTotalMax] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([]); const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }]); const [error, setError] = useState<string | null>(null); const [errorExportacion, setErrorExportacion] = useState<string | null>(null); const [revision, setRevision] = useState(0)
  const parametros = useMemo<ConsultaComercial>(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, estados: valores(filtros, 'estado'), estadosPago: valores(filtros, 'pago'), sucursalIds: valores(filtros, 'sucursal'), desde: desde || undefined, hasta: hasta || undefined, totalMin: numero(totalMin), totalMax: numero(totalMax), orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc' }), [busqueda, desde, filtros, hasta, ordenamiento, pagina, tamanoPagina, totalMax, totalMin])
  useEffect(() => { const c = new AbortController(); void obtenerOpcionesComercial(c.signal).then(setOpciones).catch(() => undefined); return () => c.abort() }, [])
  useEffect(() => { const t = window.setTimeout(() => { const x = busquedaEntrada.trim().replace(/\s+/g, ' '); setBusqueda(x); setPagina(1) }, 400); return () => clearTimeout(t) }, [busquedaEntrada])
  useEffect(() => { const c = new AbortController(); void listarVentas(parametros, c.signal).then((r) => { if (r.totalPaginas > 0 && pagina > r.totalPaginas) { setPagina(r.totalPaginas); return }; setResultado(r); setError(null) }).catch((e: unknown) => { if (!c.signal.aborted) setError(e instanceof ErrorApi ? e.message : 'No fue posible cargar las ventas.') }); return () => c.abort() }, [pagina, parametros, revision])
  const columnas = useMemo<ColumnaTabla<VentaComercial>[]>(() => [
    { id: 'numero', titulo: 'Venta', obtenerValor: (x) => x.numero, ordenable: true, celda: (x) => <strong>{x.numero}</strong> },
    { id: 'cliente', titulo: 'Cliente / identificación', obtenerValor: (x) => x.cliente, ordenable: true, celda: (x) => <div className={styles.identidad}><strong>{x.cliente}</strong><small>{x.tipoIdentificacionFiscal}: {x.identificacionFiscal}</small></div> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (x) => x.sucursal?.nombre ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Sucursal', multiple: true, opciones: opciones.sucursales.map((s) => ({ valor: s.id, etiqueta: s.nombre, descripcion: s.codigo })) }, celda: (x) => x.sucursal?.nombre ?? 'No disponible' },
    { id: 'total', titulo: 'Total', obtenerValor: (x) => x.total, ordenable: true, celda: (x) => <strong>{moneda(x.total)}</strong> },
    { id: 'pago', titulo: 'Pago', obtenerValor: (x) => x.estadoPago, filtro: { tipo: 'opciones', etiqueta: 'Estado de pago', multiple: true, buscable: false, opciones: opciones.ventas.estadosPago.map((x) => ({ valor: x, etiqueta: x === 'PAGADO' ? 'Pagado' : x === 'REVERTIDO' ? 'Revertido' : 'Pendiente' })) }, celda: (x) => x.estadoPago === 'PAGADO' ? 'Pagado' : x.estadoPago === 'REVERTIDO' ? 'Revertido' : 'Pendiente' },
    { id: 'estado', titulo: 'Estado', obtenerValor: (x) => x.estado, filtro: { tipo: 'opciones', etiqueta: 'Estado de venta', multiple: true, buscable: false, opciones: opciones.ventas.estados.map((x) => ({ valor: x, etiqueta: etiquetasVenta[x] })) }, celda: (x) => <span className={`${styles.estado} ${claseEstado(x.estado)}`}>{etiquetasVenta[x.estado]}</span> },
    { id: 'fecha', titulo: 'Registro', obtenerValor: (x) => x.creadoEn, ordenable: true, celda: (x) => fecha(x.creadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (x) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver venta ${x.numero}`} onClick={() => onNavegar(`/ventas/${x.id}`)}><img src={iconoVer} alt="" /></button>{permisos.includes('COMERCIAL.VENTAS.ACTUALIZAR') && ['BORRADOR', 'PENDIENTE_RECETA'].includes(x.estado) && <button type="button" title="Editar" aria-label={`Editar venta ${x.numero}`} onClick={() => onNavegar(`/ventas/${x.id}/editar`)}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [onNavegar, opciones, permisos])
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setTotalMin(''); setTotalMax(''); setFiltros([]); setPagina(1) }; const hayFiltros = Boolean(busqueda || desde || hasta || totalMin || totalMax || filtros.length)
  const exportar = async (formato: FormatoExportacion) => { setErrorExportacion(null); const { pagina: _p, tamanoPagina: _t, ...f } = parametros; try { await exportarComercial('ventas', formato, f) } catch (e) { setErrorExportacion(e instanceof ErrorApi ? e.message : 'No fue posible exportar las ventas.') } }
  return (
    <section className={styles.pagina} aria-labelledby="titulo-ventas">
      <header className={styles.cabeceraPagina}>
        <ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" onNavegar={onNavegar} />
        <div className={`${styles.filaCabecera} ${styles.filaCabeceraConFiltros}`}>
          <h1 id="titulo-ventas">Ventas</h1>
          {permisos.includes('COMERCIAL.VENTAS.CREAR') && (
            <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/ventas/nueva')}>
              <img src={iconoAgregar} alt="" />
              Nueva venta
            </button>
          )}
          {permisos.includes('COMERCIAL.VENTAS.EXPORTAR') && (
            <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />
          )}
          <div className={styles.filtrosCabecera} aria-label="Filtros generales de ventas">
            <label className={styles.controlFechaCabecera}>
              <span className={styles.soloLectores}>Desde</span>
              {!desde && <span className={styles.textoFechaCabecera} aria-hidden="true">Desde</span>}
              <input className={!desde ? styles.fechaVacia : undefined} type="date" value={desde} aria-label="Fecha desde" onChange={(e) => { setDesde(e.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlFechaCabecera}>
              <span className={styles.soloLectores}>Hasta</span>
              {!hasta && <span className={styles.textoFechaCabecera} aria-hidden="true">Hasta</span>}
              <input className={!hasta ? styles.fechaVacia : undefined} type="date" value={hasta} aria-label="Fecha hasta" onChange={(e) => { setHasta(e.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Total mínimo</span>
              <input type="number" min="0" step="0.01" value={totalMin} aria-label="Total mínimo" placeholder="Total mínimo" onChange={(e) => { setTotalMin(e.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Total máximo</span>
              <input type="number" min="0" step="0.01" value={totalMax} aria-label="Total máximo" placeholder="Total máximo" onChange={(e) => { setTotalMax(e.target.value); setPagina(1) }} />
            </label>
          </div>
          <form className={styles.busquedaGeneral} role="search" onSubmit={(e) => e.preventDefault()}>
            <label className={styles.soloLectores} htmlFor="buscar-ventas">Buscar venta o cliente</label>
            <div className={styles.controlBusqueda}>
              <img src={iconoBusqueda} alt="" />
              <input id="buscar-ventas" type="search" value={busquedaEntrada} placeholder="Buscar número, cliente o identificación" maxLength={200} onChange={(e) => setBusquedaEntrada(e.target.value)} />
              {busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}
            </div>
          </form>
        </div>
      </header>
      {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}>
          <div><strong>Ventas registradas</strong><small>Los filtros de cada columna se procesan en el servidor.</small></div>
          <div className={styles.accionesResumen}><span>{resultado?.total ?? 0} ventas</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div>
        </div>
        {error ? (
          <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar las ventas</h2><p>{error}</p><button type="button" onClick={() => setRevision((x) => x + 1)}>Reintentar</button></div>
        ) : resultado?.items.length ? (
          <>
            <TablaDatos descripcion="Listado de ventas" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(x) => x.id} onFiltrosChange={(x) => { setFiltros(x); setPagina(1) }} onOrdenamientoChange={(x) => { setOrdenamiento(x); setPagina(1) }} />
            <PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="venta" unidadPlural="ventas" onPaginaChange={setPagina} onTamanoPaginaChange={(x) => { setTamanoPagina(x); setPagina(1) }} />
          </>
        ) : resultado ? (
          <div className={styles.estadoVacio}><h2>Sin ventas para mostrar</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'Registra la primera venta.'}</p></div>
        ) : (
          <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando ventas</h2></div>
        )}
      </article>
    </section>
  )
}
