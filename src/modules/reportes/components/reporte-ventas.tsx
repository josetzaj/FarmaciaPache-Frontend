import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarVentasReporte, exportarVentasReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosVentasReporte, OpcionesReportes, VentasReporte } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteVentas({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosVentasReporte>(() => ({ ...periodoInicial(), agrupacion: 'DIA' }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const [reporte, setReporte] = useState<VentasReporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultarVentasReporte(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => { if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, 'No fue posible cargar las ventas por período.')) })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [filtros, revision])

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { setError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    setCargando(true)
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }

  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarVentasReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar las ventas por período.')) }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario, colores.acento],
      chart: { ...opcionesBaseGrafica(colores).chart, stacked: false },
      stroke: { curve: 'smooth', width: [3, 2] },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 90, 100] } },
      xaxis: { categories: reporte?.puntos.map((item) => item.periodo) ?? [], labels: { rotate: -35, trim: true } },
      yaxis: [{ labels: { formatter: (valor) => formatearDinero(valor) } }, { opposite: true, labels: { formatter: (valor) => formatearCantidad(valor) } }],
      tooltip: { shared: true, intersect: false, y: { formatter: (valor, contexto) => contexto?.seriesIndex === 0 ? formatearDinero(Number(valor ?? 0)) : formatearCantidad(Number(valor ?? 0)) } },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: colores.texto } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-ventas-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-ventas-reporte">Ventas por período</h2><p>Comportamiento de ingresos y unidades vendidas en el tiempo.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="ventas-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <label className={styles.campo}><span>Agrupar por</span><select value={borrador.agrupacion} onChange={(evento) => setBorrador((actual) => ({ ...actual, agrupacion: evento.target.value as FiltrosVentasReporte['agrupacion'] }))}><option value="DIA">Día</option><option value="SEMANA">Semana</option><option value="MES">Mes</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.puntos.length === 0)} onReintentar={() => { setCargando(true); setRevision((valor) => valor + 1) }} />
      {reporte && reporte.puntos.length > 0 && !error && <>
        <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Tendencia de ventas</h3><p>Ventas netas y unidades por {reporte.agrupacion === 'DIA' ? 'día' : reporte.agrupacion === 'SEMANA' ? 'semana' : 'mes'}.</p></div></div><GraficaReporte tipo="area" opciones={opcionesGrafica} series={[{ name: 'Ventas netas', data: reporte.puntos.map((item) => item.totalVentas) }, { name: 'Unidades', data: reporte.puntos.map((item) => item.unidadesVendidas) }]} descripcion="Gráfica de tendencia de ventas netas y unidades vendidas" /></article>
        <div className={styles.tablaContenedor}><table><caption>Detalle de ventas por período</caption><thead><tr><th>Período</th><th className={styles.numero}>Ventas</th><th className={styles.numero}>Total</th><th className={styles.numero}>Ticket promedio</th><th className={styles.numero}>Unidades</th><th className={styles.numero}>Anulaciones</th></tr></thead><tbody>{reporte.puntos.map((item) => <tr key={item.periodo}><th scope="row">{item.periodo}</th><td className={styles.numero}>{formatearCantidad(item.cantidadVentas)}</td><td className={styles.numero}>{formatearDinero(item.totalVentas)}</td><td className={styles.numero}>{formatearDinero(item.ticketPromedio)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesVendidas)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadAnulaciones)}</td></tr>)}</tbody></table></div>
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
