import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import { solicitarApi } from '../../shared/api/cliente-api'
import type {
  ActualizarUbicacionInventarioRequest,
  AlertasVencimientoPaginadas,
  AprobarConteoInventarioRequest,
  AuditoriaInventarioPaginada,
  ConfigurarPoliticaStockRequest,
  ConteoInventario,
  ConteosInventarioPaginados,
  CrearConteoInventarioRequest,
  CrearSolicitudPoliticaMasivaRequest,
  ExportarUbicacionesInventarioRequest,
  ExportarExistenciasInventarioRequest,
  ExistenciaProducto,
  ExistenciasInventarioPaginadas,
  GuardarUbicacionInventarioRequest,
  ListarAuditoriaInventarioParametros,
  ListarAlertasVencimientoParametros,
  ListarConteosInventarioParametros,
  ListarExistenciasInventarioParametros,
  KardexInventarioPaginado,
  ListarKardexInventarioParametros,
  ListarOperacionesInventarioParametros,
  ListarPoliticasStockParametros,
  ListarProductosPoliticaMasivaParametros,
  ListarSolicitudesPoliticaMasivaParametros,
  ListarUbicacionesInventarioParametros,
  OpcionesPoliticaMasiva,
  OperacionInventario,
  OperacionInventarioDetalle,
  OperacionesInventarioPaginadas,
  PoliticaStockInventario,
  PoliticasStockPaginadas,
  ProductosPoliticaMasivaPaginados,
  RegistrarAjusteInventarioRequest,
  RegistrarAperturaInventarioRequest,
  RegistrarResultadosConteoRequest,
  ResolverSolicitudPoliticaMasivaRequest,
  SolicitudPoliticaMasiva,
  SolicitudesPoliticaMasivaPaginadas,
  TipoEntidadAuditoriaInventario,
  UbicacionInventario,
  UbicacionesInventarioPaginadas,
} from './inventario.types'

type RespuestaApi<T> = { success: true; data: T }

