import type { AuditoriaPaginada, ConsultaAuditoria } from '../../shared/auditoria/auditoria.types'

export type EstadoPeriodoPlanilla = 'BORRADOR' | 'CERRADA'
export type DireccionOrdenPlanilla = 'asc' | 'desc'

export type SucursalPlanilla = { id: string; codigo: string; nombre: string }
export type OpcionesPlanilla = { sucursales: SucursalPlanilla[] }

export type CondicionSalarial = {
  id: string
  salarioBaseCentavos: number
  vigenteDesde: string
  vigenteHasta: string | null
  motivo: string
  version: number
}

export type ConfiguracionSalarialEmpleado = {
  empleadoId: string
  empleadoCodigo: string
  empleadoNombre: string
  estadoEmpleado: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO' | 'RETIRADO'
  puestoNombre: string | null
  sucursal: SucursalPlanilla
  condicionActual: CondicionSalarial | null
}

export type ConfiguracionSalarialDetalle = ConfiguracionSalarialEmpleado & {
  historial: CondicionSalarial[]
}

export type ConfiguracionSalarialPaginada = {
  items: ConfiguracionSalarialEmpleado[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarConfiguracionSalarialParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalId?: string
  estadosConfiguracion?: Array<'CONFIGURADO' | 'SIN_CONFIGURAR'>
  orden?: 'empleado' | 'sucursal'
  direccion?: DireccionOrdenPlanilla
}

export type RegistrarCondicionSalarialRequest = {
  salarioBaseCentavos: number
  vigenteDesde: string
  motivo: string
  versionActual: number | null
}

export type PeriodoPlanillaResumen = {
  id: string
  anio: number
  mes: number
  estado: EstadoPeriodoPlanilla
  totalCentavos: number
  cantidadEmpleados: number
  sucursal: SucursalPlanilla
  generadoEn: string
  cerradoEn: string | null
  version: number
}

export type DetallePlanilla = {
  id: string
  empleadoId: string
  empleadoCodigo: string
  empleadoNombre: string
  puestoNombre: string | null
  sucursalNombre: string
  salarioBaseCentavos: number
  montoPagarCentavos: number
  observacion: string | null
  version: number
}

export type PeriodoPlanillaDetalle = PeriodoPlanillaResumen & { detalles: DetallePlanilla[] }

export type PeriodosPlanillaPaginados = {
  items: PeriodoPlanillaResumen[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarPeriodosPlanillaParametros = {
  pagina: number
  tamanoPagina: number
  anio?: number
  meses?: number[]
  estados?: EstadoPeriodoPlanilla[]
  sucursalId?: string
  orden?: 'periodo' | 'sucursal' | 'total' | 'estado'
  direccion?: DireccionOrdenPlanilla
}

export type GenerarPeriodoPlanillaRequest = { anio: number; mes: number; sucursalId?: string }
export type ActualizarDetallesPlanillaRequest = {
  versionPeriodo: number
  detalles: Array<{ id: string; version: number; montoPagarCentavos: number; observacion: string | null }>
}

export type ConsultaAuditoriaPlanilla = ConsultaAuditoria
export type AuditoriaPlanillaPaginada = AuditoriaPaginada

