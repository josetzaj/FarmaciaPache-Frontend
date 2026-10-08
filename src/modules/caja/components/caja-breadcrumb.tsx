import { RutaNavegacion } from '../../../shared/components/ruta-navegacion'

type Props = {
  seccion: 'Turnos de caja' | 'Movimientos' | 'Arqueos' | 'Cierres' | 'Custodia y transferencias' | 'Depósitos bancarios' | 'Rendiciones' | 'Conciliaciones' | 'Consolidaciones' | 'Incidencias' | 'Configuración' | 'Denominaciones'
  actual?: string
  onNavegar: (ruta: string) => void
}

export function CajaBreadcrumb({ seccion, actual, onNavegar }: Props) {
  const rutas = { 'Turnos de caja': '/caja/turnos', Movimientos: '/caja/movimientos', Arqueos: '/caja/arqueos', Cierres: '/caja/cierres', 'Custodia y transferencias': '/caja/transferencias', 'Depósitos bancarios': '/caja/depositos', Rendiciones: '/caja/rendiciones', Conciliaciones: '/caja/conciliaciones', Consolidaciones: '/caja/consolidaciones', Incidencias: '/caja/incidencias', Configuración: '/caja/configuracion', Denominaciones: '/caja/denominaciones' } as const
  const rutaListado = rutas[seccion]
  return (
    <RutaNavegacion
      elementos={[
        { etiqueta: 'Dashboard', ruta: '/' },
        { etiqueta: 'Caja y efectivo' },
        { etiqueta: seccion, ruta: actual ? rutaListado : undefined },
        ...(actual ? [{ etiqueta: actual }] : []),
      ]}
      onNavegar={onNavegar}
    />
  )
}