function fechaArchivoActual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function listarUbicacionesInventario(
  incluirInactivas: boolean,
  signal?: AbortSignal,
): Promise<UbicacionInventario[]> {
  const consulta = new URLSearchParams({ incluirInactivas: String(incluirInactivas) })
  const respuesta = await solicitarApi<RespuestaApi<UbicacionInventario[]>>(
    `/inventario/ubicaciones?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function exportarUbicacionesInventario(
  datos: ExportarUbicacionesInventarioRequest,
): Promise<void> {
  await descargarArchivoApi('/inventario/ubicaciones/exportaciones', {
    method: 'POST',
    datos,
    nombreArchivoAlternativo: `ubicaciones_inventario_${fechaArchivoActual()}.${datos.formato}`,
  })
}

export async function listarUbicacionesInventarioPaginadas(
  parametros: ListarUbicacionesInventarioParametros,
  signal?: AbortSignal,
): Promise<UbicacionesInventarioPaginadas> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.ubicacion) consulta.set('ubicacion', parametros.ubicacion)
  if (parametros.tipos?.length) consulta.set('tipos', parametros.tipos.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  const respuesta = await solicitarApi<RespuestaApi<UbicacionesInventarioPaginadas>>(
    `/inventario/ubicaciones/listado?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function crearUbicacionInventario(
  datos: GuardarUbicacionInventarioRequest,
): Promise<UbicacionInventario> {
  const respuesta = await solicitarApi<RespuestaApi<UbicacionInventario>>('/inventario/ubicaciones', {
    method: 'POST',
    datos,
  })
  return respuesta.data
}

export async function actualizarUbicacionInventario(
  ubicacionId: string,
  datos: ActualizarUbicacionInventarioRequest,
): Promise<UbicacionInventario> {
  const respuesta = await solicitarApi<RespuestaApi<UbicacionInventario>>(
    `/inventario/ubicaciones/${ubicacionId}`,
    { method: 'PUT', datos },
  )
  return respuesta.data
}

export async function listarExistenciasInventario(
  parametros: ListarExistenciasInventarioParametros,
  signal?: AbortSignal,
): Promise<ExistenciasInventarioPaginadas> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    soloConExistencia: String(parametros.soloConExistencia),
    soloBajoMinimo: String(parametros.soloBajoMinimo),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  const respuesta = await solicitarApi<RespuestaApi<ExistenciasInventarioPaginadas>>(
    `/inventario/existencias?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function obtenerExistenciaInventario(
  productoId: string,
  signal?: AbortSignal,
): Promise<ExistenciaProducto> {
  const respuesta = await solicitarApi<RespuestaApi<ExistenciaProducto>>(
    `/inventario/existencias/${productoId}`,
    { signal },
  )
  return respuesta.data
}

export async function exportarExistenciasInventario(
  datos: ExportarExistenciasInventarioRequest,
): Promise<void> {
  await descargarArchivoApi('/inventario/existencias/exportaciones', {
    method: 'POST',
    datos,
    nombreArchivoAlternativo: `existencias_inventario_${fechaArchivoActual()}.${datos.formato}`,
  })
}

export async function listarAuditoriaInventario(
  tipo: TipoEntidadAuditoriaInventario,
  entidadId: string,
  parametros: ListarAuditoriaInventarioParametros,
  signal?: AbortSignal,
): Promise<AuditoriaInventarioPaginada> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) consulta.set('operaciones', parametros.operaciones.join(','))
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  const recurso = tipo === 'ubicacion' ? 'ubicaciones' : tipo === 'operacion' ? 'operaciones' : tipo === 'politica' ? 'politicas-stock' : tipo === 'politicaMasiva' ? 'politicas-stock/masivas/solicitudes' : 'conteos'
  const respuesta = await solicitarApi<RespuestaApi<AuditoriaInventarioPaginada>>(
    `/inventario/${recurso}/${entidadId}/auditoria?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function listarKardexInventario(
  parametros: ListarKardexInventarioParametros,
  signal?: AbortSignal,
): Promise<KardexInventarioPaginado> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    productoId: parametros.productoId,
  })
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  if (parametros.loteId) consulta.set('loteId', parametros.loteId)
  if (parametros.desde) consulta.set('desde', parametros.desde)
  if (parametros.hasta) consulta.set('hasta', parametros.hasta)
  const respuesta = await solicitarApi<RespuestaApi<KardexInventarioPaginado>>(
    `/inventario/kardex?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function registrarAperturaInventario(
  datos: RegistrarAperturaInventarioRequest,
): Promise<OperacionInventario> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionInventario>>('/inventario/aperturas', {
    method: 'POST',
    datos,
  })
  return respuesta.data
}

export async function registrarAjusteInventario(
  datos: RegistrarAjusteInventarioRequest,
): Promise<OperacionInventario> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionInventario>>('/inventario/ajustes', {
    method: 'POST',
    datos,
  })
  return respuesta.data
}

function parametrosListadoOperaciones(parametros: ListarOperacionesInventarioParametros): URLSearchParams {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
    orden: parametros.orden,
    direccion: parametros.direccion,
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.tipoAjuste) consulta.set('tipoAjuste', parametros.tipoAjuste)
  if (parametros.desde) consulta.set('desde', parametros.desde)
  if (parametros.hasta) consulta.set('hasta', parametros.hasta)
  return consulta
}

export async function listarAperturasInventario(parametros: ListarOperacionesInventarioParametros, signal?: AbortSignal): Promise<OperacionesInventarioPaginadas> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionesInventarioPaginadas>>(`/inventario/aperturas?${parametrosListadoOperaciones(parametros).toString()}`, { signal })
  return respuesta.data
}

export async function obtenerAperturaInventario(operacionId: string, signal?: AbortSignal): Promise<OperacionInventarioDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionInventarioDetalle>>(`/inventario/aperturas/${operacionId}`, { signal })
  return respuesta.data
}

export async function listarAjustesInventario(parametros: ListarOperacionesInventarioParametros, signal?: AbortSignal): Promise<OperacionesInventarioPaginadas> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionesInventarioPaginadas>>(`/inventario/ajustes?${parametrosListadoOperaciones(parametros).toString()}`, { signal })
  return respuesta.data
}

export async function obtenerAjusteInventario(operacionId: string, signal?: AbortSignal): Promise<OperacionInventarioDetalle> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionInventarioDetalle>>(`/inventario/ajustes/${operacionId}`, { signal })
  return respuesta.data
}

export async function listarPoliticasStockInventario(
  parametros: ListarPoliticasStockParametros,
  signal?: AbortSignal,
): Promise<PoliticasStockPaginadas> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  if (parametros.nivel) consulta.set('nivel', parametros.nivel)
  const respuesta = await solicitarApi<RespuestaApi<PoliticasStockPaginadas>>(`/inventario/politicas-stock?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function configurarPoliticaStockInventario(datos: ConfigurarPoliticaStockRequest): Promise<PoliticaStockInventario> {
  const respuesta = await solicitarApi<RespuestaApi<PoliticaStockInventario>>('/inventario/politicas-stock', { method: 'PUT', datos })
  return respuesta.data
}

export async function obtenerOpcionesPoliticaMasiva(signal?: AbortSignal): Promise<OpcionesPoliticaMasiva> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesPoliticaMasiva>>('/inventario/politicas-stock/masivas/opciones', { signal })
  return respuesta.data
}

export async function listarProductosPoliticaMasiva(parametros: ListarProductosPoliticaMasivaParametros, signal?: AbortSignal): Promise<ProductosPoliticaMasivaPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), modoAplicacion: parametros.modoAplicacion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.categoriaTerapeuticaId) consulta.set('categoriaTerapeuticaId', parametros.categoriaTerapeuticaId)
  if (parametros.principioActivoId) consulta.set('principioActivoId', parametros.principioActivoId)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  const respuesta = await solicitarApi<RespuestaApi<ProductosPoliticaMasivaPaginados>>(`/inventario/politicas-stock/masivas/productos?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function listarSolicitudesPoliticaMasiva(parametros: ListarSolicitudesPoliticaMasivaParametros, signal?: AbortSignal): Promise<SolicitudesPoliticaMasivaPaginadas> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  const respuesta = await solicitarApi<RespuestaApi<SolicitudesPoliticaMasivaPaginadas>>(`/inventario/politicas-stock/masivas/solicitudes?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function crearSolicitudPoliticaMasiva(datos: CrearSolicitudPoliticaMasivaRequest): Promise<SolicitudPoliticaMasiva> {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudPoliticaMasiva>>('/inventario/politicas-stock/masivas/solicitudes', { method: 'POST', datos })
  return respuesta.data
}

export async function obtenerSolicitudPoliticaMasiva(solicitudId: string, signal?: AbortSignal): Promise<SolicitudPoliticaMasiva> {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudPoliticaMasiva>>(`/inventario/politicas-stock/masivas/solicitudes/${solicitudId}`, { signal })
  return respuesta.data
}

export async function resolverSolicitudPoliticaMasiva(solicitudId: string, accion: 'aprobar' | 'rechazar', datos: ResolverSolicitudPoliticaMasivaRequest): Promise<SolicitudPoliticaMasiva> {
  const respuesta = await solicitarApi<RespuestaApi<SolicitudPoliticaMasiva>>(`/inventario/politicas-stock/masivas/solicitudes/${solicitudId}/${accion}`, { method: 'POST', datos })
  return respuesta.data
}

export async function listarAlertasVencimientoInventario(
  parametros: ListarAlertasVencimientoParametros,
  signal?: AbortSignal,
): Promise<AlertasVencimientoPaginadas> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), dias: String(parametros.dias) })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.sucursalId) consulta.set('sucursalId', parametros.sucursalId)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  const respuesta = await solicitarApi<RespuestaApi<AlertasVencimientoPaginadas>>(`/inventario/alertas-vencimiento?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function procesarVencimientosInventario(): Promise<OperacionInventario | null> {
  const respuesta = await solicitarApi<RespuestaApi<OperacionInventario | null>>('/inventario/vencimientos/procesar', { method: 'POST' })
  return respuesta.data
}

export async function listarConteosInventario(
  parametros: ListarConteosInventarioParametros,
  signal?: AbortSignal,
): Promise<ConteosInventarioPaginados> {
  const consulta = new URLSearchParams({ pagina: String(parametros.pagina), tamanoPagina: String(parametros.tamanoPagina), orden: parametros.orden, direccion: parametros.direccion })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.ubicacionId) consulta.set('ubicacionId', parametros.ubicacionId)
  if (parametros.tipos?.length) consulta.set('tipos', parametros.tipos.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  const respuesta = await solicitarApi<RespuestaApi<ConteosInventarioPaginados>>(`/inventario/conteos?${consulta.toString()}`, { signal })
  return respuesta.data
}

export async function crearConteoInventario(datos: CrearConteoInventarioRequest): Promise<ConteoInventario> {
  const respuesta = await solicitarApi<RespuestaApi<ConteoInventario>>('/inventario/conteos', { method: 'POST', datos })
  return respuesta.data
}

export async function obtenerConteoInventario(conteoId: string, signal?: AbortSignal): Promise<ConteoInventario> {
  const respuesta = await solicitarApi<RespuestaApi<ConteoInventario>>(`/inventario/conteos/${conteoId}`, { signal })
  return respuesta.data
}

export async function registrarResultadosConteoInventario(conteoId: string, datos: RegistrarResultadosConteoRequest): Promise<ConteoInventario> {
  const respuesta = await solicitarApi<RespuestaApi<ConteoInventario>>(`/inventario/conteos/${conteoId}/resultados`, { method: 'PUT', datos })
  return respuesta.data
}

export async function aprobarConteoInventario(conteoId: string, datos: AprobarConteoInventarioRequest): Promise<ConteoInventario> {
  const respuesta = await solicitarApi<RespuestaApi<ConteoInventario>>(`/inventario/conteos/${conteoId}/aprobar`, { method: 'POST', datos })
  return respuesta.data
}
