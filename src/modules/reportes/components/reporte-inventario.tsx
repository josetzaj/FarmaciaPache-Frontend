import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarInventarioReporte, exportarInventarioReporte } from '../reportes-api'
import { formatearCantidad, formatearFechaHora, mensajeErrorReporte } from '../reportes-formatos'
import type { FiltrosInventarioReporte, InventarioReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoCatalogo, CampoSucursal, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteInventario({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosInventarioReporte>(() => ({ limite: 20 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const [reporte, setReporte] = useState<InventarioReporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultarInventarioReporte(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => { if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, 'No fue posible cargar el inventario crítico.')) })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [filtros, revision])

  const aplicar = () => {
    setCargando(true)
    setFiltros({
      ...borrador,
      sucursalId: borrador.sucursalId || undefined,
      productoId: borrador.productoId || undefined,
      laboratorioId: borrador.laboratorioId || undefined,
      categoriaId: borrador.categoriaId || undefined,
    })
  }

  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarInventarioReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar el inventario crítico.')) }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.primario, colores.peligro, colores.advertencia],
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '70%' } },
      xaxis: { categories: reporte?.items.map((item) => item.producto.nombre) ?? [], labels: { formatter: (valor) => formatearCantidad(Number(valor)) } },
      yaxis: { labels: { maxWidth: 180 } },
      tooltip: { shared: true, intersect: false, y: { formatter: (valor) => formatearCantidad(Number(valor ?? 0)) } },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: colores.texto } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-inventario-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-inventario-reporte">Inventario crítico y vencimientos</h2><p>Productos agotados, bajo mínimo y con vencimiento cercano, sin revelar ubicaciones físicas.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CampoSucursal id="inventario-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <CampoCatalogo id="inventario-reporte-producto" etiqueta="Producto" opciones={opciones.productos} valor={borrador.productoId ?? ''} placeholder="Todos los productos" onChange={(productoId) => setBorrador((actual) => ({ ...actual, productoId }))} />
        <CampoCatalogo id="inventario-reporte-laboratorio" etiqueta="Laboratorio" opciones={opciones.laboratorios} valor={borrador.laboratorioId ?? ''} placeholder="Todos los laboratorios" onChange={(laboratorioId) => setBorrador((actual) => ({ ...actual, laboratorioId }))} />
        <CampoCatalogo id="inventario-reporte-categoria" etiqueta="Categoría terapéutica" opciones={opciones.categorias} valor={borrador.categoriaId ?? ''} placeholder="Todas las categorías" onChange={(categoriaId) => setBorrador((actual) => ({ ...actual, categoriaId }))} />
        <label className={styles.campo}><span>Cantidad de resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 productos</option><option value="10">10 productos</option><option value="20">20 productos</option><option value="50">50 productos</option><option value="100">100 productos</option><option value="200">200 productos</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={() => { setCargando(true); setRevision((valor) => valor + 1) }} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Productos evaluados</span><strong>{formatearCantidad(reporte.resumen.productosEvaluados)}</strong><small>Fotografía al {formatearFechaHora(reporte.fotografiaAl)}</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Bajo mínimo</span><strong>{formatearCantidad(reporte.resumen.productosBajoMinimo)}</strong><small>Requieren revisión de abastecimiento</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorPeligro}`}><span>Agotados</span><strong>{formatearCantidad(reporte.resumen.productosAgotados)}</strong><small>Sin disponibilidad vigente</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Vencen en 90 días</span><strong>{formatearCantidad(reporte.resumen.productosConVencimiento90Dias)}</strong><small>{formatearCantidad(reporte.resumen.cantidadVence90Dias)} unidades</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Condición de productos críticos</h3><p>Disponibilidad, faltante estimado y unidades próximas a vencer.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Disponible', data: reporte.items.map((item) => item.cantidadDisponible) }, { name: 'Faltante', data: reporte.items.map((item) => item.faltanteEstimado) }, { name: 'Vence en 90 días', data: reporte.items.map((item) => item.cantidadVence30Dias + item.cantidadVence31a60Dias + item.cantidadVence61a90Dias) }]} altura={Math.max(340, reporte.items.length * 44)} descripcion="Gráfica de disponibilidad, faltantes y vencimientos por producto" /></article>
          <div className={styles.tablaContenedor}><table><caption>Detalle de inventario crítico y vencimientos</caption><thead><tr><th>Producto</th><th>Sucursal</th><th>Condición</th><th className={styles.numero}>Disponible</th><th className={styles.numero}>Mínimo</th><th className={styles.numero}>Faltante</th><th className={styles.numero}>Vencida</th><th className={styles.numero}>0–30 días</th><th className={styles.numero}>31–60 días</th><th className={styles.numero}>61–90 días</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={`${item.sucursal.id}-${item.producto.id}`}><th scope="row"><span className={styles.identidadTabla}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo} · {item.laboratorio.nombre}</small></span></th><td>{item.sucursal.nombre}</td><td><span className={`${styles.estadoInventario} ${item.agotado ? styles.estadoPeligro : item.bajoMinimo ? styles.estadoAdvertencia : styles.estadoInformativo}`}>{item.agotado ? 'Agotado' : item.bajoMinimo ? 'Bajo mínimo' : 'Vencimiento'}</span></td><td className={styles.numero}>{formatearCantidad(item.cantidadDisponible)}</td><td className={styles.numero}>{item.stockMinimoReferencia === null ? 'Sin política' : formatearCantidad(item.stockMinimoReferencia)}</td><td className={styles.numero}>{formatearCantidad(item.faltanteEstimado)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadVencida)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadVence30Dias)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadVence31a60Dias)}</td><td className={styles.numero}>{formatearCantidad(item.cantidadVence61a90Dias)}</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
