import styles from './ruta-navegacion.module.css'

export type ElementoRutaNavegacion = {
  etiqueta: string
  ruta?: string
}

type RutaNavegacionProps = {
  elementos: readonly ElementoRutaNavegacion[]
  onNavegar: (ruta: string) => void
}

export function RutaNavegacion({ elementos, onNavegar }: RutaNavegacionProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <ol>
        {elementos.map((elemento, indice) => {
          const esActual = indice === elementos.length - 1
          const ruta = elemento.ruta

          return (
            <li key={`${elemento.etiqueta}-${indice}`}>
              {indice > 0 && <span className={styles.separador} aria-hidden="true">/</span>}
              {esActual || !ruta
                ? <span aria-current={esActual ? 'page' : undefined}>{elemento.etiqueta}</span>
                : <button type="button" onClick={() => onNavegar(ruta)}>{elemento.etiqueta}</button>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
