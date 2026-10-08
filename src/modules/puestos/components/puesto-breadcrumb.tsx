import styles from '../../roles/components/rol-breadcrumb.module.css'

type Props = { actual?: string; onNavegar: (ruta: string) => void }

export function PuestoBreadcrumb({ actual, onNavegar }: Props) {
  return <nav className={styles.breadcrumb} aria-label="Ruta de navegación"><ol>
    <li><button type="button" onClick={() => onNavegar('/')}>Dashboard</button></li><li aria-hidden="true">/</li>
    <li><button type="button" onClick={() => onNavegar('/organizacion/puestos')}>Organización</button></li><li aria-hidden="true">/</li>
    <li>{actual ? <button type="button" onClick={() => onNavegar('/organizacion/puestos')}>Puestos</button> : <span aria-current="page">Puestos</span>}</li>
    {actual && <><li aria-hidden="true">/</li><li><span aria-current="page">{actual}</span></li></>}
  </ol></nav>
}
