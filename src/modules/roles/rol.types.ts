export type PermisoRol = {
  id: string
  codigo: string
  nombre: string
  accion: string
}

export type Rol = {
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
  permisos: PermisoRol[]
}

export type EstadoRol = 'ACTIVO' | 'INACTIVO'
export type OrdenRol = 'rol' | 'estado'
export type DireccionOrdenRol = 'asc' | 'desc'

export type RolesPaginados = {
  items: Rol[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarRolesParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  rol?: string
  permisoIds?: string[]
  estados?: EstadoRol[]
  orden?: OrdenRol
  direccion?: DireccionOrdenRol
}

export type ExportarRolesParametros = Omit<ListarRolesParametros, 'pagina' | 'tamanoPagina'> & {
  formato: 'xlsx' | 'pdf'
}

export type CrearRolRequest = {
  codigo: string
  nombre: string
  descripcion: string | null
  permisosIds: string[]
}

export type ActualizarRolRequest = {
  version: number
  codigo: string
  nombre: string
  descripcion: string | null
}

export type PermisoCatalogo = {
  id: string
  codigo: string
  nombre: string
  accion: string
  descripcion: string | null
}

export type SubmoduloCatalogoPermisos = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  orden: number
  permisos: PermisoCatalogo[]
}

export type ModuloCatalogoPermisos = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  orden: number
  permisosDirectos: PermisoCatalogo[]
  submodulos: SubmoduloCatalogoPermisos[]
}

export type CatalogoPermisos = {
  modulos: ModuloCatalogoPermisos[]
}

export type OperacionAuditoriaRol =
  | 'CREAR'
  | 'ACTUALIZAR'
  | 'ASIGNAR_PERMISOS'
  | 'INACTIVAR'

export type OrdenAuditoriaRol = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'

export type DetalleAuditoriaRol = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaRol = {
  id: string
  usuarioNombre: string | null
  sucursal: { id: string; codigo: string; nombre: string } | null
  tipoOperacion: OperacionAuditoriaRol
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaRol[]
}

export type AuditoriaRolPaginada = {
  items: EventoAuditoriaRol[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAuditoriaRolParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: OperacionAuditoriaRol[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden?: OrdenAuditoriaRol
  direccion?: DireccionOrdenRol
}
