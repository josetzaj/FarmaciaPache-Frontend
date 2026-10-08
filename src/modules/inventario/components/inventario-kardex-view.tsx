import { useEffect, useMemo, useState } from 'react'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { listarKardexInventario, listarUbicacionesInventario } from '../inventario-api'
import type {
  ExistenciaProducto,
  KardexInventarioPaginado,
  MovimientoKardexInventario,
  UbicacionInventario,
} from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

const etiquetasOperacion: Record<string, string> = {
  APERTURA: 'Apertura', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo',
  COMPRA_RECEPCION: 'Recepción de compra', TRASLADO_DESPACHO: 'Despacho de traslado', TRASLADO_RECEPCION: 'Recepción de traslado',
  VENTA: 'Venta', DEVOLUCION_CLIENTE: 'Devolución de cliente', DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
  VENCIMIENTO: 'Vencimiento', DESTRUCCION: 'Destrucción', CONTEO: 'Conteo', COMPENSACION: 'Compensación',
}

const etiquetasEstado: Record<string, string> = {
  DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', COMPROMETIDO: 'Comprometido', EN_TRANSITO: 'En tránsito',
  BLOQUEADO: 'Bloqueado', CUARENTENA: 'Cuarentena', VENCIDO: 'Vencido', DESTRUIDO: 'Destruido',
}

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function inicioFecha(valor: string): string | undefined {
  return valor ? new Date(`${valor}T00:00:00`).toISOString() : undefined
}

function finFecha(valor: string): string | undefined {
  return valor ? new Date(`${valor}T23:59:59.999`).toISOString() : undefined
}

