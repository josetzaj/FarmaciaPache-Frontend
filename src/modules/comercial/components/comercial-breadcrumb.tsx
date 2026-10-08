import styles from './comercial.module.css'

type ComercialBreadcrumbProps = {
  seccion: 'Clientes' | 'Políticas de margen' | 'Precios' | 'Ventas' | 'Validación de recetas'
  rutaListado: string
  actual?: string
  onNavegar: (ruta: string) => void
}

export function ComercialBreadcrumb({ seccion, rutaListado, actual, onNavegar }: ComercialBreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
      <ol>
        <li><button type="button" onClick={() => onNavegar('/')}>Dashboard</button></li>
        <li aria-hidden="true">/</li>
        <li>{actual ? <button type="button" onClick={() => onNavegar(rutaListado)}>{seccion}</button> : <span aria-current="page">{seccion}</span>}</li>
        {actual && <><li aria-hidden="true">/</li><li><span aria-current="page">{actual}</span></li></>}
      </ol>
    </nav>
  )
}
