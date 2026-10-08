import { ProductoFormularioView } from './producto-formulario-view'
export function ProductoEditarView(props: { productoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) { return <ProductoFormularioView {...props} /> }
