import { abrirPdfApi, descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import { solicitarApi } from '../../shared/api/cliente-api'
import type { FormatoExportacion } from '../../shared/components/boton-exportar'
import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'
import type {
  ConsultaAbastecimiento,
  ActualizarProveedorRequest,
  CancelarSolicitudCompraRequest,
  CerrarOrdenCompraRequest,
  ConfirmarRecepcionCompraRequest,
  CotizacionCompra,
  CrearCotizacionCompraRequest,
  CrearOrdenCompraRequest,
  CrearRecepcionCompraRequest,
  CrearSolicitudCompraRequest,
  EvaluacionProveedor,
  EvaluarCotizacionCompraRequest,
  EvaluarProveedorRequest,
  GuardarProveedorRequest,
  LoteAbastecimiento,
  OpcionesFiltrosAbastecimiento,
  PaginacionAbastecimiento,
  ProductoAbastecimiento,
  ProveedorAbastecimiento,
  OrdenCompra,
  RecepcionCompra,
  RecepcionElegibleDevolucion,
  RecursoAbastecimiento,
  RegistroAbastecimiento,
  ResolverSolicitudCompraRequest,
  RegularizarDocumentoRecepcionRequest,
  SolicitudCompra,
  UbicacionAbastecimiento,
} from './abastecimiento.types'

type RespuestaApi<T> = { success: true; data: T }

const rutas: Record<RecursoAbastecimiento, string> = {
  proveedores: '/proveedores',
  solicitudes: '/compras/solicitudes',
  cotizaciones: '/compras/cotizaciones',
  ordenes: '/compras/ordenes',
  recepciones: '/compras/recepciones',
  traslados: '/traslados-internos',
  devoluciones: '/devoluciones-proveedor',
}

function consultaUrl(parametros: Record<string, unknown>): string {
  const consulta = new URLSearchParams()
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return
    consulta.set(clave, Array.isArray(valor) ? valor.join(',') : String(valor))
  })
  const texto = consulta.toString()
  return texto ? `?${texto}` : ''
}

function enteroRespuesta(valor: unknown, respaldo: number, minimo = 0): number {
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= minimo ? Math.trunc(numero) : respaldo
}

export async function obtenerOpcionesAbastecimiento(signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesFiltrosAbastecimiento>>('/abastecimiento/opciones-filtros', { signal })
  return respuesta.data
}

export async function listarRegistrosAbastecimiento<T extends RegistroAbastecimiento>(recurso: RecursoAbastecimiento, parametros: ConsultaAbastecimiento, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<PaginacionAbastecimiento<T>>>(`${rutas[recurso]}${consultaUrl(parametros)}`, { signal })
  return {
    ...respuesta.data,
    pagina: enteroRespuesta(respuesta.data.pagina, parametros.pagina, 1),
    tamanoPagina: enteroRespuesta(respuesta.data.tamanoPagina, parametros.tamanoPagina, 1),
    total: enteroRespuesta(respuesta.data.total, 0),
    totalPaginas: enteroRespuesta(respuesta.data.totalPaginas, 0),
  }
}

export async function listarTodosRegistrosAbastecimiento<T extends RegistroAbastecimiento>(recurso: RecursoAbastecimiento, criterios: Omit<ConsultaAbastecimiento, 'pagina' | 'tamanoPagina'>, signal?: AbortSignal) {
  const primera = await listarRegistrosAbastecimiento<T>(recurso, { ...criterios, pagina: 1, tamanoPagina: 200 }, signal)
  if (primera.totalPaginas <= 1) return primera.items
  const restantes = await Promise.all(Array.from({ length: primera.totalPaginas - 1 }, (_, indice) => listarRegistrosAbastecimiento<T>(recurso, { ...criterios, pagina: indice + 2, tamanoPagina: 200 }, signal)))
  return [primera.items, ...restantes.map((pagina) => pagina.items)].flat()
}

export async function obtenerRegistroAbastecimiento<T extends RegistroAbastecimiento>(recurso: RecursoAbastecimiento, id: string, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<T>>(`${rutas[recurso]}/${id}`, { signal })
  return respuesta.data
}

export async function crearRegistroAbastecimiento<T extends RegistroAbastecimiento>(recurso: RecursoAbastecimiento, datos: unknown) {
  const respuesta = await solicitarApi<RespuestaApi<T>>(rutas[recurso], { method: 'POST', datos })
  return respuesta.data
}

