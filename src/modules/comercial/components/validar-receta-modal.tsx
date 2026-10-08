import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import type { RecetaVenta, ResultadoValidacionReceta } from '../comercial.types'
import styles from './comercial.module.css'

export function ValidarRecetaModal({ receta, onCerrar, onConfirmar }: {
  receta: RecetaVenta | null
  onCerrar: () => void
  onConfirmar: (resultado: Exclude<ResultadoValidacionReceta, 'PENDIENTE'>, motivo: string | null) => Promise<void>
}) {
  const [resultado, setResultado] = useState<Exclude<ResultadoValidacionReceta, 'PENDIENTE'>>(receta?.resultadoValidacion === 'RECHAZADA' ? 'RECHAZADA' : 'VALIDA')
  const [motivo, setMotivo] = useState(receta?.motivoValidacion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cerrar = () => { setResultado('VALIDA'); setMotivo(''); setError(null); setGuardando(false); onCerrar() }
  const confirmar = async () => {
    if (resultado === 'RECHAZADA' && !motivo.trim()) { setError('Indica por qué se rechaza la receta.'); return }
    setGuardando(true); setError(null)
    try { await onConfirmar(resultado, motivo.trim() || null); setResultado('VALIDA'); setMotivo(''); setGuardando(false) }
    catch (actual) { setError(actual instanceof ErrorApi ? actual.message : 'No fue posible validar la receta.'); setGuardando(false) }
  }
  return <ModalEstado abierto={Boolean(receta)} tipo={resultado === 'RECHAZADA' ? 'advertencia' : 'informacion'} titulo="Validar receta" mensaje={<div className={styles.contenidoConfirmacion}><p>Referencia: <strong>{receta?.referencia}</strong></p><label htmlFor="resultado-receta">Resultado</label><select id="resultado-receta" value={resultado} onChange={(evento) => setResultado(evento.target.value as Exclude<ResultadoValidacionReceta, 'PENDIENTE'>)}><option value="VALIDA">Válida</option><option value="RECHAZADA">Rechazada</option></select><label htmlFor="motivo-receta">Motivo {resultado === 'RECHAZADA' && <span aria-hidden="true">*</span>}</label><textarea id="motivo-receta" rows={4} maxLength={500} value={motivo} aria-invalid={Boolean(error)} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} />{error && <small role="alert">{error}</small>}</div>} textoAccionPrincipal={guardando ? 'Guardando…' : 'Guardar validación'} onAccionPrincipal={() => void confirmar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={cerrar} onCerrar={cerrar} cargando={guardando} />
}
