import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import type { FormatoExportacion } from '../../../shared/components/boton-exportar'
import { consultarVencimientosPerdidasReporte, exportarVencimientosPerdidasReporte } from '../reportes-api'
import { formatearCantidad, formatearDinero, mensajeErrorReporte, periodoInicial, periodoValido } from '../reportes-formatos'
import type { FiltrosProductosInventarioReporte, OpcionesReportes } from '../reportes.types'
import { obtenerColoresGrafica, opcionesBaseGrafica } from './grafica-config'
import { GraficaReporte } from './grafica-reporte'
import { ActualizacionReporte, AlcanceReporte, CampoCatalogo, CampoSucursal, CamposPeriodo, EstadoReporte, FormularioFiltros } from './reportes-controles'
import styles from './reportes.module.css'
import { useReporteRemoto } from './use-reporte-remoto'

type Props = { opciones: OpcionesReportes; puedeExportar: boolean; onErrorExportacion: (mensaje: string) => void }
const etiquetaTipo = { VENCIMIENTO: 'Vencimiento', DESTRUCCION: 'Destrucción', AJUSTE_NEGATIVO: 'Ajuste negativo' } as const

export function ReporteVencimientosPerdidas({ opciones, puedeExportar, onErrorExportacion }: Props) {
  const inicial = useMemo<FiltrosProductosInventarioReporte>(() => ({ ...periodoInicial(), limite: 20 }), [])
  const [borrador, setBorrador] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const estado = useReporteRemoto(filtros, consultarVencimientosPerdidasReporte, 'No fue posible cargar los vencimientos y pérdidas.')
  const { reporte, cargando, error } = estado
  const aplicar = () => {
    if (!periodoValido(borrador.fechaDesde, borrador.fechaHasta)) { estado.reportarError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    estado.iniciarConsulta()
    setFiltros({ ...borrador, sucursalId: borrador.sucursalId || undefined, productoId: borrador.productoId || undefined, laboratorioId: borrador.laboratorioId || undefined, categoriaId: borrador.categoriaId || undefined })
  }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarVencimientosPerdidasReporte(formato, filtros) }
    catch (actual) { onErrorExportacion(mensajeErrorReporte(actual, 'No fue posible exportar los vencimientos y pérdidas.')) }
  }
  const opcionesGrafica = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    return {
      ...opcionesBaseGrafica(colores),
      colors: [colores.peligro],
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      xaxis: { categories: reporte?.items.map((item) => item.producto.nombre) ?? [], labels: { formatter: (valor) => formatearCantidad(Number(valor)) } },
      tooltip: { y: { formatter: (valor) => formatearCantidad(Number(valor ?? 0)) } },
      grid: { borderColor: colores.borde, strokeDashArray: 4, padding: { left: 12 } },
    }
  }, [reporte])

  return (
    <section className={styles.contenidoReporte} aria-labelledby="titulo-perdidas-reporte">
      <div className={styles.cabeceraReporte}><div><h2 id="titulo-perdidas-reporte">Vencimientos y pérdidas</h2><p>Salidas confirmadas por vencimiento, destrucción o ajuste negativo.</p></div>{reporte && <AlcanceReporte corporativo={reporte.alcance.esCorporativo} sucursal={reporte.alcance.sucursal} />}</div>
      <FormularioFiltros consultando={cargando} puedeExportar={puedeExportar} exportacionHabilitada={Boolean(reporte)} onConsultar={aplicar} onExportar={exportar}>
        <CamposPeriodo fechaDesde={borrador.fechaDesde} fechaHasta={borrador.fechaHasta} onFechaDesde={(fechaDesde) => setBorrador((actual) => ({ ...actual, fechaDesde }))} onFechaHasta={(fechaHasta) => setBorrador((actual) => ({ ...actual, fechaHasta }))} />
        <CampoSucursal id="perdidas-reporte-sucursal" opciones={opciones} valor={borrador.sucursalId ?? ''} onChange={(sucursalId) => setBorrador((actual) => ({ ...actual, sucursalId }))} />
        <CampoCatalogo id="perdidas-reporte-producto" etiqueta="Producto" opciones={opciones.productos} valor={borrador.productoId ?? ''} placeholder="Todos los productos" onChange={(productoId) => setBorrador((actual) => ({ ...actual, productoId }))} />
        <CampoCatalogo id="perdidas-reporte-laboratorio" etiqueta="Laboratorio" opciones={opciones.laboratorios} valor={borrador.laboratorioId ?? ''} placeholder="Todos los laboratorios" onChange={(laboratorioId) => setBorrador((actual) => ({ ...actual, laboratorioId }))} />
        <CampoCatalogo id="perdidas-reporte-categoria" etiqueta="Categoría terapéutica" opciones={opciones.categorias} valor={borrador.categoriaId ?? ''} placeholder="Todas las categorías" onChange={(categoriaId) => setBorrador((actual) => ({ ...actual, categoriaId }))} />
        <label className={styles.campo}><span>Resultados</span><select value={borrador.limite} onChange={(evento) => setBorrador((actual) => ({ ...actual, limite: Number(evento.target.value) }))}><option value="5">5 registros</option><option value="10">10 registros</option><option value="20">20 registros</option><option value="50">50 registros</option></select></label>
      </FormularioFiltros>
      <EstadoReporte cargando={cargando && !reporte} error={error} vacio={Boolean(reporte && reporte.items.length === 0)} onReintentar={estado.reintentar} />
      {reporte && !error && <>
        <div className={styles.tarjetasIndicadores}>
          <article className={styles.tarjetaIndicador}><span>Unidades vencidas</span><strong>{formatearCantidad(reporte.resumen.cantidadVencida)}</strong><small>Movimientos confirmados</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorPeligro}`}><span>Unidades destruidas</span><strong>{formatearCantidad(reporte.resumen.cantidadDestruida)}</strong><small>Bajas confirmadas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAdvertencia}`}><span>Ajustes negativos</span><strong>{formatearCantidad(reporte.resumen.cantidadAjustadaNegativa)}</strong><small>Reducciones registradas</small></article>
          <article className={`${styles.tarjetaIndicador} ${styles.indicadorAcento}`}><span>Costo estimado</span><strong>{reporte.resumen.costoEstimado === null ? 'Acceso restringido' : formatearDinero(reporte.resumen.costoEstimado)}</strong><small>{reporte.resumen.costoEstimado === null ? 'Requiere permiso administrativo' : `${formatearCantidad(reporte.resumen.movimientosSinCosto)} movimientos sin costo`}</small></article>
        </div>
        {reporte.items.length > 0 && <>
          <article className={styles.panelGrafica}><div className={styles.tituloPanel}><div><h3>Pérdidas por producto</h3><p>Cantidad asociada a las salidas confirmadas.</p></div></div><GraficaReporte tipo="bar" opciones={opcionesGrafica} series={[{ name: 'Cantidad', data: reporte.items.map((item) => item.cantidad) }]} altura={Math.max(340, reporte.items.length * 42)} descripcion="Gráfica de pérdidas confirmadas por producto" /></article>
          <div className={styles.tablaContenedor}><table><caption>Detalle de vencimientos y pérdidas</caption><thead><tr><th>Tipo</th><th>Producto</th><th className={styles.numero}>Operaciones</th><th className={styles.numero}>Cantidad</th><th className={styles.numero}>Costo estimado</th></tr></thead><tbody>{reporte.items.map((item) => <tr key={`${item.tipo}-${item.producto.id}`}><td>{etiquetaTipo[item.tipo]}</td><th scope="row"><span className={styles.identidadTabla}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo} · {item.laboratorio.nombre}</small></span></th><td className={styles.numero}>{formatearCantidad(item.operaciones)}</td><td className={styles.numero}>{formatearCantidad(item.cantidad)}</td><td className={styles.numero}>{item.costoEstimado === null ? 'Restringido' : formatearDinero(item.costoEstimado)}</td></tr>)}</tbody></table></div>
        </>}
        <ActualizacionReporte generadoEn={reporte.generadoEn} />
      </>}
    </section>
  )
}
