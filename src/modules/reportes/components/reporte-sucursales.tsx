import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarSucursalesReporte, exportarSucursalesReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { ComparacionSucursalesReporte, FiltrosPeriodoReporte } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'

type Props = { puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteSucursales({ puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosPeriodoReporte>(() => periodoInicial(), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const [reporte, setReporte] = useState<ComparacionSucursalesReporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultarSucursalesReporte(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => { if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, 'No fue posible comparar las sucursales.')) })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [filtros, revision])

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { setError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    setCargando(true)
    setFiltros({ ...borrador })
  }

  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarSucursalesReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar la comparación de sucursales.')) }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario, colores.acento, colores.secundario, colores.exito],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '56%', distributed: true } },
      xaxis: { categories: reporte?.items.map((item) => item.sucursal.nombre) ?? [], labels: { rotate: -25, trim: true } },
      yaxis: { labels: { formatter: (valor) => formatearDinero(valor) } },
      tooltip: { y: { formatter: (valor) => formatearDinero(Number(valor ?? 0)) } },
      legend: { show: false },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-sucursales-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-sucursales-reporte">Comparación de sucursales</h2><p>Desempeño corporativo de las farmacias y stands activos.</p></div><span className={styles.alcance}>Vista corporativa</span></div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={() => { setCargando(true); setRevision((valor) => valor + 1) }} />
      {reporte && reporte.items.length > 0 && !error && <>
        <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Ventas netas por sucursal</h3><p>Comparación ordenada por el total vendido.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Ventas netas', data: reporte.items.map((item) => item.totalVentas) }]} descripcion="Gráfica comparativa de ventas netas por sucursal" /></article>
        <div className={styles.tablaContenedor}><table><caption>Comparación administrativa de sucursales</caption><thead><tr><th>Sucursal</th><th className={styles.numero}>Ventas</th><th className={styles.numero}>Total</th><th className={styles.numero}>Ticket promedio</th><th className={styles.numero}>Anulaciones</th><th className={styles.numero}>Monto anulado</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.sucursal.id}><th scope="row"><span className={styles.identidadTabla}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></span></th><td className={styles.numero}>{formatearCantidad(item.cantidadVentas)}</td><td className={styles.numero}><strong>{formatearDinero(item.totalVentas)}</strong></td><td className={styles.numero}>{formatearDinero(item.ticketPromedio)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadAnulaciones)}</td><td className={styles.numero}>{formatearDinero(item.montoAnulado)}</td></tr>)}</tbody></table></div>
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
