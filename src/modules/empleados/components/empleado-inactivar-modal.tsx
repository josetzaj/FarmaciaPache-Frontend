import { useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { cambiarEstadoEmpleado } from '../empleado-api'
import type { Empleado, EstadoEmpleado } from '../empleado.types'
import styles from './empleado-gestion.module.css'

type EmpleadoEstadoModalProps = {
  empleado: Empleado | null
  abierto: boolean
  onCerrar: () => void
  onCambiado: (empleado: Empleado) => void
}

function nombreCompleto(empleado: Empleado): string {
  return [
    empleado.primerNombre,
    empleado.segundoNombre,
    empleado.tercerNombre,
    empleado.primerApellido,
    empleado.segundoApellido,
    empleado.apellidoCasada,
  ].filter(Boolean).join(' ')
}

const etiquetasEstado: Record<EstadoEmpleado, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  INACTIVO: 'Desactivado',
  RETIRADO: 'Retirado',
}

const explicacionesEstado: Record<EstadoEmpleado, string> = {
  ACTIVO: 'Recuperará el acceso y conservará su asignación de sucursal.',
  SUSPENDIDO: 'El acceso quedará bloqueado temporalmente, pero conservará su asignación de sucursal.',
  INACTIVO: 'El registro quedará dado de baja administrativamente y su asignación activa finalizará.',
  RETIRADO: 'La relación laboral finalizará definitivamente, se registrará la fecha de retiro y se cerrará su asignación activa.',
}

const clasesExplicacionEstado: Record<EstadoEmpleado, string> = {
  ACTIVO: styles.explicacionActiva,
  SUSPENDIDO: styles.explicacionSuspendida,
  INACTIVO: styles.explicacionDesactivada,
  RETIRADO: styles.explicacionRetirada,
}

const accionesEstado: Record<EstadoEmpleado, string> = {
  ACTIVO: 'Reactivar empleado',
  SUSPENDIDO: 'Suspender empleado',
  INACTIVO: 'Desactivar empleado',
  RETIRADO: 'Retirar empleado',
}

function estadosPermitidos(estado: EstadoEmpleado): EstadoEmpleado[] {
  if (estado === 'ACTIVO') return ['SUSPENDIDO', 'INACTIVO', 'RETIRADO']
  if (estado === 'SUSPENDIDO') return ['ACTIVO', 'INACTIVO', 'RETIRADO']
  return []
}

export function EmpleadoEstadoModal({
  empleado,
  abierto,
  onCerrar,
  onCambiado,
}: EmpleadoEstadoModalProps) {
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState<EstadoEmpleado | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const opciones = useMemo(
    () => empleado ? estadosPermitidos(empleado.estado) : [],
    [empleado],
  )

  const estadoSeleccionado = estado || opciones[0] || ''

  const cerrar = () => {
    setMotivo('')
    setEstado('')
    setError(null)
    onCerrar()
  }

  const confirmar = async () => {
    if (!empleado) return
    if (!estadoSeleccionado) {
      setError('Selecciona el nuevo estado del empleado.')
      return
    }
    if (motivo.trim().length < 5) {
      setError('Explica el motivo del cambio con al menos 5 caracteres.')
      return
    }

    setProcesando(true)
    setError(null)
    try {
      const actualizado = await cambiarEstadoEmpleado(empleado.id, {
        version: empleado.version,
        estado: estadoSeleccionado,
        motivo: motivo.trim(),
      })
      setMotivo('')
      setEstado('')
      setError(null)
      onCambiado(actualizado)
    } catch (errorActual: unknown) {
      setError(
        errorActual instanceof ErrorApi
          ? errorActual.message
          : 'No fue posible cambiar el estado del empleado.',
      )
    } finally {
      setProcesando(false)
    }
  }

  return (
    <ModalEstado
      abierto={abierto && Boolean(empleado)}
      tipo="advertencia"
      titulo="Cambiar estado del empleado"
      mensaje={empleado ? (
        <div className={styles.contenidoConfirmacion}>
          <p>
            Actualizarás la situación laboral de <strong>{nombreCompleto(empleado)}</strong>.
          </p>
          <label htmlFor="estado-empleado">Nuevo estado</label>
          <select
            id="estado-empleado"
            value={estadoSeleccionado}
            disabled={procesando}
            onChange={(event) => {
              setEstado(event.target.value as EstadoEmpleado)
              setError(null)
            }}
          >
            {opciones.map((opcion) => (
              <option key={opcion} value={opcion}>{etiquetasEstado[opcion]}</option>
            ))}
          </select>
          {estadoSeleccionado && (
            <p className={`${styles.explicacionEstado} ${clasesExplicacionEstado[estadoSeleccionado]}`}>
              {explicacionesEstado[estadoSeleccionado]}
            </p>
          )}
          <label htmlFor="motivo-cambio-estado">Motivo del cambio</label>
          <textarea
            id="motivo-cambio-estado"
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value)
              setError(null)
            }}
            rows={3}
            maxLength={250}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'motivo-cambio-estado-error' : undefined}
            placeholder="Describe la razón del cambio de estado"
          />
          <small>{motivo.length}/250 caracteres</small>
          {error && <span id="motivo-cambio-estado-error" role="alert">{error}</span>}
        </div>
      ) : ''}
      textoAccionPrincipal={estadoSeleccionado ? accionesEstado[estadoSeleccionado] : 'Guardar estado'}
      iconoAccionPrincipal={<IconoAccion nombre="estado" />}
      varianteAccionPrincipal={estadoSeleccionado === 'INACTIVO' || estadoSeleccionado === 'RETIRADO' ? 'peligro' : 'predeterminada'}
      onAccionPrincipal={() => void confirmar()}
      textoAccionSecundaria="Cancelar"
      iconoAccionSecundaria={<IconoAccion nombre="cancelar" />}
      onAccionSecundaria={cerrar}
      onCerrar={cerrar}
      cargando={procesando}
    />
  )
}
