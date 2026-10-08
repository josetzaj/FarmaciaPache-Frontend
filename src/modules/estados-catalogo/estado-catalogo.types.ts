export type EstadoCatalogo = {
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

export type SituacionEstadoCatalogo = 'ACTIVO' | 'INACTIVO'
export type OrdenEstadoCatalogo = 'nombre' | 'codigo' | 'estado'
export type DireccionEstadoCatalogo = 'asc' | 'desc'

export type EstadosCatalogoPaginados = {
  items: EstadoCatalogo[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarEstadosCatalogoParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  estado?: string
  estados?: SituacionEstadoCatalogo[]
  orden?: OrdenEstadoCatalogo
  direccion?: DireccionEstadoCatalogo
}

export type ExportarEstadosCatalogoParametros = Omit<ListarEstadosCatalogoParametros, 'pagina' | 'tamanoPagina'> & {
  formato: 'xlsx' | 'pdf'
}

export type GuardarEstadoCatalogoRequest = {
  codigo: string
  nombre: string
  descripcion: string | null
}

export type ActualizarEstadoCatalogoRequest = GuardarEstadoCatalogoRequest & {
  version: number
}

export type OperacionAuditoriaEstadoCatalogo = 'CREAR' | 'ACTUALIZAR' | 'INACTIVAR'
export type OrdenAuditoriaEstadoCatalogo = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'

export type DetalleAuditoriaEstadoCatalogo = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaEstadoCatalogo = {
  id: string
  usuarioNombre: string | null
  sucursal: { id: string; codigo: string; nombre: string } | null
  tipoOperacion: OperacionAuditoriaEstadoCatalogo
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaEstadoCatalogo[]
}

export type AuditoriaEstadoCatalogoPaginada = {
  items: EventoAuditoriaEstadoCatalogo[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarAuditoriaEstadoCatalogoParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: OperacionAuditoriaEstadoCatalogo[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden?: OrdenAuditoriaEstadoCatalogo
  direccion?: DireccionEstadoCatalogo
}
