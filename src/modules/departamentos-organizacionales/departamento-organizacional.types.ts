export type DepartamentoOrganizacional = {
  id: string
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

export type EstadoDepartamentoOrganizacional = 'ACTIVO' | 'INACTIVO'
export type OrdenDepartamentoOrganizacional = 'nombre' | 'codigo' | 'estado'
export type DireccionDepartamentoOrganizacional = 'asc' | 'desc'

export type DepartamentosOrganizacionalesPaginados = {
  items: DepartamentoOrganizacional[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarDepartamentosOrganizacionalesParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  departamento?: string
  estados?: EstadoDepartamentoOrganizacional[]
  orden?: OrdenDepartamentoOrganizacional
  direccion?: DireccionDepartamentoOrganizacional
}

export type ExportarDepartamentosOrganizacionalesParametros = Omit<ListarDepartamentosOrganizacionalesParametros, 'pagina' | 'tamanoPagina'> & {
  formato: 'xlsx' | 'pdf'
}

export type GuardarDepartamentoOrganizacionalRequest = {
  codigo: string
  nombre: string
  descripcion: string | null
}

export type ActualizarDepartamentoOrganizacionalRequest = GuardarDepartamentoOrganizacionalRequest & { version: number }
export type OperacionAuditoriaDepartamentoOrganizacional = 'CREAR' | 'ACTUALIZAR' | 'INACTIVAR'
export type OrdenAuditoriaDepartamentoOrganizacional = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'

export type DetalleAuditoriaDepartamentoOrganizacional = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaDepartamentoOrganizacional = {
  id: string
  usuarioNombre: string | null
  sucursal: { id: string; codigo: string; nombre: string } | null
  tipoOperacion: OperacionAuditoriaDepartamentoOrganizacional
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaDepartamentoOrganizacional[]
}

export type AuditoriaDepartamentoOrganizacionalPaginada = {
  items: EventoAuditoriaDepartamentoOrganizacional[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAuditoriaDepartamentoOrganizacionalParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: OperacionAuditoriaDepartamentoOrganizacional[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden?: OrdenAuditoriaDepartamentoOrganizacional
  direccion?: DireccionDepartamentoOrganizacional
}
