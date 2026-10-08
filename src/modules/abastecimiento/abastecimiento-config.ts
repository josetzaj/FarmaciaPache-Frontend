import type { RecursoAbastecimiento, RegistroAbastecimiento } from './abastecimiento.types'

export type ConfiguracionRecurso = {
  singular: string
  plural: string
  ruta: string
  permisoVer: string
  permisoCrear?: string
  permisoExportar?: string
  claveEstados?: string
  permiteProveedor?: boolean
  permiteModalidad?: boolean
  permiteSucursal?: boolean
}

export const configuracionesAbastecimiento: Record<RecursoAbastecimiento, ConfiguracionRecurso> = {
  proveedores: { singular: 'proveedor', plural: 'Proveedores', ruta: '/abastecimiento/proveedores', permisoVer: 'ABASTECIMIENTO.PROVEEDORES.VER', permisoCrear: 'ABASTECIMIENTO.PROVEEDORES.CREAR', permisoExportar: 'ABASTECIMIENTO.PROVEEDORES.EXPORTAR' },
  solicitudes: { singular: 'solicitud', plural: 'Solicitudes de compra', ruta: '/abastecimiento/solicitudes', permisoVer: 'ABASTECIMIENTO.SOLICITUDES.VER', permisoCrear: 'ABASTECIMIENTO.SOLICITUDES.CREAR', permisoExportar: 'ABASTECIMIENTO.SOLICITUDES.EXPORTAR', claveEstados: 'solicitudes', permiteModalidad: true, permiteSucursal: true },
  cotizaciones: { singular: 'cotización', plural: 'Cotizaciones', ruta: '/abastecimiento/cotizaciones', permisoVer: 'ABASTECIMIENTO.COTIZACIONES.VER', permisoCrear: 'ABASTECIMIENTO.COTIZACIONES.CREAR', permisoExportar: 'ABASTECIMIENTO.COTIZACIONES.EXPORTAR', claveEstados: 'cotizaciones', permiteProveedor: true, permiteModalidad: true, permiteSucursal: true },
  ordenes: { singular: 'orden', plural: 'Órdenes de compra', ruta: '/abastecimiento/ordenes', permisoVer: 'ABASTECIMIENTO.ORDENES.VER', permisoCrear: 'ABASTECIMIENTO.ORDENES.EMITIR', permisoExportar: 'ABASTECIMIENTO.ORDENES.EXPORTAR', claveEstados: 'ordenes', permiteProveedor: true, permiteModalidad: true, permiteSucursal: true },
  recepciones: { singular: 'recepción', plural: 'Recepciones', ruta: '/abastecimiento/recepciones', permisoVer: 'ABASTECIMIENTO.RECEPCIONES.VER', permisoCrear: 'ABASTECIMIENTO.RECEPCIONES.REGISTRAR', permisoExportar: 'ABASTECIMIENTO.RECEPCIONES.EXPORTAR', claveEstados: 'recepciones', permiteProveedor: true, permiteModalidad: true, permiteSucursal: true },
  traslados: { singular: 'traslado', plural: 'Traslados internos', ruta: '/abastecimiento/traslados', permisoVer: 'ABASTECIMIENTO.TRASLADOS.VER', permisoCrear: 'ABASTECIMIENTO.TRASLADOS.CREAR', permisoExportar: 'ABASTECIMIENTO.TRASLADOS.EXPORTAR', claveEstados: 'traslados', permiteSucursal: true },
  devoluciones: { singular: 'devolución', plural: 'Devoluciones a proveedores', ruta: '/abastecimiento/devoluciones', permisoVer: 'ABASTECIMIENTO.DEVOLUCIONES.VER', permisoCrear: 'ABASTECIMIENTO.DEVOLUCIONES.CREAR', permisoExportar: 'ABASTECIMIENTO.DEVOLUCIONES.EXPORTAR', claveEstados: 'devoluciones', permiteProveedor: true, permiteSucursal: true },
}

