import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PistaAuditoria } from '../../../shared/auditoria'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { listarAuditoriaAsignacion, obtenerAsignacion, obtenerMiAsignacion } from '../activos-api'
import type { AsignacionActivo, ConsultaAuditoriaActivo, EstadoAsignacionActivo, EstadoRevisionAsignacionActivo } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

const etiquetas: Record<EstadoAsignacionActivo, string> = { VIGENTE: 'Vigente', PARCIAL: 'Devolución parcial', CERRADA: 'Cerrada' }
const clases: Record<EstadoAsignacionActivo, string> = { VIGENTE: styles.vigente, PARCIAL: styles.parcial, CERRADA: styles.cerrada }
const revisiones: Record<EstadoRevisionAsignacionActivo, string> = { PENDIENTE: 'Pendiente de revisión', SIN_DEVOLUCION: 'Confirmada sin devolución', CON_DEVOLUCION: 'Confirmada con solicitud', CONFIRMADA_LEGACY: 'Registro anterior confirmado' }
const fecha = (valor: string | null) => valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) : 'Sin registro'

export function AsignacionDetalleView({ asignacionId, permisos, onNavegar, propia = false }: { asignacionId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void; propia?: boolean }) {
  const [asignacion, setAsignacion] = useState<AsignacionActivo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const cargarAuditoria = useCallback((consulta: ConsultaAuditoriaActivo, signal?: AbortSignal) => listarAuditoriaAsignacion(asignacionId, consulta, signal), [asignacionId])

  useEffect(() => {
    const controlador = new AbortController()
    const cargar = propia ? obtenerMiAsignacion : obtenerAsignacion
    void cargar(asignacionId, controlador.signal).then((respuesta) => { setAsignacion(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la asignación.') })
    return () => controlador.abort()
  }, [asignacionId, propia, revision])

  const seccion = propia ? 'Mis activos' : 'Asignaciones'
  if (!asignacion) return <section className={styles.errorPagina}><ActivosBreadcrumb seccion={seccion} actual="Detalle de la asignación" onNavegar={onNavegar} /><h1>{error ? 'No se pudo cargar la asignación' : 'Cargando asignación…'}</h1><p>{error ?? 'Consultando el acta y sus activos.'}</p>{error && <button className={styles.botonNuevo} type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>

  const puedeRevisar = propia && permisos.includes('ACTIVOS.ASIGNACIONES.CONFIRMAR_RECEPCION') && asignacion.revisionEmpleado.estado === 'PENDIENTE'
  const puedeSolicitar = propia && permisos.includes('ACTIVOS.ASIGNACIONES.SOLICITAR_DEVOLUCION') && asignacion.revisionEmpleado.estado !== 'PENDIENTE' && asignacion.cantidadPendientes > 0

  return <section className={styles.pagina}><ActivosBreadcrumb seccion={seccion} actual="Detalle de la asignación" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div className={styles.perfil}><span className={styles.avatar} aria-hidden="true">{asignacion.empleado.nombreCompleto.slice(0, 2).toUpperCase()}</span><div><p>{asignacion.numeroActa}</p><h1>{asignacion.empleado.nombreCompleto}</h1><span className={`${styles.estado} ${clases[asignacion.estado]}`}>{etiquetas[asignacion.estado]}</span></div></div><div className={styles.accionesCabecera}>{puedeRevisar && <button className={styles.botonFormularioPrincipal} type="button" onClick={() => onNavegar(`/activos/mis-asignaciones/${asignacion.id}/revisar`)}><IconoAccion nombre="estado" />Revisar activos recibidos</button>}{puedeSolicitar && <button className={styles.botonFormularioSecundario} type="button" onClick={() => onNavegar(`/activos/mis-asignaciones/${asignacion.id}/solicitar-devolucion`)}><IconoAccion nombre="enviar" />Solicitar devolución</button>}</div></header><div className={styles.grillaDetalle}><article className={styles.tarjeta}><h2>Custodio y sucursal</h2><dl><div><dt>Código de empleado</dt><dd>{asignacion.empleado.codigo}</dd></div><div><dt>Puesto</dt><dd>{asignacion.empleado.puesto ?? 'Sin puesto registrado'}</dd></div><div><dt>Sucursal</dt><dd>{asignacion.sucursal.nombre} · {asignacion.sucursal.codigo}</dd></div><div><dt>Fecha de asignación</dt><dd>{fecha(asignacion.fechaAsignacion)}</dd></div><div className={styles.datoCompleto}><dt>Observaciones</dt><dd>{asignacion.observaciones ?? 'Sin observaciones'}</dd></div></dl></article><article className={styles.tarjeta}><h2>Control del acta</h2><dl><div><dt>Total de activos</dt><dd>{asignacion.cantidadActivos}</dd></div><div><dt>Pendientes de devolución</dt><dd>{asignacion.cantidadPendientes}</dd></div><div><dt>Revisión del empleado</dt><dd>{revisiones[asignacion.revisionEmpleado.estado]}</dd></div><div><dt>Fecha de revisión</dt><dd>{fecha(asignacion.revisionEmpleado.fecha)}</dd></div><div><dt>Creado</dt><dd>{fecha(asignacion.creadoEn)}</dd></div><div><dt>Última actualización</dt><dd>{fecha(asignacion.actualizadoEn)}</dd></div><div><dt>Versión</dt><dd>{asignacion.version}</dd></div></dl></article></div><article className={styles.tarjeta}><h2>Activos incluidos</h2><div className={styles.contenedorTabla}><table className={styles.tablaDetalles}><thead><tr><th>Activo</th><th>Entrega</th><th>Estado</th><th>Devolución</th></tr></thead><tbody>{(asignacion.detalles ?? []).map((detalle) => <tr key={detalle.id}><td><strong>{detalle.activo.codigoInterno}</strong><br /><small>{detalle.activo.tipo}{detalle.activo.marca ? ` · ${detalle.activo.marca}` : ''}{detalle.activo.modelo ? ` ${detalle.activo.modelo}` : ''}</small></td><td>{detalle.condicionEntrega.nombre}<br /><small>{detalle.notasEntrega ?? 'Sin notas'}</small></td><td><span className={`${styles.estado} ${detalle.estado === 'ASIGNADO' ? styles.asignado : styles.cerrada}`}>{detalle.estado === 'ASIGNADO' ? 'Asignado' : 'Devuelto'}</span></td><td>{detalle.fechaDevolucion ? <>{fecha(detalle.fechaDevolucion)}<br /><small>{detalle.condicionDevolucion?.nombre ?? 'Sin condición'} · {detalle.notasDevolucion ?? 'Sin notas'}</small></> : <span className={styles.sinDato}>Pendiente</span>}</td></tr>)}</tbody></table></div></article>{!propia && permisos.includes('ACTIVOS.ASIGNACIONES.VER_AUDITORIA') && <PistaAuditoria claveEntidad={asignacion.id} descripcion="Consulta la creación del acta y los cambios aplicados por devoluciones aprobadas." etiquetasOperacion={{ CREAR: 'Creación', APLICAR_DEVOLUCION: 'Devolución aprobada' }} cargarEventos={cargarAuditoria} revision={asignacion.version} />}</section>
}
