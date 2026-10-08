export type TipoUbicacionInventario =
  | 'VENTA'
  | 'BODEGA'
  | 'RECEPCION'
  | 'CUARENTENA'
  | 'DEVOLUCIONES'
  | 'TRANSITO'
  | 'DESTRUCCION'

export type EstadoExistenciaInventario =
  | 'DISPONIBLE'
  | 'RESERVADO'
  | 'COMPROMETIDO'
  | 'EN_TRANSITO'
  | 'BLOQUEADO'
  | 'CUARENTENA'
  | 'VENCIDO'
  | 'DESTRUIDO'

export type UbicacionInventario = {
  id: string
  sucursalId: string
  codigo: string
  nombre: string
  tipo: TipoUbicacionInventario
  descripcion: string | null
  activa: boolean
  bloqueadaPorConteoId: string | null
  version: number
}

export type GuardarUbicacionInventarioRequest = {
  codigo: string
  nombre: string
  tipo: TipoUbicacionInventario
  descripcion: string | null
}

export type ActualizarUbicacionInventarioRequest = GuardarUbicacionInventarioRequest & {
  version: number
  activa: boolean
}

export type OrdenUbicacionInventario = 'ubicacion' | 'tipo' | 'estado'

export type FiltrosUbicacionesInventario = {
  busqueda?: string
  ubicacion?: string
  tipos?: TipoUbicacionInventario[]
  estados?: ('ACTIVA' | 'INACTIVA')[]
  orden: OrdenUbicacionInventario
  direccion: 'asc' | 'desc'
}

export type ListarUbicacionesInventarioParametros = FiltrosUbicacionesInventario & {
  pagina: number
  tamanoPagina: number
}

export type ExportarUbicacionesInventarioRequest = FiltrosUbicacionesInventario & {
  formato: 'xlsx' | 'pdf'
}