export const etiquetasEstado: Record<string, string> = {
  BORRADOR: 'Borrador', SOLICITADA: 'Solicitada', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada', EN_COTIZACION: 'En cotización', ADJUDICADA: 'Adjudicada', CANCELADA: 'Cancelada',
  REGISTRADA: 'Registrada', EVALUADA: 'Evaluada', SELECCIONADA: 'Seleccionada', DESCARTADA: 'Descartada',
  EMITIDA: 'Emitida', CONFIRMADA_PROVEEDOR: 'Confirmada por proveedor', RECEPCION_PARCIAL: 'Recepción parcial', RECIBIDA: 'Recibida', CERRADA: 'Cerrada',
  DOCUMENTAL_CONFORME: 'Documental conforme', FISICA_CONFORME: 'Física conforme', TECNICA_CONFORME: 'Técnica conforme',
  SOLICITADO: 'Solicitado', APROBADO: 'Aprobado', PREPARADO: 'Preparado', EN_TRANSITO: 'En tránsito', RECIBIDO: 'Recibido', CERRADO: 'Cerrado', CANCELADO: 'Cancelado',
  APROBACION_INTERNA: 'Aprobación interna', AUTORIZADA_PROVEEDOR: 'Autorizada por proveedor', SEGREGADA: 'Segregada', DESPACHADA: 'Despachada', RECIBIDA_PROVEEDOR: 'Recibida por proveedor', COMPENSADA: 'Compensada',
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', ORDINARIA: 'Ordinaria', URGENTE: 'Urgente',
  DISPONIBLE: 'Disponible', CUARENTENA: 'Cuarentena', BLOQUEADO: 'Bloqueado', SUCURSAL: 'Sucursal', CLIENTE: 'Cliente',
}

export function etiquetaCodigo(valor: string | null | undefined): string {
  if (!valor) return 'Sin dato'
  return etiquetasEstado[valor] ?? valor.toLowerCase().replaceAll('_', ' ').replace(/^./, (letra) => letra.toUpperCase())
}

export function obtenerEstado(registro: RegistroAbastecimiento): string {
  if ('estado' in registro) return registro.estado
  return registro.activo ? 'ACTIVO' : 'INACTIVO'
}

export function obtenerNumero(registro: RegistroAbastecimiento): string {
  if ('numero' in registro) return registro.numero
  if ('numeroProveedor' in registro) return registro.numeroProveedor
  return registro.codigo
}

export function obtenerNombrePrincipal(registro: RegistroAbastecimiento): string {
  if ('nombre' in registro) return registro.nombre
  if ('proveedor' in registro && registro.proveedor) return registro.proveedor.nombre
  if ('orden' in registro && registro.orden?.proveedor) return registro.orden.proveedor.nombre
  if ('referenciaNecesidad' in registro) return registro.referenciaNecesidad
  if ('justificacion' in registro) return registro.justificacion
  if ('motivo' in registro) return registro.motivo
  return obtenerNumero(registro)
}

export function obtenerProveedorId(registro: RegistroAbastecimiento): string | undefined {
  if ('proveedorId' in registro) return registro.proveedorId
  if ('orden' in registro && registro.orden) return registro.orden.proveedorId
  return undefined
}

export function obtenerSucursalId(registro: RegistroAbastecimiento): string | undefined {
  if ('sucursalId' in registro) return registro.sucursalId
  if ('sucursalDestinoId' in registro) return registro.sucursalDestinoId
  if ('orden' in registro && registro.orden) return registro.orden.sucursalDestinoId
  return undefined
}

export function obtenerModalidad(registro: RegistroAbastecimiento): string | undefined {
  if ('modalidad' in registro) return registro.modalidad
  if ('solicitud' in registro && registro.solicitud) return registro.solicitud.modalidad
  if ('orden' in registro && registro.orden) return registro.orden.modalidad
  return undefined
}

export function obtenerFecha(registro: RegistroAbastecimiento): string {
  if ('emitidaEn' in registro) return registro.emitidaEn ?? registro.creadoEn ?? ''
  return registro.creadoEn ?? registro.actualizadoEn ?? ''
}
