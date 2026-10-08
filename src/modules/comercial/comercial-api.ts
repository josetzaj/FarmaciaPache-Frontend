import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarClienteRequest,
  ActualizarPoliticaMargenRequest,
  AuditoriaComercialPaginada,
  ClienteComercial,
  ConsultaAuditoriaComercial,
  ConsultaComercial,
  FiltrosExportacionComercial,
  GuardarClienteRequest,
  GuardarPoliticaMargenRequest,
  OpcionesComercial,
  Paginado,
  PoliticaMargen,
  PrecioProducto,
  CrearPrecioRequest,
  GuardarVentaRequest,
  RecetaVenta,
  RecetaValidacion,
  ResultadoValidacionReceta,
  VentaComercial,
} from './comercial.types'

type RespuestaApi<T> = { success: true; data: T }
type RecursoComercial = 'clientes' | 'politicas-margen' | 'precios' | 'ventas' | 'recetas'

function fechaArchivoActual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function consultaListado(parametros: ConsultaComercial): string {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.tipos?.length) consulta.set('tipos', parametros.tipos.join(','))
  if (parametros.sucursalIds?.length) consulta.set('sucursalIds', parametros.sucursalIds.join(','))
  if (parametros.productoIds?.length) consulta.set('productoIds', parametros.productoIds.join(','))
  if (parametros.clienteIds?.length) consulta.set('clienteIds', parametros.clienteIds.join(','))
  if (parametros.estadosPago?.length) consulta.set('estadosPago', parametros.estadosPago.join(','))
  if (parametros.estadosDispensacion?.length) consulta.set('estadosDispensacion', parametros.estadosDispensacion.join(','))
  if (parametros.estadosFiscales?.length) consulta.set('estadosFiscales', parametros.estadosFiscales.join(','))
  if (parametros.desde) consulta.set('desde', parametros.desde)
  if (parametros.hasta) consulta.set('hasta', parametros.hasta)
  if (parametros.totalMin !== undefined) consulta.set('totalMin', String(parametros.totalMin))
  if (parametros.totalMax !== undefined) consulta.set('totalMax', String(parametros.totalMax))
  if (parametros.precioMin !== undefined) consulta.set('precioMin', String(parametros.precioMin))
  if (parametros.precioMax !== undefined) consulta.set('precioMax', String(parametros.precioMax))
  if (parametros.margenMin !== undefined) consulta.set('margenMin', String(parametros.margenMin))
  if (parametros.margenMax !== undefined) consulta.set('margenMax', String(parametros.margenMax))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)
  return consulta.toString()
}

function consultaAuditoria(parametros: ConsultaAuditoriaComercial): string {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden, direccion: parametros.direccion,
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  return consulta.toString()
}

function rutaRecurso(recurso: RecursoComercial): string {
  if (recurso === 'clientes') return '/clientes'
  if (recurso === 'politicas-margen') return '/comercial/politicas-margen'
  if (recurso === 'precios') return '/comercial/precios'
  if (recurso === 'recetas') return '/ventas/recetas'
  return '/ventas'
}

export async function obtenerOpcionesComercial(signal?: AbortSignal): Promise<OpcionesComercial> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesComercial>>('/comercial/opciones-filtros', { signal })
  return respuesta.data
}

export async function listarClientes(parametros: ConsultaComercial, signal?: AbortSignal): Promise<Paginado<ClienteComercial>> {
  const respuesta = await solicitarApi<RespuestaApi<Paginado<ClienteComercial>>>(`/clientes?${consultaListado(parametros)}`, { signal })
  return respuesta.data
}

export async function obtenerCliente(id: string, signal?: AbortSignal): Promise<ClienteComercial> {
  const respuesta = await solicitarApi<RespuestaApi<ClienteComercial>>(`/clientes/${id}`, { signal })
  return respuesta.data
}

