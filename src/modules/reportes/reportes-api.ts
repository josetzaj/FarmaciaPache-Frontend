import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ClientesReporte,
  ComprasProveedoresReporte,
  ComparacionSucursalesReporte,
  FiltrosInventarioReporte,
  FiltrosLimiteReporte,
  FiltrosPeriodoReporte,
  FiltrosProductosInventarioReporte,
  FiltrosProductosReporte,
  FiltrosVentasReporte,
  FormatoExportacionReporte,
  InventarioReporte,
  OpcionesReportes,
  ProductosReporte,
  RecetasReporte,
  ResumenReporte,
  RotacionValoracionReporte,
  TrasladosReporte,
  VentasReporte,
  VencimientosPerdidasReporte,
} from './reportes.types'

type RespuestaApi<T> = { success: true; data: T }

function parametrosConsulta(filtros: Record<string, string | number | undefined>): string {
  const consulta = new URLSearchParams()
  Object.entries(filtros).forEach(([nombre, valor]) => {
    if (valor !== undefined && valor !== '') consulta.set(nombre, String(valor))
  })
  return consulta.toString()
}

async function consultar<T>(ruta: string, filtros: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
  const consulta = parametrosConsulta(filtros)
  const respuesta = await solicitarApi<RespuestaApi<T>>(`${ruta}?${consulta}`, { signal })
  return respuesta.data
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function esInventarioReporte(valor: unknown): valor is InventarioReporte {
  if (!esRegistro(valor)) return false

  return esRegistro(valor.alcance)
    && esRegistro(valor.resumen)
    && Array.isArray(valor.items)
    && typeof valor.fotografiaAl === 'string'
    && typeof valor.generadoEn === 'string'
}

async function exportar<T>(ruta: string, formato: FormatoExportacionReporte, filtros: T, nombre: string): Promise<void> {
  await descargarArchivoApi(ruta, {
    method: 'POST',
    datos: { formato, filtros },
    nombreArchivoAlternativo: `${nombre}.${formato}`,
  })
}

export async function obtenerOpcionesReportes(signal?: AbortSignal): Promise<OpcionesReportes> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesReportes>>('/reportes/opciones', { signal })
  return respuesta.data
}

export const consultarResumenReporte = (filtros: FiltrosPeriodoReporte, signal?: AbortSignal) =>
  consultar<ResumenReporte>('/reportes/resumen', filtros, signal)

export const consultarVentasReporte = (filtros: FiltrosVentasReporte, signal?: AbortSignal) =>
  consultar<VentasReporte>('/reportes/ventas', filtros, signal)

export const consultarProductosReporte = (filtros: FiltrosProductosReporte, signal?: AbortSignal) =>
  consultar<ProductosReporte>('/reportes/productos', filtros, signal)

export const consultarSucursalesReporte = (filtros: FiltrosPeriodoReporte, signal?: AbortSignal) =>
  consultar<ComparacionSucursalesReporte>('/reportes/sucursales', filtros, signal)

export async function consultarInventarioReporte(filtros: FiltrosInventarioReporte, signal?: AbortSignal): Promise<InventarioReporte> {
  const reporte = await consultar<unknown>('/reportes/inventario', filtros, signal)
  if (!esInventarioReporte(reporte)) throw new Error('Respuesta incompleta del reporte de inventario.')
  return reporte
}

export const consultarClientesReporte = (filtros: FiltrosLimiteReporte, signal?: AbortSignal) =>
  consultar<ClientesReporte>('/reportes/clientes', filtros, signal)

export const consultarRecetasReporte = (filtros: FiltrosPeriodoReporte, signal?: AbortSignal) =>
  consultar<RecetasReporte>('/reportes/recetas', filtros, signal)

export const consultarRotacionValoracionReporte = (filtros: FiltrosProductosInventarioReporte, signal?: AbortSignal) =>
  consultar<RotacionValoracionReporte>('/reportes/rotacion-valoracion', filtros, signal)

export const consultarVencimientosPerdidasReporte = (filtros: FiltrosProductosInventarioReporte, signal?: AbortSignal) =>
  consultar<VencimientosPerdidasReporte>('/reportes/vencimientos-perdidas', filtros, signal)

export const consultarComprasProveedoresReporte = (filtros: FiltrosLimiteReporte, signal?: AbortSignal) =>
  consultar<ComprasProveedoresReporte>('/reportes/compras-proveedores', filtros, signal)

export const consultarTrasladosReporte = (filtros: FiltrosLimiteReporte, signal?: AbortSignal) =>
  consultar<TrasladosReporte>('/reportes/traslados', filtros, signal)

export const exportarResumenReporte = (formato: FormatoExportacionReporte, filtros: FiltrosPeriodoReporte) =>
  exportar('/reportes/resumen/exportaciones', formato, filtros, 'reporte_resumen')

export const exportarVentasReporte = (formato: FormatoExportacionReporte, filtros: FiltrosVentasReporte) =>
  exportar('/reportes/ventas/exportaciones', formato, filtros, 'reporte_ventas')

export const exportarProductosReporte = (formato: FormatoExportacionReporte, filtros: FiltrosProductosReporte) =>
  exportar('/reportes/productos/exportaciones', formato, filtros, 'reporte_productos')

export const exportarSucursalesReporte = (formato: FormatoExportacionReporte, filtros: FiltrosPeriodoReporte) =>
  exportar('/reportes/sucursales/exportaciones', formato, filtros, 'reporte_sucursales')

export const exportarInventarioReporte = (formato: FormatoExportacionReporte, filtros: FiltrosInventarioReporte) =>
  exportar('/reportes/inventario/exportaciones', formato, filtros, 'reporte_inventario')

export const exportarClientesReporte = (formato: FormatoExportacionReporte, filtros: FiltrosLimiteReporte) =>
  exportar('/reportes/clientes/exportaciones', formato, filtros, 'reporte_clientes')

export const exportarRecetasReporte = (formato: FormatoExportacionReporte, filtros: FiltrosPeriodoReporte) =>
  exportar('/reportes/recetas/exportaciones', formato, filtros, 'reporte_recetas')

export const exportarRotacionValoracionReporte = (formato: FormatoExportacionReporte, filtros: FiltrosProductosInventarioReporte) =>
  exportar('/reportes/rotacion-valoracion/exportaciones', formato, filtros, 'reporte_rotacion_valoracion')

export const exportarVencimientosPerdidasReporte = (formato: FormatoExportacionReporte, filtros: FiltrosProductosInventarioReporte) =>
  exportar('/reportes/vencimientos-perdidas/exportaciones', formato, filtros, 'reporte_vencimientos_perdidas')

export const exportarComprasProveedoresReporte = (formato: FormatoExportacionReporte, filtros: FiltrosLimiteReporte) =>
  exportar('/reportes/compras-proveedores/exportaciones', formato, filtros, 'reporte_compras_proveedores')

export const exportarTrasladosReporte = (formato: FormatoExportacionReporte, filtros: FiltrosLimiteReporte) =>
  exportar('/reportes/traslados/exportaciones', formato, filtros, 'reporte_traslados')
