export type FormatoExportacionReporte = 'xlsx' | 'pdf'
export type AgrupacionVentasReporte = 'DIA' | 'SEMANA' | 'MES'
export type MetricaProductosReporte = 'UNIDADES' | 'INGRESOS'

export type ReferenciaReporte = {
  id: string
  codigo: string
  nombre: string
}

export type AlcanceReporte = {
  esCorporativo: boolean
  sucursal: ReferenciaReporte | null
}

export type OpcionesReportes = {
  permiteTodasSucursales: boolean
  sucursales: ReferenciaReporte[]
  productos: ReferenciaReporte[]
  laboratorios: ReferenciaReporte[]
  categorias: ReferenciaReporte[]
}

export type FiltrosPeriodoReporte = {
  fechaDesde: string
  fechaHasta: string
  sucursalId?: string
}

export type FiltrosVentasReporte = FiltrosPeriodoReporte & {
  agrupacion: AgrupacionVentasReporte
}

export type FiltrosProductosReporte = FiltrosPeriodoReporte & {
  productoId?: string
  laboratorioId?: string
  categoriaId?: string
  metrica: MetricaProductosReporte
  limite: number
}

export type FiltrosInventarioReporte = {
  sucursalId?: string
  productoId?: string
  laboratorioId?: string
  categoriaId?: string
  limite: number
}

export type FiltrosLimiteReporte = FiltrosPeriodoReporte & { limite: number }
export type FiltrosProductosInventarioReporte = FiltrosPeriodoReporte & {
  productoId?: string
  laboratorioId?: string
  categoriaId?: string
  limite: number
}

export type ResumenReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  totalVentas: number
  cantidadVentas: number
  ticketPromedio: number
  unidadesVendidas: number
  cantidadAnulaciones: number
  montoAnulado: number
  generadoEn: string
}

export type PuntoVentasReporte = {
  periodo: string
  totalVentas: number
  cantidadVentas: number
  ticketPromedio: number
  unidadesVendidas: number
  cantidadAnulaciones: number
  montoAnulado: number
}

export type VentasReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  agrupacion: AgrupacionVentasReporte
  puntos: PuntoVentasReporte[]
  generadoEn: string
}

export type ProductoVendidoReporte = {
  posicion: number
  producto: ReferenciaReporte
  laboratorio: Omit<ReferenciaReporte, 'codigo'>
  unidadesVendidas: number
  totalVentas: number
  participacionPorcentaje: number
}

export type ProductosReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  metrica: MetricaProductosReporte
  totalGeneral: number
  items: ProductoVendidoReporte[]
  generadoEn: string
}

export type SucursalComparadaReporte = {
  sucursal: ReferenciaReporte
  totalVentas: number
  cantidadVentas: number
  ticketPromedio: number
  cantidadAnulaciones: number
  montoAnulado: number
}

export type ComparacionSucursalesReporte = {
  fechaDesde: string
  fechaHasta: string
  items: SucursalComparadaReporte[]
  generadoEn: string
}

export type InventarioCriticoReporte = {
  sucursal: ReferenciaReporte
  producto: ReferenciaReporte
  laboratorio: Omit<ReferenciaReporte, 'codigo'>
  cantidadFisica: number
  cantidadDisponible: number
  cantidadBloqueadaCuarentena: number
  cantidadVencida: number
  cantidadVence30Dias: number
  cantidadVence31a60Dias: number
  cantidadVence61a90Dias: number
  lotesProximosVencer: number
  stockMinimoReferencia: number | null
  faltanteEstimado: number
  bajoMinimo: boolean
  agotado: boolean
}

export type InventarioReporte = {
  alcance: AlcanceReporte
  fotografiaAl: string
  resumen: {
    productosEvaluados: number
    productosBajoMinimo: number
    productosAgotados: number
    productosConVencimiento90Dias: number
    cantidadVence90Dias: number
  }
  items: InventarioCriticoReporte[]
  generadoEn: string
}

export type ClientesReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: {
    clientesRegistrados: number
    clientesNuevos: number
    clientesConCompra: number
    clientesRecurrentes: number
    clientesSinCompraPeriodo: number
    totalComprado: number
  }
  items: Array<{
    cliente: { id: string; nombre: string }
    compras: number
    totalComprado: number
    ticketPromedio: number
    ultimaCompra: string
  }>
  generadoEn: string
}

export type RecetasReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: {
    totalRecetas: number
    recetasValidas: number
    recetasRechazadas: number
    recetasPendientes: number
    ventasConReceta: number
    unidadesDispensadasConReceta: number
  }
  items: Array<{ resultado: 'PENDIENTE' | 'VALIDA' | 'RECHAZADA'; cantidad: number; porcentaje: number }>
  generadoEn: string
}

export type RotacionValoracionReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: { productosEvaluados: number; unidadesActuales: number; valorInventario: number; productosSinCosto: number }
  items: Array<{
    producto: ReferenciaReporte
    laboratorio: Omit<ReferenciaReporte, 'codigo'>
    existenciaInicialEstimada: number
    existenciaActual: number
    existenciaPromedio: number
    unidadesVendidas: number
    indiceRotacion: number
    costoPromedio: number | null
    valorInventario: number | null
  }>
  generadoEn: string
}

export type VencimientosPerdidasReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: { operaciones: number; cantidadVencida: number; cantidadDestruida: number; cantidadAjustadaNegativa: number; costoEstimado: number | null; movimientosSinCosto: number }
  items: Array<{
    tipo: 'VENCIMIENTO' | 'DESTRUCCION' | 'AJUSTE_NEGATIVO'
    producto: ReferenciaReporte
    laboratorio: Omit<ReferenciaReporte, 'codigo'>
    operaciones: number
    cantidad: number
    costoEstimado: number | null
    movimientosSinCosto: number
  }>
  generadoEn: string
}

export type ComprasProveedoresReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: { proveedores: number; ordenes: number; ordenesCanceladas: number; totalGtq: number; cumplimientoPorcentaje: number }
  items: Array<{
    proveedor: ReferenciaReporte
    ordenes: number
    ordenesCanceladas: number
    totalGtq: number
    unidadesOrdenadas: number
    unidadesRecibidas: number
    cumplimientoPorcentaje: number
  }>
  generadoEn: string
}

export type TrasladosReporte = {
  alcance: AlcanceReporte
  fechaDesde: string
  fechaHasta: string
  resumen: { traslados: number; cerrados: number; enCurso: number; unidadesDespachadas: number; unidadesRecibidas: number; unidadesRechazadas: number }
  items: Array<{
    sucursalOrigen: ReferenciaReporte
    sucursalDestino: ReferenciaReporte
    traslados: number
    cerrados: number
    enCurso: number
    unidadesSolicitadas: number
    unidadesDespachadas: number
    unidadesRecibidas: number
    unidadesRechazadas: number
    cumplimientoPorcentaje: number
  }>
  generadoEn: string
}
