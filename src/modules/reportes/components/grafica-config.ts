import type { ApexOptions } from 'apexcharts'

export type ColoresGrafica = {
  primario: string
  secundario: string
  acento: string
  exito: string
  advertencia: string
  peligro: string
  texto: string
  textoMuted: string
  borde: string
  superficie: string
}

export function obtenerColoresGrafica(): ColoresGrafica {
  const estilos = getComputedStyle(document.documentElement)
  const color = (nombre: string) => estilos.getPropertyValue(nombre).trim()
  return {
    primario: color('--color-primary'),
    secundario: color('--color-secondary'),
    acento: color('--color-accent'),
    exito: color('--color-success'),
    advertencia: color('--color-warning'),
    peligro: color('--color-danger'),
    texto: color('--color-text'),
    textoMuted: color('--color-text-muted'),
    borde: color('--color-border'),
    superficie: color('--color-surface'),
  }
}

export function opcionesBaseGrafica(colores: ColoresGrafica): ApexOptions {
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    chart: {
      background: 'transparent',
      fontFamily: 'Inter, system-ui, sans-serif',
      foreColor: colores.textoMuted,
      toolbar: { show: false },
      animations: { enabled: !reducirMovimiento, speed: 420 },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: colores.borde, strokeDashArray: 4 },
    legend: { fontSize: '13px', labels: { colors: colores.texto } },
    tooltip: { theme: 'light' },
    noData: { text: 'No hay datos disponibles para graficar.' },
  }
}
