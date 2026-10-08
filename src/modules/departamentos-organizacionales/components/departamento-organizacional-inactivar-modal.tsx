import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarDepartamentoOrganizacional } from '../departamento-organizacional-api'
import type { DepartamentoOrganizacional } from '../departamento-organizacional.types'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { departamento: DepartamentoOrganizacional | null; onCerrar: () => void; onInactivado: (departamento: DepartamentoOrganizacional) => void }

export function DepartamentoOrganizacionalInactivarModal({ departamento, onCerrar, onInactivado }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const cerrar = () => { if (procesando) return; setMotivo(''); setError(null); onCerrar() }
  const confirmar = async () => { if (!departamento) return; if (motivo.trim().length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return } setProcesando(true); setError(null); try { await inactivarDepartamentoOrganizacional(departamento.id, departamento.version, motivo.trim()); setMotivo(''); onInactivado(departamento) } catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el departamento.') } finally { setProcesando(false) } }
  return <ModalEstado abierto={Boolean(departamento)} tipo="advertencia" titulo="Desactivar departamento" mensaje={departamento ? <div className={styles.contenidoConfirmacion}><p>El departamento <strong>{departamento.nombre}</strong> dejará de estar disponible para nuevos puestos.</p><p>Solo puede desactivarse si no tiene puestos activos.</p><label htmlFor="motivo-inactivacion-departamento">Motivo de desactivación</label><textarea id="motivo-inactivacion-departamento" rows={3} value={motivo} maxLength={250} disabled={procesando} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} /><small>{motivo.length}/250 caracteres</small>{error && <span role="alert">{error}</span>}</div> : ''} textoAccionPrincipal="Desactivar departamento" iconoAccionPrincipal={<IconoAccion nombre="desactivar" />} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionPrincipal={() => void confirmar()} onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={procesando} />
}
