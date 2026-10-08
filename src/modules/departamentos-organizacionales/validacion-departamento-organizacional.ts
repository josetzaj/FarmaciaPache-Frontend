export type DatosFormularioDepartamentoOrganizacional = { codigo: string; nombre: string; descripcion: string }
export type ErroresFormularioDepartamentoOrganizacional = Partial<Record<keyof DatosFormularioDepartamentoOrganizacional, string>>

export function validarFormularioDepartamentoOrganizacional(datos: DatosFormularioDepartamentoOrganizacional): ErroresFormularioDepartamentoOrganizacional {
  const errores: ErroresFormularioDepartamentoOrganizacional = {}
  const codigo = datos.codigo.trim()
  const nombre = datos.nombre.trim()
  if (codigo.length < 2) errores.codigo = 'El código debe contener al menos 2 caracteres.'
  else if (codigo.length > 20) errores.codigo = 'El código no puede superar 20 caracteres.'
  else if (!/^[A-Za-z0-9_-]+$/.test(codigo)) errores.codigo = 'Utiliza letras, números, guion o guion bajo.'
  if (nombre.length < 2) errores.nombre = 'El nombre debe contener al menos 2 caracteres.'
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.'
  if (datos.descripcion.trim().length > 500) errores.descripcion = 'La descripción no puede superar 500 caracteres.'
  return errores
}
