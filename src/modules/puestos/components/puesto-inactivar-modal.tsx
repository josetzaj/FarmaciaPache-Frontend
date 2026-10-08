import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarPuesto } from '../puesto-api'
import type { Puesto } from '../puesto.types'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { puesto: Puesto | null; onCerrar: () => void; onInactivado: (puesto: Puesto) => void }

export function PuestoInactivarModal({ puesto, onCerrar, onInactivado }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const cerrar = () => { if (!procesando) { setMotivo(''); setError(null); onCerrar() } }
  const confirmar = async () => {
    if (!puesto) return
    if (motivo.trim().length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return }
    setProcesando(true)
    setError(null)
    try {
      await inactivarPuesto(puesto.id, puesto.version, motivo.trim())
      setMotivo('')
      onInactivado(puesto)
    } catch (errorActual: unknown) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el puesto.')
    } finally { setProcesando(false) }
  }
  return <ModalEstado abierto={Boolean(puesto)} tipo="advertencia" titulo="Desactivar puesto" mensaje={puesto ? <div className={styles.contenidoConfirmacion}><p>El puesto <strong>{puesto.nombre}</strong> dejará de estar disponible para nuevas asignaciones.</p><p>No puede desactivarse mientras esté asignado a empleados.</p><label htmlFor="motivo-inactivacion-puesto">Motivo de desactivación</label><textarea id="motivo-inactivacion-puesto" rows={3} value={motivo} maxLength={250} disabled={procesando} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} /><small>{motivo.length}/250 caracteres</small>{error && <span role="alert">{error}</span>}</div> : ''} textoAccionPrincipal="Desactivar puesto" iconoAccionPrincipal={<IconoAccion nombre="desactivar" />} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionPrincipal={() => void confirmar()} onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={procesando} />
}
