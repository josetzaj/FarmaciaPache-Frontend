import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { generarConsolidacionCaja } from '../caja-api'
import { crearClaveIdempotencia, etiquetasEstadoConsolidacion } from '../caja-formatos'
import type { ConsolidacionDiariaCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const fechaGuatemala = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export function ConsolidacionCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [fechaNegocio, setFechaNegocio] = useState(fechaGuatemala)
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('CSD'))
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<ConsolidacionDiariaCaja | null>(null)
  const hayCambios = fechaNegocio !== fechaGuatemala()
  useEffect(() => { onCambiosPendientes(hayCambios && !creada); return () => onCambiosPendientes(false) }, [creada, hayCambios, onCambiosPendientes])
  const enviar = async (evento: FormEvent) => { evento.preventDefault(); setGuardando(true); setErrorEnvio(null); try { const dato = await generarConsolidacionCaja({ fechaNegocio, claveIdempotencia }); onCambiosPendientes(false); setCreada(dato) } catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la consolidación.') } finally { setGuardando(false) } }
  return <section className={styles.pagina} aria-labelledby="titulo-consolidacion-nueva"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Consolidaciones" actual="Generar consolidación" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Cierre diario</p><h1 id="titulo-consolidacion-nueva">Generar consolidación diaria</h1><p>Calcula los totales de la sucursal activa con información confirmada del día seleccionado.</p></div></header><form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando}><legend>Fecha de negocio</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="fecha-consolidacion">Fecha <span aria-hidden="true">*</span></label><input id="fecha-consolidacion" type="date" max={fechaGuatemala()} required value={fechaNegocio} onChange={(evento) => setFechaNegocio(evento.target.value)} /></div><div className={styles.alertaInformativa}><p>Todos los turnos deben estar cerrados. Las incidencias o depósitos pendientes dejarán la consolidación en investigación.</p></div></div></fieldset><div className={styles.accionesFormulario}><p>Los totales son calculados por el servidor.</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/consolidaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || !fechaNegocio}><IconoAccion nombre="guardar" />{guardando ? 'Generando…' : 'Generar consolidación'}</button></div></div></form><ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo generar" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creada)} tipo="exito" titulo="Consolidación generada" mensaje={creada ? `La consolidación ${creada.numero} quedó ${etiquetasEstadoConsolidacion[creada.estado].toLowerCase()}.` : ''} textoAccionPrincipal="Ver consolidación" onAccionPrincipal={() => creada && onNavegar(`/caja/consolidaciones/${creada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/consolidaciones')} onCerrar={() => creada && onNavegar(`/caja/consolidaciones/${creada.id}`)} /></section>
}
