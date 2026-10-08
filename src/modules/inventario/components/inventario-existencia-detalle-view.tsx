import { useEffect, useMemo, useState } from 'react'
import iconoVer from '../../../assets/acciones/ver.png'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { listarKardexInventario, obtenerExistenciaInventario } from '../inventario-api'
import type {
  EstadoExistenciaInventario,
  ExistenciaProducto,
  KardexInventarioPaginado,
  MovimientoKardexInventario,
  PosicionInventario,
} from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const etiquetasOperacion: Record<string, string> = {
  APERTURA: 'Apertura',
  AJUSTE_POSITIVO: 'Ajuste positivo',
  AJUSTE_NEGATIVO: 'Ajuste negativo',
  COMPRA_RECEPCION: 'Recepción de compra',
  TRASLADO_DESPACHO: 'Despacho de traslado',
  TRASLADO_RECEPCION: 'Recepción de traslado',
  VENTA: 'Venta',
  DEVOLUCION_CLIENTE: 'Devolución de cliente',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
  VENCIMIENTO: 'Vencimiento',
  DESTRUCCION: 'Destrucción',
  CONTEO: 'Conteo',
  COMPENSACION: 'Compensación',
}

const etiquetasEstado: Record<EstadoExistenciaInventario, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  COMPROMETIDO: 'Comprometido',
  EN_TRANSITO: 'En tránsito',
  BLOQUEADO: 'Bloqueado',
  CUARENTENA: 'Cuarentena',
  VENCIDO: 'Vencido',
  DESTRUIDO: 'Destruido',
}

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function moneda(valor: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(valor)
}

