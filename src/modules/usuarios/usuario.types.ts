export type EstadoUsuario = 'PENDIENTE_ACTIVACION' | 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO'
export type RolAsignadoUsuario = { id: string; codigo: string; nombre: string; vigenteDesde: string; vigenteHasta: string | null }
export type Usuario = {
  id: string
  empleadoId: string
  empleadoCodigo: string
  empleadoNombre: string
  empleadoCorreo: string
  nombreUsuario: string
  estado: EstadoUsuario
  debeCambiarContrasena: boolean
  bloqueadoHasta: string | null
  ultimoAccesoEn: string | null
  ultimoCambioContrasenaEn: string | null
  creadoEn: string
  actualizadoEn: string | null
  inactivadoEn: string | null
  motivoInactivacion: string | null
  version: number
  roles: RolAsignadoUsuario[]
}
export type UsuarioCreado = Usuario & { activacionEnviadaA: string; activacionExpiraEn: string }
export type EmpleadoDisponibleUsuario = { id: string; codigo: string; nombre: string; correo: string }
export type RolDisponibleUsuario = { id: string; codigo: string; nombre: string; descripcion: string | null; activo: boolean }
export type OpcionesFormularioUsuario = { empleados: EmpleadoDisponibleUsuario[]; roles: RolDisponibleUsuario[] }
export type AsignacionRolUsuarioRequest = { rolId: string; vigenteHasta: string | null }
export type CrearUsuarioRequest = { empleadoId: string; nombreUsuario: string; roles: AsignacionRolUsuarioRequest[] }
export type ActualizarUsuarioRequest = { version: number; nombreUsuario: string }
export type AsignarRolesUsuarioRequest = { version: number; roles: AsignacionRolUsuarioRequest[] }

export type OrdenUsuario = 'usuario' | 'empleado' | 'estado' | 'ultimoAcceso'
export type DireccionUsuario = 'asc' | 'desc'
export type ListarUsuariosParametros = { pagina: number; tamanoPagina: number; busqueda?: string; usuario?: string; empleado?: string; rolIds?: string[]; estados?: EstadoUsuario[]; orden?: OrdenUsuario; direccion?: DireccionUsuario }
export type UsuariosPaginados = { items: Usuario[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ExportarUsuariosParametros = Omit<ListarUsuariosParametros, 'pagina' | 'tamanoPagina'> & { formato: 'xlsx' | 'pdf' }

export type OperacionAuditoriaUsuario = 'CREAR' | 'ACTUALIZAR' | 'ASIGNAR_ROLES' | 'REENVIAR_ACTIVACION' | 'INACTIVAR'
export type OrdenAuditoriaUsuario = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'
export type DetalleAuditoriaUsuario = { id: string; nombrePropiedad: string; etiquetaPropiedad: string | null; tipoDato: string | null; valorAnterior: string | null; valorNuevo: string | null; orden: number }
export type EventoAuditoriaUsuario = { id: string; usuarioNombre: string | null; sucursal: { id: string; codigo: string; nombre: string } | null; tipoOperacion: OperacionAuditoriaUsuario; versionEntidad: number | null; resumen: string | null; ocurridoEn: string; detalles: DetalleAuditoriaUsuario[] }
export type AuditoriaUsuarioPaginada = { items: EventoAuditoriaUsuario[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarAuditoriaUsuarioParametros = { pagina: number; tamanoPagina: number; fecha?: string; operaciones?: OperacionAuditoriaUsuario[]; usuario?: string; sucursal?: string; resumen?: string; orden?: OrdenAuditoriaUsuario; direccion?: DireccionUsuario }
