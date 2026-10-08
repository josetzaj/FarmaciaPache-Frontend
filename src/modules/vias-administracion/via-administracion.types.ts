import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type ViaAdministracion = CatalogoMaestroRegistro & { descripcion: string | null }
export type DatosViaAdministracion = DatosCatalogoMaestro & { codigo: string; nombre: string; descripcion: string }
