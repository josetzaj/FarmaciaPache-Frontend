export type SolicitarRecuperacionRequest = {
  correo: string
}

export type MensajeRecuperacion = {
  message: string
}

export type MotivoEnlaceRecuperacionNoValido =
  | 'utilizado'
  | 'expirado'
  | 'reemplazado'
  | 'invalido'

export type EstadoEnlaceRecuperacion =
  | { valido: true }
  | { valido: false; motivo: MotivoEnlaceRecuperacionNoValido }

export type ValidarEnlaceRecuperacionRequest = {
  token: string
}

export type RestablecerContrasenaRequest = {
  token: string
  contrasenaNueva: string
  confirmarContrasenaNueva: string
}