export type UbicacionesInventarioPaginadas = {
  items: UbicacionInventario[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type PosicionInventario = {
  ubicacion: { id: string; codigo: string; nombre: string }
  lote: { id: string; numero: string; fechaVencimiento: string | null } | null
  estado: EstadoExistenciaInventario
  cantidad: number
  actualizadoEn: string
}

export type ExistenciaProducto = {
  producto: {
    id: string
    codigo: string
    nombre: string
    activo: boolean
    controlaLote: boolean
    requiereVencimiento: boolean
    imagenUrl: string | null
    version: number
  }
  cantidadFisica: number
  cantidadDisponible: number
  cantidadReservada: number
  cantidadComprometida: number
  cantidadBloqueada: number
  cantidadCuarentena: number
  cantidadEnTransito: number
  ultimoCostoUnitario: number | null
  bajoMinimo: boolean
  actualizadoEn: string
  posiciones: PosicionInventario[]
}

export type ExistenciasInventarioPaginadas = {
  items: ExistenciaProducto[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
  consultadoEn: string
}

export type OrdenExistenciasInventario = 'producto' | 'codigo' | 'disponible' | 'actualizado'
export type DireccionInventario = 'asc' | 'desc'

export type ListarExistenciasInventarioParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalId?: string
  ubicacionId?: string
  estados?: EstadoExistenciaInventario[]
  soloConExistencia: boolean
  soloBajoMinimo: boolean
  orden: OrdenExistenciasInventario
  direccion: DireccionInventario
}

export type ExportarExistenciasInventarioRequest = Omit<
  ListarExistenciasInventarioParametros,
  'pagina' | 'tamanoPagina'
> & { formato: 'xlsx' | 'pdf' }

export type DetalleAuditoriaInventario = {
  id: string
  nombrePropiedad: string
  etiquetaPropiedad: string | null
  tipoDato: string | null
  valorAnterior: string | null
  valorNuevo: string | null
  orden: number
}

export type EventoAuditoriaInventario = {
  id: string
  usuarioNombre: string | null
  sucursal: { id: string; codigo: string; nombre: string } | null
  tipoOperacion: string
  versionEntidad: number | null
  resumen: string | null
  ocurridoEn: string
  detalles: DetalleAuditoriaInventario[]
}

export type AuditoriaInventarioPaginada = {
  items: EventoAuditoriaInventario[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type TipoEntidadAuditoriaInventario = 'ubicacion' | 'operacion' | 'conteo' | 'politica' | 'politicaMasiva'
export type OrdenAuditoriaInventario = 'fecha' | 'operacion' | 'usuario' | 'sucursal' | 'resumen'

export type ListarAuditoriaInventarioParametros = {
  pagina: number
  tamanoPagina: number
  fecha?: string
  operaciones?: string[]
  usuario?: string
  sucursal?: string
  resumen?: string
  orden: OrdenAuditoriaInventario
  direccion: DireccionInventario
}

export type TipoOperacionInventario =
  | 'APERTURA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'COMPRA_RECEPCION'
  | 'TRASLADO_DESPACHO'
  | 'TRASLADO_RECEPCION'
  | 'VENTA'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR'
  | 'VENCIMIENTO'
  | 'DESTRUCCION'
  | 'CONTEO'
  | 'COMPENSACION'

export type MovimientoKardexInventario = {
  id: string
  operacionId: string
  fecha: string
  tipo: TipoOperacionInventario
  referencia: string
  ubicacion: string
  lote: string | null
  estado: EstadoExistenciaInventario
  usuario: string
  entrada: number
  salida: number
  saldo: number
}

export type KardexInventarioPaginado = {
  items: MovimientoKardexInventario[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarKardexInventarioParametros = {
  pagina: number
  tamanoPagina: number
  productoId: string
  sucursalId?: string
  ubicacionId?: string
  loteId?: string
  desde?: string
  hasta?: string
}

export type DatosLoteInventarioRequest = {
  numeroLote: string
  fechaFabricacion: string | null
  fechaVencimiento: string | null
  proveedorOrigenId: string | null
}

export type LineaAperturaInventarioRequest = {
  productoId: string
  ubicacionId: string
  estado: EstadoExistenciaInventario
  cantidad: number
  lote: DatosLoteInventarioRequest | null
  costoUnitario: number | null
}

export type RegistrarAperturaInventarioRequest = {
  referencia: string
  fechaCorte: string
  motivo: string
  evidenciaReferencia: string
  lineas: LineaAperturaInventarioRequest[]
}

export type RegistrarAjusteInventarioRequest = {
  referencia: string
  tipo: 'POSITIVO' | 'NEGATIVO'
  productoId: string
  ubicacionId: string
  estado: EstadoExistenciaInventario
  cantidad: number
  loteId: string | null
  lote: DatosLoteInventarioRequest | null
  costoUnitario: number | null
  motivo: string
  evidenciaReferencia: string
}

export type MovimientoOperacionInventario = {
  id: string
  efecto: 'ENTRADA' | 'SALIDA'
  productoId: string
  ubicacionId: string
  loteId: string | null
  estado: EstadoExistenciaInventario
  cantidad: number
  saldoAnterior: number
  saldoPosterior: number
}

export type OperacionInventario = {
  id: string
  tipo: TipoOperacionInventario
  estado: string
  referencia: string
  confirmadaEn: string
  movimientos: MovimientoOperacionInventario[]
}

export type ListarOperacionesInventarioParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  tipoAjuste?: 'POSITIVO' | 'NEGATIVO'
  desde?: string
  hasta?: string
  orden: 'referencia' | 'fecha' | 'tipo' | 'usuario'
  direccion: DireccionInventario
}

export type OperacionInventarioResumen = {
  id: string
  tipo: TipoOperacionInventario
  estado: string
  referencia: string
  motivo: string
  evidenciaReferencia: string | null
  fechaOperacion: string
  confirmadaEn: string | null
  usuarioNombre: string
  totalMovimientos: number
  cantidadTotal: number
}

export type OperacionesInventarioPaginadas = {
  items: OperacionInventarioResumen[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type MovimientoOperacionInventarioDetalle = {
  id: string
  efecto: 'ENTRADA' | 'SALIDA'
  producto: { id: string; codigo: string; nombre: string }
  ubicacion: { id: string; codigo: string; nombre: string }
  lote: {
    id: string
    numero: string
    fechaFabricacion: string | null
    fechaVencimiento: string | null
    proveedorOrigenId: string | null
  } | null
  estado: EstadoExistenciaInventario
  cantidad: number
  saldoAnterior: number
  saldoPosterior: number
  costoUnitario: number | null
  motivoSeleccionLote: string | null
  ocurridoEn: string
}

export type OperacionInventarioDetalle = OperacionInventarioResumen & {
  movimientos: MovimientoOperacionInventarioDetalle[]
}

export type PoliticaStockInventario = {
  id: string
  producto: { id: string; codigo: string; nombre: string }
  ubicacion: { id: string; codigo: string; nombre: string } | null
  stockMinimo: number
  stockMaximo: number | null
  stockSeguridad: number
  puntoReposicion: number | null
  solicitudMasivaId: string | null
  actualizadoEn: string
  version: number
}

export type EstadoPoliticaStockMasiva = 'PENDIENTE' | 'APLICADA' | 'RECHAZADA'
export type ModoAplicacionPoliticaStock = 'SOLO_SIN_POLITICA' | 'SOBRESCRIBIR'
export type TipoSeleccionPoliticaStockMasiva = 'TODOS_RESULTADOS' | 'SELECCION_MANUAL'

export type FiltrosProductosPoliticaMasiva = {
  busqueda?: string
  categoriaTerapeuticaId?: string
  principioActivoId?: string
  ubicacionId?: string
  modoAplicacion: ModoAplicacionPoliticaStock
}

export type ProductoPoliticaMasiva = { id: string; codigo: string; nombre: string; tienePolitica: boolean }
export type ProductosPoliticaMasivaPaginados = { items: ProductoPoliticaMasiva[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarProductosPoliticaMasivaParametros = FiltrosProductosPoliticaMasiva & { pagina: number; tamanoPagina: number }
export type OpcionPoliticaMasiva = { id: string; codigo: string; nombre: string }
export type OpcionesPoliticaMasiva = { categorias: OpcionPoliticaMasiva[]; principiosActivos: OpcionPoliticaMasiva[] }

export type CrearSolicitudPoliticaMasivaRequest = FiltrosProductosPoliticaMasiva & {
  referencia: string
  tipoSeleccion: TipoSeleccionPoliticaStockMasiva
  productoIds: string[]
  stockMinimo: number
  stockMaximo: number | null
  stockSeguridad: number
  puntoReposicion: number | null
  motivoSolicitud: string
}

export type ResolverSolicitudPoliticaMasivaRequest = { version: number; motivo: string }
export type SolicitudPoliticaMasiva = {
  id: string
  referencia: string
  sucursal: { id: string; codigo: string; nombre: string }
  estado: EstadoPoliticaStockMasiva
  tipoSeleccion: TipoSeleccionPoliticaStockMasiva
  modoAplicacion: ModoAplicacionPoliticaStock
  busqueda: string | null
  categoria: OpcionPoliticaMasiva | null
  principioActivo: OpcionPoliticaMasiva | null
  ubicacion: { id: string; codigo: string; nombre: string } | null
  stockMinimo: number
  stockMaximo: number | null
  stockSeguridad: number
  puntoReposicion: number | null
  motivoSolicitud: string
  motivoResolucion: string | null
  totalObjetivo: number
  totalAplicado: number
  solicitadoEn: string
  solicitadoPorNombre: string
  aprobadoEn: string | null
  aprobadoPorNombre: string | null
  rechazadoEn: string | null
  rechazadoPorNombre: string | null
  version: number
}
export type SolicitudesPoliticaMasivaPaginadas = { items: SolicitudPoliticaMasiva[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarSolicitudesPoliticaMasivaParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  estados?: EstadoPoliticaStockMasiva[]
  orden: 'referencia' | 'solicitado' | 'estado' | 'total'
  direccion: DireccionInventario
}

export type PoliticasStockPaginadas = {
  items: PoliticaStockInventario[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarPoliticasStockParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  ubicacionId?: string
  nivel?: 'SUCURSAL' | 'UBICACION'
  orden: 'producto' | 'ubicacion' | 'actualizado'
  direccion: DireccionInventario
}

export type ConfigurarPoliticaStockRequest = {
  productoId: string
  ubicacionId: string | null
  stockMinimo: number
  stockMaximo: number | null
  stockSeguridad: number
  puntoReposicion: number | null
  version: number | null
}

export type NivelAlertaVencimiento = 'VENCIDO' | 'CRITICO' | 'PREVENTIVO' | 'INFORMATIVO'

export type AlertaVencimientoInventario = {
  productoId: string
  productoCodigo: string
  productoNombre: string
  loteId: string
  numeroLote: string
  fechaVencimiento: string
  diasRestantes: number
  cantidad: number
  ubicacionId: string
  ubicacionNombre: string
  nivel: NivelAlertaVencimiento
}

export type AlertasVencimientoPaginadas = {
  items: AlertaVencimientoInventario[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
  consultadoEn: string
}

export type ListarAlertasVencimientoParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  sucursalId?: string
  ubicacionId?: string
  dias: 30 | 60 | 90
}

export type TipoConteoInventario = 'GENERAL' | 'SELECTIVO' | 'ROTATIVO'
export type EstadoConteoInventario = 'ABIERTO' | 'REGISTRADO' | 'APROBADO' | 'CERRADO' | 'ANULADO'

export type ConteoInventarioResumen = {
  id: string
  referencia: string
  tipo: TipoConteoInventario
  estado: EstadoConteoInventario
  ubicacion: { id: string; codigo: string; nombre: string }
  motivo: string
  iniciadoEn: string
  registradoEn: string | null
  cerradoEn: string | null
  totalPosiciones: number
  posicionesConDiferencia: number
}

export type ConteosInventarioPaginados = {
  items: ConteoInventarioResumen[]
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
}

export type ListarConteosInventarioParametros = {
  pagina: number
  tamanoPagina: number
  busqueda?: string
  ubicacionId?: string
  tipos?: TipoConteoInventario[]
  estados?: EstadoConteoInventario[]
  orden: 'referencia' | 'ubicacion' | 'iniciado' | 'estado'
  direccion: DireccionInventario
}

export type DetalleConteoInventario = {
  id: string
  productoId: string
  productoCodigo: string
  productoNombre: string
  loteId: string | null
  numeroLote: string | null
  estado: EstadoExistenciaInventario
  cantidadEsperada: number
  cantidadContada: number | null
  diferencia: number | null
  observacion: string | null
  operacionAjusteId: string | null
}

export type ConteoInventario = {
  id: string
  referencia: string
  tipo: TipoConteoInventario
  estado: EstadoConteoInventario
  sucursalId: string
  ubicacion: { id: string; codigo: string; nombre: string }
  motivo: string
  iniciadoEn: string
  registradoEn: string | null
  aprobadoEn: string | null
  cerradoEn: string | null
  detalles: DetalleConteoInventario[]
}

export type CrearConteoInventarioRequest = {
  referencia: string
  tipo: TipoConteoInventario
  ubicacionId: string
  motivo: string
  productoIds: string[]
}

export type RegistrarResultadosConteoRequest = {
  resultados: Array<{ detalleId: string; cantidadContada: number; observacion: string | null }>
}

export type AprobarConteoInventarioRequest = {
  evidenciaReferencia: string
  motivoAprobacion: string
}
