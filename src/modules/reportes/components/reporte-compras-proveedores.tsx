import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarComprasProveedoresReporte, exportarComprasProveedoresReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosLimiteReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteComprasProveedores({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosLimiteReporte>(() => ({ ...periodoInicial(), limite: 10 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarComprasProveedoresReporte, 'No fue posible cargar las compras y proveedores.')
  const { reporte, cargando, error } = estado
  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarComprasProveedoresReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar las compras y proveedores.')) }
  }
  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario],
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      xaxis: { categories: reporte?.items.map((item) => item.proveedor.nombre) ?? [], labels: { formatter: (valor) => formatearDinero(Number(valor)) } },
      tooltip: { y: { formatter: (valor) => formatearDinero(Number(valor ?? 0)) } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-proveedores-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-proveedores-reporte">Compras y proveedores</h2><p>Órdenes emitidas, monto contratado y cumplimiento de recepción.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="proveedores-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <label className={styles.campo}><span>Resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 proveedores</option><option value="10">10 proveedores</option><option value="20">20 proveedores</option><option value="50">50 proveedores</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={estado.reintentar} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Proveedores</span><strong>{formatearCantidad(reporte.resumen.proveedores)}</strong><small>Con órdenes en el período</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Órdenes</span><strong>{formatearCantidad(reporte.resumen.ordenes)}</strong><small>{formatearCantidad(reporte.resumen.ordenesCanceladas)} canceladas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorExito}`}><span>Total contratado</span><strong>{formatearDinero(reporte.resumen.totalGtq)}</strong><small>Órdenes no canceladas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Cumplimiento</span><strong>{reporte.resumen.cumplimientoPorcentaje.toFixed(2)}%</strong><small>Unidades recibidas sobre ordenadas</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Compras por proveedor</h3><p>Monto de órdenes no canceladas en quetzales.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Total contratado', data: reporte.items.map((item) => item.totalGtq) }]} altura={Math.max(320, reporte.items.length * 42)} descripcion="Gráfica del total comprado por proveedor" /></article>
          <div className={styles.tablaContenedor}><table><caption>Compras y cumplimiento de proveedores</caption><thead><tr><th>Proveedor</th><th className={styles.numero}>Órdenes</th><th className={styles.numero}>Canceladas</th><th className={styles.numero}>Total</th><th className={styles.numero}>Ordenado</th><th className={styles.numero}>Recibido</th><th className={styles.numero}>Cumplimiento</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.proveedor.id}><th scope="row"><span className={styles.identidadTabla}><strong>{item.proveedor.nombre}</strong><small>{item.proveedor.codigo}</small></span></th><td className={styles.numero}>{formatearCantidad(item.ordenes)}</td><td className={styles.numero}>{formatearCantidad(item.ordenesCanceladas)}</td><td className={styles.numero}>{formatearDinero(item.totalGtq)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesOrdenadas)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesRecibidas)}</td><td className={styles.numero}>{item.cumplimientoPorcentaje.toFixed(2)}%</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
