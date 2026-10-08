import { useCallback, useEffect, useMemo, useState } from 'react'
import { PistaAuditoria, type ConsultaAuditoria } from '../../../shared/auditoria'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarIncidenciaCaja, listarAuditoriaCaja, obtenerIncidenciaCaja } from '../caja-api'
import { etiquetasEntidadIncidencia, etiquetasEstadoIncidencia, etiquetasSeveridadIncidencia, formatearCentavos, formatearFechaHora } from '../caja-formatos'
import type { EstadoIncidenciaCaja, IncidenciaCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import { EvidenciasCaja } from './evidencias-caja'
import styles from './caja.module.css'

type Props = { incidenciaId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }
const rutasEntidad: Partial<Record<IncidenciaCaja['entidadTipo'], string>> = { TURNO_CAJA: '/caja/turnos', MOVIMIENTO_CAJA: '/caja/movimientos', ARQUEO_CAJA: '/caja/arqueos', TRANSFERENCIA_EFECTIVO: '/caja/transferencias', DEPOSITO_EFECTIVO: '/caja/depositos', RENDICION_REPARTIDOR: '/caja/rendiciones', CONCILIACION_CAJA: '/caja/conciliaciones', CONSOLIDACION_DIARIA_CAJA: '/caja/consolidaciones' }

function opcionesEstado(estado: EstadoIncidenciaCaja): EstadoIncidenciaCaja[] {
  if (estado === 'ABIERTA') return ['EN_INVESTIGACION', 'RESUELTA']
  if (estado === 'EN_INVESTIGACION') return ['RESUELTA']
  if (estado === 'RESUELTA') return ['CERRADA']
  return []
}

export function IncidenciaDetalleView({ incidenciaId, permisos, onNavegar }: Props) {
  const [incidencia, setIncidencia] = useState<IncidenciaCaja | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mostrarGestion, setMostrarGestion] = useState(false)
  const [estado, setEstado] = useState<EstadoIncidenciaCaja>('EN_INVESTIGACION')
  const [resolucion, setResolucion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [revision, setRevision] = useState(0)
  const claveSolicitud = `${incidenciaId}:${revision}`
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerIncidenciaCaja(incidenciaId, controlador.signal).then((dato) => { setIncidencia(dato); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la incidencia.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, incidenciaId])
  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => listarAuditoriaCaja('INCIDENCIA_CAJA', incidenciaId, consulta, signal), [incidenciaId])
  const estadosDisponibles = useMemo(() => incidencia ? opcionesEstado(incidencia.estado) : [], [incidencia])
  const rutaOrigen = incidencia ? rutasEntidad[incidencia.entidadTipo] : undefined
  const abrirGestion = () => { if (!incidencia || !estadosDisponibles.length) return; setEstado(estadosDisponibles[0]!); setResolucion(incidencia.resolucion ?? ''); setMotivo(''); setErrorModal(null); setMostrarGestion(true) }
  const guardar = async () => {
    if (!incidencia) return
    if (['RESUELTA', 'CERRADA'].includes(estado) && resolucion.trim().length < 5) { setErrorModal('La resolución debe contener al menos 5 caracteres.'); return }
    if (motivo.trim().length < 5) { setErrorModal('El motivo debe contener al menos 5 caracteres.'); return }
    setProcesando(true); setErrorAccion(null)
    try { const dato = await actualizarIncidenciaCaja(incidencia.id, { estado, resolucion: resolucion.trim() || null, responsableId: incidencia.responsableId, motivo: motivo.trim(), version: incidencia.version }); setIncidencia(dato); setMostrarGestion(false); setMensajeExito(`La incidencia ${dato.numero} cambió a ${etiquetasEstadoIncidencia[dato.estado].toLowerCase()}.`); setRevision((valor) => valor + 1) }
    catch (errorActual: unknown) { setMostrarGestion(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible actualizar la incidencia.') }
    finally { setProcesando(false) }
  }

  if (cargando && !incidencia) return <section className={styles.pagina}><p role="status">Cargando incidencia…</p></section>
  if (error || !incidencia) return <section className={styles.pagina}><CajaBreadcrumb seccion="Incidencias" actual="Detalle" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'La incidencia no está disponible.'}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>

  return <section className={styles.pagina} aria-labelledby="titulo-detalle-incidencia"><CajaBreadcrumb seccion="Incidencias" actual={incidencia.numero} onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>Investigación operativa</p><h1 id="titulo-detalle-incidencia">{incidencia.numero}</h1><p>{etiquetasEntidadIncidencia[incidencia.entidadTipo]}</p><div className={styles.estadosDetalle}><span className={`${styles.estado} ${incidencia.estado === 'ABIERTA' ? styles.estadoPeligro : incidencia.estado === 'EN_INVESTIGACION' ? styles.estadoAdvertencia : styles.estadoExito}`}>{etiquetasEstadoIncidencia[incidencia.estado]}</span><span className={`${styles.estado} ${['ALTA', 'CRITICA'].includes(incidencia.severidad) ? styles.estadoPeligro : incidencia.severidad === 'MEDIA' ? styles.estadoAdvertencia : styles.estadoInfo}`}>{etiquetasSeveridadIncidencia[incidencia.severidad]}</span></div></div><div className={styles.accionesCabecera}>{permisos.includes('CAJA.INCIDENCIAS.ACTUALIZAR') && estadosDisponibles.length > 0 && <button className={styles.botonPrincipal} type="button" onClick={abrirGestion}><IconoAccion nombre="estado" />Gestionar incidencia</button>}</div></header>
    <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Origen</h2><dl><div><dt>Tipo de registro</dt><dd>{etiquetasEntidadIncidencia[incidencia.entidadTipo]}</dd></div><div><dt>Identificador</dt><dd>{rutaOrigen ? <button className={styles.enlaceTexto} type="button" onClick={() => onNavegar(`${rutaOrigen}/${incidencia.entidadId}`)}>Ver registro relacionado</button> : incidencia.entidadId}</dd></div><div><dt>Diferencia</dt><dd>{formatearCentavos(incidencia.diferenciaCentavos)}</dd></div><div><dt>Creada</dt><dd>{formatearFechaHora(incidencia.creadoEn)}</dd></div><div className={styles.datoCompleto}><dt>Descripción</dt><dd>{incidencia.descripcion}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Resolución</h2><dl><div><dt>Responsable</dt><dd>{incidencia.responsableId ?? 'Sin asignar'}</dd></div><div><dt>Resuelta</dt><dd>{formatearFechaHora(incidencia.resueltoEn)}</dd></div><div className={styles.datoCompleto}><dt>Resolución</dt><dd>{incidencia.resolucion ?? 'Pendiente de investigación'}</dd></div><div><dt>Versión</dt><dd>{incidencia.version}</dd></div></dl></article></div>
    <EvidenciasCaja entidadTipo="INCIDENCIA_CAJA" entidadId={incidencia.id} permisos={permisos} revision={revision} onCambio={() => setRevision((valor) => valor + 1)} />
    {permisos.includes('CAJA.INCIDENCIAS.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`incidencia-${incidencia.id}`} descripcion="Creación, investigación, resolución, cierre y evidencias de la incidencia." etiquetasOperacion={{ CREAR: 'Creación manual', CREAR_AUTOMATICA: 'Creación automática', ACTUALIZAR: 'Actualización', ADJUNTAR_EVIDENCIA: 'Evidencia adjunta' }} cargarEventos={cargarAuditoria} revision={revision} />}
    <ModalEstado abierto={mostrarGestion} tipo="informacion" titulo="Gestionar incidencia" mensaje={<div className={styles.contenidoModal}><label htmlFor="estado-incidencia">Nuevo estado <span aria-hidden="true">*</span></label><select id="estado-incidencia" value={estado} onChange={(e) => { setEstado(e.target.value as EstadoIncidenciaCaja); setErrorModal(null) }}>{estadosDisponibles.map((valor) => <option key={valor} value={valor}>{etiquetasEstadoIncidencia[valor]}</option>)}</select><label htmlFor="resolucion-incidencia">Resolución {['RESUELTA', 'CERRADA'].includes(estado) && <span aria-hidden="true">*</span>}</label><textarea id="resolucion-incidencia" rows={4} maxLength={1000} value={resolucion} onChange={(e) => { setResolucion(e.target.value); setErrorModal(null) }} /><label htmlFor="motivo-incidencia">Motivo del cambio <span aria-hidden="true">*</span></label><textarea id="motivo-incidencia" rows={3} maxLength={500} value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrorModal(null) }} />{errorModal && <small role="alert">{errorModal}</small>}</div>} textoAccionPrincipal="Guardar cambio" onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setMostrarGestion(false)} onCerrar={() => setMostrarGestion(false)} cargando={procesando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Incidencia actualizada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} /><ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo actualizar" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
  </section>
}
