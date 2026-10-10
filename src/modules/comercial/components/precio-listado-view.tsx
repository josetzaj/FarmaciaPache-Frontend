import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarComercial, listarPrecios, listarPreciosPublicos, obtenerOpcionesComercial } from '../comercial-api'
import type { ConsultaComercial, EstadoPrecio, Paginado, PrecioProducto, PrecioPublico, ProductoComercialCatalogo } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

type PrecioListado = PrecioProducto | PrecioPublico
const etiquetasEstado: Record<EstadoPrecio, string> = { BORRADOR: 'Borrador', VIGENTE: 'Vigente', INACTIVO: 'Inactivo' }
const valoresFiltro = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined }
const numero = (valor: string) => valor.trim() && Number.isFinite(Number(valor)) ? Number(valor) : undefined
const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor)
const esPrecioConCostos = (precio: PrecioListado): precio is PrecioProducto => 'costoBase' in precio

export function PrecioListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const puedeVerCostos = permisos.includes('COMERCIAL.PRECIOS.VER_COSTOS')
  const puedeExportarCostos = puedeVerCostos && permisos.includes('COMERCIAL.PRECIOS.EXPORTAR')
  const [resultado, setResultado] = useState<Paginado<PrecioListado> | null>(null)
  const [productos, setProductos] = useState<ProductoComercialCatalogo[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'producto', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const parametros = useMemo<ConsultaComercial>(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, productoIds: valoresFiltro(filtros, 'producto'), estados: puedeVerCostos ? valoresFiltro(filtros, 'estado') : undefined, precioMin: numero(precioMin), precioMax: numero(precioMax), orden: ordenamiento[0]?.id ?? 'producto', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc' }), [busqueda, filtros, ordenamiento, pagina, precioMax, precioMin, puedeVerCostos, tamanoPagina])

  useEffect(() => { const controlador = new AbortController(); void obtenerOpcionesComercial(controlador.signal).then((opciones) => setProductos(opciones.productos)).catch(() => undefined); return () => controlador.abort() }, [])
  useEffect(() => { const temporizador = window.setTimeout(() => { const termino = busquedaEntrada.trim().replace(/\s+/g, ' '); setBusqueda(termino); setPagina(1) }, 400); return () => window.clearTimeout(temporizador) }, [busquedaEntrada])
  useEffect(() => {
    const controlador = new AbortController()
    const solicitud = puedeVerCostos ? listarPrecios(parametros, controlador.signal) : listarPreciosPublicos(parametros, controlador.signal)
    void solicitud.then((respuesta) => {
      if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }
      setResultado(respuesta)
      setError(null)
    }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los precios.') })
    return () => controlador.abort()
  }, [pagina, parametros, puedeVerCostos, revision])

  const columnas = useMemo<ColumnaTabla<PrecioListado>[]>(() => {
    const base: ColumnaTabla<PrecioListado>[] = [
      { id: 'producto', titulo: 'Producto', obtenerValor: (precio) => precio.producto, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Producto', multiple: true, opciones: productos.map((producto) => ({ valor: producto.id, etiqueta: producto.nombre, descripcion: producto.codigo })) }, celda: (precio) => <div className={styles.identidad}><strong>{precio.producto}</strong><small>{precio.codigo}</small></div> },
    ]
    if (puedeVerCostos) base.push(
      { id: 'politica', titulo: 'Política y margen', obtenerValor: (precio) => esPrecioConCostos(precio) ? precio.politicaMargen : '', celda: (precio) => esPrecioConCostos(precio) ? <div className={styles.identidad}><strong>{precio.politicaMargen}</strong><small>{precio.margenPorcentaje}%</small></div> : '—' },
      { id: 'costo', titulo: 'Costo base', obtenerValor: (precio) => esPrecioConCostos(precio) ? precio.costoBase : 0, celda: (precio) => esPrecioConCostos(precio) ? moneda(precio.costoBase) : '—' },
      { id: 'revision', titulo: 'Revisión', obtenerValor: (precio) => esPrecioConCostos(precio) && precio.estado === 'INACTIVO' ? 'HISTORICO' : esPrecioConCostos(precio) && precio.requiereRevision ? 'PENDIENTE' : 'AL_DIA', celda: (precio) => esPrecioConCostos(precio) && precio.estado === 'INACTIVO' ? <span className={`${styles.estado} ${styles.estadoInactivo}`}>Histórico</span> : esPrecioConCostos(precio) && precio.requiereRevision ? <span className={`${styles.estado} ${styles.estadoAdvertencia}`}>Pendiente</span> : <span className={`${styles.estado} ${styles.estadoActivo}`}>Al día</span> },
    )
    base.push(
      { id: 'precio', titulo: 'Precio de venta', obtenerValor: (precio) => precio.precioVenta, ordenable: true, celda: (precio) => <strong>{moneda(precio.precioVenta)}</strong> },
      { id: 'estado', titulo: 'Estado', obtenerValor: (precio) => precio.estado, filtro: puedeVerCostos ? { tipo: 'opciones', etiqueta: 'Estado', multiple: true, buscable: false, opciones: Object.entries(etiquetasEstado).map(([valor, etiqueta]) => ({ valor, etiqueta })) } : undefined, celda: (precio) => <span className={`${styles.estado} ${precio.estado === 'VIGENTE' ? styles.estadoActivo : styles.estadoInactivo}`}>{etiquetasEstado[precio.estado]}</span> },
    )
    if (puedeVerCostos) base.push({ id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (precio) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver precio de ${precio.producto}`} onClick={() => onNavegar(`/comercial/precios/${precio.id}`)}><img src={iconoVer} alt="" /></button></div> })
    return base
  }, [onNavegar, productos, puedeVerCostos])

  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setPrecioMin(''); setPrecioMax(''); setFiltros([]); setPagina(1) }
  const hayFiltros = Boolean(busqueda || precioMin || precioMax) || hayFiltrosAdicionales(filtros)
  const exportar = async (formato: FormatoExportacion) => { setErrorExportacion(null); const { pagina: _pagina, tamanoPagina: _tamano, ...criterios } = parametros; try { await exportarComercial('precios', formato, criterios) } catch (errorActual) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar los precios.') } }

  return <section className={styles.pagina} aria-labelledby="titulo-precios">
    <header className={styles.cabeceraPagina}>
      <ComercialBreadcrumb seccion="Precios" rutaListado="/comercial/precios" onNavegar={onNavegar} />
      <div className={`${styles.filaCabecera} ${styles.filaCabeceraConFiltros}`}>
        <h1 id="titulo-precios">{puedeVerCostos ? 'Costos y precios' : 'Precios de venta vigentes'}</h1>
        {puedeVerCostos && permisos.includes('COMERCIAL.PRECIOS.PROPONER') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/comercial/precios/nuevo')}><img src={iconoAgregar} alt="" />Nuevo precio</button>}
        {puedeExportarCostos && <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />}
        <div className={styles.filtrosCabecera} aria-label="Filtros generales de precios"><label className={styles.controlNumeroCabecera}><span className={styles.soloLectores}>Precio mínimo</span><input type="number" min="0" step="0.01" value={precioMin} aria-label="Precio mínimo" placeholder="Precio mínimo" onChange={(evento) => { setPrecioMin(evento.target.value); setPagina(1) }} /></label><label className={styles.controlNumeroCabecera}><span className={styles.soloLectores}>Precio máximo</span><input type="number" min="0" step="0.01" value={precioMax} aria-label="Precio máximo" placeholder="Precio máximo" onChange={(evento) => { setPrecioMax(evento.target.value); setPagina(1) }} /></label></div>
        <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => evento.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-precios">Buscar producto</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-precios" type="search" value={busquedaEntrada} maxLength={200} placeholder="Buscar producto" onChange={(evento) => setBusquedaEntrada(evento.target.value)} />{busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}</div></form>
      </div>
    </header>
    {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
    <article className={styles.panelTabla}>
      <div className={styles.resumenTabla}><div><strong>{puedeVerCostos ? 'Historial de costos y precios' : 'Precios públicos vigentes'}</strong><small>{puedeVerCostos ? 'Una revisión pendiente indica que cambió el costo o la política; el precio público no cambia hasta aprobar una propuesta vigente.' : 'Esta vista muestra únicamente el producto y su precio final vigente.'}</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} precios</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
      {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar los precios</h2><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : resultado?.items.length ? <><TablaDatos descripcion="Listado de precios" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(precio) => precio.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="precio" unidadPlural="precios" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : resultado ? <div className={styles.estadoVacio}><h2>Sin precios para mostrar</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'No existen precios vigentes dentro del catálogo.'}</p>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div> : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando precios</h2></div>}
    </article>
  </section>
}
