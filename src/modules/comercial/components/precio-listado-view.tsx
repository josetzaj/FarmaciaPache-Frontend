import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarComercial, listarPrecios, obtenerOpcionesComercial } from '../comercial-api'
import type { ConsultaComercial, EstadoPrecio, PrecioProducto, ProductoComercialCatalogo } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

const etiquetasEstado: Record<EstadoPrecio, string> = { BORRADOR: 'Borrador', VIGENTE: 'Vigente', INACTIVO: 'Inactivo' }
const valoresFiltro = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((f) => f.id === id)?.value; return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : undefined }
const numero = (valor: string) => valor.trim() && Number.isFinite(Number(valor)) ? Number(valor) : undefined
const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor)

export function PrecioListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarPrecios>> | null>(null)
  const [productos, setProductos] = useState<ProductoComercialCatalogo[]>([])
  const [pagina, setPagina] = useState(1); const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState(''); const [busqueda, setBusqueda] = useState('')
  const [precioMin, setPrecioMin] = useState(''); const [precioMax, setPrecioMax] = useState('')
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'producto', desc: false }])
  const [error, setError] = useState<string | null>(null); const [errorExportacion, setErrorExportacion] = useState<string | null>(null); const [revision, setRevision] = useState(0)
  const parametros = useMemo<ConsultaComercial>(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, productoIds: valoresFiltro(filtros, 'producto'), estados: valoresFiltro(filtros, 'estado'), precioMin: numero(precioMin), precioMax: numero(precioMax), orden: ordenamiento[0]?.id ?? 'producto', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc' }), [busqueda, filtros, ordenamiento, pagina, precioMax, precioMin, tamanoPagina])
  useEffect(() => { const c = new AbortController(); void obtenerOpcionesComercial(c.signal).then((o) => setProductos(o.productos)).catch(() => undefined); return () => c.abort() }, [])
  useEffect(() => { const t = window.setTimeout(() => { const termino = busquedaEntrada.trim().replace(/\s+/g, ' '); ajustarPorBusqueda(termino); setBusqueda(termino); setPagina(1) }, 400); return () => window.clearTimeout(t) }, [ajustarPorBusqueda, busquedaEntrada])
  useEffect(() => { const c = new AbortController(); void listarPrecios(parametros, c.signal).then((r) => { if (r.totalPaginas > 0 && pagina > r.totalPaginas) { setPagina(r.totalPaginas); return }; setResultado(r); setError(null) }).catch((e: unknown) => { if (!c.signal.aborted) setError(e instanceof ErrorApi ? e.message : 'No fue posible cargar los precios.') }); return () => c.abort() }, [pagina, parametros, revision])
  const columnas = useMemo<ColumnaTabla<PrecioProducto>[]>(() => [
    { id: 'producto', titulo: 'Producto', obtenerValor: (x) => x.producto, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Producto', multiple: true, opciones: productos.map((p) => ({ valor: p.id, etiqueta: p.nombre, descripcion: p.codigo })) }, celda: (x) => <div className={styles.identidad}><strong>{x.producto}</strong><small>{x.codigo}</small></div> },
    { id: 'politica', titulo: 'Política y margen', obtenerValor: (x) => x.politicaMargen, celda: (x) => <div className={styles.identidad}><strong>{x.politicaMargen}</strong><small>{x.margenPorcentaje}%</small></div> },
    { id: 'costo', titulo: 'Costo base', obtenerValor: (x) => x.costoBase, celda: (x) => moneda(x.costoBase) },
    { id: 'precio', titulo: 'Precio de venta', obtenerValor: (x) => x.precioVenta, ordenable: true, celda: (x) => <strong>{moneda(x.precioVenta)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (x) => x.estado, filtro: { tipo: 'opciones', etiqueta: 'Estado', multiple: true, buscable: false, opciones: Object.entries(etiquetasEstado).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (x) => <span className={`${styles.estado} ${x.estado === 'VIGENTE' ? styles.estadoActivo : styles.estadoInactivo}`}>{etiquetasEstado[x.estado]}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (x) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver precio de ${x.producto}`} onClick={() => onNavegar(`/comercial/precios/${x.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, productos])
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setPrecioMin(''); setPrecioMax(''); restablecerFiltros(); setPagina(1) }
  const hayFiltros = Boolean(busqueda || precioMin || precioMax) || hayFiltrosAdicionales(filtros)
  const exportar = async (formato: FormatoExportacion) => { setErrorExportacion(null); const { pagina: _p, tamanoPagina: _t, ...f } = parametros; try { await exportarComercial('precios', formato, f) } catch (e) { setErrorExportacion(e instanceof ErrorApi ? e.message : 'No fue posible exportar los precios.') } }
  return (
    <section className={styles.pagina} aria-labelledby="titulo-precios">
      <header className={styles.cabeceraPagina}>
        <ComercialBreadcrumb seccion="Precios" rutaListado="/comercial/precios" onNavegar={onNavegar} />
        <div className={`${styles.filaCabecera} ${styles.filaCabeceraConFiltros}`}>
          <h1 id="titulo-precios">Precios</h1>
          {permisos.includes('COMERCIAL.PRECIOS.PROPONER') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/comercial/precios/nuevo')}><img src={iconoAgregar} alt="" />Nuevo precio</button>}
          {permisos.includes('COMERCIAL.PRECIOS.EXPORTAR') && <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />}
          <div className={styles.filtrosCabecera} aria-label="Filtros generales de precios">
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Precio mínimo</span>
              <input type="number" min="0" step="0.01" value={precioMin} aria-label="Precio mínimo" placeholder="Precio mínimo" onChange={(e) => { setPrecioMin(e.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Precio máximo</span>
              <input type="number" min="0" step="0.01" value={precioMax} aria-label="Precio máximo" placeholder="Precio máximo" onChange={(e) => { setPrecioMax(e.target.value); setPagina(1) }} />
            </label>
          </div>
          <form className={styles.busquedaGeneral} role="search" onSubmit={(e) => e.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-precios">Buscar producto o política</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-precios" type="search" value={busquedaEntrada} maxLength={200} placeholder="Buscar producto o política" onChange={(e) => setBusquedaEntrada(e.target.value)} />{busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}</div></form>
        </div>
      </header>
      {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}><div><strong>Historial de precios</strong><small>Los precios nuevos se crean en borrador y requieren aprobación.</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} precios</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
        {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar los precios</h2><p>{error}</p><button type="button" onClick={() => setRevision((x) => x + 1)}>Reintentar</button></div> : resultado?.items.length ? <><TablaDatos descripcion="Listado de precios" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(x) => x.id} onFiltrosChange={(x) => { cambiarFiltros(x); setPagina(1) }} onOrdenamientoChange={(x) => { setOrdenamiento(x); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="precio" unidadPlural="precios" onPaginaChange={setPagina} onTamanoPaginaChange={(x) => { setTamanoPagina(x); setPagina(1) }} /></> : resultado ? <div className={styles.estadoVacio}><h2>Sin precios para mostrar</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'Propón el primer precio de venta.'}</p>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div> : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando precios</h2></div>}
      </article>
    </section>
  )
}
