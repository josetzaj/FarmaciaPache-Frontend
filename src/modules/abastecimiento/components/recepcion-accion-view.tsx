import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { confirmarRecepcionCompra, obtenerRegistroAbastecimiento, regularizarDocumentoRecepcion } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { EtapaRecepcionCompra, RecepcionCompra } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type ModoRecepcion = Lowercase<EtapaRecepcionCompra> | 'regularizar'

const etapaPorModo: Partial<Record<ModoRecepcion, EtapaRecepcionCompra>> = { documental: 'DOCUMENTAL', fisica: 'FISICA', tecnica: 'TECNICA' }

export function RecepcionAccionView({ recepcionId, modo, onNavegar, onCambiosPendientes }: { recepcionId: string; modo: ModoRecepcion; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [recepcion, setRecepcion] = useState<RecepcionCompra | null>(null)
  const [conforme, setConforme] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [documentoProveedor, setDocumentoProveedor] = useState('')
  const [evidenciaDocumental, setEvidenciaDocumental] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<RecepcionCompra | null>(null)
  const etapa = etapaPorModo[modo]
  const tieneCambios = Boolean(motivo || documentoProveedor || evidenciaDocumental || !conforme)

  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<RecepcionCompra>('recepciones', recepcionId, controlador.signal).then((respuesta) => { setRecepcion(respuesta); setEvidenciaDocumental(respuesta.evidenciaDocumental) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la recepción.') })
    return () => controlador.abort()
  }, [recepcionId])

  const disponible = Boolean(recepcion && (modo === 'regularizar' ? recepcion.documentoPendiente : etapa === 'DOCUMENTAL' ? recepcion.estado === 'REGISTRADA' : etapa === 'FISICA' ? recepcion.estado === 'DOCUMENTAL_CONFORME' : etapa === 'TECNICA' ? recepcion.estado === 'FISICA_CONFORME' : false))
  const titulo = modo === 'regularizar' ? 'Regularizar documento' : `Validar recepción ${modo === 'fisica' ? 'física' : modo === 'tecnica' ? 'técnica' : 'documental'}`

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes: Record<string, string> = {}
    if (modo === 'regularizar') {
      if (documentoProveedor.trim().length < 1 || documentoProveedor.trim().length > 100) siguientes.documentoProveedor = 'Ingresa el documento del proveedor, con máximo 100 caracteres.'
      if (evidenciaDocumental.trim().length < 3 || evidenciaDocumental.trim().length > 500) siguientes.evidenciaDocumental = 'La evidencia documental debe contener de 3 a 500 caracteres.'
    } else if (motivo.trim().length < 5 || motivo.trim().length > 500) siguientes.motivo = 'El motivo debe contener de 5 a 500 caracteres.'
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) { document.getElementById(`recepcion-accion-${primero}`)?.focus(); return }
    if (!recepcion || !disponible) return
    setGuardando(true); setError(null)
    try {
      const respuesta = modo === 'regularizar'
        ? await regularizarDocumentoRecepcion(recepcion.id, { version: recepcion.version, documentoProveedor: documentoProveedor.trim(), evidenciaDocumental: evidenciaDocumental.trim() })
        : await confirmarRecepcionCompra(recepcion.id, { version: recepcion.version, etapa: etapa!, conforme, motivo: motivo.trim() })
      setGuardada(respuesta); onCambiosPendientes(false)
    } catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la acción.') } finally { setGuardando(false) }
  }

  if (!recepcion && !error) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="recepciones" actual={titulo} onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando recepción</h1><p>Consultando la versión vigente…</p></div></section>
  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-accion-recepcion">
        <AbastecimientoBreadcrumb recurso="recepciones" actual={titulo} onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Recepción {recepcion?.numero ?? ''}</p><h1 id="titulo-accion-recepcion">{titulo}</h1><p>{modo === 'regularizar' ? 'Completa el documento pendiente sin modificar silenciosamente la evidencia original.' : etapa === 'TECNICA' ? 'La conformidad técnica es la única etapa que confirma las cantidades aceptadas y genera la entrada de inventario cuando corresponde.' : 'La validación avanza una etapa a la vez; un rechazo conserva el motivo y detiene la recepción.'}</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        {recepcion && !disponible && <div className={styles.alertaAdvertencia} role="status">La recepción está {etiquetaCodigo(recepcion.estado).toLowerCase()} y no admite esta acción.</div>}
        {recepcion && <form className={styles.formulario} noValidate onSubmit={enviar}>
          <section className={styles.resumenDocumento} aria-label="Resumen de la recepción"><div><span>Estado actual</span><strong>{etiquetaCodigo(recepcion.estado)}</strong></div><div><span>Orden</span><strong>{recepcion.orden?.numero ?? 'Relacionada'}</strong></div><div><span>Documento</span><strong>{recepcion.documentoProveedor ?? 'Pendiente'}</strong></div><div><span>Productos</span><strong>{recepcion.detalles.length}</strong></div></section>
          <fieldset disabled={guardando || !disponible}>
            <legend>{modo === 'regularizar' ? 'Documento del proveedor' : 'Resultado de inspección'}</legend>
            {modo === 'regularizar' ? <div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="recepcion-accion-documentoProveedor">Documento <span aria-hidden="true">*</span></label><input id="recepcion-accion-documentoProveedor" maxLength={100} value={documentoProveedor} aria-invalid={Boolean(errores.documentoProveedor)} onChange={(evento) => { setDocumentoProveedor(evento.target.value); setErrores((actuales) => ({ ...actuales, documentoProveedor: '' })) }} />{errores.documentoProveedor && <small className={styles.errorCampo}>{errores.documentoProveedor}</small>}</div><div className={styles.campo}><label htmlFor="recepcion-accion-evidenciaDocumental">Evidencia documental <span aria-hidden="true">*</span></label><input id="recepcion-accion-evidenciaDocumental" maxLength={500} value={evidenciaDocumental} aria-invalid={Boolean(errores.evidenciaDocumental)} onChange={(evento) => { setEvidenciaDocumental(evento.target.value); setErrores((actuales) => ({ ...actuales, evidenciaDocumental: '' })) }} />{errores.evidenciaDocumental && <small className={styles.errorCampo}>{errores.evidenciaDocumental}</small>}</div></div> : <><div className={styles.opcionesDecision} role="radiogroup" aria-label="Resultado de la validación"><label className={conforme ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="conformidad" checked={conforme} onChange={() => setConforme(true)} /><span><strong>Recepción conforme</strong><small>Avanza a la siguiente etapa del proceso.</small></span></label><label className={!conforme ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="conformidad" checked={!conforme} onChange={() => setConforme(false)} /><span><strong>Rechazar recepción</strong><small>Detiene el proceso y conserva el motivo.</small></span></label></div><div className={styles.campo}><label htmlFor="recepcion-accion-motivo">Motivo <span aria-hidden="true">*</span></label><textarea id="recepcion-accion-motivo" rows={6} maxLength={500} value={motivo} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => { setMotivo(evento.target.value); setErrores((actuales) => ({ ...actuales, motivo: '' })) }} /><small className={errores.motivo ? styles.errorCampo : styles.ayudaCampo}>{errores.motivo ?? 'Documenta la evidencia revisada y las incidencias observadas.'}</small></div></>}
          </fieldset>
          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(`/abastecimiento/recepciones/${recepcion.id}`)}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={!conforme && modo !== 'regularizar' ? styles.botonPeligro : styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre={!conforme && modo !== 'regularizar' ? 'desactivar' : 'guardar'} />{guardando ? 'Procesando…' : modo === 'regularizar' ? 'Regularizar documento' : conforme ? 'Confirmar etapa' : 'Rechazar recepción'}</button></div></div>
        </form>}
      </section>
      <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo={modo === 'regularizar' ? 'Documento regularizado' : conforme ? 'Etapa confirmada' : 'Recepción rechazada'} mensaje={guardada ? `La recepción ${guardada.numero} ahora está ${etiquetaCodigo(guardada.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver recepción" onAccionPrincipal={() => onNavegar(`/abastecimiento/recepciones/${recepcionId}`)} onCerrar={() => onNavegar(`/abastecimiento/recepciones/${recepcionId}`)} />
    </>
  )
}
