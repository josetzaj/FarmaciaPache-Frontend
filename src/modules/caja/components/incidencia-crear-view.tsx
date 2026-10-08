import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearIncidenciaCaja } from '../caja-api'
import { convertirDiferenciaACentavos, etiquetasEntidadIncidencia, etiquetasSeveridadIncidencia } from '../caja-formatos'
import type { EntidadIncidenciaCaja, IncidenciaCaja, SeveridadIncidenciaCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void; entidadTipoInicial?: EntidadIncidenciaCaja; entidadIdInicial?: string }
const tiposEntidad = Object.keys(etiquetasEntidadIncidencia) as EntidadIncidenciaCaja[]
const severidades = Object.keys(etiquetasSeveridadIncidencia) as SeveridadIncidenciaCaja[]
const patronUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function IncidenciaCrearView({ onNavegar, onCambiosPendientes, entidadTipoInicial, entidadIdInicial }: Props) {
  const [entidadTipo, setEntidadTipo] = useState<EntidadIncidenciaCaja>(entidadTipoInicial ?? 'ARQUEO_CAJA')
  const [entidadId, setEntidadId] = useState(entidadIdInicial ?? '')
  const [severidad, setSeveridad] = useState<SeveridadIncidenciaCaja>('MEDIA')
  const [descripcion, setDescripcion] = useState('')
  const [diferencia, setDiferencia] = useState('')
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<IncidenciaCaja | null>(null)
  const hayCambios = Boolean((!entidadIdInicial && entidadId) || descripcion || diferencia)
  useEffect(() => { onCambiosPendientes(hayCambios && !creada); return () => onCambiosPendientes(false) }, [creada, hayCambios, onCambiosPendientes])

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const diferenciaCentavos = diferencia ? convertirDiferenciaACentavos(diferencia) : null
    const mensaje = !patronUuid.test(entidadId.trim()) ? 'Ingresa el identificador UUID válido del registro relacionado.' : descripcion.trim().length < 5 ? 'La descripción debe contener al menos 5 caracteres.' : diferencia && diferenciaCentavos === null ? 'Ingresa una diferencia monetaria válida.' : null
    setErrorFormulario(mensaje)
    if (mensaje) return
    setGuardando(true); setErrorEnvio(null)
    try { const incidencia = await crearIncidenciaCaja({ entidadTipo, entidadId: entidadId.trim(), severidad, descripcion: descripcion.trim(), diferenciaCentavos }); onCambiosPendientes(false); setCreada(incidencia) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la incidencia.') }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-crear-incidencia"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Incidencias" actual="Nueva incidencia" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Control de diferencias</p><h1 id="titulo-crear-incidencia">Registrar incidencia</h1><p>Vincula la investigación con el registro operativo original sin alterar sus importes históricos.</p></div></header>
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando}><legend>Registro relacionado</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="tipo-entidad-incidencia">Tipo de registro <span aria-hidden="true">*</span></label><select id="tipo-entidad-incidencia" value={entidadTipo} disabled={Boolean(entidadTipoInicial)} onChange={(e) => { setEntidadTipo(e.target.value as EntidadIncidenciaCaja); setErrorFormulario(null) }}>{tiposEntidad.map((tipo) => <option key={tipo} value={tipo}>{etiquetasEntidadIncidencia[tipo]}</option>)}</select></div><div className={styles.campo}><label htmlFor="id-entidad-incidencia">Identificador del registro <span aria-hidden="true">*</span></label><input id="id-entidad-incidencia" maxLength={36} value={entidadId} readOnly={Boolean(entidadIdInicial)} aria-describedby="ayuda-id-incidencia" onChange={(e) => { setEntidadId(e.target.value); setErrorFormulario(null) }} /><small id="ayuda-id-incidencia" className={styles.ayudaCampo}>{entidadIdInicial ? 'El registro se vinculó desde su vista de detalle.' : 'Utiliza el UUID del registro relacionado.'}</small></div></div></fieldset>
      <fieldset disabled={guardando}><legend>Clasificación</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="severidad-incidencia">Severidad <span aria-hidden="true">*</span></label><select id="severidad-incidencia" value={severidad} onChange={(e) => setSeveridad(e.target.value as SeveridadIncidenciaCaja)}>{severidades.map((valor) => <option key={valor} value={valor}>{etiquetasSeveridadIncidencia[valor]}</option>)}</select></div><div className={styles.campo}><label htmlFor="diferencia-incidencia">Diferencia (Q)</label><input id="diferencia-incidencia" type="number" step="0.01" value={diferencia} onChange={(e) => { setDiferencia(e.target.value); setErrorFormulario(null) }} /></div><div className={`${styles.campo} ${styles.campoDoble}`}><label htmlFor="descripcion-incidencia">Descripción <span aria-hidden="true">*</span></label><textarea id="descripcion-incidencia" rows={5} maxLength={1000} value={descripcion} onChange={(e) => { setDescripcion(e.target.value); setErrorFormulario(null) }} /></div></div>{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset>
      <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/incidencias')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar incidencia'}</button></div></div></form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo registrar la incidencia" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creada)} tipo="exito" titulo="Incidencia registrada" mensaje={creada ? `La incidencia ${creada.numero} quedó abierta para investigación.` : ''} textoAccionPrincipal="Ver incidencia" onAccionPrincipal={() => creada && onNavegar(`/caja/incidencias/${creada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/incidencias')} onCerrar={() => creada && onNavegar(`/caja/incidencias/${creada.id}`)} />
  </section>
}
