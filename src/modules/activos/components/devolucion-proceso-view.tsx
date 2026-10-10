import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { obtenerDevolucion, obtenerOpcionesRegistroActivo, registrarRecepcionDevolucion, resolverDevolucion } from '../activos-api'
import type { DevolucionActivo, OpcionCondicion } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

type ModoProceso = 'recepcion' | 'resolucion'
type LineaRecepcion = { condicionId: string; notas: string }

export function DevolucionProcesoView({ devolucionId, modo, onNavegar, onCambiosPendientes }: { devolucionId: string; modo: ModoProceso; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [devolucion, setDevolucion] = useState<DevolucionActivo | null>(null)
  const [condiciones, setCondiciones] = useState<OpcionCondicion[]>([])
  const [lineas, setLineas] = useState<Record<string, LineaRecepcion>>({})
  const [observaciones, setObservaciones] = useState('')
  const [decision, setDecision] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)
  const [revision, setRevision] = useState(0)
  const hayCambios = useMemo(() => modo === 'recepcion' ? Boolean(observaciones.trim() || Object.values(lineas).some((linea) => linea.condicionId || linea.notas.trim())) : Boolean(motivo.trim() || decision !== 'APROBAR'), [decision, lineas, modo, motivo, observaciones])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([obtenerDevolucion(devolucionId, controlador.signal), modo === 'recepcion' ? obtenerOpcionesRegistroActivo(controlador.signal) : Promise.resolve(null)]).then(([respuesta, opciones]) => {
      setDevolucion(respuesta)
      setCondiciones(opciones?.condiciones ?? [])
      setLineas(Object.fromEntries((respuesta.detalles ?? []).map((detalle) => [detalle.id, { condicionId: detalle.condicionRecibida?.id ?? '', notas: detalle.notasRecepcion ?? '' }])) )
      setError(null)
    }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible preparar el proceso de devolución.') })
    return () => controlador.abort()
  }, [devolucionId, modo, revision])
  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const cambiarLinea = (detalleId: string, cambios: Partial<LineaRecepcion>) => setLineas((actuales) => ({ ...actuales, [detalleId]: { ...actuales[detalleId]!, ...cambios } }))
  const solicitarConfirmacion = (evento: FormEvent) => {
    evento.preventDefault()
    if (!devolucion) return
    if (modo === 'recepcion' && (devolucion.detalles ?? []).some((detalle) => !lineas[detalle.id]?.condicionId)) { setErrorFormulario('Selecciona la condición recibida de todos los activos.'); return }
    if (modo === 'resolucion' && motivo.trim().length < 5) { setErrorFormulario('Describe el motivo de la decisión con al menos 5 caracteres.'); return }
    setErrorFormulario(null)
    setConfirmar(true)
  }
  const guardar = async () => {
    if (!devolucion) return
    setGuardando(true)
    setErrorFormulario(null)
    try {
      if (modo === 'recepcion') await registrarRecepcionDevolucion(devolucion.id, { version: devolucion.version, observaciones: observaciones.trim() || null, detalles: (devolucion.detalles ?? []).map((detalle) => ({ devolucionDetalleId: detalle.id, condicionRecibidaId: lineas[detalle.id]!.condicionId, notasRecepcion: lineas[detalle.id]!.notas.trim() || null })) })
      else await resolverDevolucion(devolucion.id, { version: devolucion.version, decision, motivo: motivo.trim() })
      onCambiosPendientes(false)
      setConfirmar(false)
      setExito(true)
    } catch (errorActual: unknown) {
      setConfirmar(false)
      setErrorFormulario(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la devolución.')
    } finally { setGuardando(false) }
  }

  const titulo = modo === 'recepcion' ? 'Registrar recepción de activos' : 'Resolver devolución de activos'
  if (!devolucion) return <section className={styles.errorPagina}><ActivosBreadcrumb seccion="Devoluciones" actual={titulo} onNavegar={onNavegar} /><h1>{error ? 'No se pudo preparar el formulario' : 'Preparando formulario…'}</h1><p>{error ?? 'Consultando la devolución.'}</p>{error && <button className={styles.botonNuevo} type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>

  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><ActivosBreadcrumb seccion="Devoluciones" actual={titulo} onNavegar={onNavegar} /><h1>{titulo}</h1></header><article className={styles.tarjeta}><h2>{devolucion.numero} · {devolucion.empleado.nombreCompleto}</h2><p className={styles.ayuda}>{devolucion.sucursal.nombre} · {devolucion.cantidadActivos} {devolucion.cantidadActivos === 1 ? 'activo' : 'activos'} en la solicitud.</p></article>{errorFormulario && <div className={styles.alertaError} role="alert"><p>{errorFormulario}</p></div>}<form className={styles.formulario} onSubmit={solicitarConfirmacion}>{modo === 'recepcion' ? <><fieldset disabled={guardando}><legend>Recepción física</legend><p className={styles.ayuda}>Verifica todos los activos y registra su condición real al momento de recibirlos.</p><div className={styles.contenedorTabla}><table className={styles.tablaDetalles}><thead><tr><th>Activo</th><th>Motivo solicitado</th><th>Condición recibida *</th><th>Notas de recepción</th></tr></thead><tbody>{(devolucion.detalles ?? []).map((detalle) => { const linea = lineas[detalle.id]; if (!linea) return null; return <tr key={detalle.id}><td><strong>{detalle.activo.codigoInterno}</strong><br /><small>{detalle.activo.tipo}{detalle.activo.marca ? ` · ${detalle.activo.marca}` : ''}</small></td><td>{detalle.motivoSolicitud}</td><td><SelectorCatalogoBuscable id={`condicion-${detalle.id}`} valor={linea.condicionId} opciones={condiciones.map((condicion) => ({ valor: condicion.id, etiqueta: condicion.nombre }))} placeholder="Seleccionar condición" deshabilitado={guardando} onChange={(valor) => cambiarLinea(detalle.id, { condicionId: valor })} /></td><td><textarea className={styles.textareaTabla} maxLength={500} value={linea.notas} aria-label={`Notas de recepción de ${detalle.activo.codigoInterno}`} onChange={(evento) => cambiarLinea(detalle.id, { notas: evento.target.value })} /></td></tr> })}</tbody></table></div><div className={styles.campoCompleto}><label htmlFor="observaciones">Observaciones generales</label><textarea id="observaciones" rows={3} maxLength={1000} value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)} /><small className={styles.ayuda}>{observaciones.length}/1000 caracteres</small></div></fieldset></> : <fieldset disabled={guardando}><legend>Decisión administrativa</legend><div className={styles.opcionesDecision}><label className={decision === 'APROBAR' ? styles.opcionSeleccionada : undefined}><input type="radio" name="decision" value="APROBAR" checked={decision === 'APROBAR'} onChange={() => { setDecision('APROBAR'); setErrorFormulario(null) }} /><span><strong>Aprobar devolución</strong><small>Finaliza la custodia de los activos recibidos y actualiza su condición y situación.</small></span></label><label className={decision === 'RECHAZAR' ? styles.opcionSeleccionada : undefined}><input type="radio" name="decision" value="RECHAZAR" checked={decision === 'RECHAZAR'} onChange={() => { setDecision('RECHAZAR'); setErrorFormulario(null) }} /><span><strong>Rechazar devolución</strong><small>La custodia continúa y la solicitud queda cerrada como rechazada.</small></span></label></div><div className={styles.campoCompleto}><label htmlFor="motivo">Motivo de la decisión *</label><textarea id="motivo" rows={4} maxLength={500} value={motivo} onChange={(evento) => { setMotivo(evento.target.value); setErrorFormulario(null) }} /><small className={styles.ayuda}>{motivo.length}/500 caracteres</small></div></fieldset>}<div className={styles.accionesFormulario}><p>* Campos obligatorios</p><div><button className={styles.botonFormularioSecundario} type="button" disabled={guardando} onClick={() => onNavegar(`/activos/devoluciones/${devolucion.id}`)}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonFormularioPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Procesando…' : modo === 'recepcion' ? 'Registrar recepción' : 'Guardar decisión'}</button></div></div></form><ModalEstado abierto={confirmar} tipo="advertencia" titulo={modo === 'recepcion' ? 'Confirmar recepción física' : decision === 'APROBAR' ? 'Aprobar devolución' : 'Rechazar devolución'} mensaje={modo === 'recepcion' ? 'La recepción quedará registrada y la solicitud pasará a resolución administrativa.' : decision === 'APROBAR' ? 'La aprobación actualizará la custodia, condición y situación de cada activo. Esta decisión es final.' : 'La solicitud quedará rechazada y los activos continuarán bajo custodia del empleado.'} textoAccionPrincipal={guardando ? 'Procesando…' : 'Confirmar'} varianteAccionPrincipal={modo === 'resolucion' && decision === 'RECHAZAR' ? 'peligro' : 'predeterminada'} onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Revisar" onAccionSecundaria={() => setConfirmar(false)} onCerrar={() => setConfirmar(false)} cargando={guardando} /><ModalEstado abierto={exito} tipo="exito" titulo={modo === 'recepcion' ? 'Recepción registrada' : decision === 'APROBAR' ? 'Devolución aprobada' : 'Devolución rechazada'} mensaje={modo === 'recepcion' ? 'La devolución quedó lista para su resolución.' : decision === 'APROBAR' ? 'La custodia y los activos fueron actualizados correctamente.' : 'La solicitud quedó cerrada sin modificar la custodia.'} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar(`/activos/devoluciones/${devolucion.id}`)} onCerrar={() => onNavegar(`/activos/devoluciones/${devolucion.id}`)} /></section>
}
