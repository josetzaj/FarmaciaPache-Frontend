import { useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { iniciarSesion } from '../autenticacion-api'
import type { SesionUsuario } from '../autenticacion.types'
import { EstructuraAutenticacion } from './estructura-autenticacion'
import styles from './inicio-sesion-view.module.css'

type InicioSesionViewProps = {
  onSesionIniciada: (sesion: SesionUsuario) => void
  onRecuperarContrasena: () => void
}

type ErrorFormulario = {
  campo: 'nombreUsuario' | 'contrasena' | 'general'
  mensaje: string
}

function obtenerMensajeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return error.message
  }

  if (error instanceof TypeError) {
    return 'No se pudo contactar al servidor. Verifica que el backend esté ejecutándose.'
  }

  return 'Ocurrió un error inesperado. Inténtalo nuevamente.'
}

function IconoUsuario() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" />
    </svg>
  )
}

function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function IconoVisibilidad({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 4 16 16M10.6 6.2A8.4 8.4 0 0 1 12 6c5.5 0 9 6 9 6a15.8 15.8 0 0 1-2.1 2.8M14 17.7a8.7 8.7 0 0 1-2 .3c-5.5 0-9-6-9-6a15.4 15.4 0 0 1 3.1-3.7M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export function InicioSesionView({
  onSesionIniciada,
  onRecuperarContrasena,
}: InicioSesionViewProps) {
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<ErrorFormulario | null>(null)

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const usuarioNormalizado = nombreUsuario.trim().toUpperCase()

    if (usuarioNormalizado.length < 4) {
      setErrorFormulario({
        campo: 'nombreUsuario',
        mensaje: 'El nombre de usuario debe tener al menos 4 caracteres.',
      })
      return
    }

    if (!contrasena) {
      setErrorFormulario({ campo: 'contrasena', mensaje: 'Ingresa tu contraseña.' })
      return
    }

    setEnviando(true)
    setErrorFormulario(null)

    try {
      const sesion = await iniciarSesion({
        nombreUsuario: usuarioNormalizado,
        contrasena,
      })
      onSesionIniciada(sesion)
    } catch (error: unknown) {
      setErrorFormulario({ campo: 'general', mensaje: obtenerMensajeError(error) })
    } finally {
      setEnviando(false)
    }
  }

  const errorId = errorFormulario ? 'error-inicio-sesion' : undefined
  const usuarioInvalido =
    errorFormulario?.campo === 'nombreUsuario' || errorFormulario?.campo === 'general'
  const contrasenaInvalida =
    errorFormulario?.campo === 'contrasena' || errorFormulario?.campo === 'general'

  return (
    <EstructuraAutenticacion
      tituloId="titulo-inicio-sesion"
      titulo="Iniciar sesión"
      descripcion="Ingresa tus credenciales para continuar al sistema."
    >
      <form
        className={styles.formulario}
        onSubmit={manejarEnvio}
        aria-busy={enviando}
        noValidate
      >
              {errorFormulario && (
                <div id="error-inicio-sesion" className={styles.alertaError} role="alert">
                  <span className={styles.alertaIcono} aria-hidden="true">!</span>
                  <p>{errorFormulario.mensaje}</p>
                </div>
              )}

              <div className={styles.campo}>
                <label htmlFor="nombreUsuario">Usuario</label>
                <div className={styles.control}>
                  <span className={styles.iconoCampo} aria-hidden="true">
                    <IconoUsuario />
                  </span>
                  <input
                    id="nombreUsuario"
                    name="nombreUsuario"
                    type="text"
                    value={nombreUsuario}
                    onChange={(event) => {
                      setNombreUsuario(event.target.value)
                      setErrorFormulario(null)
                    }}
                    autoComplete="username"
                    autoCapitalize="characters"
                    minLength={4}
                    maxLength={50}
                    placeholder="Ingresa tu usuario"
                    aria-invalid={usuarioInvalido}
                    aria-describedby={usuarioInvalido ? errorId : undefined}
                    disabled={enviando}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.campo}>
                <label htmlFor="contrasena">Contraseña</label>
                <div className={styles.control}>
                  <span className={styles.iconoCampo} aria-hidden="true">
                    <IconoCandado />
                  </span>
                  <input
                    id="contrasena"
                    name="contrasena"
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(event) => {
                      setContrasena(event.target.value)
                      setErrorFormulario(null)
                    }}
                    autoComplete="current-password"
                    maxLength={128}
                    placeholder="Ingresa tu contraseña"
                    aria-invalid={contrasenaInvalida}
                    aria-describedby={contrasenaInvalida ? errorId : undefined}
                    disabled={enviando}
                    required
                  />
                  <button
                    className={styles.botonVisibilidad}
                    type="button"
                    onClick={() => setMostrarContrasena((valor) => !valor)}
                    aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={mostrarContrasena}
                    disabled={enviando}
                  >
                    <IconoVisibilidad visible={mostrarContrasena} />
                  </button>
                </div>
              </div>

              <button className={styles.botonIngresar} type="submit" disabled={enviando}>
                {!enviando && (
                  <span className={styles.iconoBoton} aria-hidden="true">
                    <IconoCandado />
                  </span>
                )}
                <span>{enviando ? 'Verificando acceso…' : 'Ingresar al sistema'}</span>
              </button>
      </form>

      <button
        className={styles.enlaceAyuda}
        type="button"
        onClick={onRecuperarContrasena}
      >
        ¿Olvidaste tu contraseña?
      </button>
    </EstructuraAutenticacion>
  )
}
