import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { DetalleProductoAbastecimiento, OrdenCompra } from '../abastecimiento.types'
import { AbastecimientoAuditoria } from './abastecimiento-auditoria'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

function fecha(valor: string | null): string {
  if (!valor) return 'No registrada'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

function fechaHora(valor: string | null): string {
  if (!valor) return 'No registrada'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function monto(valor: unknown, moneda: string): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(Number(valor ?? 0))
}

function claseEstado(estado: string): string {
  if (['RECIBIDA', 'CERRADA'].includes(estado)) return styles.estadoExito
  if (estado === 'CANCELADA') return styles.estadoPeligro
  if (estado === 'EMITIDA') return styles.estadoAdvertencia
  return styles.estadoInfo
}

export function OrdenDetalleView({ ordenId, sucursalActualId, permisos, onNavegar }: { ordenId: string; sucursalActualId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [orden, setOrden] = useState<OrdenCompra | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeConfirmar = permisos.includes('ABASTECIMIENTO.ORDENES.CONFIRMAR')
  const puedeCerrar = permisos.includes('ABASTECIMIENTO.ORDENES.CERRAR')
  const puedeCancelar = permisos.includes('ABASTECIMIENTO.ORDENES.CANCELAR')
  const puedeRecibir = permisos.includes('ABASTECIMIENTO.RECEPCIONES.REGISTRAR')
  const puedeVerAuditoria = permisos.includes('ABASTECIMIENTO.ORDENES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<OrdenCompra>('ordenes', ordenId, controlador.signal).then((respuesta) => { setOrden(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la orden de compra.') })
    return () => controlador.abort()
  }, [ordenId, revision])

  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: (item) => item.producto?.codigo ?? '', celda: (item) => <strong>{item.producto?.codigo ?? 'Sin código'}</strong> },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => item.producto?.nombre ?? 'Producto no disponible' },
    { id: 'ordenada', titulo: 'Ordenada', obtenerValor: (item) => Number(item.cantidadOrdenada ?? 0), celda: (item) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(item.cantidadOrdenada ?? 0)) },
    { id: 'recibida', titulo: 'Aceptada', obtenerValor: (item) => Number(item.cantidadRecibida ?? 0), celda: (item) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(item.cantidadRecibida ?? 0)) },
    { id: 'pendiente', titulo: 'Pendiente', obtenerValor: (item) => Number(item.cantidadOrdenada ?? 0) - Number(item.cantidadRecibida ?? 0), celda: (item) => <strong>{new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Math.max(0, Number(item.cantidadOrdenada ?? 0) - Number(item.cantidadRecibida ?? 0)))}</strong> },
    { id: 'precio', titulo: 'Precio unitario', obtenerValor: (item) => Number(item.precioUnitario ?? 0), celda: (item) => orden ? monto(item.precioUnitario, orden.moneda) : '—' },
  ], [orden])

  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="ordenes" actual="Detalle de orden" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!orden) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="ordenes" actual="Detalle de orden" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando orden</h1><p>Consultando condiciones, productos y seguimiento…</p></div></section>

  const cancelable = ['EMITIDA', 'CONFIRMADA_PROVEEDOR', 'RECEPCION_PARCIAL'].includes(orden.estado)
  const recepcionable = ['EMITIDA', 'CONFIRMADA_PROVEEDOR', 'RECEPCION_PARCIAL'].includes(orden.estado)
  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-orden">
      <AbastecimientoBreadcrumb recurso="ordenes" actual="Detalle de orden" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div><p className={styles.sobretitulo}>{orden.modalidad === 'URGENTE' ? 'Orden urgente' : 'Orden ordinaria'} · versión {orden.versionDocumento}</p><h1 id="titulo-detalle-orden">Orden {orden.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${claseEstado(orden.estado)}`}>{etiquetaCodigo(orden.estado)}</span><span className={`${styles.estado} ${styles.estadoInfo}`}>{orden.tipoDestino === 'CLIENTE' ? 'Entrega directa' : 'Ingreso a sucursal'}</span></div></div>
        <div className={styles.accionesCabecera}>
          {puedeConfirmar && orden.estado === 'EMITIDA' && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/ordenes/${orden.id}/confirmar`)}><IconoAccion nombre="estado" />Confirmar proveedor</button>}
          {puedeRecibir && recepcionable && orden.sucursalDestinoId === sucursalActualId && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/abastecimiento/recepciones/nuevo?ordenId=${encodeURIComponent(orden.id)}`)}><IconoAccion nombre="guardar" />Registrar recepción</button>}
          {puedeCerrar && orden.estado === 'RECIBIDA' && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/ordenes/${orden.id}/cerrar`)}><IconoAccion nombre="estado" />Cerrar orden</button>}
          {puedeCancelar && cancelable && <button className={styles.botonPeligro} type="button" onClick={() => onNavegar(`/abastecimiento/ordenes/${orden.id}/cancelar`)}><IconoAccion nombre="desactivar" />Cancelar orden</button>}
        </div>
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Origen y destino</h2><dl><div><dt>Proveedor</dt><dd>{orden.proveedor ? `${orden.proveedor.codigo} — ${orden.proveedor.nombre}` : 'Proveedor relacionado'}</dd></div><div><dt>Sucursal destino</dt><dd>{orden.sucursalDestino ? `${orden.sucursalDestino.codigo} — ${orden.sucursalDestino.nombre}` : 'Sucursal relacionada'}</dd></div><div><dt>Solicitud</dt><dd>{orden.solicitudId}</dd></div><div><dt>Cotización</dt><dd>{orden.cotizacionId}</dd></div><div><dt>Tipo de destino</dt><dd>{orden.tipoDestino === 'CLIENTE' ? 'Entrega directa a cliente' : 'Ingreso a sucursal'}</dd></div><div className={styles.datoCompleto}><dt>Referencia de destino</dt><dd>{orden.referenciaDestino ?? 'No aplica'}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Condiciones y calendario</h2><dl><div><dt>Emitida</dt><dd>{fechaHora(orden.emitidaEn)}</dd></div><div><dt>Entrega estimada</dt><dd>{fecha(orden.entregaEstimadaEn)}</dd></div><div><dt>Moneda</dt><dd>{orden.moneda}</dd></div><div><dt>Tipo de cambio</dt><dd>{new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(orden.tipoCambio)} · {fecha(orden.fechaTipoCambio)}</dd></div><div className={styles.datoCompleto}><dt>Forma de pago</dt><dd>{orden.formaPago}</dd></div><div className={styles.datoCompleto}><dt>Condiciones de entrega</dt><dd>{orden.condicionesEntrega}</dd></div><div><dt>Total</dt><dd>{monto(orden.total, orden.moneda)}</dd></div><div><dt>Total en GTQ</dt><dd>{monto(orden.totalGtq, 'GTQ')}</dd></div><div><dt>Cerrada</dt><dd>{fechaHora(orden.cerradaEn)}</dd></div></dl></article>
      </div>

      <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Seguimiento de cantidades</h2><p>Las cantidades aceptadas se acumulan únicamente después de la validación técnica de cada recepción.</p></div><span>{orden.detalles.length} productos</span></div><TablaDatos descripcion={`Detalle de la orden ${orden.numero}`} datos={orden.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /></article>

      {puedeVerAuditoria && <AbastecimientoAuditoria recurso="ordenes" entidadId={orden.id} revision={revision} />}
    </section>
  )
}
