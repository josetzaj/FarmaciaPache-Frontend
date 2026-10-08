import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './modal-estado.module.css'

export type TipoModalEstado = 'exito' | 'error' | 'advertencia' | 'informacion'

export type AnimacionLottie = {
  src: string
  loop?: boolean
  velocidad?: number
}

export type ModalEstadoProps = {
  abierto: boolean
  tipo: TipoModalEstado
  ancho?: 'normal' | 'amplio'
  titulo: string
  mensaje: ReactNode
  textoAccionPrincipal?: string
  onAccionPrincipal?: () => void
  textoAccionSecundaria?: string
  onAccionSecundaria?: () => void
  iconoAccionPrincipal?: ReactNode
  iconoAccionSecundaria?: ReactNode
  varianteAccionPrincipal?: 'predeterminada' | 'peligro'
  onCerrar?: () => void
  cargando?: boolean
  animacion?: AnimacionLottie
}

const etiquetasEstado: Record<TipoModalEstado, string> = {
  exito: 'Operación exitosa',
  error: 'Se produjo un error',
  advertencia: 'Advertencia',
  informacion: 'Información',
}

function usePrefiereMovimientoReducido() {
  const [prefiereMovimientoReducido, setPrefiereMovimientoReducido] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const actualizarPreferencia = () => setPrefiereMovimientoReducido(consulta.matches)

    consulta.addEventListener('change', actualizarPreferencia)
    return () => consulta.removeEventListener('change', actualizarPreferencia)
  }, [])

  return prefiereMovimientoReducido
}

function IconoEstado({ tipo }: { tipo: TipoModalEstado }) {
  if (tipo === 'exito') {
    return <path pathLength={1} d="m7.5 12.5 3 3 6-7" />
  }

  if (tipo === 'error') {
    return <path d="m8.5 8.5 7 7m0-7-7 7" />
  }

  if (tipo === 'advertencia') {
    return (
      <>
        <path d="M12 8.5v5" />
        <path d="M12 17h.01" />
      </>
    )
  }

  return (
    <>
      <path d="M12 10.5V17" />
      <path d="M12 7h.01" />
    </>
  )
}

function IlustracionEstado({
  tipo,
  animacion,
}: {
  tipo: TipoModalEstado
  animacion?: AnimacionLottie
}) {
  const prefiereMovimientoReducido = usePrefiereMovimientoReducido()

  if (animacion) {
    return (
      <div className={styles.animacionLottie} aria-hidden="true">
        <DotLottieReact
          src={animacion.src}
          autoplay={!prefiereMovimientoReducido}
          loop={!prefiereMovimientoReducido && Boolean(animacion.loop)}
          speed={animacion.velocidad ?? 1}
        />
      </div>
    )
  }

  return (
    <div className={`${styles.ilustracion} ${styles[tipo]}`} aria-hidden="true">
      {tipo !== 'advertencia' && tipo !== 'error' && <span className={styles.halo} />}
      <svg viewBox="0 0 24 24">
        {tipo === 'exito' && (
          <circle className={styles.circuloRelleno} cx="12" cy="12" r="9" />
        )}
        {tipo === 'informacion' && (
          <circle className={styles.circuloInformacion} cx="12" cy="12" r="9" />
        )}
        {tipo === 'error' && (
          <>
            <g className={styles.fantasmaError}>
              <circle cx="12" cy="12" r="9" />
              <IconoEstado tipo="error" />
            </g>
            <circle className={styles.circuloError} cx="12" cy="12" r="9" />
          </>
        )}
        {tipo === 'advertencia' && (
          <path
            className={styles.trianguloRelleno}
            d="M12 3.25c.95 0 1.83.5 2.32 1.32l7.05 12.18c1.04 1.8-.26 4.05-2.34 4.05H4.97c-2.08 0-3.38-2.25-2.34-4.05L9.68 4.57A2.7 2.7 0 0 1 12 3.25Z"
          />
        )}
        {tipo !== 'advertencia' && tipo !== 'exito' && tipo !== 'informacion' && tipo !== 'error' && (
          <circle className={styles.contorno} cx="12" cy="12" r="9" />
        )}
        <g className={styles.simbolo}>
          <IconoEstado tipo={tipo} />
        </g>
      </svg>
    </div>
  )
}

function obtenerElementosEnfocables(contenedor: HTMLElement) {
  return Array.from(
    contenedor.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

export function ModalEstado({
  abierto,
  tipo,
  ancho = 'normal',
  titulo,
  mensaje,
  textoAccionPrincipal = 'Aceptar',
  onAccionPrincipal,
  textoAccionSecundaria,
  onAccionSecundaria,
  iconoAccionPrincipal,
  iconoAccionSecundaria,
  varianteAccionPrincipal = 'predeterminada',
  onCerrar,
  cargando = false,
  animacion,
}: ModalEstadoProps) {
  const tituloId = useId()
  const mensajeId = useId()
  const dialogoRef = useRef<HTMLDivElement>(null)
  const botonPrincipalRef = useRef<HTMLButtonElement>(null)
  const onCerrarRef = useRef(onCerrar)
  const cargandoRef = useRef(cargando)

  useEffect(() => {
    onCerrarRef.current = onCerrar
    cargandoRef.current = cargando
  }, [cargando, onCerrar])

  useEffect(() => {
    if (!abierto) return

    const elementoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    botonPrincipalRef.current?.focus()

    const manejarTeclado = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCerrarRef.current && !cargandoRef.current) {
        event.preventDefault()
        onCerrarRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialogoRef.current) return

      const enfocables = obtenerElementosEnfocables(dialogoRef.current)
      if (enfocables.length === 0) {
        event.preventDefault()
        dialogoRef.current.focus()
        return
      }

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]

      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', manejarTeclado)

    return () => {
      document.removeEventListener('keydown', manejarTeclado)
      document.body.style.overflow = overflowAnterior
      elementoAnterior?.focus()
    }
  }, [abierto])

  if (!abierto) return null

  const ejecutarAccionPrincipal = onAccionPrincipal ?? onCerrar
  const rol = tipo === 'error' || tipo === 'advertencia' ? 'alertdialog' : 'dialog'

  return createPortal(
    <div className={styles.fondo}>
      <div
        ref={dialogoRef}
        className={`${styles.modal} ${ancho === 'amplio' ? styles.modalAmplio : ''} ${styles[tipo]}`}
        role={rol}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensajeId}
        tabIndex={-1}
      >
        {onCerrar && (
          <button
            className={styles.cerrar}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar mensaje"
            disabled={cargando}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}

        <IlustracionEstado tipo={tipo} animacion={animacion} />

        <span className={styles.etiqueta}>{etiquetasEstado[tipo]}</span>
        <h2 id={tituloId}>{titulo}</h2>
        <div id={mensajeId} className={styles.mensaje}>{mensaje}</div>

        <div className={styles.acciones}>
          {textoAccionSecundaria && onAccionSecundaria && (
            <button
              className={styles.secundario}
              type="button"
              onClick={onAccionSecundaria}
              disabled={cargando}
            >
              {iconoAccionSecundaria}
              {textoAccionSecundaria}
            </button>
          )}

          {ejecutarAccionPrincipal && (
            <button
              ref={botonPrincipalRef}
              className={`${styles.principal} ${varianteAccionPrincipal === 'peligro' ? styles.principalPeligro : ''}`}
              type="button"
            onClick={ejecutarAccionPrincipal}
            disabled={cargando}
          >
              {iconoAccionPrincipal}
              <span>{textoAccionPrincipal}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
