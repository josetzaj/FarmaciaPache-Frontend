import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'

export type SituacionActivo = 'DISPONIBLE' | 'ASIGNADO' | 'MANTENIMIENTO' | 'BAJA'
export type EstadoAsignacionActivo = 'VIGENTE' | 'PARCIAL' | 'CERRADA'
export type EstadoDetalleAsignacionActivo = 'ASIGNADO' | 'DEVUELTO'
export type EstadoRevisionAsignacionActivo = 'PENDIENTE' | 'SIN_DEVOLUCION' | 'CON_DEVOLUCION' | 'CONFIRMADA_LEGACY'
export type EstadoDevolucionActivo = 'SOLICITADA' | 'RECIBIDA' | 'APROBADA' | 'RECHAZADA'
export type DireccionOrden = 'asc' | 'desc'
export type FormatoExportacionActivo = 'xlsx' | 'pdf'

export type OpcionSucursal = { id: string; codigo: string; nombre: string }
export type OpcionTipoActivo = { id: string; prefijo: string; nombre: string }
export type OpcionCondicion = { id: string; codigo: string; nombre: string }

export type Activo = {
  id: string
  codigoInterno: string
  tipoActivo: OpcionTipoActivo
  sucursal: OpcionSucursal
  condicion: OpcionCondicion
  situacion: SituacionActivo
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
  descripcion: string | null
  creadoEn: string
  actualizadoEn: string | null
  inactivadoEn: string | null
  motivoInactivacion: string | null
  version: number
}

