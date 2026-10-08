import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarEstadoCatalogo } from '../estado-catalogo-api'
import type { EstadoCatalogo } from '../estado-catalogo.types'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { estado: EstadoCatalogo | null; onCerrar: () => void; onInactivado: (estado: EstadoCatalogo) => void }

export function EstadoCatalogoInactivarModal({ estado, onCerrar, onInactivado }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const cerrar = () => {
    if (procesando) return
    setMotivo('')
    setError(null)
    onCerrar()
  }
  const confirmar = async () => {
    if (!estado) return
    if (motivo.trim().length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return }
    setProcesando(true); setError(null)
    try { await inactivarEstadoCatalogo(estado.id, estado.version, motivo.trim()); setMotivo(''); onInactivado(estado) }
    catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el estado.') }
    finally { setProcesando(false) }
  }
  return (
    <ModalEstado
      abierto={Boolean(estado)}
      tipo="advertencia"
      titulo="Desactivar estado"
      mensaje={estado ? <div className={styles.contenidoConfirmacion}><p>El estado <strong>{estado.nombre}</strong> dejará de estar disponible para nuevas asignaciones.</p><label htmlFor="motivo-inactivacion-estado">Motivo de desactivación</label><textarea id="motivo-inactivacion-estado" rows={3} value={motivo} maxLength={250} disabled={procesando} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} /><small>{motivo.length}/250 caracteres</small>{error && <span role="alert">{error}</span>}</div> : ''}
      textoAccionPrincipal="Desactivar estado"
      iconoAccionPrincipal={<IconoAccion nombre="desactivar" />}
      textoAccionSecundaria="Cancelar"
      iconoAccionSecundaria={<IconoAccion nombre="cancelar" />}
      onAccionPrincipal={() => void confirmar()}
      onAccionSecundaria={cerrar}
      onCerrar={cerrar}
      cargando={procesando}
    />
  )
}
