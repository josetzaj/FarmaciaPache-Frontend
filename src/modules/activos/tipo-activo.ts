import { crearCatalogoMaestroApi } from '../catalogos-base/catalogo-maestro-api'
import type { ConfiguracionCatalogo } from '../catalogos-base/catalogo-maestro.types'

export const tipoActivoApi = crearCatalogoMaestroApi('activos/tipos')

export const tipoActivoConfig: ConfiguracionCatalogo = {
  recurso: 'tipos-activo',
  ruta: '/activos/tipos',
  permiso: 'ACTIVOS_TIPOS',
  singular: 'Tipo de activo',
  plural: 'Tipos de activo',
  descripcion: 'Clasifica mobiliario, equipo de cómputo y otros bienes administrativos.',
  datosIniciales: { codigo: '', nombre: '', descripcion: '' },
  campos: [
    { clave: 'codigo', etiqueta: 'Prefijo', tipo: 'texto', obligatorio: true, maxLength: 10, ayuda: 'Entre 2 y 10 letras o números. Se usará en el código interno.' },
    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, maxLength: 100 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', maxLength: 500 },
  ],
  validar: (datos) => {
    const errores: Record<string, string> = {}
    const codigo = String(datos.codigo ?? '').trim()
    const nombre = String(datos.nombre ?? '').trim()
    if (!codigo) errores.codigo = 'El prefijo es obligatorio.'
    else if (!/^[A-Za-z0-9]{2,10}$/.test(codigo)) errores.codigo = 'Usa entre 2 y 10 letras o números.'
    if (!nombre) errores.nombre = 'El nombre es obligatorio.'
    else if (nombre.length < 2) errores.nombre = 'El nombre debe contener al menos 2 caracteres.'
    return errores
  },
}
