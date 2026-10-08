import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { DetalleProductoAbastecimiento, EtapaRecepcionCompra, RecepcionCompra } from '../abastecimiento.types'
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

function numero(valor: unknown): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(valor ?? 0))
}

function siguienteEtapa(estado: string): EtapaRecepcionCompra | null {
  if (estado === 'REGISTRADA') return 'DOCUMENTAL'
  if (estado === 'DOCUMENTAL_CONFORME') return 'FISICA'
  if (estado === 'FISICA_CONFORME') return 'TECNICA'
  return null
}

function claseEstado(estado: string): string {
  if (estado === 'TECNICA_CONFORME') return styles.estadoExito
  if (estado === 'RECHAZADA') return styles.estadoPeligro
  if (estado === 'REGISTRADA') return styles.estadoAdvertencia
  return styles.estadoInfo
}

export function RecepcionDetalleView({ recepcionId, permisos, onNavegar }: { recepcionId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [recepcion, setRecepcion] = useState<RecepcionCompra | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeValidar = permisos.includes('ABASTECIMIENTO.RECEPCIONES.VALIDAR')
  const puedeRegularizar = permisos.includes('ABASTECIMIENTO.RECEPCIONES.REGULARIZAR')
  const puedeVerAuditoria = permisos.includes('ABASTECIMIENTO.RECEPCIONES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<RecepcionCompra>('recepciones', recepcionId, controlador.signal).then((respuesta) => { setRecepcion(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la recepción.') })
    return () => controlador.abort()
  }, [recepcionId, revision])

  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: (item) => item.producto?.codigo ?? '', celda: (item) => <strong>{item.producto?.codigo ?? 'Sin código'}</strong> },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => item.producto?.nombre ?? 'Producto no disponible' },
    { id: 'recibida', titulo: 'Recibida', obtenerValor: (item) => Number(item.cantidadRecibida ?? 0), celda: (item) => numero(item.cantidadRecibida) },
    { id: 'aceptada', titulo: 'Aceptada', obtenerValor: (item) => Number(item.cantidadAceptada ?? 0), celda: (item) => <strong>{numero(item.cantidadAceptada)}</strong> },
    { id: 'rechazada', titulo: 'Rechazada', obtenerValor: (item) => Number(item.cantidadRechazada ?? 0), celda: (item) => numero(item.cantidadRechazada) },
    { id: 'ingreso', titulo: 'Estado de ingreso', obtenerValor: (item) => String(item.estadoIngreso ?? ''), celda: (item) => etiquetaCodigo(String(item.estadoIngreso ?? '')) },
    { id: 'lote', titulo: 'Lote / vencimiento', obtenerValor: (item) => String(item.numeroLote ?? ''), celda: (item) => <>{String(item.numeroLote ?? 'Sin lote')}<small>{fecha(typeof item.fechaVencimiento === 'string' ? item.fechaVencimiento : null)}</small></> },
    { id: 'costo', titulo: 'Costo unitario', obtenerValor: (item) => Number(item.costoUnitario ?? 0), celda: (item) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 4 }).format(Number(item.costoUnitario ?? 0)) },
  ], [])

  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="recepciones" actual="Detalle de recepción" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!recepcion) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="recepciones" actual="Detalle de recepción" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando recepción</h1><p>Consultando inspecciones, productos y trazabilidad…</p></div></section>

  const etapa = siguienteEtapa(recepcion.estado)
  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-recepcion">
      <AbastecimientoBreadcrumb recurso="recepciones" actual="Detalle de recepción" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div><p className={styles.sobretitulo}>Orden {recepcion.orden?.numero ?? 'relacionada'}</p><h1 id="titulo-detalle-recepcion">Recepción {recepcion.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${claseEstado(recepcion.estado)}`}>{etiquetaCodigo(recepcion.estado)}</span>{recepcion.documentoPendiente && <span className={`${styles.estado} ${styles.estadoAdvertencia}`}>Documento pendiente</span>}</div></div>
        <div className={styles.accionesCabecera}>{puedeRegularizar && recepcion.documentoPendiente && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/abastecimiento/recepciones/${recepcion.id}/regularizar`)}><IconoAccion nombre="editar" />Regularizar documento</button>}{puedeValidar && etapa && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/recepciones/${recepcion.id}/validar/${etapa.toLowerCase()}`)}><IconoAccion nombre="estado" />Validar etapa {etapa.toLowerCase()}</button>}</div>
      </header>

      <section className={styles.progresoRecepcion} aria-label="Etapas de recepción">
        {(['DOCUMENTAL', 'FISICA', 'TECNICA'] as const).map((item, indice) => { const alcanzada = ['DOCUMENTAL_CONFORME', 'FISICA_CONFORME', 'TECNICA_CONFORME'].indexOf(recepcion.estado) >= indice; return <div key={item} className={alcanzada ? styles.etapaCompleta : styles.etapaPendiente}><span>{alcanzada ? '✓' : indice + 1}</span><strong>{item === 'FISICA' ? 'Física' : item === 'TECNICA' ? 'Técnica' : 'Documental'}</strong></div> })}
      </section>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Documento y responsable</h2><dl><div><dt>Documento del proveedor</dt><dd>{recepcion.documentoProveedor ?? 'Pendiente'}</dd></div><div><dt>Regularizar antes de</dt><dd>{fecha(recepcion.regularizarAntesDe)}</dd></div><div className={styles.datoCompleto}><dt>Evidencia documental</dt><dd>{recepcion.evidenciaDocumental}</dd></div><div><dt>Registrada</dt><dd>{fechaHora(recepcion.creadoEn)}</dd></div><div><dt>Confirmada</dt><dd>{fechaHora(recepcion.confirmadaEn)}</dd></div><div className={styles.datoCompleto}><dt>Observaciones</dt><dd>{recepcion.observaciones ?? 'Sin observaciones'}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Origen y destino</h2><dl><div><dt>Proveedor</dt><dd>{recepcion.orden?.proveedor?.nombre ?? 'Proveedor relacionado'}</dd></div><div><dt>Orden</dt><dd>{recepcion.orden?.numero ?? recepcion.ordenId}</dd></div><div><dt>Tipo de destino</dt><dd>{recepcion.orden?.tipoDestino === 'CLIENTE' ? 'Entrega directa a cliente' : 'Ingreso a sucursal'}</dd></div><div><dt>Ubicación</dt><dd>{recepcion.ubicacionDestino ? `${recepcion.ubicacionDestino.codigo} — ${recepcion.ubicacionDestino.nombre}` : 'No aplica'}</dd></div><div><dt>Receptor</dt><dd>{recepcion.receptorNombre ?? 'No aplica'}</dd></div><div><dt>Identificación</dt><dd>{recepcion.receptorIdentificacion ?? 'No aplica'}</dd></div><div><dt>Entregado</dt><dd>{fechaHora(recepcion.entregadoEn)}</dd></div></dl></article>
      </div>

      <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Productos inspeccionados</h2><p>Solo las cantidades aceptadas podrán ingresar a inventario después de la conformidad técnica.</p></div><span>{recepcion.detalles.length} productos</span></div><TablaDatos descripcion={`Productos de la recepción ${recepcion.numero}`} datos={recepcion.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /></article>

      {puedeVerAuditoria && <AbastecimientoAuditoria recurso="recepciones" entidadId={recepcion.id} revision={revision} />}
    </section>
  )
}
