import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarUsuario } from '../usuario-api'
import type { Usuario } from '../usuario.types'
import styles from '../../roles/components/rol-gestion.module.css'
type Props = { usuario: Usuario | null; onCerrar: () => void; onInactivado: (usuario: Usuario) => void }
export function UsuarioInactivarModal({ usuario, onCerrar, onInactivado }: Props) {
  const [motivo, setMotivo] = useState(''); const [error, setError] = useState<string | null>(null); const [procesando, setProcesando] = useState(false)
  const cerrar = () => { if (!procesando) { setMotivo(''); setError(null); onCerrar() } }
  const confirmar = async () => { if (!usuario) return; const limpio = motivo.trim(); if (limpio.length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return } setProcesando(true); setError(null); try { await inactivarUsuario(usuario.id, usuario.version, limpio); setMotivo(''); onInactivado(usuario) } catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el usuario.') } finally { setProcesando(false) } }
  return <ModalEstado abierto={Boolean(usuario)} tipo="advertencia" titulo="Desactivar usuario" mensaje={usuario ? <div className={styles.contenidoConfirmacion}><p>La cuenta <strong>{usuario.nombreUsuario}</strong> dejará de tener acceso al sistema.</p><p>Sus roles serán retirados y todas sus sesiones abiertas serán revocadas.</p><label htmlFor="motivo-inactivacion-usuario">Motivo de desactivación</label><textarea id="motivo-inactivacion-usuario" rows={3} value={motivo} maxLength={250} disabled={procesando} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} /><small>{motivo.length}/250 caracteres</small>{error && <span role="alert">{error}</span>}</div> : ''} textoAccionPrincipal="Desactivar usuario" iconoAccionPrincipal={<IconoAccion nombre="desactivar" />} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionPrincipal={() => void confirmar()} onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={procesando} />
}
