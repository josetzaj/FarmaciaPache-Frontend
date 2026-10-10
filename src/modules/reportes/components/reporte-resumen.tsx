import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarResumenReporte, exportarResumenReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosPeriodoReporte, OpcionesReportes, ResumenReporte } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'

type Props = {
  opciones: OpcionesReportes
  puedeExportar: boolean
  onErrorExportacion: (mensaje: string) => void
}

export function ReporteResumen({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo(() => periodoInicial(), [])
  const [borrador, setBorrador] = useState<FiltrosPeriodoReporte>(inicial)
  const [filtros, setFiltros] = useState<FiltrosPeriodoReporte>(inicial)
  const [reporte, setReporte] = useState<ResumenReporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultarResumenReporte(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, 'No fue posible cargar el resumen administrativo.'))
      })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [filtros, revision])

  const aplicarFiltros = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) {
      setError('La fecha inicial no puede ser posterior a la fecha final.')
      return
    }
    setCargando(true)
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }

  const exportar = async (formato: FormatoExportacion) => {
    try {
      await exportarResumenReporte(formato, filtros)
    } catch (actual) {
      onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar el resumen administrativo.'))
    }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario, colores.peligro],
      labels: ['Ventas confirmadas', 'Anulaciones'],
      stroke: { width: 3, colors: [colores.superficie] },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Operaciones' } } } } },
      tooltip: { y: { formatter: (valor) => formatearCantidad(Number(valor ?? 0)) } },
      legend: { position: 'bottom', fontSize: '13px', labels: { colors: colores.texto } },
    }
  }, [])

  const totalOperaciones = (reporte?.cantidadVentas ?? 0) + (reporte?.cantidadAnulaciones ?? 0)

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-resumen-reporte">
      <div className={styles.cabeceraReporte}>
        <div><h2 id="titulo-resumen-reporte">Resumen administrativo</h2><p>Indicadores principales de ventas y anulaciones para el período seleccionado.</p></div>
        {reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}
      </div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicarFiltros} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="resumen-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={false} onReintentar={() => { setCargando(true); setRevision((valor) => valor + 1) }} />
      {reporte && !error && (
        <>
          <div className={styles.tarjetasIndicadores}>
            <article className={`${styles.tarjetaIndicador} ${styles.indicadorPrincipal}`}><span>Ventas netas</span><strong>{formatearDinero(reporte.totalVentas)}</strong><small>{formatearCantidad(reporte.cantidadVentas)} ventas confirmadas</small></article>
            <article className={styles.tarjetaIndicador}><span>Ticket promedio</span><strong>{formatearDinero(reporte.ticketPromedio)}</strong><small>Promedio por venta confirmada</small></article>
            <article className={styles.tarjetaIndicador}><span>Unidades vendidas</span><strong>{formatearCantidad(reporte.unidadesVendidas)}</strong><small>Productos dispensados</small></article>
            <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Monto anulado</span><strong>{formatearDinero(reporte.montoAnulado)}</strong><small>{formatearCantidad(reporte.cantidadAnulaciones)} anulaciones</small></article>
          </div>
          <div className={styles.rejillaResumen}>
            <article className={styles.panelGrafica}>
              <div className={styles.tituloPanel}><div><h3>Distribución de operaciones</h3><p>Ventas confirmadas frente a anulaciones.</p></div></div>
              {totalOperaciones > 0
                ? <GraficaReporte tipo="donut" opciones={opcionesGrafica} series={[reporte.cantidadVentas, reporte.cantidadAnulaciones]} altura={300} descripcion="Gráfica circular de ventas confirmadas y anulaciones" />
                : <div className={styles.estadoVacioCompacto}><strong>Sin operaciones</strong><span>No hay ventas ni anulaciones en este período.</span></div>}
            </article>
            <article className={styles.panelLectura}>
              <h3>Lectura del período</h3>
              <dl>
                <div><dt>Ventas confirmadas</dt><dd>{formatearCantidad(reporte.cantidadVentas)}</dd></div>
                <div><dt>Anulaciones</dt><dd>{formatearCantidad(reporte.cantidadAnulaciones)}</dd></div>
                <div><dt>Proporción anulada</dt><dd>{totalOperaciones > 0 ? `${((reporte.cantidadAnulaciones / totalOperaciones) * 100).toFixed(1)} %` : '0 %'}</dd></div>
                <div><dt>Alcance</dt><dd>{reporte.alcance.sucursal?.nombre ?? 'Todas las sucursales'}</dd></div>
              </dl>
            </article>
          </div>
          <ActualizacionReporte generadoEn={reporte.generadoEn} />
        </>
      )}
    </section>
  )
}
