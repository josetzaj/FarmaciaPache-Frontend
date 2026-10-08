import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type PrincipioActivo = CatalogoMaestroRegistro & { descripcion: string | null }
export type DatosPrincipioActivo = DatosCatalogoMaestro & { codigo: string; nombre: string; descripcion: string }
