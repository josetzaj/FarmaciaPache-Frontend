import { useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { solicitarRecuperacion } from '../recuperacion-api'
import { EstructuraAutenticacion } from './estructura-autenticacion'
import styles from './inicio-sesion-view.module.css'

type SolicitarRecuperacionViewProps = {
  onVolver: () => void
}

function IconoCorreo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />
    </svg>
  )
}

function obtenerMensajeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return error.detalles[0]?.mensaje ?? error.message
  }

  if (error instanceof TypeError) {
    return 'No se pudo contactar al servidor. Verifica que el backend esté ejecutándose.'
  }

  return 'No fue posible solicitar la recuperación. Inténtalo nuevamente.'
}

export function SolicitarRecuperacionView({ onVolver }: SolicitarRecuperacionViewProps) {
  const [correo, setCorreo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const correoNormalizado = correo.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)) {
      setError('Ingresa una dirección de correo válida.')
      return
    }

    if (correoNormalizado.length > 150) {
      setError('El correo no debe superar los 150 caracteres.')
      return
    }

    setEnviando(true)
    setError(null)

    try {
      const respuesta = await solicitarRecuperacion({ correo: correoNormalizado })
      setMensajeExito(respuesta.message)
    } catch (errorSolicitud: unknown) {
      setError(obtenerMensajeError(errorSolicitud))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <EstructuraAutenticacion
      tituloId="titulo-recuperacion"
      titulo="Recuperación de contraseña"
      descripcion="Ingresa el correo asociado a tu cuenta para recibir un enlace seguro."
    >
      {!mensajeExito && (
        <form
          className={styles.formulario}
          onSubmit={manejarEnvio}
          aria-busy={enviando}
          noValidate
        >
          {error && (
            <div id="error-recuperacion" className={styles.alertaError} role="alert">
              <span className={styles.alertaIcono} aria-hidden="true">!</span>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.campo}>
            <label htmlFor="correo-recuperacion">Correo electrónico</label>
            <div className={styles.control}>
              <span className={styles.iconoCampo} aria-hidden="true">
                <IconoCorreo />
              </span>
              <input
                id="correo-recuperacion"
                name="correo"
                type="email"
                value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value)
                  setError(null)
                }}
                autoComplete="email"
                maxLength={150}
                placeholder="Ingresa tu correo"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'error-recuperacion' : undefined}
                disabled={enviando}
                required
                autoFocus
              />
            </div>
          </div>

          <button className={styles.botonIngresar} type="submit" disabled={enviando}>
            <span>{enviando ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}</span>
          </button>
        </form>
      )}

      <button className={styles.enlaceAyuda} type="button" onClick={onVolver}>
        Volver al inicio de sesión
      </button>

      <ModalEstado
        abierto={Boolean(mensajeExito)}
        tipo="exito"
        titulo="Revisa tu correo"
        mensaje={mensajeExito ?? ''}
        textoAccionPrincipal="Volver al inicio de sesión"
        onAccionPrincipal={onVolver}
        onCerrar={onVolver}
      />
    </EstructuraAutenticacion>
  )
}
