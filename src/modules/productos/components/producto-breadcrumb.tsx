import { RutaNavegacion, type ElementoRutaNavegacion } from '../../../shared/components/ruta-navegacion'

export function ProductoBreadcrumb({ actual, onNavegar }: { actual?: string; onNavegar: (ruta: string) => void }) {
  const elementos: ElementoRutaNavegacion[] = [
    { etiqueta: 'Dashboard', ruta: '/' },
    { etiqueta: 'Productos y medicamentos', ruta: actual ? '/catalogos/productos' : undefined },
  ]

  if (actual) elementos.push({ etiqueta: actual })

  return <RutaNavegacion elementos={elementos} onNavegar={onNavegar} />
}
