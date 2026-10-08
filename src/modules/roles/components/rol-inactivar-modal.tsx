import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarRol } from '../rol-api'
import type { Rol } from '../rol.types'
import styles from './rol-gestion.module.css'

type RolInactivarModalProps = {
  rol: Rol | null
  onCerrar: () => void
  onInactivado: (rol: Rol) => void
}

export function RolInactivarModal({ rol, onCerrar, onInactivado }: RolInactivarModalProps) {
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
    if (!rol) return
    if (motivo.trim().length < 5) {
      setError('Escribe un motivo de al menos 5 caracteres.')
      return
    }
    setProcesando(true)
    setError(null)
    try {
      await inactivarRol(rol.id, rol.version, motivo.trim())
      setMotivo('')
      onInactivado(rol)
    } catch (errorActual: unknown) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el rol.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <ModalEstado
      abierto={Boolean(rol)}
      tipo="advertencia"
      titulo="Desactivar rol"
      mensaje={rol ? (
        <div className={styles.contenidoConfirmacion}>
          <p>El rol <strong>{rol.nombre}</strong> dejará de estar disponible para nuevas asignaciones.</p>
          <label htmlFor="motivo-inactivacion-rol">Motivo de desactivación</label>
          <textarea
            id="motivo-inactivacion-rol"
            rows={3}
            maxLength={250}
            value={motivo}
            disabled={procesando}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <small>{motivo.length}/250 caracteres</small>
          {error && <span role="alert">{error}</span>}
        </div>
      ) : ''}
      textoAccionPrincipal="Desactivar rol"
      iconoAccionPrincipal={<IconoAccion nombre="desactivar" />}
      onAccionPrincipal={() => void confirmar()}
      textoAccionSecundaria="Cancelar"
      iconoAccionSecundaria={<IconoAccion nombre="cancelar" />}
      onAccionSecundaria={cerrar}
      onCerrar={cerrar}
      cargando={procesando}
    />
  )
}
