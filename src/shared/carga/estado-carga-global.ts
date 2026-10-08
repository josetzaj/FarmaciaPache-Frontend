type SuscriptorCarga = () => void

let operacionesActivas = 0
const suscriptores = new Set<SuscriptorCarga>()

function notificarCambio(): void {
  suscriptores.forEach((suscriptor) => suscriptor())
}

export function obtenerEstadoCargaGlobal(): boolean {
  return operacionesActivas > 0
}

export function suscribirCargaGlobal(suscriptor: SuscriptorCarga): () => void {
  suscriptores.add(suscriptor)
  return () => suscriptores.delete(suscriptor)
}

export function iniciarCargaGlobal(): () => void {
  operacionesActivas += 1
  notificarCambio()

  let operacionFinalizada = false

  return () => {
    if (operacionFinalizada) return

    operacionFinalizada = true
    operacionesActivas = Math.max(0, operacionesActivas - 1)
    notificarCambio()
  }
}
