import styles from './activos.module.css'

type SeccionActivos = 'Activos' | 'Asignaciones' | 'Devoluciones' | 'Mis activos' | 'Mis devoluciones' | 'Tipos de activo'

export function ActivosBreadcrumb({ seccion, actual, onNavegar }: { seccion?: SeccionActivos; actual?: string; onNavegar: (ruta: string) => void }) {
  const rutas: Record<SeccionActivos, string> = { Activos: '/activos', Asignaciones: '/activos/asignaciones', Devoluciones: '/activos/devoluciones', 'Mis activos': '/activos/mis-asignaciones', 'Mis devoluciones': '/activos/mis-devoluciones', 'Tipos de activo': '/activos/tipos' }
  const ruta = rutas[seccion ?? 'Activos']
  return <nav className={styles.breadcrumb} aria-label="Migas de pan"><button type="button" onClick={() => onNavegar('/')}>Dashboard</button><span aria-hidden="true">/</span>{actual ? <button type="button" onClick={() => onNavegar(ruta)}>{seccion ?? 'Activos'}</button> : <strong>{seccion ?? 'Activos'}</strong>}{actual && <><span aria-hidden="true">/</span><strong>{actual}</strong></>}</nav>
}
