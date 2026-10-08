export type TipoSucursal = 'FARMACIA' | 'STAND' | 'BODEGA' | 'OFICINA'
export type EstadoSucursal = 'ACTIVO' | 'INACTIVO'
export type OrdenSucursal = 'nombre' | 'codigo' | 'tipo' | 'departamento' | 'municipio' | 'estado'
export type DireccionSucursal = 'asc' | 'desc'

export type Sucursal = {
  id: string
  codigo: string
  nombre: string
  tipo: TipoSucursal
  direccion: string
  departamento: string | null
  municipio: string | null
  telefono: string | null
  correo: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string | null
  inactivadoEn: string | null
  motivoInactivacion: string | null
  version: number
}

export type SucursalesPaginadas = { items: Sucursal[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarSucursalesParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursal?: string
  tipos?: TipoSucursal[]
  departamento?: string
  municipio?: string
  estados?: EstadoSucursal[]
  orden?: OrdenSucursal
  direccion?: DireccionSucursal
}
export type ExportarSucursalesParametros = Omit<ListarSucursalesParametros, 'pagina' | 'tamanoPagina'> & { formato: 'xlsx' | 'pdf' }
export type GuardarSucursalRequest = Omit<Sucursal, 'id' | 'activo' | 'creadoEn' | 'actualizadoEn' | 'inactivadoEn' | 'motivoInactivacion' | 'version'>
export type ActualizarSucursalRequest = GuardarSucursalRequest & { version: number }

export type OperacionAuditoriaSucursal = 'CREAR' | 'ACTUALIZAR' | 'INACTIVAR'
export type OrdenAuditoriaSucursal = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'
export type DetalleAuditoriaSucursal = { id: string; nombrePropiedad: string; etiquetaPropiedad: string | null; tipoDato: string | null; valorAnterior: string | null; valorNuevo: string | null; orden: number }
export type EventoAuditoriaSucursal = { id: string; usuarioNombre: string | null; sucursal: { id: string; codigo: string; nombre: string } | null; tipoOperacion: OperacionAuditoriaSucursal; versionEntidad: number | null; resumen: string | null; ocurridoEn: string; detalles: DetalleAuditoriaSucursal[] }
export type AuditoriaSucursalPaginada = { items: EventoAuditoriaSucursal[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarAuditoriaSucursalParametros = { pagina: number; tamanoPagina: number; fecha?: string; operaciones?: OperacionAuditoriaSucursal[]; usuario?: string; sucursal?: string; resumen?: string; orden?: OrdenAuditoriaSucursal; direccion?: DireccionSucursal }
