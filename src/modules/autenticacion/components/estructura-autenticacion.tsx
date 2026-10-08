import type { ReactNode } from 'react'
import logoFarmaciaPache from '../../../assets/marca/imagotipo.png'
import logoFarmaciaPacheBlanco from '../../../assets/marca/imagotipo-blanco.png'
import patronInferior from '../../../assets/marca/patron-inferior.png'
import styles from './inicio-sesion-view.module.css'

type EstructuraAutenticacionProps = {
  tituloId: string
  titulo: string
  descripcion: string
  children: ReactNode
  compacta?: boolean
}

export function EstructuraAutenticacion({
  tituloId,
  titulo,
  descripcion,
  children,
  compacta = false,
}: EstructuraAutenticacionProps) {
  return (
    <main className={styles.pagina}>
      <header className={styles.barraSuperior} aria-label="Farmacia Pache">
        <img className={styles.logoPrincipal} src={logoFarmaciaPache} alt="Farmacia Pache" />
      </header>

      <div className={styles.escenario}>
        <div className={styles.circulosFondo} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <img
          className={styles.figuraInferior}
          src={patronInferior}
          alt=""
          aria-hidden="true"
        />

        <section
          className={`${styles.tarjeta} ${compacta ? styles.tarjetaCompacta : ''}`}
          aria-labelledby={tituloId}
        >
          <div className={styles.cabeceraTarjeta}>
            <img src={logoFarmaciaPacheBlanco} alt="Farmacia Pache" />
          </div>

          <div className={styles.contenidoTarjeta}>
            <header className={styles.encabezado}>
              <h1 id={tituloId}>{titulo}</h1>
              <p>{descripcion}</p>
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
