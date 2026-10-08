import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarSucursal } from '../sucursal-api'
import type { Sucursal } from '../sucursal.types'
import styles from '../../roles/components/rol-gestion.module.css'
type Props = { sucursal: Sucursal | null; onCerrar: () => void; onInactivada: (sucursal: Sucursal) => void }
export function SucursalInactivarModal({ sucursal, onCerrar, onInactivada }: Props) {
  const [motivo, setMotivo] = useState(''); const [error, setError] = useState<string | null>(null); const [procesando, setProcesando] = useState(false)
  const cerrar = () => { if (!procesando) { setMotivo(''); setError(null); onCerrar() } }
  const confirmar = async () => { if (!sucursal) return; const limpio = motivo.trim(); if (limpio.length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return } setProcesando(true); setError(null); try { await inactivarSucursal(sucursal.id, sucursal.version, limpio); setMotivo(''); onInactivada(sucursal) } catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar la sucursal.') } finally { setProcesando(false) } }
  return <ModalEstado abierto={Boolean(sucursal)} tipo="advertencia" titulo="Desactivar sucursal" mensaje={sucursal ? <div className={styles.contenidoConfirmacion}><p>La sucursal <strong>{sucursal.nombre}</strong> dejará de estar disponible.</p><p>No puede desactivarse mientras tenga empleados asignados activamente.</p><label htmlFor="motivo-inactivacion-sucursal">Motivo de desactivación</label><textarea id="motivo-inactivacion-sucursal" rows={3} value={motivo} maxLength={250} disabled={procesando} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} /><small>{motivo.length}/250 caracteres</small>{error && <span role="alert">{error}</span>}</div> : ''} textoAccionPrincipal="Desactivar sucursal" iconoAccionPrincipal={<IconoAccion nombre="desactivar" />} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionPrincipal={() => void confirmar()} onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={procesando} />
}