export type ActivosPaginados = {
  items: Activo[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarActivosParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalIds?: string[]
  tipoActivoIds?: string[]
  condicionIds?: string[]
  situaciones?: SituacionActivo[]
  orden: 'codigo' | 'sucursal' | 'tipo' | 'condicion' | 'situacion' | 'marca' | 'creadoEn'
  direccion: DireccionOrden
}

export type ExportarActivosParametros = Omit<ListarActivosParametros, 'pagina' | 'tamanoPagina'> & {
  formato: FormatoExportacionActivo
}

export type DatosActivoRequest = {
  tipoActivoId: string
  condicionId: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
  descripcion: string | null
}

export type CrearActivoRequest = DatosActivoRequest & { sucursalId: string }
export type ActualizarActivoRequest = DatosActivoRequest & { version: number }
export type CambiarSituacionActivoRequest = { version: number; situacion: 'DISPONIBLE' | 'MANTENIMIENTO'; motivo: string }
export type DarBajaActivoRequest = { version: number; motivo: string }

export type OpcionesRegistroActivo = {
  sucursal: OpcionSucursal | null
  sucursales: OpcionSucursal[]
  tipos: OpcionTipoActivo[]
  condiciones: OpcionCondicion[]
}

export type OpcionEmpleadoActivo = {
  id: string
  codigo: string
  nombreCompleto: string
  puesto: string | null
  sucursal: OpcionSucursal
}

export type OpcionActivoDisponible = {
  id: string
  codigoInterno: string
  tipo: string
  condicion: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
}

export type OpcionesAsignacionActivo = {
  sucursales: OpcionSucursal[]
  sucursal: OpcionSucursal | null
  tipos: OpcionTipoActivo[]
  condiciones: OpcionCondicion[]
  empleados: OpcionEmpleadoActivo[]
  activosDisponibles: OpcionActivoDisponible[]
}

export type DetalleAsignacionActivo = {
  id: string
  activo: {
    id: string
    codigoInterno: string
    tipo: string
    marca: string | null
    modelo: string | null
    numeroSerie: string | null
  }
  condicionEntrega: OpcionCondicion
  notasEntrega: string | null
  estado: EstadoDetalleAsignacionActivo
  fechaDevolucion: string | null
  condicionDevolucion: OpcionCondicion | null
  notasDevolucion: string | null
}

export type AsignacionActivo = {
  id: string
  numeroActa: string
  empleado: { id: string; codigo: string; nombreCompleto: string; puesto: string | null }
  sucursal: OpcionSucursal
  fechaAsignacion: string
  observaciones: string | null
  estado: EstadoAsignacionActivo
  revisionEmpleado: {
    estado: EstadoRevisionAsignacionActivo
    fecha: string | null
    empleadoId: string | null
  }
  cantidadActivos: number
  cantidadPendientes: number
  detalles?: DetalleAsignacionActivo[]
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type AsignacionesPaginadas = {
  items: AsignacionActivo[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAsignacionesParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  estados?: EstadoAsignacionActivo[]
  fechaDesde?: string
  fechaHasta?: string
  orden: 'numero' | 'fecha' | 'empleado' | 'estado'
  direccion: DireccionOrden
}

export type ExportarAsignacionesParametros = Omit<ListarAsignacionesParametros, 'pagina' | 'tamanoPagina'> & {
  formato: FormatoExportacionActivo
}

export type CrearAsignacionRequest = {
  sucursalId: string
  empleadoId: string
  observaciones: string | null
  detalles: { activoId: string; condicionEntregaId: string; notasEntrega: string | null }[]
}

export type RegistrarRevisionEmpleadoRequest = {
  version: number
  decision: 'SIN_DEVOLUCION' | 'SOLICITAR_DEVOLUCION'
  observaciones: string | null
  detalles?: { detalleId: string; motivoSolicitud: string }[]
}

export type CrearSolicitudDevolucionRequest = {
  version: number
  observaciones: string | null
  detalles: { detalleId: string; motivoSolicitud: string }[]
}

export type DetalleDevolucionActivo = {
  id: string
  asignacionDetalleId: string
  activo: {
    id: string
    codigoInterno: string
    tipo: string
    marca: string | null
    modelo: string | null
    numeroSerie: string | null
  }
  motivoSolicitud: string
  condicionEntrega: OpcionCondicion
  condicionRecibida: OpcionCondicion | null
  notasRecepcion: string | null
}

export type DevolucionActivo = {
  id: string
  numero: string
  estado: EstadoDevolucionActivo
  asignacion: { id: string; numeroActa: string; estado: EstadoAsignacionActivo }
  empleado: { id: string; codigo: string; nombreCompleto: string; puesto: string | null }
  sucursal: OpcionSucursal
  solicitadoEn: string
  observacionesSolicitud: string | null
  recibidoPor: { id: string; nombreUsuario: string } | null
  recibidoEn: string | null
  observacionesRecepcion: string | null
  resueltoPor: { id: string; nombreUsuario: string } | null
  resueltoEn: string | null
  motivoDecision: string | null
  cantidadActivos: number
  detalles?: DetalleDevolucionActivo[]
  creadoEn: string
  actualizadoEn: string | null
  version: number
}

export type DevolucionesPaginadas = {
  items: DevolucionActivo[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarDevolucionesParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalIds?: string[]
  estados?: EstadoDevolucionActivo[]
  fechaDesde?: string
  fechaHasta?: string
  orden: 'numero' | 'fecha' | 'empleado' | 'sucursal' | 'estado'
  direccion: DireccionOrden
}

export type ExportarDevolucionesParametros = Omit<ListarDevolucionesParametros, 'pagina' | 'tamanoPagina'> & {
  formato: FormatoExportacionActivo
}

export type RegistrarRecepcionDevolucionRequest = {
  version: number
  observaciones: string | null
  detalles: { devolucionDetalleId: string; condicionRecibidaId: string; notasRecepcion: string | null }[]
}

export type ResolverDevolucionRequest = {
  version: number
  decision: 'APROBAR' | 'RECHAZAR'
  motivo: string
}

export type ConsultaAuditoriaActivo = ConsultaAuditoria
export type AuditoriaActivoPaginada = AuditoriaPaginada
