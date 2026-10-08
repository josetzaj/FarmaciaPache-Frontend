import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type FormaFarmaceutica = CatalogoMaestroRegistro & { descripcion: string | null }
export type DatosFormaFarmaceutica = DatosCatalogoMaestro & { codigo: string; nombre: string; descripcion: string }
