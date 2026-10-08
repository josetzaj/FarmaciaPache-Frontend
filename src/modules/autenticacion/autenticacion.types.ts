export type RolSesion = {
  id: string
  codigo: string
  nombre: string
}

export type SucursalSesion = {
  id: string
  codigo: string
  nombre: string
}

export type SesionUsuario = {
  usuarioId: string
  nombreUsuario: string
  empleadoId: string
  empleadoCodigo: string
  empleadoNombre: string
  estado: string
  debeCambiarContrasena: boolean
  expiraEn: string
  sucursal: SucursalSesion
  roles: RolSesion[]
  permisos: string[]
}

export type IniciarSesionRequest = {
  nombreUsuario: string
  contrasena: string
}

export type RespuestaApi<T> = {
  success: true
  data: T
}
