import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type {
  ActualizarEmpleadoRequest,
  CambiarSucursalEmpleadoRequest,
  CambiarEstadoEmpleadoRequest,
  AuditoriaEmpleadoPaginada,
  CatalogosEmpleado,
  CrearEmpleadoRequest,
  DepartamentoGeograficoCatalogo,
  EmpleadoCreado,
  Empleado,
  EmpleadosPaginados,
  ExportarEmpleadosParametros,
  ListarEmpleadosParametros,
  ListarAuditoriaEmpleadoParametros,
  MunicipioCatalogo,
  OpcionesFiltrosEmpleado,
  PuestoCatalogo,
  SucursalCatalogo,
} from './empleado.types'

function fechaArchivoActual(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

type RespuestaApi<T> = {
  success: true
  data: T
}

export async function listarEmpleados(
  parametros: ListarEmpleadosParametros,
  signal?: AbortSignal,
): Promise<EmpleadosPaginados> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.busqueda) consulta.set('busqueda', parametros.busqueda)
  if (parametros.empleado) consulta.set('empleado', parametros.empleado)
  if (parametros.contacto) consulta.set('contacto', parametros.contacto)
  if (parametros.puestoIds?.length) consulta.set('puestoIds', parametros.puestoIds.join(','))
  if (parametros.sucursalIds?.length) consulta.set('sucursalIds', parametros.sucursalIds.join(','))
  if (parametros.estados?.length) consulta.set('estados', parametros.estados.join(','))
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)

  const respuesta = await solicitarApi<RespuestaApi<EmpleadosPaginados>>(
    `/empleados?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function exportarEmpleados(
  parametros: ExportarEmpleadosParametros,
): Promise<void> {
  await descargarArchivoApi('/empleados/exportaciones', {
    method: 'POST',
    datos: parametros,
    nombreArchivoAlternativo: `empleados_${fechaArchivoActual()}.${parametros.formato}`,
  })
}

export async function obtenerOpcionesFiltrosEmpleado(
  signal?: AbortSignal,
): Promise<OpcionesFiltrosEmpleado> {
  const respuesta = await solicitarApi<RespuestaApi<OpcionesFiltrosEmpleado>>(
    '/empleados/opciones-filtros',
    { signal },
  )
  return respuesta.data
}

export async function obtenerEmpleado(
  empleadoId: string,
  signal?: AbortSignal,
): Promise<Empleado> {
  const respuesta = await solicitarApi<RespuestaApi<Empleado>>(`/empleados/${empleadoId}`, {
    signal,
  })
  return respuesta.data
}

export async function listarAuditoriaEmpleado(
  empleadoId: string,
  parametros: ListarAuditoriaEmpleadoParametros,
  signal?: AbortSignal,
): Promise<AuditoriaEmpleadoPaginada> {
  const consulta = new URLSearchParams({
    pagina: String(parametros.pagina),
    tamanoPagina: String(parametros.tamanoPagina),
  })
  if (parametros.fecha) consulta.set('fecha', parametros.fecha)
  if (parametros.operaciones?.length) {
    consulta.set('operaciones', parametros.operaciones.join(','))
  }
  if (parametros.usuario) consulta.set('usuario', parametros.usuario)
  if (parametros.sucursal) consulta.set('sucursal', parametros.sucursal)
  if (parametros.resumen) consulta.set('resumen', parametros.resumen)
  if (parametros.orden) consulta.set('orden', parametros.orden)
  if (parametros.direccion) consulta.set('direccion', parametros.direccion)

  const respuesta = await solicitarApi<RespuestaApi<AuditoriaEmpleadoPaginada>>(
    `/empleados/${empleadoId}/auditoria?${consulta.toString()}`,
    { signal },
  )
  return respuesta.data
}

export async function obtenerCatalogosEmpleado(
  signal?: AbortSignal,
): Promise<CatalogosEmpleado> {
  const [puestos, sucursales, departamentos] = await Promise.all([
    solicitarApi<RespuestaApi<PuestoCatalogo[]>>('/puestos', { signal }),
    solicitarApi<RespuestaApi<SucursalCatalogo[]>>('/sucursales', { signal }),
    solicitarApi<RespuestaApi<DepartamentoGeograficoCatalogo[]>>(
      '/ubicaciones/departamentos',
      { signal },
    ),
  ])

  return {
    puestos: puestos.data.filter((puesto) => puesto.activo),
    sucursales: sucursales.data.filter((sucursal) => sucursal.activo),
    departamentos: departamentos.data,
  }
}

export async function obtenerMunicipiosPorDepartamento(
  departamentoId: string,
  signal?: AbortSignal,
): Promise<MunicipioCatalogo[]> {
  const respuesta = await solicitarApi<RespuestaApi<MunicipioCatalogo[]>>(
    `/ubicaciones/departamentos/${departamentoId}/municipios`,
    { signal },
  )

  return respuesta.data
}

export async function crearEmpleado(
  datos: CrearEmpleadoRequest,
): Promise<EmpleadoCreado> {
  const respuesta = await solicitarApi<RespuestaApi<EmpleadoCreado>>('/empleados', {
    method: 'POST',
    datos,
  })

  return respuesta.data
}

export async function actualizarEmpleado(
  empleadoId: string,
  datos: ActualizarEmpleadoRequest,
): Promise<Empleado> {
  const respuesta = await solicitarApi<RespuestaApi<Empleado>>(`/empleados/${empleadoId}`, {
    method: 'PUT',
    datos,
  })
  return respuesta.data
}

export async function cambiarSucursalEmpleado(
  empleadoId: string,
  datos: CambiarSucursalEmpleadoRequest,
): Promise<Empleado> {
  const respuesta = await solicitarApi<RespuestaApi<Empleado>>(
    `/empleados/${empleadoId}/sucursal`,
    {
      method: 'PUT',
      datos,
    },
  )
  return respuesta.data
}

export async function cambiarEstadoEmpleado(
  empleadoId: string,
  datos: CambiarEstadoEmpleadoRequest,
): Promise<Empleado> {
  const respuesta = await solicitarApi<RespuestaApi<Empleado>>(`/empleados/${empleadoId}/estado`, {
    method: 'PATCH',
    datos,
  })
  return respuesta.data
}

export async function actualizarFotoEmpleado(
  empleadoId: string,
  version: number,
  foto: File,
): Promise<EmpleadoCreado> {
  const formulario = new FormData()
  formulario.append('version', String(version))
  formulario.append('foto', foto)

  const respuesta = await solicitarApi<RespuestaApi<EmpleadoCreado>>(
    `/empleados/${empleadoId}/foto`,
    {
      method: 'PUT',
      datos: formulario,
    },
  )

  return respuesta.data
}

export async function eliminarFotoEmpleado(
  empleadoId: string,
  version: number,
): Promise<Empleado> {
  const respuesta = await solicitarApi<RespuestaApi<Empleado>>(
    `/empleados/${empleadoId}/foto`,
    {
      method: 'DELETE',
      datos: { version },
    },
  )
  return respuesta.data
}
