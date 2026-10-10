export const nombresMes = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export function formatearCentavos(centavos: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(centavos / 100)
}

export function centavosATexto(centavos: number): string {
  return (centavos / 100).toFixed(2)
}

export function textoACentavos(valor: string): number | null {
  const texto = valor.trim()
  if (!/^\d+(?:\.\d{0,2})?$/.test(texto)) return null
  const [enteros, decimales = ''] = texto.split('.')
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'))
  return Number.isSafeInteger(centavos) ? centavos : null
}

export function fechaGuatemala(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

export function periodoTexto(anio: number, mes: number): string {
  return `${nombresMes[mes - 1]} ${anio}`
}

