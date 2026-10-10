import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearSolicitudDevolucion, obtenerMiAsignacion, registrarRevisionEmpleado } from '../activos-api'
import type { AsignacionActivo } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

type LineaSolicitud = { seleccionada: boolean; motivo: string }
type ModoSolicitud = 'revision' | 'solicitud'

export function DevolucionActivosView({ asignacionId, modo, onNavegar, onCambiosPendientes }: { asignacionId: string; modo: ModoSolicitud; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [asignacion, setAsignacion] = useState<AsignacionActivo | null>(null)
  const [decision, setDecision] = useState<'SIN_DEVOLUCION' | 'SOLICITAR_DEVOLUCION'>(modo === 'revision' ? 'SIN_DEVOLUCION' : 'SOLICITAR_DEVOLUCION')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Record<string, LineaSolicitud>>({})
  const [error, setError] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)
  const [revisionCarga, setRevisionCarga] = useState(0)
  const seleccionadas = useMemo(() => Object.entries(lineas).filter(([, linea]) => linea.seleccionada), [lineas])
  const hayCambios = Boolean(observaciones.trim() || seleccionadas.length || (modo === 'revision' && decision !== 'SIN_DEVOLUCION'))

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerMiAsignacion(asignacionId, controlador.signal).then((respuesta) => {
      setAsignacion(respuesta)
      setLineas(Object.fromEntries((respuesta.detalles ?? []).filter((detalle) => detalle.estado === 'ASIGNADO').map((detalle) => [detalle.id, { seleccionada: false, motivo: '' }])) )
      setError(null)
    }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible preparar la solicitud.') })
    return () => controlador.abort()
  }, [asignacionId, revisionCarga])

  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const cambiar = (detalleId: string, cambios: Partial<LineaSolicitud>) => setLineas((actuales) => ({ ...actuales, [detalleId]: { ...actuales[detalleId]!, ...cambios } }))
  const solicitarConfirmacion = (evento: FormEvent) => {
    evento.preventDefault()
    if (decision === 'SOLICITAR_DEVOLUCION') {
      if (!seleccionadas.length) { setErrorFormulario('Selecciona al menos un activo para devolver.'); return }
      if (seleccionadas.some(([, linea]) => linea.motivo.trim().length < 5)) { setErrorFormulario('Describe el motivo de cada activo seleccionado con al menos 5 caracteres.'); return }
    }
    setErrorFormulario(null)
    setConfirmar(true)
  }
  const guardar = async () => {
    if (!asignacion) return
    const detalles = seleccionadas.map(([detalleId, linea]) => ({ detalleId, motivoSolicitud: linea.motivo.trim() }))
    setGuardando(true)
    setErrorFormulario(null)
    try {
      if (modo === 'revision') await registrarRevisionEmpleado(asignacion.id, { version: asignacion.version, decision, observaciones: observaciones.trim() || null, detalles: decision === 'SOLICITAR_DEVOLUCION' ? detalles : undefined })
      else await crearSolicitudDevolucion(asignacion.id, { version: asignacion.version, observaciones: observaciones.trim() || null, detalles })
      onCambiosPendientes(false)
      setConfirmar(false)
      setExito(true)
    } catch (errorActual: unknown) {
      setConfirmar(false)
      setErrorFormulario(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la solicitud.')
    } finally { setGuardando(false) }
  }

  const titulo = modo === 'revision' ? 'Revisar activos recibidos' : 'Solicitar devolución de activos'
  if (!asignacion) return <section className={styles.errorPagina}><ActivosBreadcrumb seccion="Mis activos" actual={titulo} onNavegar={onNavegar} /><h1>{error ? 'No se pudo preparar la revisión' : 'Preparando revisión…'}</h1><p>{error ?? 'Consultando los activos bajo tu custodia.'}</p>{error && <button className={styles.botonNuevo} type="button" onClick={() => setRevisionCarga((valor) => valor + 1)}>Reintentar</button>}</section>

  const pendientes = (asignacion.detalles ?? []).filter((detalle) => detalle.estado === 'ASIGNADO')
  const muestraSeleccion = modo === 'solicitud' || decision === 'SOLICITAR_DEVOLUCION'
  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><ActivosBreadcrumb seccion="Mis activos" actual={titulo} onNavegar={onNavegar} /><h1>{titulo}</h1></header><article className={styles.tarjeta}><h2>{asignacion.numeroActa} · {asignacion.empleado.nombreCompleto}</h2><p className={styles.ayuda}>{asignacion.sucursal.nombre} · Verifica cada bien antes de confirmar.</p></article>{errorFormulario && <div className={styles.alertaError} role="alert"><p>{errorFormulario}</p></div>}<form className={styles.formulario} onSubmit={solicitarConfirmacion}><fieldset disabled={guardando}><legend>{modo === 'revision' ? 'Resultado de la revisión' : 'Información de la solicitud'}</legend>{modo === 'revision' && <div className={styles.opcionesDecision}><label className={decision === 'SIN_DEVOLUCION' ? styles.opcionSeleccionada : undefined}><input type="radio" name="decision" value="SIN_DEVOLUCION" checked={decision === 'SIN_DEVOLUCION'} onChange={() => { setDecision('SIN_DEVOLUCION'); setErrorFormulario(null) }} /><span><strong>Sin devolución</strong><small>Confirmo que revisé los activos y conservaré su custodia.</small></span></label><label className={decision === 'SOLICITAR_DEVOLUCION' ? styles.opcionSeleccionada : undefined}><input type="radio" name="decision" value="SOLICITAR_DEVOLUCION" checked={decision === 'SOLICITAR_DEVOLUCION'} onChange={() => { setDecision('SOLICITAR_DEVOLUCION'); setErrorFormulario(null) }} /><span><strong>Solicitar devolución</strong><small>Seleccionaré uno o más activos para iniciar el proceso.</small></span></label></div>}<div className={styles.campoCompleto}><label htmlFor="observaciones">Observaciones</label><textarea id="observaciones" rows={3} maxLength={1000} value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)} /><small className={styles.ayuda}>{observaciones.length}/1000 caracteres</small></div></fieldset>{muestraSeleccion && <fieldset disabled={guardando}><legend>Activos para devolver</legend><div className={styles.contenedorTabla}><table className={styles.tablaDetalles}><thead><tr><th>Seleccionar</th><th>Activo</th><th>Condición de entrega</th><th>Motivo de la devolución</th></tr></thead><tbody>{pendientes.map((detalle) => { const linea = lineas[detalle.id]; if (!linea) return null; return <tr key={detalle.id}><td><input className={styles.selectorDevolucion} type="checkbox" aria-label={`Seleccionar ${detalle.activo.codigoInterno}`} checked={linea.seleccionada} onChange={(evento) => { cambiar(detalle.id, { seleccionada: evento.target.checked }); setErrorFormulario(null) }} /></td><td><strong>{detalle.activo.codigoInterno}</strong><br /><small>{detalle.activo.tipo}{detalle.activo.marca ? ` · ${detalle.activo.marca}` : ''}</small></td><td>{detalle.condicionEntrega.nombre}<br /><small>{detalle.notasEntrega ?? 'Sin notas'}</small></td><td><textarea className={styles.textareaTabla} maxLength={500} value={linea.motivo} disabled={!linea.seleccionada || guardando} aria-label={`Motivo para devolver ${detalle.activo.codigoInterno}`} onChange={(evento) => cambiar(detalle.id, { motivo: evento.target.value })} /></td></tr> })}</tbody></table></div>{!pendientes.length && <p className={styles.ayuda}>No tienes activos pendientes en esta asignación.</p>}</fieldset>}<div className={styles.accionesFormulario}><p>{muestraSeleccion ? `${seleccionadas.length} ${seleccionadas.length === 1 ? 'activo seleccionado' : 'activos seleccionados'}` : '* La revisión solo puede confirmarse una vez'}</p><div><button className={styles.botonFormularioSecundario} type="button" disabled={guardando} onClick={() => onNavegar(`/activos/mis-asignaciones/${asignacion.id}`)}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonFormularioPrincipal} type="submit" disabled={guardando || (muestraSeleccion && !pendientes.length)}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : modo === 'revision' ? 'Confirmar revisión' : 'Enviar solicitud'}</button></div></div></form><ModalEstado abierto={confirmar} tipo="advertencia" titulo={modo === 'revision' ? 'Confirmar revisión' : 'Enviar solicitud de devolución'} mensaje={decision === 'SIN_DEVOLUCION' ? 'Confirmarás que revisaste todos los activos y que no solicitas devolución. Esta revisión no podrá editarse.' : `Se enviará una solicitud para ${seleccionadas.length} ${seleccionadas.length === 1 ? 'activo' : 'activos'}. La custodia continuará hasta que la administración la apruebe.`} textoAccionPrincipal={guardando ? 'Registrando…' : 'Confirmar'} onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Revisar" onAccionSecundaria={() => setConfirmar(false)} onCerrar={() => setConfirmar(false)} cargando={guardando} /><ModalEstado abierto={exito} tipo="exito" titulo={decision === 'SIN_DEVOLUCION' ? 'Revisión confirmada' : 'Solicitud enviada'} mensaje={decision === 'SIN_DEVOLUCION' ? 'La revisión quedó cerrada sin devolución.' : 'La administración podrá registrar la recepción física y resolver la solicitud.'} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar(`/activos/mis-asignaciones/${asignacion.id}`)} onCerrar={() => onNavegar(`/activos/mis-asignaciones/${asignacion.id}`)} /></section>
}
