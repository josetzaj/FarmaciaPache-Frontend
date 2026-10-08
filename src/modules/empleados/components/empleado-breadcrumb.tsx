import styles from './empleado-breadcrumb.module.css'

type EmpleadoBreadcrumbProps = {
  actual: string
  onNavegar: (ruta: string) => void
}

export function EmpleadoBreadcrumb({ actual, onNavegar }: EmpleadoBreadcrumbProps) {
  const esListado = actual === 'Empleados'

  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <ol>
        <li><button type="button" onClick={() => onNavegar('/')}>Dashboard</button></li>
        <li aria-hidden="true">/</li>
        <li>
          {esListado
            ? <span aria-current="page">Empleados</span>
            : <button type="button" onClick={() => onNavegar('/empleados')}>Empleados</button>}
        </li>
        {!esListado && (
          <>
            <li aria-hidden="true">/</li>
            <li><span aria-current="page">{actual}</span></li>
          </>
        )}
      </ol>
    </nav>
  )
}
