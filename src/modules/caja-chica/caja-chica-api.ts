import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria'
import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  AutorizarLiquidacionRequest, CajaChicaResumen, CerrarLiquidacionRequest,
  ConsultaCajasChicas, ConsultaLiquidaciones, ConsultaMovimientos, CrearCajaChicaRequest,
  EstadoLiquidacionActiva, LiquidacionCajaChicaDetalle, LiquidacionCajaChicaResumen,
  ModificarFondoRequest, MovimientoCajaChica, OpcionesCajaChica, RecibirReposicionRequest,
  RegistrarCorreccionRequest, ResolverMovimientoRequest, ResultadoPaginado, SolicitarLiquidacionRequest,
} from './caja-chica.types'

type RespuestaApi<T> = { data: T }

function consultaPaginada(parametros: Record<string, unknown>): string {
  const consulta = new URLSearchParams()
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return
    if (Array.isArray(valor)) {
      if (valor.length) consulta.set(clave, valor.join(','))
      return
    }
    consulta.set(clave, String(valor))
  })
  return `?${consulta.toString()}`
}

export async function obtenerOpcionesCajaChica(signal?: AbortSignal): Promise<OpcionesCajaChica> {
  return (await solicitarApi<RespuestaApi<OpcionesCajaChica>>('/caja/chica/opciones-filtros', { signal })).data
}

export async function listarCajasChicas(parametros: ConsultaCajasChicas, signal?: AbortSignal): Promise<ResultadoPaginado<CajaChicaResumen>> {
  return (await solicitarApi<RespuestaApi<ResultadoPaginado<CajaChicaResumen>>>(`/caja/chica${consultaPaginada(parametros)}`, { signal })).data
}

export async function obtenerCajaChica(id: string, signal?: AbortSignal): Promise<CajaChicaResumen> {
  return (await solicitarApi<RespuestaApi<CajaChicaResumen>>(`/caja/chica/${id}`, { signal })).data
}

export async function crearCajaChica(datos: CrearCajaChicaRequest): Promise<CajaChicaResumen> {
  return (await solicitarApi<RespuestaApi<CajaChicaResumen>>('/caja/chica', { method: 'POST', datos })).data
}

export async function modificarFondoCajaChica(id: string, datos: ModificarFondoRequest): Promise<CajaChicaResumen> {
  return (await solicitarApi<RespuestaApi<CajaChicaResumen>>(`/caja/chica/${id}/fondo`, { method: 'PATCH', datos })).data
}

export async function listarLiquidaciones(parametros: ConsultaLiquidaciones, signal?: AbortSignal): Promise<ResultadoPaginado<LiquidacionCajaChicaResumen>> {
  return (await solicitarApi<RespuestaApi<ResultadoPaginado<LiquidacionCajaChicaResumen>>>(`/caja/liquidaciones${consultaPaginada(parametros)}`, { signal })).data
}

export async function obtenerLiquidacionActiva(signal?: AbortSignal): Promise<EstadoLiquidacionActiva> {
  return (await solicitarApi<RespuestaApi<EstadoLiquidacionActiva>>('/caja/liquidaciones/activa', { signal })).data
}

export async function obtenerLiquidacion(id: string, signal?: AbortSignal): Promise<LiquidacionCajaChicaDetalle> {
  return (await solicitarApi<RespuestaApi<LiquidacionCajaChicaDetalle>>(`/caja/liquidaciones/${id}`, { signal })).data
}

export async function solicitarLiquidacion(datos: SolicitarLiquidacionRequest): Promise<LiquidacionCajaChicaDetalle> {
  return (await solicitarApi<RespuestaApi<LiquidacionCajaChicaDetalle>>('/caja/liquidaciones/solicitudes', { method: 'POST', datos })).data
}

