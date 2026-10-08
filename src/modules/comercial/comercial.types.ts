import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'

export type DireccionOrden = 'asc' | 'desc'
export type EstadoActivo = 'ACTIVO' | 'INACTIVO'
export type TipoCliente = 'PERSONA' | 'EMPRESA'
export type TipoIdentificacionCliente = 'NIT' | 'CUI' | 'PASAPORTE'
export type AlcanceMargen = 'GENERAL' | 'PRODUCTO'

export type ReferenciaCatalogo = {
  id: string
  codigo: string
  nombre: string
}

export type ClienteComercial = {
  id: string
  tipo: TipoCliente
  nombre: string
  nombres?: string | null
  apellidos?: string | null
  razonSocial?: string | null
  tipoIdentificacion: TipoIdentificacionCliente | null
  identificacion: string | null
  telefono: string | null
  correo: string | null
  direccion?: string | null
  activo: boolean
  sucursalRegistro: ReferenciaCatalogo | null
  creadoEn: string
  version: number
}

export type PoliticaMargen = {
  id: string
  nombre: string
  alcance: AlcanceMargen
  producto: ReferenciaCatalogo | null
  margenPorcentaje: number
  activo: boolean
  version: number
}

export type Paginado<T> = {
  items: T[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ConsultaComercial = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  estados?: string[]
  tipos?: string[]
  sucursalIds?: string[]
  productoIds?: string[]
  clienteIds?: string[]
  estadosPago?: string[]
  estadosDispensacion?: string[]
  estadosFiscales?: string[]
  desde?: string
  hasta?: string
  totalMin?: number
  totalMax?: number
  precioMin?: number
  precioMax?: number
  margenMin?: number
  margenMax?: number
  orden?: string
  direccion?: DireccionOrden
}

export type FiltrosExportacionComercial = Omit<ConsultaComercial, 'pagina' | 'tamanoPagina'>

export type OpcionesComercial = {
  sucursales: ReferenciaCatalogo[]
  productos: ProductoComercialCatalogo[]
  clientes: { tipos: TipoCliente[]; estados: EstadoActivo[] }
  margenes: { alcances: AlcanceMargen[]; estados: EstadoActivo[] }
  precios: { estados: EstadoPrecio[] }
  ventas: {
    estados: EstadoVenta[]
    estadosPago: EstadoPagoVenta[]
    estadosDispensacion: EstadoDispensacionVenta[]
    estadosFiscales: EstadoFiscalVenta[]
  }
}

export type ProductoComercialCatalogo = ReferenciaCatalogo & {
  requiereReceta?: boolean
  esControlado?: boolean
  precioVigente?: number | null
}

export type EstadoPrecio = 'BORRADOR' | 'VIGENTE' | 'INACTIVO'
export type EstadoVenta = 'BORRADOR' | 'PENDIENTE_RECETA' | 'LISTA_PARA_COBRO' | 'CONFIRMADA' | 'ANULADA'
export type EstadoPagoVenta = 'PENDIENTE' | 'PAGADO' | 'REVERTIDO'
export type EstadoDispensacionVenta = 'PENDIENTE' | 'DISPENSADA' | 'REVERTIDA'
export type EstadoFiscalVenta = 'PENDIENTE' | 'EMITIDA' | 'ANULADA' | 'ERROR'
export type ResultadoValidacionReceta = 'PENDIENTE' | 'VALIDA' | 'RECHAZADA'

export type PrecioProducto = {
  id: string
  productoId: string
  codigo: string
  producto: string
  politicaMargenId: string
  politicaMargen: string
  costoPromedio: number
  costoReposicion: number
  costoBase: number
  margenPorcentaje: number
  precioSugerido: number
  precioVenta: number
  estado: EstadoPrecio
  vigenteDesde: string | null
  vigenteHasta: string | null
  motivo: string
  version: number
}

export type CrearPrecioRequest = {
  productoId: string
  politicaMargenId?: string
  precioVenta?: number
  motivo: string
}

export type LineaVentaRequest = { productoId: string; cantidad: number }
export type RecetaVentaRequest = {
  referencia: string
  fechaEmision: string
  pacienteIdentificacion: string
  pacienteNombre: string
  prescriptorNombre: string
  prescriptorColegiado: string
  detalleMedicacion: string
  dosis: string
  frecuencia: string
  via: string
  duracion: string
  instrucciones: string | null
}

export type GuardarVentaRequest = {
  clienteId: string | null
  tipoIdentificacionFiscal: TipoIdentificacionCliente | null
  identificacionFiscal: string | null
  nombreFiscal: string | null
  direccionFiscal: string | null
  pacienteIdentificacion: string | null
  pacienteNombre: string | null
  lineas: LineaVentaRequest[]
  recetas: RecetaVentaRequest[]
}

export type VentaDetalleLinea = {
  id: string
  productoId: string
  codigo: string
  producto: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  impuesto: number
  total: number
  requiereReceta: boolean
  lotes: Array<{ ubicacionId: string; ubicacion: string | null; loteId: string | null; lote: string | null; fechaVencimiento: string | null; cantidad: number }>
}

export type RecetaVenta = RecetaVentaRequest & {
  id: string
  resultadoValidacion: ResultadoValidacionReceta
  motivoValidacion: string | null
  validadoPorId: string | null
  validadoEn: string | null
  version: number
}

export type RecetaValidacion = RecetaVenta & {
  ventaId: string
  ventaNumero: string
  ventaEstado: EstadoVenta
  sucursal: ReferenciaCatalogo | null
  creadoEn: string
}

export type VentaComercial = {
  id: string
  numero: string
  sucursal: ReferenciaCatalogo | null
  clienteId: string | null
  cliente: string
  tipoIdentificacionFiscal: TipoIdentificacionCliente | 'CF'
  identificacionFiscal: string
  direccionFiscal?: string | null
  pacienteIdentificacion?: string | null
  pacienteNombre?: string | null
  moneda?: 'GTQ'
  estado: EstadoVenta
  estadoPago: EstadoPagoVenta
  estadoDispensacion: EstadoDispensacionVenta
  estadoFiscal: EstadoFiscalVenta
  subtotal?: number
  descuento?: number
  impuesto?: number
  total: number
  cajaReferenciaId?: string | null
  operacionInventarioId?: string | null
  creadoEn: string
  confirmadaEn: string | null
  anuladaEn?: string | null
  motivoAnulacion?: string | null
  detalles?: VentaDetalleLinea[]
  recetas?: RecetaVenta[]
  version: number
}

export type GuardarClienteRequest = {
  tipo: TipoCliente
  nombres: string | null
  apellidos: string | null
  razonSocial: string | null
  tipoIdentificacion: TipoIdentificacionCliente | null
  identificacion: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
}

export type ActualizarClienteRequest = GuardarClienteRequest & {
  activo: boolean
  version: number
  motivo: string
}

export type GuardarPoliticaMargenRequest = {
  nombre: string
  alcance: AlcanceMargen
  productoId: string | null
  margenPorcentaje: number
}

export type ActualizarPoliticaMargenRequest = GuardarPoliticaMargenRequest & {
  activo: boolean
  version: number
  motivo: string
}

export type ConsultaAuditoriaComercial = ConsultaAuditoria
export type AuditoriaComercialPaginada = AuditoriaPaginada
