import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type CategoriaTerapeutica = CatalogoMaestroRegistro & { descripcion: string | null }
export type DatosCategoriaTerapeutica = DatosCatalogoMaestro & { codigo: string; nombre: string; descripcion: string }
