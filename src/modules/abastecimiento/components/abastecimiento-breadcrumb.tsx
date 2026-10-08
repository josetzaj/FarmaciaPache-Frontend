import type { RecursoAbastecimiento } from '../abastecimiento.types'
import { configuracionesAbastecimiento } from '../abastecimiento-config'
import styles from './abastecimiento.module.css'

export function AbastecimientoBreadcrumb({ recurso, actual, onNavegar }: { recurso: RecursoAbastecimiento; actual?: string; onNavegar: (ruta: string) => void }) {
  const configuracion = configuracionesAbastecimiento[recurso]
  return (
    <nav className={styles.breadcrumb} aria-label="Migas de pan">
      <button type="button" onClick={() => onNavegar('/')}>Dashboard</button>
      <span aria-hidden="true">/</span>
      {actual ? <button type="button" onClick={() => onNavegar(configuracion.ruta)}>{configuracion.plural}</button> : <strong>{configuracion.plural}</strong>}
      {actual && <><span aria-hidden="true">/</span><strong>{actual}</strong></>}
    </nav>
  )
}
