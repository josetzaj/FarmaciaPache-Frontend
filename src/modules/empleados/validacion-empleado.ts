export const MENSAJE_EDAD_MINIMA_EMPLEADO =
  'No es posible guardar el empleado porque debe tener al menos 18 años en la fecha de contratación.'

export function cumpleEdadMinimaEnFecha(
  fechaNacimiento: string,
  fechaReferencia: string,
  edadMinima = 18,
): boolean {
  const [anioNacimiento, mesNacimiento, diaNacimiento] = fechaNacimiento
    .split('-')
    .map(Number)
  const [anioReferencia, mesReferencia, diaReferencia] = fechaReferencia
    .split('-')
    .map(Number)

  if (
    !anioNacimiento || !mesNacimiento || !diaNacimiento ||
    !anioReferencia || !mesReferencia || !diaReferencia
  ) {
    return false
  }

  let edad = anioReferencia - anioNacimiento
  if (
    mesReferencia < mesNacimiento ||
    (mesReferencia === mesNacimiento && diaReferencia < diaNacimiento)
  ) {
    edad -= 1
  }

  return edad >= edadMinima
}
