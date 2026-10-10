import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarProductosReporte, exportarProductosReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosProductosReporte, OpcionesReportes, ProductosReporte } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoCatalogo, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }

export function ReporteProductos({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosProductosReporte>(() => ({ ...periodoInicial(), metrica: 'UNIDADES', limite: 10 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const [reporte, setReporte] = useState<ProductosReporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void consultarProductosReporte(filtros, controlador.signal)
      .then((datos) => { setReporte(datos); setError(null) })
      .catch((actual: unknown) => { if (!controlador.signal.aborted) setError(mensajeErrorReporte(actual, 'No fue posible cargar los productos más vendidos.')) })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [filtros, revision])

  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { setError('La fecha inicial no puede ser posterior a la fecha final.'); return }
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
    try { await exportarProductosReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar los productos más vendidos.')) }
  }

  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    const esIngresos = reporte?.metrica === 'INGRESOS'
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.acento],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '62%' } },
      xaxis: { categories: reporte?.items.map((item) => item.producto.nombre) ?? [], labels: { formatter: (valor) => esIngresos ? formatearDinero(Number(valor)) : formatearCantidad(Number(valor)) } },
      yaxis: { labels: { maxWidth: 190 } },
      tooltip: { y: { formatter: (valor) => esIngresos ? formatearDinero(Number(valor ?? 0)) : `${formatearCantidad(Number(valor ?? 0))} unidades` } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-productos-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-productos-reporte">Productos más vendidos</h2><p>Clasificación por unidades o ingresos, con filtros del catálogo farmacéutico.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="productos-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <CampoCatalogo id="productos-producto" etiqueta="Producto" opciones={opciones.productos} valor={borrador.productoId ?? ''} placeholder="Todos los productos" onChange={(productoId) => setBorrador((actual) => ({ ...actual, productoId }))} />
        <CampoCatalogo id="productos-laboratorio" etiqueta="Laboratorio" opciones={opciones.laboratorios} valor={borrador.laboratorioId ?? ''} placeholder="Todos los laboratorios" onChange={(laboratorioId) => setBorrador((actual) => ({ ...actual, laboratorioId }))} />
        <CampoCatalogo id="productos-categoria" etiqueta="Categoría terapéutica" opciones={opciones.categorias} valor={borrador.categoriaId ?? ''} placeholder="Todas las categorías" onChange={(categoriaId) => setBorrador((actual) => ({ ...actual, categoriaId }))} />
        <label className={styles.campo}><span>Clasificar por</span><select value={borrador.metrica} onChange={(evento) => setBorrador((actual) => ({ ...actual, metrica: evento.target.value as FiltrosProductosReporte['metrica'] }))}><option value="UNIDADES">Unidades vendidas</option><option value="INGRESOS">Ingresos</option></select></label>
        <label className={styles.campo}><span>Cantidad de resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 productos</option><option value="10">10 productos</option><option value="20">20 productos</option><option value="30">30 productos</option><option value="50">50 productos</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={() => { setCargando(true); setRevision((valor) => valor + 1) }} />
      {reporte && reporte.items.length > 0 && !error && <>
        <div className={styles.resumenBanda}><span>Total analizado</span><strong>{reporte.metrica === 'INGRESOS' ? formatearDinero(reporte.totalGeneral) : `${formatearCantidad(reporte.totalGeneral)} unidades`}</strong></div>
        <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Clasificación de productos</h3><p>Orden descendente por {reporte.metrica === 'INGRESOS' ? 'ingresos generados' : 'unidades vendidas'}.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: reporte.metrica === 'INGRESOS' ? 'Ingresos' : 'Unidades', data: reporte.items.map((item) => reporte.metrica === 'INGRESOS' ? item.totalVentas : item.unidadesVendidas) }]} altura={Math.max(320, reporte.items.length * 46)} descripcion="Gráfica horizontal de productos más vendidos" /></article>
        <div className={styles.tablaContenedor}><table><caption>Detalle de productos más vendidos</caption><thead><tr><th className={styles.numero}>Posición</th><th>Producto</th><th>Laboratorio</th><th className={styles.numero}>Unidades</th><th className={styles.numero}>Ingresos</th><th className={styles.numero}>Participación</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={item.producto.id}><td className={styles.numero}><strong>{item.posicion}</strong></td><th scope="row"><span className={styles.identidadTabla}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span></th><td>{item.laboratorio.nombre}</td><td className={styles.numero}>{formatearCantidad(item.unidadesVendidas)}</td><td className={styles.numero}>{formatearDinero(item.totalVentas)}</td><td className={styles.numero}>{item.participacionPorcentaje.toFixed(2)} %</td></tr>)}</tbody></table></div>
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
