import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import styles from './comercial.module.css'

export function AccionConMotivoModal({ abierto, titulo, mensaje, textoAccion, peligrosa = false, onCerrar, onConfirmar }: {
  abierto: boolean
  titulo: string
  mensaje: string
  textoAccion: string
  peligrosa?: boolean
  onCerrar: () => void
  onConfirmar: (motivo: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cerrar = () => { setMotivo(''); setError(null); setGuardando(false); onCerrar() }
  const confirmar = async () => {
    const limpio = motivo.trim()
    if (!limpio) { setError('Escribe el motivo de la operación.'); return }
    setGuardando(true); setError(null)
    try { await onConfirmar(limpio); setMotivo(''); setGuardando(false) }
    catch (actual) { setError(actual instanceof ErrorApi ? actual.message : 'No fue posible completar la operación.'); setGuardando(false) }
  }
  return <ModalEstado abierto={abierto} tipo={peligrosa ? 'advertencia' : 'informacion'} titulo={titulo} mensaje={<div className={styles.contenidoConfirmacion}><p>{mensaje}</p><label htmlFor="motivo-accion-comercial">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-accion-comercial" rows={4} maxLength={500} value={motivo} aria-invalid={Boolean(error)} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} />{error && <small role="alert">{error}</small>}</div>} textoAccionPrincipal={guardando ? 'Procesando…' : textoAccion} varianteAccionPrincipal={peligrosa ? 'peligro' : 'predeterminada'} onAccionPrincipal={() => void confirmar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={guardando} />
}