export async function crearCliente(datos: GuardarClienteRequest): Promise<ClienteComercial> {
  const respuesta = await solicitarApi<RespuestaApi<ClienteComercial>>('/clientes', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarCliente(id: string, datos: ActualizarClienteRequest): Promise<ClienteComercial> {
  const respuesta = await solicitarApi<RespuestaApi<ClienteComercial>>(`/clientes/${id}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function listarPoliticasMargen(parametros: ConsultaComercial, signal?: AbortSignal): Promise<Paginado<PoliticaMargen>> {
  const respuesta = await solicitarApi<RespuestaApi<Paginado<PoliticaMargen>>>(`/comercial/politicas-margen?${consultaListado(parametros)}`, { signal })
  return respuesta.data
}

export async function listarPrecios(parametros: ConsultaComercial, signal?: AbortSignal): Promise<Paginado<PrecioProducto>> {
  const respuesta = await solicitarApi<RespuestaApi<Paginado<PrecioProducto>>>(`/comercial/precios?${consultaListado(parametros)}`, { signal })
  return respuesta.data
}

export async function obtenerPrecio(id: string, signal?: AbortSignal): Promise<PrecioProducto> {
  const respuesta = await solicitarApi<RespuestaApi<PrecioProducto>>(`/comercial/precios/${id}`, { signal })
  return respuesta.data
}

export async function crearPrecio(datos: CrearPrecioRequest): Promise<PrecioProducto> {
  const respuesta = await solicitarApi<RespuestaApi<PrecioProducto>>('/comercial/precios', { method: 'POST', datos })
  return respuesta.data
}

export async function aprobarPrecio(id: string, version: number, motivo: string): Promise<PrecioProducto> {
  const respuesta = await solicitarApi<RespuestaApi<PrecioProducto>>(`/comercial/precios/${id}/aprobacion`, { method: 'PATCH', datos: { version, motivo } })
  return respuesta.data
}

export async function listarVentas(parametros: ConsultaComercial, signal?: AbortSignal): Promise<Paginado<VentaComercial>> {
  const respuesta = await solicitarApi<RespuestaApi<Paginado<VentaComercial>>>(`/ventas?${consultaListado(parametros)}`, { signal })
  return respuesta.data
}

export async function listarRecetas(parametros: ConsultaComercial, signal?: AbortSignal): Promise<Paginado<RecetaValidacion>> {
  const respuesta = await solicitarApi<RespuestaApi<Paginado<RecetaValidacion>>>(`/ventas/recetas?${consultaListado(parametros)}`, { signal })
  return respuesta.data
}

export async function obtenerReceta(id: string, signal?: AbortSignal): Promise<RecetaValidacion> {
  const respuesta = await solicitarApi<RespuestaApi<RecetaValidacion>>(`/ventas/recetas/${id}`, { signal })
  return respuesta.data
}

export async function obtenerVenta(id: string, signal?: AbortSignal): Promise<VentaComercial> {
  const respuesta = await solicitarApi<RespuestaApi<VentaComercial>>(`/ventas/${id}`, { signal })
  return respuesta.data
}

export async function crearVenta(datos: GuardarVentaRequest): Promise<VentaComercial> {
  const respuesta = await solicitarApi<RespuestaApi<VentaComercial>>('/ventas', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarVenta(id: string, version: number, datos: GuardarVentaRequest): Promise<VentaComercial> {
  const respuesta = await solicitarApi<RespuestaApi<VentaComercial>>(`/ventas/${id}`, { method: 'PUT', datos: { ...datos, version } })
  return respuesta.data
}

export async function validarRecetaVenta(ventaId: string, recetaId: string, version: number, resultado: Exclude<ResultadoValidacionReceta, 'PENDIENTE'>, motivo: string | null): Promise<RecetaVenta> {
  const respuesta = await solicitarApi<RespuestaApi<RecetaVenta>>(`/ventas/${ventaId}/recetas/${recetaId}/validacion`, { method: 'PATCH', datos: { version, resultado, motivo } })
  return respuesta.data
}

export async function prepararVentaParaCobro(id: string, version: number, motivo: string): Promise<VentaComercial> {
  const respuesta = await solicitarApi<RespuestaApi<VentaComercial>>(`/ventas/${id}/preparacion-cobro`, { method: 'PATCH', datos: { version, motivo } })
  return respuesta.data
}

export async function anularVenta(id: string, version: number, motivo: string): Promise<VentaComercial> {
  const respuesta = await solicitarApi<RespuestaApi<VentaComercial>>(`/ventas/${id}/anulacion`, { method: 'PATCH', datos: { version, motivo } })
  return respuesta.data
}

export async function obtenerPoliticaMargen(id: string, signal?: AbortSignal): Promise<PoliticaMargen> {
  const respuesta = await solicitarApi<RespuestaApi<PoliticaMargen>>(`/comercial/politicas-margen/${id}`, { signal })
  return respuesta.data
}

export async function crearPoliticaMargen(datos: GuardarPoliticaMargenRequest): Promise<PoliticaMargen> {
  const respuesta = await solicitarApi<RespuestaApi<PoliticaMargen>>('/comercial/politicas-margen', { method: 'POST', datos })
  return respuesta.data
}

export async function actualizarPoliticaMargen(id: string, datos: ActualizarPoliticaMargenRequest): Promise<PoliticaMargen> {
  const respuesta = await solicitarApi<RespuestaApi<PoliticaMargen>>(`/comercial/politicas-margen/${id}`, { method: 'PUT', datos })
  return respuesta.data
}

export async function exportarComercial(recurso: RecursoComercial, formato: 'xlsx' | 'pdf', filtros: FiltrosExportacionComercial): Promise<void> {
  const nombres: Record<RecursoComercial, string> = { clientes: 'clientes', 'politicas-margen': 'politicas_margen', precios: 'precios', ventas: 'ventas', recetas: 'validacion_recetas' }
  const nombre = nombres[recurso]
  await descargarArchivoApi(`${rutaRecurso(recurso)}/exportaciones`, {
    method: 'POST',
    datos: { formato: formato === 'xlsx' ? 'XLSX' : 'PDF', filtros },
    nombreArchivoAlternativo: `${nombre}_${fechaArchivoActual()}.${formato}`,
  })
}

export async function listarAuditoriaComercial(
  recurso: RecursoComercial,
  id: string,
  parametros: ConsultaAuditoriaComercial,
  signal?: AbortSignal,
): Promise<AuditoriaComercialPaginada> {
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaComercialPaginada>>(
    `${rutaRecurso(recurso)}/${id}/auditoria?${consultaAuditoria(parametros)}`,
    { signal },
  )
  return respuesta.data
}
