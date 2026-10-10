import { RutaNavegacion } from '../../../shared/components/ruta-navegacion'

type Props = {
  seccion: 'Caja Chica' | 'Liquidaciones'
  actual?: string
  onNavegar: (ruta: string) => void
}

export function CajaChicaBreadcrumb({ seccion, actual, onNavegar }: Props) {
  const ruta = seccion === 'Caja Chica' ? '/caja/chica' : '/caja/liquidaciones'
  return <RutaNavegacion elementos={[
    { etiqueta: 'Dashboard', ruta: '/' },
    { etiqueta: 'Caja y efectivo' },
    { etiqueta: seccion, ruta: actual ? ruta : undefined },
    ...(actual ? [{ etiqueta: actual }] : []),
  ]} onNavegar={onNavegar} />
}
