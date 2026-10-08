import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import { listarEvaluacionesProveedor, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { EvaluacionProveedor, ProveedorAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoAuditoria } from './abastecimiento-auditoria'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import { ProveedorInactivarModal } from './proveedor-inactivar-modal'
import styles from './abastecimiento.module.css'

function fechaHora(valor: string | null): string {
  if (!valor) return 'No registrada'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

export function ProveedorDetalleView({ proveedorId, permisos, onNavegar }: { proveedorId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [proveedor, setProveedor] = useState<ProveedorAbastecimiento | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errorEvaluaciones, setErrorEvaluaciones] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [confirmarInactivacion, setConfirmarInactivacion] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const puedeActualizar = permisos.includes('ABASTECIMIENTO.PROVEEDORES.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ABASTECIMIENTO.PROVEEDORES.INACTIVAR')
  const puedeEvaluar = permisos.includes('ABASTECIMIENTO.PROVEEDORES.EVALUAR')
  const puedeVerAuditoria = permisos.includes('ABASTECIMIENTO.PROVEEDORES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<ProveedorAbastecimiento>('proveedores', proveedorId, controlador.signal)
      .then((detalle) => { setProveedor(detalle); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el proveedor.') })
    void listarEvaluacionesProveedor(proveedorId, controlador.signal)
      .then((historial) => { setEvaluaciones(historial); setErrorEvaluaciones(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorEvaluaciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las evaluaciones del proveedor.') })
    return () => controlador.abort()
  }, [proveedorId, revision])

  const evaluacionesOrdenadas = useMemo(() => {
    const orden = ordenamiento[0]
    if (!orden) return evaluaciones
    return [...evaluaciones].sort((a, b) => {
      const izquierda = orden.id === 'puntaje' ? a.puntajeTotal : orden.id === 'periodo' ? a.periodo : a.evaluadoEn
      const derecha = orden.id === 'puntaje' ? b.puntajeTotal : orden.id === 'periodo' ? b.periodo : b.evaluadoEn
      const comparacion = typeof izquierda === 'number' && typeof derecha === 'number' ? izquierda - derecha : String(izquierda).localeCompare(String(derecha), 'es', { numeric: true })
      return orden.desc ? -comparacion : comparacion
    })
  }, [evaluaciones, ordenamiento])

  const columnas = useMemo<ColumnaTabla<EvaluacionProveedor>[]>(() => [
    { id: 'periodo', titulo: 'Período', obtenerValor: (item) => item.periodo, ordenable: true, celda: (item) => <strong>{item.periodo}</strong> },
    { id: 'calidad', titulo: 'Calidad', obtenerValor: (item) => item.calidad, celda: (item) => `${item.calidad.toFixed(2)} / 100` },
    { id: 'cumplimiento', titulo: 'Cumplimiento', obtenerValor: (item) => item.cumplimiento, celda: (item) => `${item.cumplimiento.toFixed(2)} / 100` },
    { id: 'servicio', titulo: 'Servicio', obtenerValor: (item) => item.servicio, celda: (item) => `${item.servicio.toFixed(2)} / 100` },
    { id: 'puntaje', titulo: 'Puntaje total', obtenerValor: (item) => item.puntajeTotal, ordenable: true, celda: (item) => <strong>{item.puntajeTotal.toFixed(2)}</strong> },
    { id: 'resultado', titulo: 'Resultado', obtenerValor: (item) => item.resultado, celda: (item) => etiquetaCodigo(item.resultado) },
    { id: 'fecha', titulo: 'Evaluada', obtenerValor: (item) => item.evaluadoEn, ordenable: true, celda: (item) => fechaHora(item.evaluadoEn) },
  ], [])

  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="proveedores" actual="Detalle del proveedor" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!proveedor) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="proveedores" actual="Detalle del proveedor" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando proveedor</h1><p>Consultando información, evaluaciones y trazabilidad…</p></div></section>

  return (
    <>
    <section className={styles.pagina} aria-labelledby="titulo-detalle-proveedor">
      <AbastecimientoBreadcrumb recurso="proveedores" actual="Detalle del proveedor" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div>
          <p className={styles.sobretitulo}>Proveedor {proveedor.codigo}</p>
          <h1 id="titulo-detalle-proveedor">{proveedor.nombre}</h1>
          <div className={styles.estadosDetalle}><span className={`${styles.estado} ${proveedor.activo ? styles.estadoExito : styles.estadoPeligro}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span><span className={`${styles.estado} ${proveedor.autorizado ? styles.estadoExito : styles.estadoAdvertencia}`}>{proveedor.autorizado ? 'Autorizado' : 'No autorizado'}</span></div>
        </div>
        <div className={styles.accionesCabecera}>
          {puedeEvaluar && proveedor.activo && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/abastecimiento/proveedores/${proveedor.id}/evaluar`)}><IconoAccion nombre="estado" />Registrar evaluación</button>}
          {puedeActualizar && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar(`/abastecimiento/proveedores/${proveedor.id}/editar`)}><IconoAccion nombre="editar" />Editar información</button>}
          {puedeInactivar && proveedor.activo && <button className={styles.botonPeligro} type="button" onClick={() => setConfirmarInactivacion(true)}><IconoAccion nombre="desactivar" />Desactivar proveedor</button>}
        </div>
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Información legal y comercial</h2><dl><div><dt>Código</dt><dd>{proveedor.codigo}</dd></div><div><dt>NIT</dt><dd>{proveedor.nit}</dd></div><div><dt>Nombre legal</dt><dd>{proveedor.nombre}</dd></div><div><dt>Nombre comercial</dt><dd>{proveedor.nombreComercial ?? 'No registrado'}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Contacto y control</h2><dl><div><dt>Correo</dt><dd>{proveedor.correo ?? 'No registrado'}</dd></div><div><dt>Teléfono</dt><dd>{proveedor.telefono ?? 'No registrado'}</dd></div><div className={styles.datoCompleto}><dt>Dirección</dt><dd>{proveedor.direccion ?? 'No registrada'}</dd></div><div><dt>Calificación vigente</dt><dd>{proveedor.calificacion === null ? 'Sin evaluación' : `${proveedor.calificacion.toFixed(2)} / 100`}</dd></div><div><dt>Última evaluación</dt><dd>{fechaHora(proveedor.evaluadoEn)}</dd></div></dl></article>
      </div>

      <article className={styles.tarjetaDetalle}>
        <div className={styles.tituloSeccion}><div><h2>Historial de evaluaciones</h2><p>Seguimiento de calidad, cumplimiento y servicio.</p></div><span>{evaluaciones.length} {evaluaciones.length === 1 ? 'evaluación' : 'evaluaciones'}</span></div>
        {errorEvaluaciones && <div className={styles.alertaAdvertencia} role="status"><p>{errorEvaluaciones} La información principal del proveedor permanece disponible.</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar evaluaciones</button></div>}
        {evaluacionesOrdenadas.length ? <TablaDatos descripcion="Historial de evaluaciones del proveedor" datos={evaluacionesOrdenadas} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={setOrdenamiento} /> : !errorEvaluaciones ? <div className={styles.estadoVacioCompacto}><h3>Sin evaluaciones</h3><p>Este proveedor todavía no tiene evaluaciones registradas.</p></div> : null}
      </article>

      {puedeVerAuditoria && <AbastecimientoAuditoria recurso="proveedores" entidadId={proveedor.id} revision={revision} />}
    </section>
    <ProveedorInactivarModal proveedor={confirmarInactivacion ? proveedor : null} onCerrar={() => setConfirmarInactivacion(false)} onInactivado={(actualizado) => { setProveedor(actualizado); setConfirmarInactivacion(false); setMensajeExito(`${actualizado.nombre} fue desactivado correctamente.`); setRevision((valor) => valor + 1) }} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Proveedor desactivado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    </>
  )
}
