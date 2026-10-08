export type RecursoAbastecimiento =
  | 'proveedores'
  | 'solicitudes'
  | 'cotizaciones'
  | 'ordenes'
  | 'recepciones'
  | 'traslados'
  | 'devoluciones'

export type OrdenAbastecimiento = 'numero' | 'descripcion' | 'nit' | 'autorizado' | 'calificacion' | 'total' | 'estado' | 'proveedor' | 'modalidad' | 'sucursal' | 'fecha'
export type DireccionOrdenAbastecimiento = 'asc' | 'desc'

export type ModalidadCompra = 'ORDINARIA' | 'URGENTE'
export type PrioridadCompraUrgente = 'CRITICA' | 'ALTA' | 'PREVENTIVA'
export type ViaAtencionUrgente =
  | 'INVENTARIO_PROPIO'
  | 'BODEGA_CENTRAL'
  | 'TRASLADO_OTRA_SUCURSAL'
  | 'RECEPCION_CENTRAL_URGENTE'
  | 'COMPRA_DIRECTA_SUCURSAL'
export type ResultadoEvaluacionProveedor = 'APROBADO' | 'CONDICIONADO' | 'NO_APROBADO'
export type TipoDestinoOrdenCompra = 'SUCURSAL' | 'CLIENTE'
export type EstadoIngresoRecepcion = 'DISPONIBLE' | 'CUARENTENA' | 'BLOQUEADO'
export type EtapaRecepcionCompra = 'DOCUMENTAL' | 'FISICA' | 'TECNICA'
export type TipoTrasladoInterno = 'ABASTECIMIENTO' | 'DEVOLUCION_INTERNA' | 'TRASLADO_HORIZONTAL' | 'REDISTRIBUCION'
export type PrioridadTrasladoInterno = 'NORMAL' | 'ALTA' | 'EMERGENCIA'

export type OpcionAbastecimiento = {
  id: string
  codigo: string
  nombre: string
}

export type ProductoAbastecimiento = OpcionAbastecimiento & {
  presentacion?: string
  nombreComercial?: string
  controlaLote?: boolean
  requiereVencimiento?: boolean
}

export type UbicacionAbastecimiento = OpcionAbastecimiento & {
  sucursalId: string
  tipo: string
  activa?: boolean
  bloqueada: boolean
  esSucursalSesion: boolean
}

export type LoteAbastecimiento = {
  id: string | null
  numeroLote: string
  fechaVencimiento: string | null
  cantidadDisponible: number
}

export type OpcionesFiltrosAbastecimiento = {
  proveedores: Array<OpcionAbastecimiento & { autorizado: boolean }>
  sucursales: OpcionAbastecimiento[]
  sucursalesTraslado: OpcionAbastecimiento[]
  sucursalContextoId: string
  alcanceGlobal: boolean
  modalidades: ModalidadCompra[]
  prioridadesUrgentes: string[]
  viasAtencionUrgente: string[]
  tiposTraslado: string[]
  resultadosProveedor: string[]
  estados: Record<string, string[]>
}

