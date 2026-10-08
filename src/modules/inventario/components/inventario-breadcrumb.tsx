import { RutaNavegacion } from '../../../shared/components/ruta-navegacion'

export function InventarioBreadcrumb({
  actual,
  anterior,
  onNavegar,
}: {
  actual: string
  anterior?: { etiqueta: string; ruta: string }
  onNavegar: (ruta: string) => void
}) {
  return (
    <RutaNavegacion
      elementos={[
        { etiqueta: 'Dashboard', ruta: '/' },
        { etiqueta: 'Inventario', ruta: '/inventario/existencias' },
        ...(anterior ? [anterior] : []),
        { etiqueta: actual },
      ]}
      onNavegar={onNavegar}
    />
  )
}
