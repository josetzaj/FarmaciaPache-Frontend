export type CatalogoProducto = { id: string; codigo: string; nombre: string; activo: boolean; simbolo?: string }
export type CodigoBarraProducto = { codigo: string; esPrincipal: boolean }
export type ComponenteProducto = { principioActivoId: string; concentracion: number; unidadMedidaId: string; principioActivo: CatalogoProducto; unidadMedida: CatalogoProducto }
export type Producto = {
  id: string; codigo: string; nombreComercial: string
  laboratorioId: string; laboratorio: CatalogoProducto
  presentacionId: string; presentacion: CatalogoProducto
  formaFarmaceuticaId: string; formaFarmaceutica: CatalogoProducto
  categoriaTerapeuticaIds: string[]; categoriasTerapeuticas: CatalogoProducto[]
  viaAdministracionIds: string[]; viasAdministracion: CatalogoProducto[]
  cantidadContenido: number; unidadContenidoId: string; unidadContenido: CatalogoProducto
  requiereReceta: boolean; esControlado: boolean; controlaLote: boolean; requiereVencimiento: boolean
  condicionesAlmacenamiento: string | null; codigosBarras: CodigoBarraProducto[]; componentes: ComponenteProducto[]
  imagenUrl: string | null; imagenTipoMime: string | null; imagenTamanoBytes: number | null
  activo: boolean; creadoEn: string; actualizadoEn: string | null; inactivadoEn: string | null; motivoInactivacion: string | null; version: number
}
export type OpcionesProducto = { laboratorios: CatalogoProducto[]; presentaciones: CatalogoProducto[]; principiosActivos: CatalogoProducto[]; unidadesMedida: CatalogoProducto[]; formasFarmaceuticas: CatalogoProducto[]; categoriasTerapeuticas: CatalogoProducto[]; viasAdministracion: CatalogoProducto[] }
export type EstadoProducto = 'ACTIVO' | 'INACTIVO'
export type OrdenProducto = 'nombre' | 'codigo' | 'laboratorio' | 'presentacion' | 'estado'
export type DireccionProducto = 'asc' | 'desc'
export type ProductosPaginados = { items: Producto[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number }
export type ListarProductosParametros = { pagina: number; tamanoPagina: number; busqueda?: string; producto?: string; laboratorios?: string[]; presentaciones?: string[]; estados?: EstadoProducto[]; orden?: OrdenProducto; direccion?: DireccionProducto }
export type GuardarProductoRequest = {
  codigo: string; nombreComercial: string; laboratorioId: string; presentacionId: string; formaFarmaceuticaId: string; categoriaTerapeuticaIds: string[]; viaAdministracionIds: string[]; cantidadContenido: number; unidadContenidoId: string
  requiereReceta: boolean; esControlado: boolean; controlaLote: boolean; requiereVencimiento: boolean; condicionesAlmacenamiento: string | null
  codigosBarras: CodigoBarraProducto[]; componentes: Array<Pick<ComponenteProducto, 'principioActivoId' | 'concentracion' | 'unidadMedidaId'>>
}
export type ExportarProductosParametros = Omit<ListarProductosParametros, 'pagina' | 'tamanoPagina'> & { formato: 'xlsx' | 'pdf' }
