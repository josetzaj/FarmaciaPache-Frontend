export type RolFormularioUsuario = {
  rolId: string
  vigenteHasta: string
  indefinido: boolean
}
export type DatosFormularioUsuario = { empleadoId: string; nombreUsuario: string; roles: RolFormularioUsuario[] }
export type ErroresFormularioUsuario = { empleadoId?: string; nombreUsuario?: string; roles?: string; vigencias?: Record<string, string> }
export function validarFormularioUsuario(datos: DatosFormularioUsuario, requiereEmpleado: boolean): ErroresFormularioUsuario {
  const errores: ErroresFormularioUsuario = {}; const nombre = datos.nombreUsuario.trim()
  if (requiereEmpleado && !datos.empleadoId) errores.empleadoId = 'Selecciona el empleado que utilizará la cuenta.'
  if (nombre.length < 4) errores.nombreUsuario = 'El nombre de usuario debe contener al menos 4 caracteres.'
  else if (nombre.length > 50) errores.nombreUsuario = 'El nombre de usuario no puede superar 50 caracteres.'
  else if (!/^[A-Za-z0-9._-]+$/.test(nombre)) errores.nombreUsuario = 'Utiliza letras, números, punto, guion o guion bajo.'
  if (!datos.roles.length) errores.roles = 'Asigna al menos un rol.'
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const vigencias: Record<string, string> = {}
  for (const rol of datos.roles) {
    if (rol.indefinido) continue
    if (!rol.vigenteHasta) {
      vigencias[rol.rolId] = 'Selecciona una fecha de vigencia o marca Indefinido.'
    } else if (rol.vigenteHasta <= hoy) {
      vigencias[rol.rolId] = 'La vigencia debe ser posterior a la fecha actual.'
    }
  }
  if (Object.keys(vigencias).length) errores.vigencias = vigencias
  return errores
}
export function fechaVigenciaApi(valor: string): string | null { return valor ? new Date(`${valor}T23:59:59-06:00`).toISOString() : null }
export function fechaVigenciaFormulario(valor: string | null): string { if (!valor) return ''; return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(valor)) }