export async function crearProveedor(datos: GuardarProveedorRequest) {
  const respuesta = await solicitarApi<RespuestaApi<ProveedorAbastecimiento>>('/proveedores', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarProveedor(id: string, datos: ActualizarProveedorRequest) {
  const respuesta = await solicitarApi<RespuestaApi<ProveedorAbastecimiento>>(`/proveedores/${id}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function inactivarProveedor(id: string, version: number) {
  const respuesta = await solicitarApi<RespuestaApi<ProveedorAbastecimiento>>(`/proveedores/${id}/inactivacion`, { method: 'PATCH', datos: { version } })
  return respuesta.data
}

export async function ejecutarAccionAbastecimiento<T extends RegistroAbastecimiento>(recurso: RecursoAbastecimiento, id: string, accion: string, datos: unknown) {
  const respuesta = await solicitarApi<RespuestaApi<T>>(`${rutas[recurso]}/${id}/${accion}`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function listarProductosAbastecimiento(busqueda = '', signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<ProductoAbastecimiento[]>>(`/abastecimiento/productos${consultaUrl({ busqueda, limite: 100 })}`, { signal })
  return respuesta.data
}

export async function listarUbicacionesAbastecimiento(sucursalId: string, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<UbicacionAbastecimiento[]>>(`/abastecimiento/ubicaciones${consultaUrl({ sucursalId })}`, { signal })
  return respuesta.data
}

export async function listarLotesAbastecimiento(sucursalId: string, ubicacionId: string, productoId: string, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<LoteAbastecimiento[]>>(`/abastecimiento/lotes${consultaUrl({ sucursalId, ubicacionId, productoId })}`, { signal })
  return respuesta.data
}

export async function listarRecepcionesElegiblesDevolucion(parametros: { proveedorId?: string; ubicacionId?: string; busqueda?: string; limite?: number }, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<RecepcionElegibleDevolucion[]>>(`/abastecimiento/devoluciones/recepciones-elegibles${consultaUrl({ ...parametros, limite: parametros.limite ?? 100 })}`, { signal })
  return respuesta.data
}

export async function listarEvaluacionesProveedor(proveedorId: string, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<EvaluacionProveedor[]>>(`/proveedores/${proveedorId}/evaluaciones`, { signal })
  return respuesta.data
}

export async function evaluarProveedor(proveedorId: string, datos: EvaluarProveedorRequest) {
  const respuesta = await solicitarApi<RespuestaApi<EvaluacionProveedor>>(`/proveedores/${proveedorId}/evaluaciones`, { method: 'POST', datos })
  return respuesta.data
}

export async function crearSolicitudCompra(datos: CrearSolicitudCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudCompra>>('/compras/solicitudes', { method: 'POST', datos })
  return respuesta.data
}

export async function crearCotizacionCompra(datos: CrearCotizacionCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<CotizacionCompra>>('/compras/cotizaciones', { method: 'POST', datos })
  return respuesta.data
}

export async function evaluarCotizacionCompra(id: string, datos: EvaluarCotizacionCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<CotizacionCompra>>(`/compras/cotizaciones/${id}/evaluacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function crearOrdenCompra(datos: CrearOrdenCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<OrdenCompra>>('/compras/ordenes', { method: 'POST', datos })
  return respuesta.data
}

export async function confirmarOrdenCompra(id: string, datos: { version: number; motivo: string }) {
  const respuesta = await solicitarApi<RespuestaApi<OrdenCompra>>(`/compras/ordenes/${id}/confirmacion-proveedor`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function cerrarOrdenCompra(id: string, datos: CerrarOrdenCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<OrdenCompra>>(`/compras/ordenes/${id}/cierre`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function cancelarOrdenCompra(id: string, datos: { version: number; motivo: string }) {
  const respuesta = await solicitarApi<RespuestaApi<OrdenCompra>>(`/compras/ordenes/${id}/cancelacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function crearRecepcionCompra(datos: CrearRecepcionCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<RecepcionCompra>>('/compras/recepciones', { method: 'POST', datos })
  return respuesta.data
}

export async function confirmarRecepcionCompra(id: string, datos: ConfirmarRecepcionCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<RecepcionCompra>>(`/compras/recepciones/${id}/confirmacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function regularizarDocumentoRecepcion(id: string, datos: RegularizarDocumentoRecepcionRequest) {
  const respuesta = await solicitarApi<RespuestaApi<RecepcionCompra>>(`/compras/recepciones/${id}/documento`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function resolverSolicitudCompra(id: string, datos: ResolverSolicitudCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudCompra>>(`/compras/solicitudes/${id}/resolucion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function cancelarSolicitudCompra(id: string, datos: CancelarSolicitudCompraRequest) {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudCompra>>(`/compras/solicitudes/${id}/cancelacion`, { method: 'PATCH', datos })
  return respuesta.data
}

export async function listarAuditoriaAbastecimiento(recurso: RecursoAbastecimiento, id: string, parametros: ConsultaAuditoria, signal?: AbortSignal) {
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaPaginada>>(`${rutas[recurso]}/${id}/auditoria${consultaUrl(parametros)}`, { signal })
  return respuesta.data
}

export async function exportarAbastecimiento(recurso: RecursoAbastecimiento, formato: FormatoExportacion, parametros: Omit<ConsultaAbastecimiento, 'pagina' | 'tamanoPagina'>) {
  await descargarArchivoApi(`${rutas[recurso]}/exportaciones`, {
    method: 'POST',
    datos: { ...parametros, formato },
    nombreArchivoAlternativo: `${recurso}.${formato}`,
  })
}

export async function abrirPdfSolicitudCompra(id: string) {
  await abrirPdfApi(`/compras/solicitudes/${id}/documento-pdf`, { method: 'GET', nombreArchivoAlternativo: `solicitud_compra_${id}.pdf` })
}

export async function abrirPdfSolicitudCotizacion(id: string, proveedorId: string) {
  await abrirPdfApi(`/compras/solicitudes/${id}/solicitud-cotizacion-pdf`, { method: 'POST', datos: { proveedorId }, nombreArchivoAlternativo: `solicitud_cotizacion_${id}.pdf` })
}

export async function abrirPdfCotizacionCompra(id: string) {
  await abrirPdfApi(`/compras/cotizaciones/${id}/documento-pdf`, { method: 'GET', nombreArchivoAlternativo: `cotizacion_${id}.pdf` })
}

export async function abrirPdfOrdenCompra(id: string) {
  await abrirPdfApi(`/compras/ordenes/${id}/documento-pdf`, { method: 'GET', nombreArchivoAlternativo: `orden_compra_${id}.pdf` })
}
