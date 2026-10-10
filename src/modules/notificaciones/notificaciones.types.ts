export type PrioridadNotificacion = 'INFORMATIVA' | 'ADVERTENCIA' | 'CRITICA'
export type AlcanceNotificacion = 'USUARIO' | 'PERMISO_SUCURSAL' | 'PERMISO_GLOBAL'
export type EstadoLecturaNotificacion = 'TODAS' | 'NO_LEIDAS' | 'LEIDAS'
export type OrdenNotificacion = 'fecha' | 'titulo' | 'modulo'
export type DireccionNotificacion = 'asc' | 'desc'

export type Notificacion = {
  id: string
  tipo: string
  modulo: string
  submodulo: string | null
  titulo: string
  mensaje: string
  prioridad: PrioridadNotificacion
  alcance: AlcanceNotificacion
  sucursalId: string | null
  entidadTipo: string | null
  entidadId: string | null
  ruta: string | null
  creadoEn: string
  expiraEn: string | null
  leidaEn: string | null
  archivadaEn: string | null
}

export type ResumenNotificaciones = {
  noLeidas: number
  criticasNoLeidas: number
  ultimaCreadaEn: string | null
}

export type NotificacionesPaginadas = {
  items: Notificacion[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ConsultaNotificaciones = {
  pagina: number
  tamanoPagina: 50 | 100 | 150 | 200
  estadoLectura?: EstadoLecturaNotificacion
  incluirArchivadas?: boolean
  busqueda?: string
  prioridades?: PrioridadNotificacion[]
  modulos?: string[]
  tipos?: string[]
  orden?: OrdenNotificacion
  direccion?: DireccionNotificacion
}
