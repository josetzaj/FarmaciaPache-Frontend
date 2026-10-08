export type CrearEmpleadoRequest = {
  codigo: string
  primerNombre: string
  segundoNombre: string | null
  tercerNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  apellidoCasada: string | null
  dpi: string
  fechaNacimiento: string
  correo: string | null
  telefono: string | null
  puestoId: string
  municipioId: string
  direccion: string
  fechaContratacion: string
  sucursalId: string
  fechaInicio: string
}

export type ActualizarEmpleadoRequest = Omit<
  CrearEmpleadoRequest,
  'sucursalId' | 'fechaInicio'
> & {
  version: number
}

export type CambiarSucursalEmpleadoRequest = {
  version: number
  sucursalId: string
  fechaInicio: string
  motivoCambio: string
}

export type EstadoEmpleado = 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO' | 'RETIRADO'

export type CambiarEstadoEmpleadoRequest = {
  version: number
  estado: EstadoEmpleado
  motivo: string
}

export type AsignacionSucursalEmpleado = {
  id: string
  sucursalId: string
  sucursalCodigo: string
  sucursalNombre: string
  fechaInicio: string
  fechaFin: string | null
  esPrincipal: boolean
  estado: 'ACTIVA' | 'FINALIZADA' | 'INACTIVA'
  motivoCambio: string | null
}

export type PuestoEmpleado = {
  id: string
  codigo: string
  nombre: string
  departamentoOrganizacional: {
    id: string
    codigo: string
    nombre: string
  }
}

export type MunicipioEmpleado = {
  id: string
  codigo: string
  nombre: string
  departamentoGeografico: {
    id: string
    codigo: string
    nombre: string
  }
}

export type Empleado = {
  id: string
  codigo: string
  primerNombre: string
  segundoNombre: string | null
  tercerNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  apellidoCasada: string | null
  dpi: string
  fechaNacimiento: string
  correo: string | null
  telefono: string | null
  puestoId: string | null
  puesto: PuestoEmpleado | null
  municipioId: string | null
  municipio: MunicipioEmpleado | null
  direccion: string | null
  direccionCompleta: string | null
  fechaContratacion: string
  fechaRetiro: string | null
  motivoEstado: string | null
  fotoUrl: string | null
  fotoTipoMime: string | null
  fotoTamanoBytes: number | null
  estado: EstadoEmpleado
  version: number
  asignacionActual: AsignacionSucursalEmpleado | null
  historialSucursales: AsignacionSucursalEmpleado[]
}

export type EmpleadoCreado = Empleado

export type EmpleadosPaginados = {
  items: Empleado[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type OperacionAuditoriaEmpleado =
  | 'CREAR'
  | 'ACTUALIZAR'
  | 'ACTUALIZAR_FOTO'
  | 'ELIMINAR_FOTO'
  | 'CAMBIAR_SUCURSAL'
  | 'CAMBIAR_ESTADO'
  | 'INACTIVAR'

export type OrdenAuditoriaEmpleado =
  | 'fecha'
  | 'operacion'
  | 'usuario'
  | 'sucursal'
  | 'resumen'

export type DetalleAuditoriaEmpleado = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaEmpleado = {
  id: string
  usuarioNombre: string | null
  sucursal: {
    id: string
    codigo: string
    nombre: string
  } | null
  tipoOperacion: OperacionAuditoriaEmpleado
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaEmpleado[]
}

export type AuditoriaEmpleadoPaginada = {
  items: EventoAuditoriaEmpleado[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAuditoriaEmpleadoParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: OperacionAuditoriaEmpleado[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden?: OrdenAuditoriaEmpleado
  direccion?: DireccionOrden
}

export type ListarEmpleadosParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  empleado?: string
  contacto?: string
  puestoIds?: string[]
  sucursalIds?: string[]
  estados?: EstadoEmpleado[]
  orden?: OrdenEmpleado
  direccion?: DireccionOrden
}

export type ExportarEmpleadosParametros = Omit<
  ListarEmpleadosParametros,
  'pagina' | 'tamanoPagina'
> & {
  formato: 'xlsx' | 'pdf'
}

export type OrdenEmpleado = 'empleado' | 'puesto' | 'contacto' | 'estado'
export type DireccionOrden = 'asc' | 'desc'

export type OpcionesFiltrosEmpleado = {
  puestos: PuestoCatalogo[]
  sucursales: SucursalCatalogo[]
}

export type PuestoCatalogo = {
  id: string
  codigo: string
  nombre: string
  departamentoOrganizacionalNombre: string
  activo: boolean
}

export type SucursalCatalogo = {
  id: string
  codigo: string
  nombre: string
  activo: boolean
}

export type DepartamentoGeograficoCatalogo = {
  id: string
  codigo: string
  nombre: string
}

export type MunicipioCatalogo = {
  id: string
  departamentoGeograficoId: string
  codigo: string
  nombre: string
}

export type CatalogosEmpleado = {
  puestos: PuestoCatalogo[]
  sucursales: SucursalCatalogo[]
  departamentos: DepartamentoGeograficoCatalogo[]
}
