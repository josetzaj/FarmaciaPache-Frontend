export type OrdenAuditoria = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'
export type DireccionAuditoria = 'asc' | 'desc'

export type ConsultaAuditoria = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: string[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden: OrdenAuditoria
  direccion: DireccionAuditoria
}

export type DetalleEventoAuditoria = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoria = {
  id: string
  usuarioNombre: string | null
  sucursal: {
    id: string
    codigo: string
    nombre: string
  } | null
  tipoOperacion: string
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleEventoAuditoria[]
}

export type AuditoriaPaginada = {
  items: EventoAuditoria[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type CargarAuditoria = (
  consulta: ConsultaAuditoria,
  signal?: AbortSignal,
) => Promise<AuditoriaPaginada>
