import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarClientesReporte, exportarClientesReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, formatearFechaHora, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosLimiteReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteClientes({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosLimiteReporte>(() => ({ ...periodoInicial(), limite: 10 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarClientesReporte, 'No fue posible cargar el reporte de clientes.')
  const { reporte, cargando, error } = estado

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined })
  }

  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarClientesReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar el reporte de clientes.')) }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario],
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      xaxis: { categories: reporte?.items.map((item) => item.cliente.nombre) ?? [], labels: { formatter: (valor) => formatearDinero(Number(valor)) } },
      tooltip: { y: { formatter: (valor) => formatearDinero(Number(valor ?? 0)) } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-clientes-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-clientes-reporte">Clientes</h2><p>Actividad, recurrencia y compras identificadas durante el período.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="clientes-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <label className={styles.campo}><span>Resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 clientes</option><option value="10">10 clientes</option><option value="20">20 clientes</option><option value="50">50 clientes</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={estado.reintentar} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Clientes registrados</span><strong>{formatearCantidad(reporte.resumen.clientesRegistrados)}</strong><small>{formatearCantidad(reporte.resumen.clientesNuevos)} nuevos en el período</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Con compra</span><strong>{formatearCantidad(reporte.resumen.clientesConCompra)}</strong><small>Compras identificadas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorExito}`}><span>Recurrentes</span><strong>{formatearCantidad(reporte.resumen.clientesRecurrentes)}</strong><small>Dos o más compras</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Total identificado</span><strong>{formatearDinero(reporte.resumen.totalComprado)}</strong><small>{formatearCantidad(reporte.resumen.clientesSinCompraPeriodo)} sin compra en el período</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Clientes con mayor compra</h3><p>Monto confirmado por cliente identificado.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Total comprado', data: reporte.items.map((item) => item.totalComprado) }]} altura={Math.max(320, reporte.items.length * 40)} descripcion="Gráfica de compras acumuladas por cliente" /></article>
          <div className={styles.tablaContenedor}><table><caption>Clientes con actividad comercial</caption><thead><tr><th>Cliente</th><th className={styles.numero}>Compras</th><th className={styles.numero}>Total</th><th className={styles.numero}>Ticket promedio</th><th>Última compra</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.cliente.id}><th scope="row">{item.cliente.nombre}</th><td className={styles.numero}>{formatearCantidad(item.compras)}</td><td className={styles.numero}>{formatearDinero(item.totalComprado)}</td><td className={styles.numero}>{formatearDinero(item.ticketPromedio)}</td><td>{formatearFechaHora(item.ultimaCompra)}</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
