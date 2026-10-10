export const EVENTO_NOTIFICACIONES_ACTUALIZADAS = 'farmaciapache:notificaciones-actualizadas'

export function notificarActualizacionDeNotificaciones(): void {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_ACTUALIZADAS))
}
