import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import styles from './comercial.module.css'

type ConfirmarEstadoModalProps = {
  abierto: boolean
  nombre: string
  activar: boolean
  entidad: 'cliente' | 'política'
  onCerrar: () => void
  onConfirmar: (motivo: string) => Promise<void>
}

export function ConfirmarEstadoModal({ abierto, nombre, activar, entidad, onCerrar, onConfirmar }: ConfirmarEstadoModalProps) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    setMotivo('')
    setError(null)
    setGuardando(false)
    onCerrar()
  }

  const confirmar = async () => {
    const limpio = motivo.trim()
    if (!limpio) { setError('Escribe el motivo de este cambio.'); return }
    setGuardando(true); setError(null)
    try { await onConfirmar(limpio); setMotivo(''); setGuardando(false) }
    catch (actual) { setError(actual instanceof ErrorApi ? actual.message : `No fue posible ${activar ? 'activar' : 'desactivar'} la ${entidad}.`); setGuardando(false) }
  }

  return (
    <ModalEstado
      abierto={abierto}
      tipo={activar ? 'informacion' : 'advertencia'}
      titulo={`${activar ? 'Activar' : 'Desactivar'} ${entidad}`}
      mensaje={<div className={styles.contenidoConfirmacion}><p><strong>{nombre}</strong> {activar ? 'volverá a estar disponible para nuevas operaciones.' : 'dejará de estar disponible para nuevas operaciones, pero conservará su historial.'}</p><label htmlFor="motivo-cambio-estado">Motivo del cambio <span aria-hidden="true">*</span></label><textarea id="motivo-cambio-estado" rows={4} maxLength={250} value={motivo} aria-invalid={Boolean(error)} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} />{error && <small role="alert">{error}</small>}</div>}
      textoAccionPrincipal={guardando ? 'Guardando…' : activar ? 'Activar' : 'Desactivar'}
      varianteAccionPrincipal={activar ? 'predeterminada' : 'peligro'}
      onAccionPrincipal={() => void confirmar()}
      textoAccionSecundaria="Cancelar"
      onAccionSecundaria={cerrar}
      onCerrar={cerrar}
      cargando={guardando}
    />
  )
}
