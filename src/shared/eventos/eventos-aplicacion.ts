export const EVENTO_FOTO_EMPLEADO_ACTUALIZADA = 'farmaciapache:foto-empleado-actualizada'

export function notificarFotoEmpleadoActualizada(empleadoId: string): void {
  window.dispatchEvent(new CustomEvent(EVENTO_FOTO_EMPLEADO_ACTUALIZADA, {
    detail: { empleadoId },
  }))
}
