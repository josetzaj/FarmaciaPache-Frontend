import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarTrasladosReporte, exportarTrasladosReporte } from '../reportes-api'
import { formatearCantidad, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosLimiteReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteTraslados({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosLimiteReporte>(() => ({ ...periodoInicial(), limite: 10 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarTrasladosReporte, 'No fue posible cargar el reporte de traslados.')
  const { reporte, cargando, error } = estado
  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarTrasladosReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar el reporte de traslados.')) }
  }
  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario, colores.peligro],
      chart: { ...opcionesBaseGrafica(colores).chart, stacked: false },
      plotOptions: { bar: { horizontal: false, borderRadius: 4 } },
      xaxis: { categories: reporte?.items.map((item) => `${item.sucursalOrigen.codigo} → ${item.sucursalDestino.codigo}`) ?? [] },
      tooltip: { shared: true, intersect: false, y: { formatter: (valor) => formatearCantidad(Number(valor ?? 0)) } },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: colores.texto } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-traslados-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-traslados-reporte">Traslados</h2><p>Resultados por ruta, cantidades despachadas, recibidas y rechazadas.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="traslados-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <label className={styles.campo}><span>Resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 rutas</option><option value="10">10 rutas</option><option value="20">20 rutas</option><option value="50">50 rutas</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={estado.reintentar} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Traslados</span><strong>{formatearCantidad(reporte.resumen.traslados)}</strong><small>{formatearCantidad(reporte.resumen.cerrados)} cerrados</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>En curso</span><strong>{formatearCantidad(reporte.resumen.enCurso)}</strong><small>Sin estado final</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorExito}`}><span>Unidades recibidas</span><strong>{formatearCantidad(reporte.resumen.unidadesRecibidas)}</strong><small>{formatearCantidad(reporte.resumen.unidadesDespachadas)} despachadas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorPeligro}`}><span>Unidades rechazadas</span><strong>{formatearCantidad(reporte.resumen.unidadesRechazadas)}</strong><small>Diferencias de recepción</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Recepción por ruta</h3><p>Comparación entre unidades recibidas y rechazadas.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Recibidas', data: reporte.items.map((item) => item.unidadesRecibidas) }, { name: 'Rechazadas', data: reporte.items.map((item) => item.unidadesRechazadas) }]} descripcion="Gráfica de unidades recibidas y rechazadas por ruta de traslado" /></article>
          <div className={styles.tablaContenedor}><table><caption>Resultados de traslados por ruta</caption><thead><tr><th>Origen</th><th>Destino</th><th className={styles.numero}>Traslados</th><th className={styles.numero}>Despachadas</th><th className={styles.numero}>Recibidas</th><th className={styles.numero}>Rechazadas</th><th className={styles.numero}>Cumplimiento</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={`${item.sucursalOrigen.id}-${item.sucursalDestino.id}`}><th scope="row">{item.sucursalOrigen.nombre}</th><td>{item.sucursalDestino.nombre}</td><td className={styles.numero}>{formatearCantidad(item.traslados)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesDespachadas)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesRecibidas)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesRechazadas)}</td><td className={styles.numero}>{item.cumplimientoPorcentaje.toFixed(2)}%</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