export type PaginacionAbastecimiento<T> = {
  items: T[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ConsultaAbastecimiento = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  estados?: string[]
  sucursalId?: string
  proveedorId?: string
  modalidad?: ModalidadCompra
  fechaDesde?: string
  fechaHasta?: string
  orden?: OrdenAbastecimiento
  direccion?: DireccionOrdenAbastecimiento
}

export type BaseRegistroAbastecimiento = {
  id: string
  version: number
  creadoEn: string | null
  actualizadoEn?: string | null
  inactivadoEn?: string | null
  motivoInactivacion?: string | null
}

export type ProveedorAbastecimiento = BaseRegistroAbastecimiento & {
  codigo: string
  nit: string
  nombre: string
  nombreComercial: string | null
  correo: string | null
  telefono: string | null
  direccion: string | null
  autorizado: boolean
  activo: boolean
  calificacion: number | null
  evaluadoEn: string | null
}

export type DetalleProductoAbastecimiento = {
  id: string
  productoId: string
  producto?: ProductoAbastecimiento
  loteId?: string | null
  lote?: { id: string; numeroLote: string; fechaVencimiento: string | null } | null
  cantidad?: number
  observaciones?: string | null
  [campo: string]: unknown
}

export type SolicitudCompra = BaseRegistroAbastecimiento & {
  numero: string
  sucursalId: string
  sucursal?: OpcionAbastecimiento
  modalidad: ModalidadCompra
  prioridad: string | null
  viaAtencionUrgente: string | null
  alternativasEvaluadas: string[]
  estado: string
  justificacion: string
  referenciaNecesidad: string
  evidenciaReferencia: string | null
  requeridaEn: string | null
  solicitadaEn: string | null
  resueltaEn: string | null
  motivoResolucion: string | null
  detalles: DetalleProductoAbastecimiento[]
}

export type CotizacionCompra = BaseRegistroAbastecimiento & {
  solicitudId: string
  solicitud?: SolicitudCompra
  proveedorId: string
  proveedor?: ProveedorAbastecimiento
  numeroProveedor: string
  moneda: string
  tipoCambio: number
  fechaTipoCambio: string
  total: number
  totalGtq: number
  formaPago: string
  condicionesEntrega: string
  vigenteHasta: string
  plazoEntregaDias: number
  estado: string
  puntaje: number | null
  justificacionSeleccion: string | null
  evidenciaReferencia: string
  detalles: DetalleProductoAbastecimiento[]
}

export type LineaCotizacionCompraRequest = {
  productoId: string
  cantidad: number
  precioUnitario: number
  impuesto: number
}

export type CrearCotizacionCompraRequest = {
  solicitudId: string
  proveedorId: string
  numeroProveedor: string
  moneda: string
  tipoCambio: number
  fechaTipoCambio: string
  formaPago: string
  condicionesEntrega: string
  vigenteHasta: string
  plazoEntregaDias: number
  evidenciaReferencia: string
  detalles: LineaCotizacionCompraRequest[]
}

export type EvaluarCotizacionCompraRequest = {
  version: number
  puntaje: number
  seleccionar: boolean
  justificacion: string
}

export type OrdenCompra = BaseRegistroAbastecimiento & {
  numero: string
  solicitudId: string
  cotizacionId: string
  proveedorId: string
  proveedor?: ProveedorAbastecimiento
  sucursalDestinoId: string
  sucursalDestino?: OpcionAbastecimiento
  modalidad: ModalidadCompra
  tipoDestino: TipoDestinoOrdenCompra
  referenciaDestino: string | null
  estado: string
  moneda: string
  tipoCambio: number
  fechaTipoCambio: string | null
  total: number
  totalGtq: number
  formaPago: string
  condicionesEntrega: string
  versionDocumento: number
  emitidaEn: string | null
  entregaEstimadaEn: string | null
  cerradaEn: string | null
  detalles: DetalleProductoAbastecimiento[]
}

export type RecepcionCompra = BaseRegistroAbastecimiento & {
  numero: string
  ordenId: string
  orden?: {
    id: string
    numero: string
    proveedorId: string
    proveedor?: ProveedorAbastecimiento | null
    sucursalDestinoId: string
    tipoDestino: TipoDestinoOrdenCompra
    estado: string
    modalidad?: ModalidadCompra
  } | null
  ubicacionDestinoId: string | null
  ubicacionDestino?: UbicacionAbastecimiento | null
  estado: string
  documentoProveedor: string | null
  documentoPendiente: boolean
  regularizarAntesDe: string | null
  evidenciaDocumental: string
  observaciones: string | null
  receptorNombre: string | null
  receptorIdentificacion: string | null
  entregadoEn: string | null
  confirmadaEn: string | null
  detalles: DetalleProductoAbastecimiento[]
}

export type CrearOrdenCompraRequest = {
  solicitudId: string
  cotizacionId: string
  entregaEstimadaEn: string
  tipoDestino: TipoDestinoOrdenCompra
  referenciaDestino: string | null
}

export type FinalizarOrdenCompraRequest = {
  version: number
  motivo: string
}

export type CerrarOrdenCompraRequest = FinalizarOrdenCompraRequest & {
  documentosCompletos: boolean
  validacionFinanciera: boolean
}

export type LineaRecepcionCompraRequest = {
  ordenDetalleId: string
  cantidadRecibida: number
  cantidadAceptada: number
  cantidadRechazada: number
  estadoIngreso: EstadoIngresoRecepcion
  numeroLote: string | null
  fechaVencimiento: string | null
  registroSanitario: string | null
  costoUnitario: number
  observaciones: string | null
}

export type CrearRecepcionCompraRequest = {
  ordenId: string
  ubicacionDestinoId: string | null
  documentoProveedor: string | null
  documentoPendiente: boolean
  regularizarAntesDe: string | null
  evidenciaDocumental: string
  observaciones: string | null
  receptorNombre: string | null
  receptorIdentificacion: string | null
  entregadoEn: string | null
  detalles: LineaRecepcionCompraRequest[]
}

export type ConfirmarRecepcionCompraRequest = {
  version: number
  etapa: EtapaRecepcionCompra
  conforme: boolean
  motivo: string
}

export type RegularizarDocumentoRecepcionRequest = {
  version: number
  documentoProveedor: string
  evidenciaDocumental: string
}

export type TrasladoInterno = BaseRegistroAbastecimiento & {
  numero: string
  tipo: string
  estado: string
  prioridad: string
  requeridoEn: string | null
  sucursalOrigenId: string
  sucursalOrigen?: OpcionAbastecimiento
  sucursalDestinoId: string
  sucursalDestino?: OpcionAbastecimiento
  ubicacionOrigenId: string
  ubicacionOrigen?: UbicacionAbastecimiento
  ubicacionDestinoId: string
  ubicacionDestino?: UbicacionAbastecimiento
  justificacion: string
  evidenciaReferencia: string | null
  ultimoTransportista: string | null
  ultimoTransporteReferencia: string | null
  ultimaEvidenciaDespacho: string | null
  ultimoCostoTransporte: number | null
  secuenciaDespacho: number
  detalles: DetalleProductoAbastecimiento[]
}

export type DevolucionProveedor = BaseRegistroAbastecimiento & {
  numero: string
  proveedorId: string
  proveedor?: ProveedorAbastecimiento
  sucursalId: string
  sucursal?: OpcionAbastecimiento
  ubicacionId: string
  ubicacion?: UbicacionAbastecimiento
  estado: string
  motivo: string
  autorizacionProveedor: string | null
  evidenciaReferencia: string | null
  despachadoEn: string | null
  compensacionReferencia: string | null
  detalles: DetalleProductoAbastecimiento[]
}

export type RecepcionElegibleDevolucion = {
  recepcionDetalleId: string
  recepcionId: string
  recepcionNumero: string
  proveedor: OpcionAbastecimiento
  ubicacion: OpcionAbastecimiento | null
  producto: ProductoAbastecimiento
  lote: { id: string; numeroLote: string; fechaVencimiento: string | null } | null
  estadoIngreso: EstadoIngresoRecepcion
  cantidadAceptada: number
  cantidadDevuelta: number
  cantidadElegible: number
}

export type CrearTrasladoInternoRequest = {
  tipo: TipoTrasladoInterno
  prioridad: PrioridadTrasladoInterno
  requeridoEn: string
  sucursalOrigenId: string
  sucursalDestinoId: string
  ubicacionOrigenId: string
  ubicacionDestinoId: string
  justificacion: string
  evidenciaReferencia: string | null
  detalles: Array<{ productoId: string; loteId: string | null; cantidadSolicitada: number; observaciones: string | null }>
}

export type CrearDevolucionProveedorRequest = {
  proveedorId: string
  ubicacionId: string
  motivo: string
  evidenciaReferencia: string | null
  detalles: Array<{ recepcionDetalleId: string; productoId: string; loteId: string | null; cantidad: number; causa: string }>
}

export type RegistroAbastecimiento =
  | ProveedorAbastecimiento
  | SolicitudCompra
  | CotizacionCompra
  | OrdenCompra
  | RecepcionCompra
  | TrasladoInterno
  | DevolucionProveedor

export type EvaluacionProveedor = BaseRegistroAbastecimiento & {
  periodo: string
  calidad: number
  cumplimiento: number
  servicio: number
  puntajeTotal: number
  resultado: string
  observaciones: string | null
  evaluadoEn: string
}

export type GuardarProveedorRequest = {
  codigo: string
  nit: string
  nombre: string
  nombreComercial: string | null
  correo: string | null
  telefono: string | null
  direccion: string | null
  autorizado: boolean
}

export type ActualizarProveedorRequest = GuardarProveedorRequest & {
  version: number
}

export type EvaluarProveedorRequest = {
  periodo: string
  calidad: number
  cumplimiento: number
  servicio: number
  resultado: ResultadoEvaluacionProveedor
  observaciones: string | null
}

export type LineaSolicitudCompraRequest = {
  productoId: string
  cantidad: number
  observaciones: string | null
}

export type CrearSolicitudCompraRequest = {
  modalidad: ModalidadCompra
  prioridad: PrioridadCompraUrgente | null
  viaAtencionUrgente: ViaAtencionUrgente | null
  alternativasEvaluadas: ViaAtencionUrgente[] | null
  justificacion: string
  referenciaNecesidad: string
  evidenciaReferencia: string | null
  requeridaEn: string
  detalles: LineaSolicitudCompraRequest[]
}

export type ResolverSolicitudCompraRequest = {
  version: number
  aprobar: boolean
  motivo: string
}

export type CancelarSolicitudCompraRequest = {
  version: number
  motivo: string
}

export const ordenViasAtencionUrgente: readonly ViaAtencionUrgente[] = [
  'INVENTARIO_PROPIO',
  'BODEGA_CENTRAL',
  'TRASLADO_OTRA_SUCURSAL',
  'RECEPCION_CENTRAL_URGENTE',
  'COMPRA_DIRECTA_SUCURSAL',
]
