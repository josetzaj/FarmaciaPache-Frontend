import { ProductoFormularioView } from './producto-formulario-view'
export function ProductoCrearView(props: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) { return <ProductoFormularioView {...props} /> }
