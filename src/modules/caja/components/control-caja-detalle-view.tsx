import { useCallback, useEffect, useState } from 'react'
import { PistaAuditoria, type ConsultaAuditoria } from '../../../shared/auditoria'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { aprobarArqueoCaja, listarAuditoriaCaja, obtenerArqueoCaja, obtenerCierreCaja, obtenerTurnoCaja, reabrirTurnoCaja } from '../caja-api'
import { etiquetasEstadoArqueo, etiquetasEstadoCierre, etiquetasTipoArqueo, etiquetasTipoCaja, formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { ArqueoCaja, CierreCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
function MotivoAccion({ valor, error, onChange }: { valor: string; error: string | null; onChange: (valor: string) => void }) {
  return <div className={styles.contenidoModal}><p>La decisión y su motivo quedarán registrados en la pista de auditoría.</p><label htmlFor="motivo-control-caja">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-control-caja" rows={4} maxLength={500} value={valor} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />{error && <small>{error}</small>}</div>
}

export function ArqueoDetalleView({ arqueoId, permisos, onNavegar }: Props & { arqueoId: string }) {
  const [arqueo, setArqueo] = useState<ArqueoCaja | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mostrarAprobacion, setMostrarAprobacion] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const claveSolicitud = `${arqueoId}:${revision}`
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => { const controlador = new AbortController(); void obtenerArqueoCaja(arqueoId, controlador.signal).then((dato) => { setArqueo(dato); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el arqueo.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) }); return () => controlador.abort() }, [arqueoId, claveSolicitud])
  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => listarAuditoriaCaja('ARQUEO_CAJA', arqueoId, consulta, signal), [arqueoId])
  const aprobar = async () => {
    if (!arqueo) return
    if (motivo.trim().length < 5) { setErrorMotivo('El motivo debe contener al menos 5 caracteres.'); return }
    setProcesando(true); setErrorAccion(null)
    try { const actualizado = await aprobarArqueoCaja(arqueo.id, { version: arqueo.version, motivo: motivo.trim() }); setArqueo(actualizado); setMostrarAprobacion(false); setMotivo(''); setMensajeExito(`El arqueo ${actualizado.numero} fue aprobado.`); setRevision((v) => v + 1) }
    catch (errorActual: unknown) { setMostrarAprobacion(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible aprobar el arqueo.') }
    finally { setProcesando(false) }
  }
  if (cargando && !arqueo) return <section className={styles.pagina}><p role="status">Cargando arqueo…</p></section>
  if (error || !arqueo) return <section className={styles.pagina}><CajaBreadcrumb seccion="Arqueos" actual="Detalle" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'El arqueo no está disponible.'}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div></section>
  return <section className={styles.pagina} aria-labelledby="titulo-detalle-arqueo"><CajaBreadcrumb seccion="Arqueos" actual={arqueo.numero} onNavegar={onNavegar} />
    <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>Arqueo de caja</p><h1 id="titulo-detalle-arqueo">{arqueo.numero}</h1><p>{etiquetasTipoArqueo[arqueo.tipo]} · Turno {arqueo.turnoNumero ?? arqueo.turnoId}</p><span className={`${styles.estado} ${arqueo.estado === 'APROBADO' ? styles.estadoExito : arqueo.estado === 'INVESTIGACION' ? styles.estadoPeligro : styles.estadoAdvertencia}`}>{etiquetasEstadoArqueo[arqueo.estado]}</span></div><div className={styles.accionesCabecera}><button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/turnos/${arqueo.turnoId}`)}>Ver turno</button>{permisos.includes('CAJA.INCIDENCIAS.CREAR') && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/incidencias/nueva?entidadTipo=ARQUEO_CAJA&entidadId=${arqueo.id}`)}><IconoAccion nombre="agregar" />Reportar incidencia</button>}{permisos.includes('CAJA.ARQUEOS.APROBAR') && arqueo.estado === 'PENDIENTE_APROBACION' && <button className={styles.botonPrincipal} type="button" onClick={() => setMostrarAprobacion(true)}><IconoAccion nombre="guardar" />Aprobar arqueo</button>}</div></header>
    <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Resultado</h2><dl><div><dt>Tipo de caja</dt><dd>{arqueo.caja?.tipo ? etiquetasTipoCaja[arqueo.caja.tipo] : 'No disponible'}</dd></div><div><dt>Esperado</dt><dd>{formatearCentavos(arqueo.esperadoCentavos)}</dd></div><div><dt>Declarado</dt><dd>{formatearCentavos(arqueo.declaradoCentavos)}</dd></div><div><dt>Diferencia</dt><dd><strong>{formatearCentavos(arqueo.diferenciaCentavos)}</strong></dd></div><div><dt>Conteo ciego</dt><dd>{arqueo.esCiego ? 'Sí' : 'No'}</dd></div><div className={styles.datoCompleto}><dt>Explicación</dt><dd>{arqueo.explicacion ?? 'Sin diferencia reportada'}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Control y aprobación</h2><dl><div><dt>Registrado</dt><dd>{formatearFechaHora(arqueo.ocurridoEn)}</dd></div><div><dt>Aprobado</dt><dd>{formatearFechaHora(arqueo.aprobadoEn)}</dd></div><div><dt>Declarado por</dt><dd>{arqueo.declaradoPorId}</dd></div><div><dt>Aprobado por</dt><dd>{arqueo.aprobadoPorId ?? 'Pendiente'}</dd></div><div><dt>Versión</dt><dd>{arqueo.version}</dd></div></dl></article></div>
    <article className={styles.tarjetaDetalle}><h2>Desglose por denominación</h2>{arqueo.detalles?.length ? <div className={styles.contenedorTablaConteo}><table className={styles.tablaConteo}><thead><tr><th scope="col">Denominación</th><th scope="col">Valor</th><th scope="col">Cantidad</th><th scope="col">Subtotal</th></tr></thead><tbody>{arqueo.detalles.map((detalle) => <tr key={detalle.denominacionId}><th scope="row">{detalle.nombre ?? detalle.denominacionId}</th><td>{formatearCentavos(detalle.valorCentavos)}</td><td>{detalle.cantidad}</td><td>{formatearCentavos(detalle.subtotalCentavos)}</td></tr>)}</tbody></table></div> : <p className={styles.sinDato}>No hay desglose disponible.</p>}</article>
    {permisos.includes('CAJA.ARQUEOS.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`arqueo-${arqueo.id}`} descripcion="Registro y aprobación del arqueo, con detalle de cambios y responsables." etiquetasOperacion={{ REGISTRAR: 'Registro', APROBAR: 'Aprobación' }} cargarEventos={cargarAuditoria} revision={revision} />}
    <ModalEstado abierto={mostrarAprobacion} tipo="informacion" titulo="Aprobar arqueo" mensaje={<MotivoAccion valor={motivo} error={errorMotivo} onChange={(v) => { setMotivo(v); setErrorMotivo(null) }} />} textoAccionPrincipal="Aprobar arqueo" onAccionPrincipal={() => void aprobar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setMostrarAprobacion(false)} onCerrar={() => setMostrarAprobacion(false)} cargando={procesando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Arqueo actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    <ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
  </section>
}

export function CierreDetalleView({ cierreId, permisos, onNavegar }: Props & { cierreId: string }) {
  const [cierre, setCierre] = useState<CierreCaja | null>(null)
  const [turno, setTurno] = useState<TurnoCaja | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mostrarReapertura, setMostrarReapertura] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const claveSolicitud = `${cierreId}:${revision}`
  const cargando = solicitudFinalizada !== claveSolicitud
  useEffect(() => { const controlador = new AbortController(); void obtenerCierreCaja(cierreId, controlador.signal).then(async (dato) => { const turnoDato = await obtenerTurnoCaja(dato.turnoId, controlador.signal); setCierre(dato); setTurno(turnoDato); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el cierre.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) }); return () => controlador.abort() }, [cierreId, claveSolicitud])
  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => cierre ? listarAuditoriaCaja('TURNO_CAJA', cierre.turnoId, consulta, signal) : Promise.reject(new Error('Cierre no disponible')), [cierre])
  const reabrir = async () => {
    if (!cierre || !turno) return
    if (motivo.trim().length < 5) { setErrorMotivo('El motivo debe contener al menos 5 caracteres.'); return }
    setProcesando(true); setErrorAccion(null)
    try { await reabrirTurnoCaja(turno.id, { version: turno.version, motivo: motivo.trim() }); setMostrarReapertura(false); setMotivo(''); setMensajeExito(`El turno ${turno.numero} fue reabierto sin eliminar el cierre ${cierre.numero}.`); setRevision((v) => v + 1) }
    catch (errorActual: unknown) { setMostrarReapertura(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible reabrir el turno.') }
    finally { setProcesando(false) }
  }
  if (cargando && !cierre) return <section className={styles.pagina}><p role="status">Cargando cierre…</p></section>
  if (error || !cierre || !turno) return <section className={styles.pagina}><CajaBreadcrumb seccion="Cierres" actual="Detalle" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'El cierre no está disponible.'}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div></section>
  return <section className={styles.pagina} aria-labelledby="titulo-detalle-cierre"><CajaBreadcrumb seccion="Cierres" actual={cierre.numero} onNavegar={onNavegar} />
    <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>Cierre de caja</p><h1 id="titulo-detalle-cierre">{cierre.numero}</h1><p>Turno {cierre.turnoNumero ?? cierre.turnoId} · Versión de cierre {cierre.versionCierre}</p><span className={`${styles.estado} ${cierre.estado === 'REABIERTO' ? styles.estadoNeutral : cierre.estado === 'INVESTIGACION' || cierre.estado === 'FALTANTE' ? styles.estadoPeligro : styles.estadoExito}`}>{etiquetasEstadoCierre[cierre.estado]}</span></div><div className={styles.accionesCabecera}><button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/arqueos/${cierre.arqueoId}`)}>Ver arqueo</button><button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/turnos/${cierre.turnoId}`)}>Ver turno</button>{permisos.includes('CAJA.TURNOS.REABRIR') && turno.estado === 'CERRADO' && cierre.estado !== 'REABIERTO' && <button className={styles.botonPeligro} type="button" onClick={() => setMostrarReapertura(true)}><IconoAccion nombre="estado" />Reabrir turno</button>}</div></header>
    <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Resultado del cierre</h2><dl><div><dt>Tipo de caja</dt><dd>{cierre.caja?.tipo ? etiquetasTipoCaja[cierre.caja.tipo] : 'No disponible'}</dd></div><div><dt>Esperado</dt><dd>{formatearCentavos(cierre.esperadoCentavos)}</dd></div><div><dt>Declarado</dt><dd>{formatearCentavos(cierre.declaradoCentavos)}</dd></div><div><dt>Diferencia</dt><dd><strong>{formatearCentavos(cierre.diferenciaCentavos)}</strong></dd></div><div><dt>Estado</dt><dd>{etiquetasEstadoCierre[cierre.estado]}</dd></div><div className={styles.datoCompleto}><dt>Explicación</dt><dd>{cierre.explicacion ?? 'Sin diferencia reportada'}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Fechas y control</h2><dl><div><dt>Cerrado</dt><dd>{formatearFechaHora(cierre.cerradoEn)}</dd></div><div><dt>Aprobado</dt><dd>{formatearFechaHora(cierre.aprobadoEn)}</dd></div><div><dt>Reabierto</dt><dd>{formatearFechaHora(cierre.reabiertoEn)}</dd></div><div><dt>Arqueo</dt><dd>{cierre.arqueoNumero ?? cierre.arqueoId}</dd></div><div><dt>Versión del registro</dt><dd>{cierre.version}</dd></div><div className={styles.datoCompleto}><dt>Motivo de reapertura</dt><dd>{cierre.motivoReapertura ?? 'No aplica'}</dd></div></dl></article></div>
    {permisos.includes('CAJA.TURNOS.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`cierre-turno-${cierre.turnoId}`} descripcion="Apertura, cierre y reapertura del turno asociado. El cierre histórico se conserva." etiquetasOperacion={{ ABRIR: 'Apertura', CERRAR: 'Cierre', REABRIR: 'Reapertura' }} cargarEventos={cargarAuditoria} revision={revision} />}
    <ModalEstado abierto={mostrarReapertura} tipo="advertencia" titulo="Reabrir turno" mensaje={<MotivoAccion valor={motivo} error={errorMotivo} onChange={(v) => { setMotivo(v); setErrorMotivo(null) }} />} textoAccionPrincipal="Reabrir turno" onAccionPrincipal={() => void reabrir()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setMostrarReapertura(false)} onCerrar={() => setMostrarReapertura(false)} cargando={procesando} varianteAccionPrincipal="peligro" />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Turno reabierto" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    <ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
  </section>
}
