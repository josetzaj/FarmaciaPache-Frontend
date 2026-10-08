import { useState } from 'react'
import {
  ModalEstado,
  type TipoModalEstado,
} from '../../../shared/components/modal-estado'
import { IconoAccion } from '../../../shared/components/icono-accion'
import styles from './galeria-modales-view.module.css'

type GaleriaModalesViewProps = {
  onVolver: () => void
}

type ConfiguracionModal = {
  etiqueta: string
  titulo: string
  descripcion: string
  mensaje: string
}

const configuraciones: Record<TipoModalEstado, ConfiguracionModal> = {
  exito: {
    etiqueta: 'Éxito',
    titulo: 'Operación completada',
    descripcion: 'Confirma que una acción finalizó correctamente.',
    mensaje: 'La información se guardó correctamente en el sistema.',
  },
  error: {
    etiqueta: 'Error',
    titulo: 'No fue posible continuar',
    descripcion: 'Comunica que una operación no pudo completarse.',
    mensaje: 'Revisa la información e inténtalo nuevamente.',
  },
  advertencia: {
    etiqueta: 'Advertencia',
    titulo: 'Confirma esta acción',
    descripcion: 'Solicita confirmación antes de una acción importante.',
    mensaje: 'Esta acción requiere tu confirmación antes de continuar.',
  },
  informacion: {
    etiqueta: 'Información',
    titulo: 'Información importante',
    descripcion: 'Presenta un aviso sin indicar un error.',
    mensaje: 'Aquí puedes comunicar información importante al usuario.',
  },
}

const tiposModal = Object.keys(configuraciones) as TipoModalEstado[]

export function GaleriaModalesView({ onVolver }: GaleriaModalesViewProps) {
  const [tipoActivo, setTipoActivo] = useState<TipoModalEstado | null>(null)
  const configuracionActiva = configuraciones[tipoActivo ?? 'informacion']
  const esAdvertencia = tipoActivo === 'advertencia'

  const cerrarModal = () => setTipoActivo(null)

  return (
    <main className={styles.pagina}>
      <section className={styles.contenedor} aria-labelledby="titulo-galeria-modales">
        <header className={styles.encabezado}>
          <div>
            <span className={styles.etiquetaEntorno}>Solo desarrollo</span>
            <h1 id="titulo-galeria-modales">Prueba de modales</h1>
            <p>
              Abre cada estado para revisar su icono, animación, texto y acciones.
              Cada apertura reproduce la animación desde el inicio.
            </p>
          </div>

          <button className={styles.botonVolver} type="button" onClick={onVolver}>
            Volver al sistema
          </button>
        </header>

        <div className={styles.avisoRuta} role="note">
          Esta pantalla solo está disponible con <code>npm run dev</code> en la ruta{' '}
          <code>/componentes/modales</code>.
        </div>

        <div className={styles.cuadricula}>
          {tiposModal.map((tipo) => {
            const configuracion = configuraciones[tipo]

            return (
              <article className={`${styles.tarjeta} ${styles[tipo]}`} key={tipo}>
                <span className={styles.indicador} aria-hidden="true" />
                <h2>{configuracion.etiqueta}</h2>
                <p>{configuracion.descripcion}</p>
                <button type="button" onClick={() => setTipoActivo(tipo)}>
                  Probar modal de {configuracion.etiqueta.toLowerCase()}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <ModalEstado
        key={tipoActivo ?? 'modal-cerrado'}
        abierto={tipoActivo !== null}
        tipo={tipoActivo ?? 'informacion'}
        titulo={configuracionActiva.titulo}
        mensaje={configuracionActiva.mensaje}
        textoAccionPrincipal={esAdvertencia ? 'Confirmar' : 'Entendido'}
        onAccionPrincipal={cerrarModal}
        textoAccionSecundaria={esAdvertencia ? 'Cancelar' : undefined}
        iconoAccionSecundaria={esAdvertencia ? <IconoAccion nombre="cancelar" /> : undefined}
        onAccionSecundaria={esAdvertencia ? cerrarModal : undefined}
        onCerrar={cerrarModal}
      />
    </main>
  )
}
