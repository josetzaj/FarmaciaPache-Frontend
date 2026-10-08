import styles from '../../roles/components/rol-breadcrumb.module.css'

type EstadoCatalogoBreadcrumbProps = { actual?: string; onNavegar: (ruta: string) => void }

export function EstadoCatalogoBreadcrumb({ actual, onNavegar }: EstadoCatalogoBreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <ol>
        <li><button type="button" onClick={() => onNavegar('/')}>Dashboard</button></li>
        <li aria-hidden="true">/</li>
        <li>{actual
          ? <button type="button" onClick={() => onNavegar('/catalogos/estados')}>Estados</button>
          : <span aria-current="page">Estados</span>}</li>
        {actual && <><li aria-hidden="true">/</li><li><span aria-current="page">{actual}</span></li></>}
      </ol>
    </nav>
  )
}
