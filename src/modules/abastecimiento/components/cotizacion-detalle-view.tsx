import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { CotizacionCompra, DetalleProductoAbastecimiento } from '../abastecimiento.types'
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
  if (estado === 'SELECCIONADA') return styles.estadoExito
  if (estado === 'DESCARTADA') return styles.estadoPeligro
  if (estado === 'REGISTRADA') return styles.estadoAdvertencia
  return styles.estadoInfo
}

export function CotizacionDetalleView({ cotizacionId, permisos, onNavegar }: { cotizacionId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [cotizacion, setCotizacion] = useState<CotizacionCompra | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeEvaluar = permisos.includes('ABASTECIMIENTO.COTIZACIONES.ADJUDICAR')
  const puedeVerAuditoria = permisos.includes('ABASTECIMIENTO.COTIZACIONES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<CotizacionCompra>('cotizaciones', cotizacionId, controlador.signal).then((respuesta) => { setCotizacion(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la cotización.') })
    return () => controlador.abort()
  }, [cotizacionId, revision])

  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: (item) => item.producto?.codigo ?? '', celda: (item) => <strong>{item.producto?.codigo ?? 'Sin código'}</strong> },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => item.producto?.nombre ?? 'Producto no disponible' },
    { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => Number(item.cantidad ?? 0), celda: (item) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(item.cantidad ?? 0)) },
    { id: 'precio', titulo: 'Precio unitario', obtenerValor: (item) => Number(item.precioUnitario ?? 0), celda: (item) => cotizacion ? monto(item.precioUnitario, cotizacion.moneda) : '' },
    { id: 'impuesto', titulo: 'Impuesto', obtenerValor: (item) => Number(item.impuesto ?? 0), celda: (item) => cotizacion ? monto(item.impuesto, cotizacion.moneda) : '' },
    { id: 'subtotal', titulo: 'Subtotal', obtenerValor: (item) => Number(item.subtotal ?? 0), celda: (item) => cotizacion ? <strong>{monto(item.subtotal, cotizacion.moneda)}</strong> : '' },
  ], [cotizacion])

  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="cotizaciones" actual="Detalle de cotización" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!cotizacion) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="cotizaciones" actual="Detalle de cotización" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando cotización</h1><p>Consultando oferta, productos y trazabilidad…</p></div></section>

  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-cotizacion">
      <AbastecimientoBreadcrumb recurso="cotizaciones" actual="Detalle de cotización" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div><p className={styles.sobretitulo}>Oferta del proveedor</p><h1 id="titulo-detalle-cotizacion">Cotización {cotizacion.numeroProveedor}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${claseEstado(cotizacion.estado)}`}>{etiquetaCodigo(cotizacion.estado)}</span>{cotizacion.solicitud && <span className={`${styles.estado} ${styles.estadoInfo}`}>{etiquetaCodigo(cotizacion.solicitud.modalidad)}</span>}</div></div>
        {puedeEvaluar && cotizacion.estado === 'REGISTRADA' && <div className={styles.accionesCabecera}><button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/cotizaciones/${cotizacion.id}/evaluar`)}><IconoAccion nombre="estado" />Evaluar cotización</button></div>}
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Proveedor y solicitud</h2><dl><div><dt>Proveedor</dt><dd>{cotizacion.proveedor ? `${cotizacion.proveedor.codigo} — ${cotizacion.proveedor.nombre}` : 'Proveedor relacionado'}</dd></div><div><dt>Solicitud</dt><dd>{cotizacion.solicitud?.numero ?? 'Solicitud relacionada'}</dd></div><div><dt>Registrada</dt><dd>{fechaHora(cotizacion.creadoEn)}</dd></div><div><dt>Vigente hasta</dt><dd>{fecha(cotizacion.vigenteHasta)}</dd></div><div className={styles.datoCompleto}><dt>Referencia de evidencia</dt><dd>{cotizacion.evidenciaReferencia}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Condiciones comerciales</h2><dl><div><dt>Moneda</dt><dd>{cotizacion.moneda}</dd></div><div><dt>Tipo de cambio</dt><dd>{new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(cotizacion.tipoCambio)}</dd></div><div><dt>Fecha del tipo de cambio</dt><dd>{fecha(cotizacion.fechaTipoCambio)}</dd></div><div><dt>Plazo de entrega</dt><dd>{cotizacion.plazoEntregaDias} {cotizacion.plazoEntregaDias === 1 ? 'día' : 'días'}</dd></div><div className={styles.datoCompleto}><dt>Forma de pago</dt><dd>{cotizacion.formaPago}</dd></div><div className={styles.datoCompleto}><dt>Condiciones de entrega</dt><dd>{cotizacion.condicionesEntrega}</dd></div></dl></article>
      </div>

      <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Productos cotizados</h2><p>El total en GTQ conserva el tipo de cambio y la fecha usados al registrar la oferta.</p></div><span>{cotizacion.detalles.length} {cotizacion.detalles.length === 1 ? 'producto' : 'productos'}</span></div><TablaDatos descripcion={`Productos de la cotización ${cotizacion.numeroProveedor}`} datos={cotizacion.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /><section className={styles.totalesCotizacion}><div><span>Total de la oferta</span><strong>{monto(cotizacion.total, cotizacion.moneda)}</strong></div><div><span>Total en GTQ</span><strong>{monto(cotizacion.totalGtq, 'GTQ')}</strong></div></section></article>

      <article className={styles.tarjetaDetalle}><h2>Evaluación comercial</h2><dl><div><dt>Estado</dt><dd>{etiquetaCodigo(cotizacion.estado)}</dd></div><div><dt>Puntaje</dt><dd>{cotizacion.puntaje === null ? 'Pendiente' : `${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 2 }).format(cotizacion.puntaje)} / 100`}</dd></div><div className={styles.datoCompleto}><dt>Justificación</dt><dd>{cotizacion.justificacionSeleccion ?? 'Pendiente de evaluación independiente'}</dd></div></dl></article>

      {puedeVerAuditoria && <AbastecimientoAuditoria recurso="cotizaciones" entidadId={cotizacion.id} revision={revision} />}
    </section>
  )
}
