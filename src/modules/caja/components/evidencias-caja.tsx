import { useEffect, useState, type FormEvent } from 'react'
import iconoDescargar from '../../../assets/acciones/descargar.png'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarEvidenciasCaja, subirEvidenciaCaja } from '../caja-api'
import { formatearFechaHora } from '../caja-formatos'
import type { EvidenciaCaja } from '../caja.types'
import styles from './caja.module.css'

type Props = { entidadTipo: EvidenciaCaja['entidadTipo']; entidadId: string; permisos: readonly string[]; revision: number; onCambio: () => void }
export function EvidenciasCaja({ entidadTipo, entidadId, permisos, revision, onCambio }: Props) {
  const [evidencias, setEvidencias] = useState<EvidenciaCaja[]>([])
  const [categoria, setCategoria] = useState('COMPROBANTE')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [revisionLocal, setRevisionLocal] = useState(0)
  useEffect(() => { const controlador = new AbortController(); void listarEvidenciasCaja(entidadTipo, entidadId, controlador.signal).then((datos) => { setEvidencias(datos); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las evidencias.') }); return () => controlador.abort() }, [entidadId, entidadTipo, revision, revisionLocal])
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!archivo) { setError('Selecciona un archivo JPG, PNG o PDF.'); return }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(archivo.type)) { setError('Solo se permiten archivos JPG, PNG o PDF.'); return }
    if (archivo.size > 10 * 1024 * 1024) { setError('El archivo no puede superar 10 MB.'); return }
    setSubiendo(true); setError(null)
    try { await subirEvidenciaCaja(entidadTipo, entidadId, categoria, descripcion, archivo); setArchivo(null); setDescripcion(''); setMensajeExito('La evidencia quedó vinculada y auditada.'); setRevisionLocal((v) => v + 1); onCambio() }
    catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible adjuntar la evidencia.') }
    finally { setSubiendo(false) }
  }
  return <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Evidencias</h2><p>Comprobantes protegidos por sesión y vinculados al registro.</p></div><span>{evidencias.length} archivos</span></div>
    {evidencias.length ? <ul className={styles.listaEvidencias}>{evidencias.map((item) => <li key={item.id}><div><strong>{item.categoria}</strong><small>{item.descripcion ?? item.tipoMime} · {formatearFechaHora(item.cargadoEn)}</small></div><a href={construirUrlApi(`/caja/evidencias/${item.id}/archivo`)} target="_blank" rel="noreferrer" aria-label={`Abrir evidencia ${item.categoria}`} title="Abrir evidencia"><img src={iconoDescargar} alt="" /></a></li>)}</ul> : <p className={styles.sinDato}>No hay evidencias adjuntas.</p>}
    {permisos.includes('CAJA.EVIDENCIAS.CARGAR') && <form className={styles.formularioEvidencia} onSubmit={enviar}><div className={styles.campo}><label htmlFor={`categoria-${entidadId}`}>Categoría <span aria-hidden="true">*</span></label><input id={`categoria-${entidadId}`} maxLength={50} value={categoria} onChange={(e) => setCategoria(e.target.value)} /></div><div className={styles.campo}><label htmlFor={`descripcion-${entidadId}`}>Descripción</label><input id={`descripcion-${entidadId}`} maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div><div className={styles.campo}><label htmlFor={`archivo-${entidadId}`}>Archivo <span aria-hidden="true">*</span></label><input id={`archivo-${entidadId}`} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /><small className={styles.ayudaCampo}>JPG, PNG o PDF de hasta 10 MB.</small></div><button className={styles.botonPrincipal} type="submit" disabled={subiendo}><IconoAccion nombre="guardar" />{subiendo ? 'Adjuntando…' : 'Adjuntar evidencia'}</button></form>}
    {error && <p className={styles.errorCampo} role="alert">{error}</p>}<ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Evidencia registrada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </article>
}
