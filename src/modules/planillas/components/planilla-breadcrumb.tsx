import styles from './planilla.module.css'

type PlanillaBreadcrumbProps = {
  actual?: string
  onNavegar: (ruta: string) => void
}

export function PlanillaBreadcrumb({ actual, onNavegar }: PlanillaBreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <button type="button" onClick={() => onNavegar('/')}>Dashboard</button>
      <span aria-hidden="true">/</span>
      {actual ? <button type="button" onClick={() => onNavegar('/planillas')}>Planillas</button> : <span aria-current="page">Planillas</span>}
      {actual && <><span aria-hidden="true">/</span><span aria-current="page">{actual}</span></>}
    </nav>
  )
}

