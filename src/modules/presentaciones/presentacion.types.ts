import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type Presentacion = CatalogoMaestroRegistro & { descripcion: string | null }
export type DatosPresentacion = DatosCatalogoMaestro & { codigo: string; nombre: string; descripcion: string }
