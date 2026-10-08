import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type Laboratorio = CatalogoMaestroRegistro & { paisOrigen: string | null }
export type DatosLaboratorio = DatosCatalogoMaestro & { codigo: string; nombre: string; paisOrigen: string }
