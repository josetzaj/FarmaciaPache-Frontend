export type CatalogoMaestroRegistro = { id: string; codigo: string; nombre: string; activo: boolean; creadoEn: string; actualizadoEn: string | null; inactivadoEn: string | null; motivoInactivacion: string | null; version: number; [campo: string]: unknown }
export type DatosCatalogoMaestro = { codigo: string; nombre: string; [campo: string]: string | boolean | number }
export type CatalogosPaginados = { items: CatalogoMaestroRegistro[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ParametrosCatalogo = { pagina: number; tamanoPagina: number; busqueda?: string; estados?: ('ACTIVO' | 'INACTIVO')[]; orden?: 'nombre' | 'codigo' | 'estado'; direccion?: 'asc' | 'desc' }
export type DetalleAuditoriaCatalogo = { id: string; etiquetaPropiedad: string | null; nombrePropiedad: string; valorAnterior: string | null; valorNuevo: string | null }
export type EventoAuditoriaCatalogo = { id: string; ocurridoEn: string; tipoOperacion: string; usuarioNombre: string | null; resumen: string | null; detalles: DetalleAuditoriaCatalogo[] }
export type AuditoriaCatalogo = { items: EventoAuditoriaCatalogo[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type CampoCatalogo = { clave: string; etiqueta: string; tipo: 'texto' | 'textarea' | 'checkbox'; obligatorio?: boolean; maxLength?: number; ayuda?: string }
export type ConfiguracionCatalogo = { recurso: string; ruta: string; permiso: string; singular: string; plural: string; descripcion: string; campos: CampoCatalogo[]; datosIniciales: DatosCatalogoMaestro; validar: (datos: DatosCatalogoMaestro) => Record<string, string> }