export async function autorizarLiquidacion(id: string, datos: AutorizarLiquidacionRequest): Promise<LiquidacionCajaChicaDetalle> {
  return (await solicitarApi<RespuestaApi<LiquidacionCajaChicaDetalle>>(`/caja/liquidaciones/${id}/autorizacion`, { method: 'PATCH', datos })).data
}

export async function recibirReposicion(id: string, datos: RecibirReposicionRequest): Promise<LiquidacionCajaChicaDetalle> {
  return (await solicitarApi<RespuestaApi<LiquidacionCajaChicaDetalle>>(`/caja/liquidaciones/${id}/reposicion/recepcion`, { method: 'PATCH', datos })).data
}

export async function listarMovimientos(id: string, parametros: ConsultaMovimientos, signal?: AbortSignal): Promise<ResultadoPaginado<MovimientoCajaChica>> {
  return (await solicitarApi<RespuestaApi<ResultadoPaginado<MovimientoCajaChica>>>(`/caja/liquidaciones/${id}/movimientos${consultaPaginada(parametros)}`, { signal })).data
}

export async function registrarGasto(id: string, datos: { versionLiquidacion: number; montoCentavos: number; fechaGasto: string; concepto: string; claveIdempotencia: string; comprobante: File }): Promise<MovimientoCajaChica> {
  const formulario = new FormData()
  formulario.append('versionLiquidacion', String(datos.versionLiquidacion))
  formulario.append('montoCentavos', String(datos.montoCentavos))
  formulario.append('fechaGasto', datos.fechaGasto)
  formulario.append('concepto', datos.concepto)
  formulario.append('claveIdempotencia', datos.claveIdempotencia)
  formulario.append('comprobante', datos.comprobante)
  return (await solicitarApi<RespuestaApi<MovimientoCajaChica>>(`/caja/liquidaciones/${id}/gastos`, { method: 'POST', datos: formulario })).data
}

export async function registrarCorreccion(id: string, datos: RegistrarCorreccionRequest): Promise<MovimientoCajaChica> {
  return (await solicitarApi<RespuestaApi<MovimientoCajaChica>>(`/caja/liquidaciones/${id}/correcciones`, { method: 'POST', datos })).data
}

export async function resolverMovimiento(tipo: 'gastos' | 'correcciones', id: string, accion: 'confirmacion' | 'cancelacion', datos: ResolverMovimientoRequest): Promise<MovimientoCajaChica> {
  return (await solicitarApi<RespuestaApi<MovimientoCajaChica>>(`/caja/liquidaciones/${tipo}/${id}/${accion}`, { method: 'PATCH', datos })).data
}

export async function cerrarLiquidacion(id: string, datos: CerrarLiquidacionRequest): Promise<LiquidacionCajaChicaDetalle> {
  return (await solicitarApi<RespuestaApi<LiquidacionCajaChicaDetalle>>(`/caja/liquidaciones/${id}/cierre`, { method: 'POST', datos })).data
}

export async function descargarComprobante(id: string, nombre: string): Promise<void> {
  await descargarArchivoApi(`/caja/liquidaciones/gastos/${id}/comprobante`, { nombreArchivoAlternativo: nombre })
}

function consultaAuditoria(parametros: ConsultaAuditoria): string {
  return consultaPaginada(parametros as unknown as Record<string, unknown>)
}

export async function listarAuditoriaCajaChica(id: string, parametros: ConsultaAuditoria, signal?: AbortSignal): Promise<AuditoriaPaginada> {
  return (await solicitarApi<RespuestaApi<AuditoriaPaginada>>(`/caja/chica/${id}/auditoria${consultaAuditoria(parametros)}`, { signal })).data
}

export async function listarAuditoriaLiquidacion(id: string, parametros: ConsultaAuditoria, signal?: AbortSignal): Promise<AuditoriaPaginada> {
  return (await solicitarApi<RespuestaApi<AuditoriaPaginada>>(`/caja/liquidaciones/${id}/auditoria${consultaAuditoria(parametros)}`, { signal })).data
}
