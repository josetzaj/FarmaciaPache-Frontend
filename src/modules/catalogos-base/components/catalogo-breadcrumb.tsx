import type { ConfiguracionCatalogo } from '../catalogo-maestro.types'
import { RutaNavegacion, type ElementoRutaNavegacion } from '../../../shared/components/ruta-navegacion'

export function CatalogoBreadcrumb({ config, actual, onNavegar }: { config: ConfiguracionCatalogo; actual?: string; onNavegar: (ruta: string) => void }) {
  const elementos: ElementoRutaNavegacion[] = [
    { etiqueta: 'Dashboard', ruta: '/' },
    { etiqueta: config.plural, ruta: actual ? config.ruta : undefined },
  ]

  if (actual) elementos.push({ etiqueta: actual })

  return <RutaNavegacion elementos={elementos} onNavegar={onNavegar} />
}
