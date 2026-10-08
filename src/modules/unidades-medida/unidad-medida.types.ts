import type { CatalogoMaestroRegistro, DatosCatalogoMaestro } from '../catalogos-base/catalogo-maestro.types'
export type UnidadMedida = CatalogoMaestroRegistro & { simbolo: string; permiteDecimales: boolean }
export type DatosUnidadMedida = DatosCatalogoMaestro & { codigo: string; nombre: string; simbolo: string; permiteDecimales: boolean }
