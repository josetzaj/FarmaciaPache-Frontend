import styles from './rol-breadcrumb.module.css'

type RolBreadcrumbProps = {
  actual?: string
  onNavegar: (ruta: string) => void
}

export function RolBreadcrumb({ actual, onNavegar }: RolBreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <ol>
        <li><button type="button" onClick={() => onNavegar('/')}>Dashboard</button></li>
        <li aria-hidden="true">/</li>
        {actual ? (
          <>
            <li><button type="button" onClick={() => onNavegar('/seguridad/roles')}>Roles y permisos</button></li>
            <li aria-hidden="true">/</li>
            <li><span aria-current="page">{actual}</span></li>
          </>
        ) : <li><span aria-current="page">Roles y permisos</span></li>}
      </ol>
    </nav>
  )
}
