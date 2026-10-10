import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarRecetasReporte, exportarRecetasReporte } from '../reportes-api'
import { formatearCantidad, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosPeriodoReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }
const etiquetaResultado = { VALIDA: 'Válidas', RECHAZADA: 'Rechazadas', PENDIENTE: 'Pendientes' } as const

export function ReporteRecetas({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosPeriodoReporte>(() => periodoInicial(), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarRecetasReporte, 'No fue posible cargar el reporte de recetas.')
  const { reporte, cargando, error } = estado

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarRecetasReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar el reporte de recetas.')) }
  }
  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      labels: reporte?.items.map((item) => etiquetaResultado[item.resultado]) ?? [],
      colors: [colores.exito, colores.peligro, colores.advertencia],
      legend: { position: 'bottom', labels: { colors: colores.texto } },
      tooltip: { y: { formatter: (valor) => `${formatearCantidad(Number(valor ?? 0))} recetas` } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-recetas-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-recetas-reporte">Recetas y dispensación</h2><p>Resultado de validaciones y unidades dispensadas que requirieron receta.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="recetas-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.resumen.totalRecetas === 0)} onReintentar={estado.reintentar} />
      {reporte && reporte.resumen.totalRecetas > 0 && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Total recetas</span><strong>{formatearCantidad(reporte.resumen.totalRecetas)}</strong><small>Registradas en el período</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorExito}`}><span>Válidas</span><strong>{formatearCantidad(reporte.resumen.recetasValidas)}</strong><small>Validación aprobada</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorPeligro}`}><span>Rechazadas</span><strong>{formatearCantidad(reporte.resumen.recetasRechazadas)}</strong><small>{formatearCantidad(reporte.resumen.recetasPendientes)} pendientes</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Unidades dispensadas</span><strong>{formatearCantidad(reporte.resumen.unidadesDispensadasConReceta)}</strong><small>{formatearCantidad(reporte.resumen.ventasConReceta)} ventas con receta</small></article>
        </div>
        <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Resultados de validación</h3><p>Distribución de recetas por resultado registrado.</p></div></div><GraficaReporte tipo="donut" opciones={opcionesGrafica} series={reporte.items.map((item) => item.cantidad)} descripcion="Gráfica de resultados de validación de recetas" /></article>
        <div className={styles.tablaContenedor}><table><caption>Resultados de recetas</caption><thead><tr><th>Resultado</th><th className={styles.numero}>Cantidad</th><th className={styles.numero}>Participación</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.resultado}><th scope="row">{etiquetaResultado[item.resultado]}</th><td className={styles.numero}>{formatearCantidad(item.cantidad)}</td><td className={styles.numero}>{item.porcentaje.toFixed(2)}%</td></tr>)}</tbody></table></div>
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
