import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  activarCuenta,
  restablecerContrasena,
  validarEnlaceActivacion,
  validarEnlaceRecuperacion,
} from '../recuperacion-api'
import type { MotivoEnlaceRecuperacionNoValido } from '../recuperacion.types'
import { EstructuraAutenticacion } from './estructura-autenticacion'
import styles from './inicio-sesion-view.module.css'

type RestablecerContrasenaViewProps = {
  token: string | null
  modo: 'activacion' | 'recuperacion'
  onVolver: () => void
  onEnlaceNoValido: (
    motivo: MotivoEnlaceRecuperacionNoValido,
    modo: 'activacion' | 'recuperacion',
  ) => void
}

type CampoError = 'contrasenaNueva' | 'confirmarContrasenaNueva' | 'general'

type ErrorFormulario = {
  campo: CampoError
  mensaje: string
}

type RequisitoContrasena = {
  id: string
  etiqueta: string
  mensajeError: string
  cumple: boolean
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

function evaluarContrasena(contrasena: string): RequisitoContrasena[] {
  return [
    {
      id: 'longitud-minima',
      etiqueta: 'Al menos 12 caracteres',
      mensajeError: 'La contraseña debe contener al menos 12 caracteres.',
      cumple: contrasena.length >= 12,
    },
    {
      id: 'mayuscula',
      etiqueta: 'Una letra mayúscula',
      mensajeError: 'Incluye al menos una letra mayúscula.',
      cumple: /[A-ZÁÉÍÓÚÑ]/.test(contrasena),
    },
    {
      id: 'minuscula',
      etiqueta: 'Una letra minúscula',
      mensajeError: 'Incluye al menos una letra minúscula.',
      cumple: /[a-záéíóúñ]/.test(contrasena),
    },
    {
      id: 'numero',
      etiqueta: 'Un número',
      mensajeError: 'Incluye al menos un número.',
      cumple: /\d/.test(contrasena),
    },
    {
      id: 'simbolo',
      etiqueta: 'Un símbolo',
      mensajeError: 'Incluye al menos un símbolo.',
      cumple: /[^\p{L}\p{N}\s]/u.test(contrasena),
    },
    {
      id: 'sin-espacios',
      etiqueta: 'Sin espacios',
      mensajeError: 'La contraseña no debe contener espacios.',
      cumple: contrasena.length > 0 && !/\s/u.test(contrasena),
    },
  ]
}

function validarContrasena(contrasena: string): string | null {
  if (contrasena.length > 128) return 'La contraseña no debe superar los 128 caracteres.'
  return evaluarContrasena(contrasena).find((requisito) => !requisito.cumple)?.mensajeError ?? null
}

function tokenTieneFormatoValido(token: string | null): token is string {
  return Boolean(token && token.length >= 43 && token.length <= 128 && /^[A-Za-z0-9_-]+$/.test(token))
}

function obtenerErrorApi(error: unknown): ErrorFormulario {
  if (error instanceof ErrorApi) {
    const detalle = error.detalles[0]
    const campo = detalle?.campo === 'confirmarContrasenaNueva'
      ? 'confirmarContrasenaNueva'
      : detalle?.campo === 'contrasenaNueva'
        ? 'contrasenaNueva'
        : 'general'

    return { campo, mensaje: detalle?.mensaje ?? error.message }
  }

  if (error instanceof TypeError) {
    return {
      campo: 'general',
      mensaje: 'No se pudo contactar al servidor. Verifica que el backend esté ejecutándose.',
    }
  }

  return {
    campo: 'general',
    mensaje: 'No fue posible restablecer la contraseña. Inténtalo nuevamente.',
  }
}

export function RestablecerContrasenaView({
  token,
  modo,
  onVolver,
  onEnlaceNoValido,
}: RestablecerContrasenaViewProps) {
  const [contrasenaNueva, setContrasenaNueva] = useState('')
  const [confirmarContrasenaNueva, setConfirmarContrasenaNueva] = useState('')
  const [mostrarContrasenas, setMostrarContrasenas] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [completado, setCompletado] = useState(false)
  const [error, setError] = useState<ErrorFormulario | null>(null)
  const [estadoEnlace, setEstadoEnlace] = useState<'validando' | 'valido' | 'error'>('validando')
  const [reintentoValidacion, setReintentoValidacion] = useState(0)
  const tokenValido = tokenTieneFormatoValido(token)
  const requisitos = evaluarContrasena(contrasenaNueva)
  const requisitosCumplidos = requisitos.filter((requisito) => requisito.cumple).length
  const esActivacion = modo === 'activacion'

  useEffect(() => {
    if (!tokenValido) {
      onEnlaceNoValido('invalido', modo)
      return
    }

    const controlador = new AbortController()

    const validarEnlace = esActivacion
      ? validarEnlaceActivacion
      : validarEnlaceRecuperacion

    void validarEnlace({ token }, controlador.signal)
      .then((resultado) => {
        if (!resultado.valido) {
          onEnlaceNoValido(resultado.motivo, modo)
          return
        }

        setEstadoEnlace('valido')
      })
      .catch(() => {
        if (!controlador.signal.aborted) {
          setEstadoEnlace('error')
        }
      })

    return () => controlador.abort()
  }, [esActivacion, modo, onEnlaceNoValido, reintentoValidacion, token, tokenValido])

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!tokenValido || estadoEnlace !== 'valido') {
      setError({ campo: 'general', mensaje: 'El enlace no es válido.' })
      return
    }

    const mensajeContrasena = validarContrasena(contrasenaNueva)
    if (mensajeContrasena) {
      setError({ campo: 'contrasenaNueva', mensaje: mensajeContrasena })
      return
    }

    if (contrasenaNueva !== confirmarContrasenaNueva) {
      setError({
        campo: 'confirmarContrasenaNueva',
        mensaje: 'La confirmación no coincide con la nueva contraseña.',
      })
      return
    }

    setEnviando(true)
    setError(null)

    try {
      const establecerContrasena = esActivacion ? activarCuenta : restablecerContrasena
      await establecerContrasena({
        token,
        contrasenaNueva,
        confirmarContrasenaNueva,
      })
      window.history.replaceState(null, '', esActivacion ? '/activar-cuenta' : '/restablecer-contrasena')
      setCompletado(true)
    } catch (errorSolicitud: unknown) {
      if (errorSolicitud instanceof ErrorApi && errorSolicitud.codigo === 'ENLACE_CREDENCIAL_NO_VALIDO') {
        try {
          const validarEnlace = esActivacion
            ? validarEnlaceActivacion
            : validarEnlaceRecuperacion
          const estadoActual = await validarEnlace({ token })
          onEnlaceNoValido(estadoActual.valido ? 'invalido' : estadoActual.motivo, modo)
        } catch {
          onEnlaceNoValido('invalido', modo)
        }
        return
      }

      setError(obtenerErrorApi(errorSolicitud))
    } finally {
      setEnviando(false)
    }
  }

  const errorId = error ? 'error-restablecer-contrasena' : undefined

  return (
    <EstructuraAutenticacion
      tituloId={esActivacion ? 'titulo-activar-cuenta' : 'titulo-restablecer-contrasena'}
      titulo={esActivacion ? 'Crea tu contraseña' : 'Recuperación de contraseña'}
      descripcion={esActivacion
        ? 'Define una contraseña segura para activar tu cuenta e ingresar al sistema.'
        : 'Crea una contraseña nueva para recuperar el acceso a tu cuenta.'}
      compacta
    >
      {!completado && (estadoEnlace === 'validando' ? (
        <div className={styles.estadoValidacionEnlace} role="status" aria-live="polite">
          <span className={styles.cargadorEnlace} aria-hidden="true" />
          <p>Comprobando que el enlace siga vigente…</p>
        </div>
      ) : estadoEnlace === 'error' ? (
        <div className={styles.bloqueValidacionEnlace}>
          <div className={styles.alertaError} role="alert">
            <span className={styles.alertaIcono} aria-hidden="true">!</span>
            <p>No fue posible verificar el enlace. Comprueba tu conexión e inténtalo nuevamente.</p>
          </div>
          <button
            className={styles.botonReintentar}
            type="button"
            onClick={() => {
              setEstadoEnlace('validando')
              setReintentoValidacion((valor) => valor + 1)
            }}
          >
            Verificar nuevamente
          </button>
        </div>
      ) : (
        <form
          className={styles.formulario}
          onSubmit={manejarEnvio}
          aria-busy={enviando}
          noValidate
        >
          {error && (
            <div id={errorId} className={styles.alertaError} role="alert">
              <span className={styles.alertaIcono} aria-hidden="true">!</span>
              <p>{error.mensaje}</p>
            </div>
          )}

          <div className={styles.campo}>
            <label htmlFor="contrasena-nueva">Nueva contraseña</label>
            <div className={styles.control}>
              <span className={styles.iconoCampo} aria-hidden="true">
                <IconoCandado />
              </span>
              <input
                id="contrasena-nueva"
                name="contrasenaNueva"
                type={mostrarContrasenas ? 'text' : 'password'}
                value={contrasenaNueva}
                onChange={(event) => {
                  setContrasenaNueva(event.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                maxLength={128}
                placeholder="Ingresa la nueva contraseña"
                aria-invalid={error?.campo === 'contrasenaNueva' || error?.campo === 'general'}
                aria-describedby={error ? errorId : 'requisitos-contrasena'}
                disabled={enviando}
                required
                autoFocus
              />
              <button
                className={styles.botonVisibilidad}
                type="button"
                onClick={() => setMostrarContrasenas((visible) => !visible)}
                aria-label={mostrarContrasenas ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                aria-pressed={mostrarContrasenas}
                disabled={enviando}
              >
                <IconoVisibilidad visible={mostrarContrasenas} />
              </button>
            </div>

            <div id="requisitos-contrasena" className={styles.progresoContrasena}>
              <div className={styles.progresoEncabezado}>
                <span>Requisitos de contraseña</span>
                <span aria-live="polite">
                  {requisitosCumplidos} de {requisitos.length}
                </span>
              </div>
              <progress
                className={styles.barraProgreso}
                max={requisitos.length}
                value={requisitosCumplidos}
                aria-label={`${requisitosCumplidos} de ${requisitos.length} requisitos cumplidos`}
              />
              <ul className={styles.listaRequisitos}>
                {requisitos.map((requisito) => (
                  <li
                    key={requisito.id}
                    className={requisito.cumple ? styles.requisitoCumplido : undefined}
                  >
                    <span aria-hidden="true">{requisito.cumple ? '✓' : '○'}</span>
                    <span>{requisito.etiqueta}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.campo}>
            <label htmlFor="confirmar-contrasena-nueva">Confirmar contraseña</label>
            <div className={styles.control}>
              <span className={styles.iconoCampo} aria-hidden="true">
                <IconoCandado />
              </span>
              <input
                id="confirmar-contrasena-nueva"
                name="confirmarContrasenaNueva"
                type={mostrarContrasenas ? 'text' : 'password'}
                value={confirmarContrasenaNueva}
                onChange={(event) => {
                  setConfirmarContrasenaNueva(event.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                maxLength={128}
                placeholder="Confirma la nueva contraseña"
                aria-invalid={error?.campo === 'confirmarContrasenaNueva' || error?.campo === 'general'}
                aria-describedby={error ? errorId : undefined}
                disabled={enviando}
                required
              />
            </div>
          </div>

          <button className={styles.botonIngresar} type="submit" disabled={enviando}>
            <span>{enviando
              ? (esActivacion ? 'Activando…' : 'Restableciendo…')
              : (esActivacion ? 'Activar cuenta' : 'Restablecer contraseña')}</span>
          </button>
        </form>
      ))}

      <button className={styles.enlaceAyuda} type="button" onClick={onVolver}>
        {completado ? 'Ir al inicio de sesión' : 'Volver al inicio de sesión'}
      </button>

      <ModalEstado
        abierto={completado}
        tipo="exito"
        titulo={esActivacion ? 'Cuenta activada' : 'Contraseña restablecida'}
        mensaje={esActivacion
          ? 'Tu cuenta fue activada correctamente. Ya puedes iniciar sesión.'
          : 'Tu contraseña fue restablecida. Ya puedes iniciar sesión.'}
        textoAccionPrincipal="Ir al inicio de sesión"
        onAccionPrincipal={onVolver}
        onCerrar={onVolver}
      />
    </EstructuraAutenticacion>
  )
}
