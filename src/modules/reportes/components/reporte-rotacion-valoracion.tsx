import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarRotacionValoracionReporte, exportarRotacionValoracionReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosProductosInventarioReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoCatalogo, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteRotacionValoracion({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosProductosInventarioReporte>(() => ({ ...periodoInicial(), limite: 20 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarRotacionValoracionReporte, 'No fue posible cargar la rotación y valoración.')
  const { reporte, cargando, error } = estado

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined, productoId: borrador.productoId || undefined, laboratorioId: borrador.laboratorioId || undefined, categoriaId: borrador.categoriaId || undefined })
  }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarRotacionValoracionReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar la rotación y valoración.')) }
  }
  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.acento],
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      xaxis: { categories: reporte?.items.map((item) => item.producto.nombre) ?? [], labels: { formatter: (valor) => formatearCantidad(Number(valor)) } },
      tooltip: { y: { formatter: (valor) => `${formatearCantidad(Number(valor ?? 0))} veces` } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-rotacion-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-rotacion-reporte">Rotación y valoración</h2><p>Movimiento del inventario y valor estimado a costo ponderado confirmado.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="rotacion-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <CampoCatalogo id="rotacion-reporte-producto" etiqueta="Producto" opciones={opciones.productos} valor={borrador.productoId ?? ''} placeholder="Todos los productos" onChange={(productoId) => setBorrador((actual) => ({ ...actual, productoId }))} />
        <CampoCatalogo id="rotacion-reporte-laboratorio" etiqueta="Laboratorio" opciones={opciones.laboratorios} valor={borrador.laboratorioId ?? ''} placeholder="Todos los laboratorios" onChange={(laboratorioId) => setBorrador((actual) => ({ ...actual, laboratorioId }))} />
        <CampoCatalogo id="rotacion-reporte-categoria" etiqueta="Categoría terapéutica" opciones={opciones.categorias} valor={borrador.categoriaId ?? ''} placeholder="Todas las categorías" onChange={(categoriaId) => setBorrador((actual) => ({ ...actual, categoriaId }))} />
        <label className={styles.campo}><span>Resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 productos</option><option value="10">10 productos</option><option value="20">20 productos</option><option value="50">50 productos</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={estado.reintentar} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Productos evaluados</span><strong>{formatearCantidad(reporte.resumen.productosEvaluados)}</strong><small>Con existencia o venta</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Unidades actuales</span><strong>{formatearCantidad(reporte.resumen.unidadesActuales)}</strong><small>Existencia física consolidada</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorExito}`}><span>Valor del inventario</span><strong>{formatearDinero(reporte.resumen.valorInventario)}</strong><small>Costo ponderado disponible</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Sin costo completo</span><strong>{formatearCantidad(reporte.resumen.productosSinCosto)}</strong><small>Requieren regularización</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Índice de rotación</h3><p>Unidades vendidas respecto de la existencia promedio estimada.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Rotación', data: reporte.items.map((item) => item.indiceRotacion) }]} altura={Math.max(340, reporte.items.length * 42)} descripcion="Gráfica del índice de rotación por producto" /></article>
          <div className={styles.tablaContenedor}><table><caption>Rotación y valoración por producto</caption><thead><tr><th>Producto</th><th className={styles.numero}>Inicial estimada</th><th className={styles.numero}>Actual</th><th className={styles.numero}>Vendidas</th><th className={styles.numero}>Rotación</th><th className={styles.numero}>Costo promedio</th><th className={styles.numero}>Valor</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.producto.id}><th scope="row"><span className={styles.identidadTabla}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo} · {item.laboratorio.nombre}</small></span></th><td className={styles.numero}>{formatearCantidad(item.existenciaInicialEstimada)}</td><td className={styles.numero}>{formatearCantidad(item.existenciaActual)}</td><td className={styles.numero}>{formatearCantidad(item.unidadesVendidas)}</td><td className={styles.numero}>{item.indiceRotacion.toFixed(2)}</td><td className={styles.numero}>{item.costoPromedio === null ? 'Sin costo' : formatearDinero(item.costoPromedio)}</td><td className={styles.numero}>{item.valorInventario === null ? 'Sin costo' : formatearDinero(item.valorInventario)}</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
