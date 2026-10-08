import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import type { ProveedorAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import { ProveedorFormulario } from './proveedor-formulario'
import styles from './abastecimiento.module.css'

export function ProveedorEditarView({ proveedorId, onNavegar, onCambiosPendientes }: { proveedorId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [proveedor, setProveedor] = useState<ProveedorAbastecimiento | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<ProveedorAbastecimiento>('proveedores', proveedorId, controlador.signal).then((valor) => { setProveedor(valor); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el proveedor.') })
    return () => controlador.abort()
  }, [proveedorId, revision])
  if (error) return <section className={styles.pagina}><AbastecimientoBreadcrumb recurso="proveedores" actual="Editar proveedor" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!proveedor) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="proveedores" actual="Editar proveedor" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando proveedor</h1><p>Consultando la información actual…</p></div></section>
  return <ProveedorFormulario proveedor={proveedor} onNavegar={onNavegar} onCambiosPendientes={onCambiosPendientes} />
}