export function InventarioKardexView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [producto, setProducto] = useState<ExistenciaProducto | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [ubicacionId, setUbicacionId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [resultado, setResultado] = useState<KardexInventarioPaginado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorUbicaciones, setErrorUbicaciones] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [operacionAuditoria, setOperacionAuditoria] = useState<MovimientoKardexInventario | null>(null)
  const puedeVerAuditoria = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(true, controlador.signal)
      .then((items) => { setUbicaciones(items); setErrorUbicaciones(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorUbicaciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las ubicaciones.')
      })
    return () => controlador.abort()
  }, [revision])

  const parametros = useMemo(() => producto ? {
    pagina,
    tamanoPagina,
    productoId: producto.producto.id,
    ubicacionId: ubicacionId || undefined,
    desde: inicioFecha(desde),
    hasta: finFecha(hasta),
  } : null, [desde, hasta, pagina, producto, tamanoPagina, ubicacionId])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = Boolean(parametros) && solicitudFinalizada !== clave

  useEffect(() => {
    if (!parametros) return
    const controlador = new AbortController()
    void listarKardexInventario(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }
        setResultado(respuesta); setError(null); setOperacionAuditoria(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible consultar el Kardex.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, pagina, parametros])

  const columnas = useMemo<ColumnaTabla<MovimientoKardexInventario>[]>(() => [
    { id: 'fecha', titulo: 'Fecha y hora', obtenerValor: (item) => item.fecha, celda: (item) => fechaHora(item.fecha) },
    { id: 'tipo', titulo: 'Operación', obtenerValor: (item) => item.tipo, celda: (item) => <span className={`${styles.estado} ${styles.estadoInformacion}`}>{etiquetasOperacion[item.tipo] ?? item.tipo}</span> },
    { id: 'referencia', titulo: 'Referencia', obtenerValor: (item) => item.referencia, celda: (item) => item.referencia },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacion, celda: (item) => item.ubicacion },
    { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.lote ?? '', celda: (item) => item.lote ?? <span className={styles.sinDato}>Sin lote</span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, celda: (item) => etiquetasEstado[item.estado] ?? item.estado },
    { id: 'usuario', titulo: 'Registrado por', obtenerValor: (item) => item.usuario, celda: (item) => item.usuario },
    { id: 'entrada', titulo: 'Entrada', obtenerValor: (item) => item.entrada, celda: (item) => <span className={styles.cantidad}>{item.entrada ? numero(item.entrada) : '—'}</span> },
    { id: 'salida', titulo: 'Salida', obtenerValor: (item) => item.salida, celda: (item) => <span className={styles.cantidad}>{item.salida ? numero(item.salida) : '—'}</span> },
    { id: 'saldo', titulo: 'Saldo', obtenerValor: (item) => item.saldo, celda: (item) => <span className={styles.cantidad}>{numero(item.saldo)}</span> },
    {
      id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id,
      celda: (item) => puedeVerAuditoria ? <div className={styles.accionesFila}><button type="button" title="Ver auditoría" aria-label={`Ver auditoría de la operación ${item.referencia}`} onClick={() => setOperacionAuditoria(item)}><img src={iconoVer} alt="" /></button></div> : null,
    },
  ], [puedeVerAuditoria])

  const cambiarProducto = (seleccion: ExistenciaProducto | null) => {
    setProducto(seleccion); setPagina(1); setResultado(null); setError(null); setOperacionAuditoria(null)
  }
  const limpiar = () => { setProducto(null); setUbicacionId(''); setDesde(''); setHasta(''); setPagina(1); setResultado(null); setError(null); setOperacionAuditoria(null) }
  const hayFiltros = Boolean(producto || ubicacionId || desde || hasta)

  return (
    <section className={styles.pagina} aria-labelledby="titulo-kardex-inventario">
      <header className={styles.cabecera}><InventarioBreadcrumb actual="Kardex" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-kardex-inventario">Kardex de inventario</h1></div></header>
      <fieldset className={styles.panelFiltros}>
        <legend>Filtros del Kardex</legend>
        <div className={styles.campo}><label htmlFor="kardex-producto">Medicamento *</label><SelectorProductoInventario id="kardex-producto" valor={producto} soloConExistencia={false} soloActivos={false} onChange={cambiarProducto} /></div>
        <div className={styles.campo}><label htmlFor="kardex-ubicacion">Ubicación</label><select id="kardex-ubicacion" value={ubicacionId} onChange={(evento) => { setUbicacionId(evento.target.value); setPagina(1) }}><option value="">Todas las ubicaciones</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo}){!item.activa ? ' · Inactiva' : ''}</option>)}</select></div>
        <div className={styles.campo}><label htmlFor="kardex-desde">Desde</label><input id="kardex-desde" type="date" value={desde} max={hasta || undefined} onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} /></div>
        <div className={styles.campo}><label htmlFor="kardex-hasta">Hasta</label><input id="kardex-hasta" type="date" value={hasta} min={desde || undefined} onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} /></div>
        {hayFiltros && <button className={styles.botonNeutral} type="button" onClick={limpiar}>Restablecer filtros</button>}
      </fieldset>
      {errorUbicaciones && <div className={styles.alertaAdvertencia} role="status"><p>{errorUbicaciones}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}><div><strong>Movimientos del medicamento</strong><small>Entradas, salidas y saldo posterior registrados cronológicamente.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} {resultado.total === 1 ? 'movimiento' : 'movimientos'}</span>}</div></div>
        {!producto ? <div className={styles.estadoVacio}><h2>Selecciona un medicamento</h2><p>El Kardex se consulta por medicamento para preservar la trazabilidad del saldo.</p></div> : resultado?.items.length ? <><TablaDatos descripcion="Kardex de movimientos de inventario" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="movimiento" unidadPlural="movimientos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>Sin movimientos</h2><p>No existen movimientos que coincidan con el medicamento y periodo seleccionados.</p></div> : null}
      </article>
      {operacionAuditoria && puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={operacionAuditoria.operacionId} titulo={`Operación ${operacionAuditoria.referencia} · ${etiquetasOperacion[operacionAuditoria.tipo] ?? operacionAuditoria.tipo}.`} revision={revision} />}
    </section>
  )
}
