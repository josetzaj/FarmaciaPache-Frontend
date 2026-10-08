import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { cerrarTurnoCaja, listarCaja } from '../caja-api'
import { formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { ArqueoCaja, CierreCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }

export function CierreCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>([])
  const [arqueoId, setArqueoId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creado, setCreado] = useState<CierreCaja | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<ArqueoCaja>('arqueos', { pagina: 1, tamanoPagina: 200, estados: ['APROBADO'], tipos: ['CIERRE'], orden: 'fecha', direccion: 'desc' }, controlador.signal).then((respuesta) => { setArqueos(respuesta.items); setErrorCarga(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los arqueos de cierre aprobados.') })
    return () => controlador.abort()
  }, [revision])
  const arqueo = arqueos.find((item) => item.id === arqueoId)
  const hayCambios = Boolean(arqueoId || motivo) && !creado
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const mensaje = !arqueo ? 'Selecciona un arqueo de cierre aprobado.' : motivo.trim().length < 5 ? 'El motivo debe contener al menos 5 caracteres.' : null
    setErrorFormulario(mensaje)
    if (mensaje || !arqueo) return
    setGuardando(true); setErrorEnvio(null)
    try { const respuesta = await cerrarTurnoCaja(arqueo.turnoId, { arqueoId: arqueo.id, arqueoVersion: arqueo.version, motivo: motivo.trim() }); onCambiosPendientes(false); setCreado(respuesta.cierre) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cerrar el turno.') }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-crear-cierre"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Cierres" actual="Cerrar turno" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Cierre operativo</p><h1 id="titulo-crear-cierre">Cerrar turno de caja</h1><p>Selecciona un arqueo de cierre aprobado. El registro se conservará incluso si el turno se reabre.</p></div></header>
    {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}
    {!errorCarga && !arqueos.length && <div className={styles.alertaInformativa} role="status"><p>No hay arqueos de cierre aprobados disponibles. Registra y aprueba un arqueo de tipo cierre antes de continuar.</p></div>}
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando || Boolean(errorCarga)}><legend>Arqueo aprobado</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="arqueo-cierre">Arqueo de cierre <span aria-hidden="true">*</span></label><select id="arqueo-cierre" value={arqueoId} onChange={(e) => { setArqueoId(e.target.value); setErrorFormulario(null) }}><option value="">Selecciona un arqueo</option>{arqueos.map((item) => <option key={item.id} value={item.id}>{item.numero} · {item.turnoNumero ?? item.turnoId} · {formatearFechaHora(item.ocurridoEn)}</option>)}</select></div><div className={styles.campo}><label htmlFor="motivo-cierre">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-cierre" rows={4} minLength={5} maxLength={500} value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrorFormulario(null) }} /></div></div></fieldset>
      {arqueo && <fieldset><legend>Resumen del cierre</legend><div className={styles.grillaTres}><div className={styles.resumenConteo}><span>Esperado</span><strong>{formatearCentavos(arqueo.esperadoCentavos)}</strong></div><div className={styles.resumenConteo}><span>Declarado</span><strong>{formatearCentavos(arqueo.declaradoCentavos)}</strong></div><div className={styles.resumenConteo}><span>Diferencia</span><strong>{formatearCentavos(arqueo.diferenciaCentavos)}</strong></div></div>{arqueo.explicacion && <p className={styles.descripcionSeccion}>Explicación: {arqueo.explicacion}</p>}</fieldset>}
      {errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}<div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/cierres')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !arqueos.length}><IconoAccion nombre="guardar" />{guardando ? 'Cerrando…' : 'Cerrar turno'}</button></div></div>
    </form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo cerrar el turno" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} />
    <ModalEstado abierto={Boolean(creado)} tipo="exito" titulo="Turno cerrado" mensaje={creado ? `Se registró el cierre ${creado.numero} por ${formatearCentavos(creado.declaradoCentavos)}.` : ''} textoAccionPrincipal="Ver cierre" onAccionPrincipal={() => creado && onNavegar(`/caja/cierres/${creado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/cierres')} onCerrar={() => creado && onNavegar(`/caja/cierres/${creado.id}`)} />
  </section>
}