function fechaHora(valor: string): string {
  if (!valor) return 'Sin movimientos'
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

function fecha(valor: string | null): string {
  if (!valor) return 'Sin vencimiento'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

function claseEstado(estado: EstadoExistenciaInventario): string {
  if (estado === 'DISPONIBLE') return styles.estadoCorrecto
  if (estado === 'VENCIDO' || estado === 'DESTRUIDO') return styles.estadoPeligro
  if (estado === 'BLOQUEADO' || estado === 'CUARENTENA') return styles.estadoAdvertencia
  return styles.estadoInformacion
}

export function InventarioExistenciaDetalleView({
  productoId,
  permisos,
  onNavegar,
}: {
  productoId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}) {
  const [detalle, setDetalle] = useState<ExistenciaProducto | null>(null)
  const [kardex, setKardex] = useState<KardexInventarioPaginado | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [operacionAuditoria, setOperacionAuditoria] = useState<MovimientoKardexInventario | null>(null)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)
  const [errorKardex, setErrorKardex] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudKardexFinalizada, setSolicitudKardexFinalizada] = useState('')
  const puedeVerKardex = permisos.includes('INVENTARIO.KARDEX.VER')
  const puedeVerAuditoria = puedeVerKardex && permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerExistenciaInventario(productoId, controlador.signal)
      .then((respuesta) => { setDetalle(respuesta); setErrorDetalle(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorDetalle(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el detalle de la existencia.')
      })
    return () => controlador.abort()
  }, [productoId, revision])

  const claveKardex = useMemo(
    () => JSON.stringify({ productoId, pagina, tamanoPagina, revision }),
    [pagina, productoId, revision, tamanoPagina],
  )
  const cargandoKardex = puedeVerKardex && solicitudKardexFinalizada !== claveKardex

  useEffect(() => {
    if (!puedeVerKardex) return
    const controlador = new AbortController()
    void listarKardexInventario({ pagina, tamanoPagina, productoId }, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setKardex(respuesta)
        setErrorKardex(null)
        setOperacionAuditoria(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorKardex(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la pista de movimientos.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudKardexFinalizada(claveKardex) })
    return () => controlador.abort()
  }, [claveKardex, pagina, puedeVerKardex, productoId, tamanoPagina])

  const columnasPosiciones = useMemo<ColumnaTabla<PosicionInventario>[]>(() => [
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => `${item.ubicacion.nombre} ${item.ubicacion.codigo}`, celda: (item) => <span className={styles.identidad}><strong>{item.ubicacion.nombre}</strong><small>{item.ubicacion.codigo}</small></span> },
    { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.lote?.numero ?? '', celda: (item) => item.lote?.numero ?? <span className={styles.sinDato}>Sin lote</span> },
    { id: 'vencimiento', titulo: 'Vencimiento', obtenerValor: (item) => item.lote?.fechaVencimiento ?? '', celda: (item) => fecha(item.lote?.fechaVencimiento ?? null) },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstado[item.estado]}</span> },
    { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => item.cantidad, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidad)}</span> },
    { id: 'actualizado', titulo: 'Último movimiento', obtenerValor: (item) => item.actualizadoEn, celda: (item) => fechaHora(item.actualizadoEn) },
  ], [])

  const columnasKardex = useMemo<ColumnaTabla<MovimientoKardexInventario>[]>(() => [
    { id: 'fecha', titulo: 'Fecha y hora', obtenerValor: (item) => item.fecha, celda: (item) => fechaHora(item.fecha) },
    { id: 'tipo', titulo: 'Operación', obtenerValor: (item) => item.tipo, celda: (item) => <span className={`${styles.estado} ${styles.estadoInformacion}`}>{etiquetasOperacion[item.tipo] ?? item.tipo}</span> },
    { id: 'referencia', titulo: 'Referencia', obtenerValor: (item) => item.referencia, celda: (item) => item.referencia },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacion, celda: (item) => item.ubicacion },
    { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.lote ?? '', celda: (item) => item.lote ?? <span className={styles.sinDato}>Sin lote</span> },
    { id: 'usuario', titulo: 'Registrado por', obtenerValor: (item) => item.usuario, celda: (item) => item.usuario },
    { id: 'entrada', titulo: 'Entrada', obtenerValor: (item) => item.entrada, celda: (item) => <span className={styles.cantidad}>{item.entrada ? numero(item.entrada) : '—'}</span> },
    { id: 'salida', titulo: 'Salida', obtenerValor: (item) => item.salida, celda: (item) => <span className={styles.cantidad}>{item.salida ? numero(item.salida) : '—'}</span> },
    { id: 'saldo', titulo: 'Saldo', obtenerValor: (item) => item.saldo, celda: (item) => <span className={styles.cantidad}>{numero(item.saldo)}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => puedeVerAuditoria ? <div className={styles.accionesFila}><button type="button" title="Ver auditoría de la operación" aria-label={`Ver auditoría de la operación ${item.referencia}`} onClick={() => setOperacionAuditoria(item)}><img src={iconoVer} alt="" /></button></div> : null },
  ], [puedeVerAuditoria])

  if (errorDetalle) {
    return <section className={styles.pagina}><InventarioBreadcrumb anterior={{ etiqueta: 'Existencias', ruta: '/inventario/existencias' }} actual="Detalle de existencia" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{errorDetalle}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  }

  if (!detalle) {
    return <section className={styles.pagina} aria-busy="true"><InventarioBreadcrumb anterior={{ etiqueta: 'Existencias', ruta: '/inventario/existencias' }} actual="Detalle de existencia" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h2>Cargando existencia</h2><p>Consultando cantidades, ubicaciones y movimientos…</p></div></section>
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-existencia">
      <header className={styles.cabecera}>
        <InventarioBreadcrumb anterior={{ etiqueta: 'Existencias', ruta: '/inventario/existencias' }} actual={detalle.producto.nombre} onNavegar={onNavegar} />
        <div className={styles.encabezadoProductoInventario}>
          <span className={styles.imagenProductoInventario}>
            <span aria-hidden="true">Rx</span>
            {detalle.producto.imagenUrl && <img src={`${construirUrlApi(detalle.producto.imagenUrl)}?v=${detalle.producto.version}`} alt={`Imagen de referencia de ${detalle.producto.nombre}`} crossOrigin="use-credentials" onError={(evento) => { evento.currentTarget.style.display = 'none' }} />}
          </span>
          <div><h1 id="titulo-detalle-existencia">{detalle.producto.nombre}</h1><p>{detalle.producto.codigo}</p></div>
        </div>
      </header>

      <article className={styles.detalleMasivo}>
        <dl>
          <div><dt>Código</dt><dd>{detalle.producto.codigo}</dd></div>
          <div><dt>Estado del medicamento</dt><dd>{detalle.producto.activo ? 'Activo' : 'Inactivo'}</dd></div>
          <div><dt>Existencia física</dt><dd>{numero(detalle.cantidadFisica)}</dd></div>
          <div><dt>Disponible</dt><dd>{numero(detalle.cantidadDisponible)}</dd></div>
          <div><dt>Último costo unitario</dt><dd>{detalle.ultimoCostoUnitario === null ? 'Sin costo registrado' : moneda(detalle.ultimoCostoUnitario)}</dd></div>
          <div><dt>Reservada</dt><dd>{numero(detalle.cantidadReservada)}</dd></div>
          <div><dt>Comprometida</dt><dd>{numero(detalle.cantidadComprometida)}</dd></div>
          <div><dt>Bloqueada</dt><dd>{numero(detalle.cantidadBloqueada)}</dd></div>
          <div><dt>En cuarentena</dt><dd>{numero(detalle.cantidadCuarentena)}</dd></div>
          <div><dt>En tránsito</dt><dd>{numero(detalle.cantidadEnTransito)}</dd></div>
          <div><dt>Política de mínimo</dt><dd>{detalle.bajoMinimo ? 'Existencia bajo mínimo' : 'Existencia dentro del mínimo'}</dd></div>
          <div><dt>Control de lote</dt><dd>{detalle.producto.controlaLote ? 'Sí' : 'No'}</dd></div>
          <div><dt>Requiere vencimiento</dt><dd>{detalle.producto.requiereVencimiento ? 'Sí' : 'No'}</dd></div>
        </dl>
      </article>

      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}><div><strong>Distribución física y lotes</strong><small>Existencia actual por ubicación, lote y estado.</small></div><span>{detalle.posiciones.length} {detalle.posiciones.length === 1 ? 'posición' : 'posiciones'}</span></div>
        {detalle.posiciones.length ? <TablaDatos descripcion={`Distribución de ${detalle.producto.nombre}`} datos={detalle.posiciones} columnas={columnasPosiciones} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => `${item.ubicacion.id}-${item.lote?.id ?? 'SIN_LOTE'}-${item.estado}`} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /> : <div className={styles.estadoVacio}><h2>Sin posiciones actuales</h2><p>El medicamento no tiene existencia distribuida en esta sucursal.</p></div>}
      </article>

      <article className={styles.panelTabla} aria-busy={cargandoKardex}>
        <div className={styles.resumenTabla}><div><strong>Pista de auditoría del inventario</strong><small>Movimientos del Kardex que explican las entradas, salidas y saldos del medicamento.</small></div><div className={styles.accionesResumen}>{cargandoKardex && <span role="status">Actualizando…</span>}{kardex && <span>{kardex.total} {kardex.total === 1 ? 'movimiento' : 'movimientos'}</span>}</div></div>
        {!puedeVerKardex ? <div className={styles.estadoVacio}><h2>Auditoría no disponible</h2><p>Tu usuario necesita permiso para consultar el Kardex de inventario.</p></div> : errorKardex ? <div className={styles.alertaError} role="alert"><p>{errorKardex}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : kardex?.items.length ? <><TablaDatos descripcion={`Pista de movimientos de ${detalle.producto.nombre}`} datos={kardex.items} columnas={columnasKardex} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /><PaginacionTabla pagina={kardex.pagina} tamanoPagina={kardex.tamanoPagina} total={kardex.total} totalPaginas={kardex.totalPaginas} unidadSingular="movimiento" unidadPlural="movimientos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargandoKardex ? <div className={styles.estadoVacio}><h2>Sin movimientos registrados</h2><p>No existe historial de movimientos para este medicamento.</p></div> : null}
      </article>

      {operacionAuditoria && puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={operacionAuditoria.operacionId} titulo={`Operación ${operacionAuditoria.referencia} · ${etiquetasOperacion[operacionAuditoria.tipo] ?? operacionAuditoria.tipo}.`} revision={revision} />}
    </section>
  )
}
