import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { abrirPdfSolicitudCompra, cancelarSolicitudCompra, obtenerRegistroAbastecimiento, resolverSolicitudCompra } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { SolicitudCompra } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type ModoAccion = 'resolver' | 'cancelar'

export function SolicitudAccionView({ solicitudId, modo, onNavegar, onCambiosPendientes }: { solicitudId: string; modo: ModoAccion; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [solicitud, setSolicitud] = useState<SolicitudCompra | null>(null)
  const [aprobar, setAprobar] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<SolicitudCompra | null>(null)
  const tieneCambios = motivo.length > 0 || (modo === 'resolver' && !aprobar)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<SolicitudCompra>('solicitudes', solicitudId, controlador.signal).then(setSolicitud).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la solicitud.') })
    return () => controlador.abort()
  }, [solicitudId])

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (motivo.trim().length < 5 || motivo.trim().length > 500) { setErrorMotivo('El motivo debe contener de 5 a 500 caracteres.'); document.getElementById('solicitud-motivo-accion')?.focus(); return }
    if (!solicitud) return
    setGuardando(true); setError(null)
    try {
      const respuesta = modo === 'resolver'
        ? await resolverSolicitudCompra(solicitud.id, { version: solicitud.version, aprobar, motivo: motivo.trim() })
        : await cancelarSolicitudCompra(solicitud.id, { version: solicitud.version, motivo: motivo.trim() })
      setGuardado(respuesta); onCambiosPendientes(false)
    } catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la acción.') } finally { setGuardando(false) }
  }

  const titulo = modo === 'resolver' ? 'Resolver solicitud' : 'Cancelar solicitud'
  if (!solicitud && !error) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="solicitudes" actual={titulo} onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando solicitud</h1><p>Consultando la versión vigente del documento…</p></div></section>
  const accionDisponible = Boolean(solicitud && (modo === 'resolver'
    ? solicitud.estado === 'SOLICITADA'
    : ['SOLICITADA', 'APROBADA', 'EN_COTIZACION'].includes(solicitud.estado)))

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-accion-solicitud">
        <AbastecimientoBreadcrumb recurso="solicitudes" actual={titulo} onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Solicitud {solicitud?.numero ?? ''}</p><h1 id="titulo-accion-solicitud">{titulo}</h1><p>{modo === 'resolver' ? 'La aprobación y el rechazo requieren una decisión independiente y un motivo trazable.' : 'La cancelación conserva el documento, su estado anterior y el motivo.'}</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        {solicitud && !accionDisponible && <div className={styles.alertaAdvertencia} role="status">La solicitud está {etiquetaCodigo(solicitud.estado).toLowerCase()} y ya no admite esta acción.</div>}
        {solicitud && <form className={styles.formulario} noValidate onSubmit={enviar}>
          <section className={styles.resumenDocumento} aria-label="Resumen de la solicitud"><div><span>Estado actual</span><strong>{etiquetaCodigo(solicitud.estado)}</strong></div><div><span>Modalidad</span><strong>{etiquetaCodigo(solicitud.modalidad)}</strong></div><div><span>Referencia</span><strong>{solicitud.referenciaNecesidad}</strong></div><div><span>Productos</span><strong>{solicitud.detalles.length}</strong></div></section>
          <fieldset disabled={guardando || !accionDisponible}>
            <legend>{modo === 'resolver' ? 'Decisión' : 'Motivo de cancelación'}</legend>
            {modo === 'resolver' && <div className={styles.opcionesDecision} role="radiogroup" aria-label="Decisión sobre la solicitud"><label className={aprobar ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="decision" checked={aprobar} onChange={() => setAprobar(true)} /><span><strong>Aprobar solicitud</strong><small>Habilita la continuación del proceso de cotización.</small></span></label><label className={!aprobar ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="decision" checked={!aprobar} onChange={() => setAprobar(false)} /><span><strong>Rechazar solicitud</strong><small>Finaliza esta solicitud conservando el motivo.</small></span></label></div>}
            <div className={styles.campo}><label htmlFor="solicitud-motivo-accion">Motivo <span aria-hidden="true">*</span></label><textarea id="solicitud-motivo-accion" value={motivo} rows={6} maxLength={500} aria-invalid={Boolean(errorMotivo)} aria-describedby={errorMotivo ? 'solicitud-motivo-accion-error' : 'solicitud-motivo-accion-ayuda'} onChange={(evento) => { setMotivo(evento.target.value); setErrorMotivo(null) }} />{errorMotivo ? <small id="solicitud-motivo-accion-error" className={styles.errorCampo}>{errorMotivo}</small> : <small id="solicitud-motivo-accion-ayuda" className={styles.ayudaCampo}>Describe el fundamento operativo de la decisión.</small>}</div>
          </fieldset>
          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(`/abastecimiento/solicitudes/${solicitud.id}`)}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={modo === 'cancelar' || (modo === 'resolver' && !aprobar) ? styles.botonPeligro : styles.botonPrimario} type="submit" disabled={guardando || !accionDisponible}>{modo === 'cancelar' || !aprobar ? <IconoAccion nombre="desactivar" /> : <IconoAccion nombre="guardar" />}{guardando ? 'Procesando decisión…' : modo === 'cancelar' ? 'Confirmar cancelación' : aprobar ? 'Aprobar solicitud' : 'Rechazar solicitud'}</button></div></div>
        </form>}
      </section>
      <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo={modo === 'cancelar' ? 'Solicitud cancelada' : aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada'} mensaje={guardado ? `La solicitud ${guardado.numero} ahora está ${etiquetaCodigo(guardado.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver solicitud" onAccionPrincipal={() => onNavegar(`/abastecimiento/solicitudes/${solicitudId}`)} textoAccionSecundaria={modo === 'resolver' && aprobar ? 'Ver PDF oficial' : undefined} onAccionSecundaria={modo === 'resolver' && aprobar ? () => void abrirPdfSolicitudCompra(solicitudId).catch((errorActual: unknown) => setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar el PDF oficial.')) : undefined} onCerrar={() => onNavegar(`/abastecimiento/solicitudes/${solicitudId}`)} />
    </>
  )
}
