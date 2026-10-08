import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { DetalleProductoAbastecimiento, SolicitudCompra } from '../abastecimiento.types'
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

function claseEstado(estado: string): string {
  if (estado === 'APROBADA') return styles.estadoExito
  if (['RECHAZADA', 'CANCELADA'].includes(estado)) return styles.estadoPeligro
  return styles.estadoAdvertencia
}

export function SolicitudDetalleView({ solicitudId, permisos, onNavegar }: { solicitudId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [solicitud, setSolicitud] = useState<SolicitudCompra | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeResolver = permisos.includes('ABASTECIMIENTO.SOLICITUDES.APROBAR')
  const puedeCancelar = permisos.includes('ABASTECIMIENTO.SOLICITUDES.CANCELAR')
  const puedeVerAuditoria = permisos.includes('ABASTECIMIENTO.SOLICITUDES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<SolicitudCompra>('solicitudes', solicitudId, controlador.signal).then((valor) => { setSolicitud(valor); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la solicitud.') })
    return () => controlador.abort()
  }, [solicitudId, revision])

  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: (item) => item.producto?.codigo ?? '', celda: (item) => <strong>{item.producto?.codigo ?? 'Sin código'}</strong> },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => <><strong>{item.producto?.nombre ?? 'Producto no disponible'}</strong>{item.producto?.presentacion && <small>{item.producto.presentacion}</small>}</> },
    { id: 'cantidad', titulo: 'Cantidad solicitada', obtenerValor: (item) => item.cantidad ?? 0, celda: (item) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(item.cantidad ?? 0) },
    { id: 'observaciones', titulo: 'Observaciones', obtenerValor: (item) => item.observaciones ?? '', celda: (item) => item.observaciones ?? 'Sin observaciones' },
  ], [])

  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="solicitudes" actual="Detalle de solicitud" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!solicitud) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="solicitudes" actual="Detalle de solicitud" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando solicitud</h1><p>Consultando productos, resolución y trazabilidad…</p></div></section>

  const cancelable = ['SOLICITADA', 'APROBADA', 'EN_COTIZACION'].includes(solicitud.estado)
  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-solicitud">
      <AbastecimientoBreadcrumb recurso="solicitudes" actual="Detalle de solicitud" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div><p className={styles.sobretitulo}>{solicitud.modalidad === 'URGENTE' ? 'Compra urgente' : 'Compra ordinaria'}</p><h1 id="titulo-detalle-solicitud">Solicitud {solicitud.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${claseEstado(solicitud.estado)}`}>{etiquetaCodigo(solicitud.estado)}</span><span className={`${styles.estado} ${styles.estadoInfo}`}>{etiquetaCodigo(solicitud.modalidad)}</span></div></div>
        {(puedeResolver || puedeCancelar) && <div className={styles.accionesCabecera}>{puedeResolver && solicitud.estado === 'SOLICITADA' && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/solicitudes/${solicitud.id}/resolver`)}><IconoAccion nombre="estado" />Resolver solicitud</button>}{puedeCancelar && cancelable && <button className={styles.botonPeligro} type="button" onClick={() => onNavegar(`/abastecimiento/solicitudes/${solicitud.id}/cancelar`)}><IconoAccion nombre="desactivar" />Cancelar solicitud</button>}</div>}
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Necesidad</h2><dl><div><dt>Sucursal</dt><dd>{solicitud.sucursal ? `${solicitud.sucursal.codigo} — ${solicitud.sucursal.nombre}` : 'Sucursal relacionada'}</dd></div><div><dt>Fecha requerida</dt><dd>{fecha(solicitud.requeridaEn)}</dd></div><div><dt>Registrada</dt><dd>{fechaHora(solicitud.solicitadaEn ?? solicitud.creadoEn)}</dd></div><div className={styles.datoCompleto}><dt>Referencia</dt><dd>{solicitud.referenciaNecesidad}</dd></div><div className={styles.datoCompleto}><dt>Justificación</dt><dd>{solicitud.justificacion}</dd></div><div className={styles.datoCompleto}><dt>Evidencia</dt><dd>{solicitud.evidenciaReferencia ?? 'No registrada'}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Resolución</h2><dl><div><dt>Estado</dt><dd>{etiquetaCodigo(solicitud.estado)}</dd></div><div><dt>Fecha de resolución</dt><dd>{fechaHora(solicitud.resueltaEn)}</dd></div><div className={styles.datoCompleto}><dt>Motivo</dt><dd>{solicitud.motivoResolucion ?? 'Pendiente de resolución'}</dd></div>{solicitud.modalidad === 'URGENTE' && <><div><dt>Prioridad</dt><dd>{etiquetaCodigo(solicitud.prioridad)}</dd></div><div><dt>Última vía evaluada</dt><dd>{etiquetaCodigo(solicitud.viaAtencionUrgente)}</dd></div><div className={styles.datoCompleto}><dt>Alternativas evaluadas</dt><dd>{solicitud.alternativasEvaluadas.length ? solicitud.alternativasEvaluadas.map(etiquetaCodigo).join(' → ') : 'No registradas'}</dd></div></>}</dl></article>
      </div>

      <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Productos solicitados</h2><p>Las cantidades todavía no representan movimientos de inventario.</p></div><span>{solicitud.detalles.length} {solicitud.detalles.length === 1 ? 'producto' : 'productos'}</span></div><TablaDatos descripcion={`Productos de la solicitud ${solicitud.numero}`} datos={solicitud.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /></article>

      {puedeVerAuditoria && <AbastecimientoAuditoria recurso="solicitudes" entidadId={solicitud.id} revision={revision} />}
    </section>
  )
}
