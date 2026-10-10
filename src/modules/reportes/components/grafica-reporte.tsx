import { lazy, Suspense } from 'react'
import type { ApexOptions } from 'apexcharts'
import { LimiteErrorReporte } from './limite-error-reporte'
import styles from './reportes.module.css'

const ApexChart = lazy(() => import('react-apexcharts'))

type GraficaReporteProps = {
  tipo: 'area' | 'bar' | 'donut'
  opciones: ApexOptions
  series: NonNullable<ApexOptions['series']>
  altura?: number
  descripcion: string
}

export function GraficaReporte({ tipo, opciones, series, altura = 320, descripcion }: GraficaReporteProps) {
  return (
    <div className={styles.grafica} aria-label={descripcion} role="img">
      <LimiteErrorReporte mensaje="La gráfica no pudo mostrarse. Los indicadores y el detalle continúan disponibles.">
        <Suspense fallback={<p className={styles.estadoCarga} role="status">Preparando gráfica…</p>}>
          <ApexChart type={tipo} options={opciones} series={series} height={altura} width="100%" />
        </Suspense>
      </LimiteErrorReporte>
    </div>
  )
}
