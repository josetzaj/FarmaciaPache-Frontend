import type { TipoSucursal } from './sucursal.types'
export type DatosFormularioSucursal = { codigo: string; nombre: string; tipo: TipoSucursal | ''; direccion: string; departamento: string; municipio: string; telefono: string; correo: string }
export type ErroresFormularioSucursal = Partial<Record<keyof DatosFormularioSucursal, string>>
export function validarFormularioSucursal(datos: DatosFormularioSucursal): ErroresFormularioSucursal {
  const errores: ErroresFormularioSucursal = {}
  const codigo = datos.codigo.trim(); const nombre = datos.nombre.trim(); const direccion = datos.direccion.trim(); const correo = datos.correo.trim()
  if (codigo.length < 2) errores.codigo = 'El código debe contener al menos 2 caracteres.'
  else if (codigo.length > 20) errores.codigo = 'El código no puede superar 20 caracteres.'
  else if (!/^[A-Za-z0-9_-]+$/.test(codigo)) errores.codigo = 'Utiliza letras, números, guion o guion bajo.'
  if (nombre.length < 2) errores.nombre = 'El nombre debe contener al menos 2 caracteres.'
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.'
  if (!datos.tipo) errores.tipo = 'Selecciona el tipo de sucursal.'
  if (direccion.length < 5) errores.direccion = 'La dirección debe contener al menos 5 caracteres.'
  else if (direccion.length > 300) errores.direccion = 'La dirección no puede superar 300 caracteres.'
  if (datos.departamento.trim().length > 100) errores.departamento = 'El departamento no puede superar 100 caracteres.'
  if (datos.municipio.trim().length > 100) errores.municipio = 'El municipio no puede superar 100 caracteres.'
  if (datos.telefono.trim().length > 30) errores.telefono = 'El teléfono no puede superar 30 caracteres.'
  if (correo.length > 150) errores.correo = 'El correo no puede superar 150 caracteres.'
  else if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Ingresa un correo electrónico válido.'
  return errores
}
