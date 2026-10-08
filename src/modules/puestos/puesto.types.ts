export type Puesto = {
  id: string
  departamentoOrganizacionalId: string
  departamentoOrganizacionalCodigo: string
  departamentoOrganizacionalNombre: string
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string | null
  inactivadoEn: string | null
  motivoInactivacion: string | null
  version: number
}

export type DepartamentoDisponiblePuesto = {
  id: string
  codigo: string
  nombre: string
  activo: boolean
}

export type EstadoPuesto = 'ACTIVO' | 'INACTIVO'
export type OrdenPuesto = 'nombre' | 'codigo' | 'departamento' | 'estado'
export type DireccionPuesto = 'asc' | 'desc'

export type PuestosPaginados = {
  items: Puesto[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarPuestosParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  puesto?: string
  departamentos?: string[]
  estados?: EstadoPuesto[]
  orden?: OrdenPuesto
  direccion?: DireccionPuesto
}

export type ExportarPuestosParametros = Omit<ListarPuestosParametros, 'pagina' | 'tamanoPagina'> & {
  formato: 'xlsx' | 'pdf'
}

export type GuardarPuestoRequest = {
  departamentoOrganizacionalId: string
  codigo: string
  nombre: string
  descripcion: string | null
}

export type ActualizarPuestoRequest = GuardarPuestoRequest & { version: number }
export type OperacionAuditoriaPuesto = 'CREAR' | 'ACTUALIZAR' | 'INACTIVAR'
export type OrdenAuditoriaPuesto = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'

export type DetalleAuditoriaPuesto = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaPuesto = {
  id: string
  usuarioNombre: string | null
  sucursal: { id: string; codigo: string; nombre: string } | null
  tipoOperacion: OperacionAuditoriaPuesto
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaPuesto[]
}

export type AuditoriaPuestoPaginada = {
  items: EventoAuditoriaPuesto[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAuditoriaPuestoParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: OperacionAuditoriaPuesto[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden?: OrdenAuditoriaPuesto
  direccion?: DireccionPuesto
}
