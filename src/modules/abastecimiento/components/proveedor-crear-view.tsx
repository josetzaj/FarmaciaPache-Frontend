import { ProveedorFormulario } from './proveedor-formulario'

export function ProveedorCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  return <ProveedorFormulario onNavegar={onNavegar} onCambiosPendientes={onCambiosPendientes} />
}
