import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { DetalleProductoAbastecimiento, TrasladoInterno } from '../abastecimiento.types'
import { AbastecimientoAuditoria } from './abastecimiento-auditoria'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

const numero = (valor: unknown) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(valor ?? 0))
const fecha = (valor: string | null) => valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`)) : 'No registrada'
const moneda = (valor: unknown) => valor === null || valor === undefined ? 'No registrado' : new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor))

export function TrasladoDetalleView({ trasladoId, sucursalActualId, permisos, onNavegar }: { trasladoId: string; sucursalActualId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [traslado, setTraslado] = useState<TrasladoInterno | null>(null); const [error, setError] = useState<string | null>(null); const [revision, setRevision] = useState(0)
  useEffect(() => { const c = new AbortController(); void obtenerRegistroAbastecimiento<TrasladoInterno>('traslados', trasladoId, c.signal).then((r) => { setTraslado(r); setError(null) }).catch((e: unknown) => { if (!c.signal.aborted) setError(e instanceof ErrorApi ? e.message : 'No fue posible cargar el traslado.') }); return () => c.abort() }, [trasladoId, revision])
  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'producto', titulo: 'Producto', obtenerValor: (x) => x.producto?.nombre ?? '', celda: (x) => <><strong>{x.producto?.codigo ?? 'Sin código'}</strong><br />{x.producto?.nombre ?? 'Producto no disponible'}</> },
    { id: 'lote', titulo: 'Lote', obtenerValor: (x) => x.lote?.numeroLote ?? '', celda: (x) => x.lote?.numeroLote ?? 'Pendiente de preparación' },
    { id: 'solicitada', titulo: 'Solicitada', obtenerValor: (x) => Number(x.cantidadSolicitada ?? 0), celda: (x) => numero(x.cantidadSolicitada) },
    { id: 'aprobada', titulo: 'Aprobada', obtenerValor: (x) => Number(x.cantidadAprobada ?? 0), celda: (x) => numero(x.cantidadAprobada) },
    { id: 'despachada', titulo: 'Despachada', obtenerValor: (x) => Number(x.cantidadDespachada ?? 0), celda: (x) => numero(x.cantidadDespachada) },
    { id: 'enDespacho', titulo: 'En tránsito', obtenerValor: (x) => Number(x.cantidadEnDespacho ?? 0), celda: (x) => numero(x.cantidadEnDespacho) },
    { id: 'recibida', titulo: 'Recibida', obtenerValor: (x) => Number(x.cantidadRecibida ?? 0), celda: (x) => numero(x.cantidadRecibida) },
    { id: 'rechazada', titulo: 'Rechazada', obtenerValor: (x) => Number(x.cantidadRechazada ?? 0), celda: (x) => numero(x.cantidadRechazada) },
  ], [])
  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="traslados" actual="Detalle de traslado" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div></section>
  if (!traslado) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="traslados" actual="Detalle de traslado" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando traslado</h1><p>Consultando ruta, productos y seguimiento…</p></div></section>
  const origen = traslado.sucursalOrigenId === sucursalActualId; const destino = traslado.sucursalDestinoId === sucursalActualId
  const pendiente = traslado.detalles.some((x) => Number(x.cantidadAprobada ?? 0) > Number(x.cantidadDespachada ?? 0))
  const puedeAprobar = origen && permisos.includes('ABASTECIMIENTO.TRASLADOS.APROBAR')
  const puedePreparar = origen && permisos.includes('ABASTECIMIENTO.TRASLADOS.PREPARAR')
  const puedeDespachar = origen && permisos.includes('ABASTECIMIENTO.TRASLADOS.DESPACHAR')
  const puedeRecibir = destino && permisos.includes('ABASTECIMIENTO.TRASLADOS.RECIBIR')
  const puedeCerrar = destino && permisos.includes('ABASTECIMIENTO.TRASLADOS.CERRAR')
  const puedeCancelar = permisos.includes('ABASTECIMIENTO.TRASLADOS.CANCELAR')
  const cerrable = traslado.estado === 'RECIBIDO' && traslado.detalles.every((x) => Number(x.cantidadAprobada ?? 0) === Number(x.cantidadRecibida ?? 0) + Number(x.cantidadRechazada ?? 0))
  return <section className={styles.pagina} aria-labelledby="titulo-traslado"><AbastecimientoBreadcrumb recurso="traslados" actual="Detalle de traslado" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>{etiquetaCodigo(traslado.tipo)} · despacho {traslado.secuenciaDespacho ?? 0}</p><h1 id="titulo-traslado">Traslado {traslado.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${['CERRADO', 'RECIBIDO'].includes(traslado.estado) ? styles.estadoExito : ['RECHAZADO', 'CANCELADO'].includes(traslado.estado) ? styles.estadoPeligro : styles.estadoInfo}`}>{etiquetaCodigo(traslado.estado)}</span><span className={`${styles.estado} ${traslado.prioridad === 'EMERGENCIA' ? styles.estadoPeligro : traslado.prioridad === 'ALTA' ? styles.estadoAdvertencia : styles.estadoInfo}`}>{etiquetaCodigo(traslado.prioridad)}</span></div></div><div className={styles.accionesCabecera}>
    {puedeAprobar && traslado.estado === 'SOLICITADO' && <button className={styles.botonPrimario} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/aprobar`)}><IconoAccion nombre="estado" />Resolver solicitud</button>}
    {puedePreparar && ['APROBADO', 'RECIBIDO'].includes(traslado.estado) && pendiente && <button className={styles.botonPrimario} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/preparar`)}><IconoAccion nombre="guardar" />Preparar despacho</button>}
    {puedeDespachar && traslado.estado === 'PREPARADO' && <button className={styles.botonPrimario} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/despachar`)}><IconoAccion nombre="guardar" />Despachar</button>}
    {puedeRecibir && traslado.estado === 'EN_TRANSITO' && <button className={styles.botonPrimario} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/recibir`)}><IconoAccion nombre="guardar" />Recibir traslado</button>}
    {puedeCerrar && cerrable && <button className={styles.botonPrimario} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/cerrar`)}><IconoAccion nombre="estado" />Cerrar traslado</button>}
    {puedeCancelar && ['SOLICITADO', 'APROBADO', 'PREPARADO'].includes(traslado.estado) && <button className={styles.botonPeligro} onClick={() => onNavegar(`/abastecimiento/traslados/${traslado.id}/cancelar`)}><IconoAccion nombre="desactivar" />Cancelar</button>}
  </div></header><div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Ruta logística</h2><dl><div><dt>Sucursal origen</dt><dd>{traslado.sucursalOrigen?.nombre ?? traslado.sucursalOrigenId}</dd></div><div><dt>Ubicación origen</dt><dd>{traslado.ubicacionOrigen?.nombre ?? traslado.ubicacionOrigenId}</dd></div><div><dt>Sucursal destino</dt><dd>{traslado.sucursalDestino?.nombre ?? traslado.sucursalDestinoId}</dd></div><div><dt>Ubicación destino</dt><dd>{traslado.ubicacionDestino?.nombre ?? traslado.ubicacionDestinoId}</dd></div><div><dt>Requerido para</dt><dd>{fecha(traslado.requeridoEn)}</dd></div><div><dt>Participación actual</dt><dd>{origen ? 'Sucursal de origen' : destino ? 'Sucursal de destino' : 'Consulta global'}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Control y transporte</h2><dl><div className={styles.datoCompleto}><dt>Justificación</dt><dd>{traslado.justificacion}</dd></div><div className={styles.datoCompleto}><dt>Evidencia</dt><dd>{traslado.evidenciaReferencia ?? 'No registrada'}</dd></div><div><dt>Transportista</dt><dd>{traslado.ultimoTransportista ?? 'Pendiente'}</dd></div><div><dt>Referencia</dt><dd>{traslado.ultimoTransporteReferencia ?? 'Pendiente'}</dd></div><div><dt>Costo</dt><dd>{moneda(traslado.ultimoCostoTransporte)}</dd></div><div><dt>Evidencia de despacho</dt><dd>{traslado.ultimaEvidenciaDespacho ?? 'Pendiente'}</dd></div></dl></article></div><article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Seguimiento por producto</h2><p>Las cantidades distinguen lo aprobado, cada despacho y la recepción final.</p></div><span>{traslado.detalles.length} productos</span></div><TablaDatos descripcion={`Productos del traslado ${traslado.numero}`} datos={traslado.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(x) => x.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /></article>{permisos.includes('ABASTECIMIENTO.TRASLADOS.VER_AUDITORIA') && <AbastecimientoAuditoria recurso="traslados" entidadId={traslado.id} revision={revision} />}</section>
}
