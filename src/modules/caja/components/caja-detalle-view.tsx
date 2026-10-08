import { useCallback, useEffect, useState } from 'react'
import { PistaAuditoria, type ConsultaAuditoria } from '../../../shared/auditoria'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  compensarMovimientoCaja,
  confirmarMovimientoCaja,
  listarAuditoriaCaja,
  obtenerMovimientoCaja,
  obtenerTurnoCaja,
  reabrirTurnoCaja,
} from '../caja-api'
import {
  crearClaveIdempotencia,
  etiquetasEfecto,
  etiquetasEstadoMovimiento,
  etiquetasEstadoTurno,
  etiquetasTipoCaja,
  etiquetasTipoMovimiento,
  formatearCentavos,
  formatearFecha,
  formatearFechaHora,
} from '../caja-formatos'
import type { MovimientoCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type PropsDetalle = { permisos: readonly string[]; onNavegar: (ruta: string) => void }

function claseEstadoTurno(estado: TurnoCaja['estado']): string {
  if (estado === 'ABIERTO' || estado === 'REABIERTO') return styles.estadoExito
  if (estado === 'CERRADO') return styles.estadoNeutral
  if (estado === 'INVESTIGACION') return styles.estadoPeligro
  return styles.estadoAdvertencia
}

function claseEstadoMovimiento(estado: MovimientoCaja['estado']): string {
  if (estado === 'CONFIRMADO') return styles.estadoExito
  if (estado === 'INVESTIGACION') return styles.estadoPeligro
  if (estado === 'REGISTRADO') return styles.estadoAdvertencia
  return styles.estadoNeutral
}

function ContenidoMotivo({ valor, error, onChange }: { valor: string; error: string | null; onChange: (valor: string) => void }) {
  return <div className={styles.contenidoModal}><p>Esta acción quedará registrada en la pista de auditoría.</p><label htmlFor="motivo-accion-caja">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-accion-caja" rows={4} maxLength={500} value={valor} aria-invalid={Boolean(error)} onChange={(evento) => onChange(evento.target.value)} />{error && <small>{error}</small>}</div>
}

export function TurnoDetalleView({ turnoId, permisos, onNavegar }: PropsDetalle & { turnoId: string }) {
  const [turno, setTurno] = useState<TurnoCaja | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [reabriendo, setReabriendo] = useState(false)
  const [mostrarReapertura, setMostrarReapertura] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const claveSolicitud = `${turnoId}:${revision}`
  const cargando = solicitudFinalizada !== claveSolicitud
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerTurnoCaja(turnoId, controlador.signal).then((respuesta) => { setTurno(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el turno.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, turnoId])

  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => listarAuditoriaCaja('TURNO_CAJA', turnoId, consulta, signal), [turnoId])
  const ejecutarReapertura = async () => {
    if (!turno) return
    if (motivo.trim().length < 5) { setErrorMotivo('El motivo debe contener al menos 5 caracteres.'); return }
    setReabriendo(true); setErrorAccion(null)
    try {
      const actualizado = await reabrirTurnoCaja(turno.id, { version: turno.version, motivo: motivo.trim() })
      setTurno(actualizado); setMostrarReapertura(false); setMotivo(''); setMensajeExito(`El turno ${actualizado.numero} fue reabierto correctamente.`); setRevision((valor) => valor + 1)
    } catch (errorActual: unknown) { setMostrarReapertura(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible reabrir el turno.') }
    finally { setReabriendo(false) }
  }

  if (cargando && !turno) return <section className={styles.pagina}><p role="status">Cargando turno de caja…</p></section>
  if (error || !turno) return <section className={styles.pagina}><CajaBreadcrumb seccion="Turnos de caja" actual="Detalle" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'El turno no está disponible.'}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>

  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-turno">
      <CajaBreadcrumb seccion="Turnos de caja" actual={turno.numero} onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>Turno de caja</p><h1 id="titulo-detalle-turno">{turno.numero}</h1><p>{turno.caja?.nombre ?? 'Caja no disponible'}{turno.caja?.tipo ? ` · ${etiquetasTipoCaja[turno.caja.tipo]}` : ''} · {turno.responsableNombre}</p><span className={`${styles.estado} ${claseEstadoTurno(turno.estado)}`}>{etiquetasEstadoTurno[turno.estado]}</span></div><div className={styles.accionesCabecera}>{permisos.includes('CAJA.INCIDENCIAS.CREAR') && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/incidencias/nueva?entidadTipo=TURNO_CAJA&entidadId=${turno.id}`)}><IconoAccion nombre="agregar" />Reportar incidencia</button>}{permisos.includes('CAJA.MOVIMIENTOS.REGISTRAR') && ['ABIERTO', 'REABIERTO'].includes(turno.estado) && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/movimientos/nuevo?turnoId=${turno.id}`)}><IconoAccion nombre="agregar" />Registrar movimiento</button>}{permisos.includes('CAJA.TURNOS.REABRIR') && turno.estado === 'CERRADO' && <button className={styles.botonPeligro} type="button" onClick={() => setMostrarReapertura(true)}><IconoAccion nombre="estado" />Reabrir turno</button>}</div></header>
      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Información del turno</h2><dl><div><dt>Caja</dt><dd>{turno.caja ? `${turno.caja.codigo} · ${turno.caja.nombre}` : turno.cajaId}</dd></div><div><dt>Responsable</dt><dd>{turno.responsableNombre}</dd></div><div><dt>Fecha de negocio</dt><dd>{formatearFecha(turno.fechaNegocio)}</dd></div><div><dt>Apertura</dt><dd>{formatearFechaHora(turno.abiertoEn)}</dd></div><div><dt>Cierre</dt><dd>{formatearFechaHora(turno.cerradoEn)}</dd></div><div><dt>Versión de cierre</dt><dd>{turno.versionCierre}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Resumen de efectivo</h2><dl><div><dt>Fondo inicial</dt><dd><strong>{formatearCentavos(turno.fondoInicialCentavos)}</strong></dd></div><div><dt>Saldo confirmado</dt><dd><strong>{formatearCentavos(turno.saldoConfirmadoCentavos)}</strong></dd></div><div><dt>Estado</dt><dd>{etiquetasEstadoTurno[turno.estado]}</dd></div><div><dt>Última actualización</dt><dd>{formatearFechaHora(turno.actualizadoEn)}</dd></div></dl></article>
      </div>
      <article className={styles.tarjetaDetalle}><h2>Fondo inicial por denominación</h2>{turno.fondoDenominaciones?.length ? <div className={styles.contenedorTablaConteo}><table className={styles.tablaConteo}><caption className={styles.ayudaCampo}>Detalle del conteo registrado en la apertura</caption><thead><tr><th scope="col">Denominación</th><th scope="col">Valor</th><th scope="col">Cantidad</th><th scope="col">Subtotal</th></tr></thead><tbody>{turno.fondoDenominaciones.map((detalle) => <tr key={detalle.id ?? detalle.denominacionId}><th scope="row">{detalle.denominacion?.nombre ?? 'Denominación'}</th><td>{formatearCentavos(detalle.valorCentavos)}</td><td>{detalle.cantidad}</td><td>{formatearCentavos(detalle.subtotalCentavos)}</td></tr>)}</tbody></table></div> : <p className={styles.sinDato}>No hay desglose de denominaciones disponible.</p>}</article>
      {permisos.includes('CAJA.TURNOS.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`turno-${turno.id}`} descripcion="Aperturas, cierres y reaperturas registradas para este turno." etiquetasOperacion={{ ABRIR: 'Apertura', CERRAR: 'Cierre', REABRIR: 'Reapertura' }} cargarEventos={cargarAuditoria} revision={revision} />}
      <ModalEstado abierto={mostrarReapertura} tipo="advertencia" titulo="Reabrir turno" mensaje={<ContenidoMotivo valor={motivo} error={errorMotivo} onChange={(valor) => { setMotivo(valor); setErrorMotivo(null) }} />} textoAccionPrincipal="Reabrir turno" onAccionPrincipal={() => void ejecutarReapertura()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => { setMostrarReapertura(false); setMotivo(''); setErrorMotivo(null) }} onCerrar={() => setMostrarReapertura(false)} cargando={reabriendo} varianteAccionPrincipal="peligro" />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Turno actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
      <ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
    </section>
  )
}

export function MovimientoDetalleView({ movimientoId, permisos, onNavegar }: PropsDetalle & { movimientoId: string }) {
  const [movimiento, setMovimiento] = useState<MovimientoCaja | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<'confirmar' | 'compensar' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [destinoExito, setDestinoExito] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const claveSolicitud = `${movimientoId}:${revision}`
  const cargando = solicitudFinalizada !== claveSolicitud
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerMovimientoCaja(movimientoId, controlador.signal).then((respuesta) => { setMovimiento(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el movimiento.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, movimientoId])

  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => listarAuditoriaCaja('MOVIMIENTO_CAJA', movimientoId, consulta, signal), [movimientoId])
  const ejecutarAccion = async () => {
    if (!movimiento || !accion) return
    if (motivo.trim().length < 5) { setErrorMotivo('El motivo debe contener al menos 5 caracteres.'); return }
    setProcesando(true); setErrorAccion(null)
    try {
      const actualizado = accion === 'confirmar'
        ? await confirmarMovimientoCaja(movimiento.id, { version: movimiento.version, motivo: motivo.trim() })
        : await compensarMovimientoCaja(movimiento.id, { version: movimiento.version, motivo: motivo.trim(), claveIdempotencia: crearClaveIdempotencia('compensacion') })
      setAccion(null); setMotivo('')
      if (accion === 'confirmar') setMovimiento(actualizado)
      setDestinoExito(accion === 'compensar' ? `/caja/movimientos/${actualizado.id}` : null)
      setMensajeExito(accion === 'confirmar' ? `El movimiento ${actualizado.numero} fue confirmado y aplicado al saldo.` : `Se generó el movimiento compensatorio ${actualizado.numero}.`)
      setRevision((valor) => valor + 1)
    } catch (errorActual: unknown) { setAccion(null); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la acción.') }
    finally { setProcesando(false) }
  }

  if (cargando && !movimiento) return <section className={styles.pagina}><p role="status">Cargando movimiento de caja…</p></section>
  if (error || !movimiento) return <section className={styles.pagina}><CajaBreadcrumb seccion="Movimientos" actual="Detalle" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'El movimiento no está disponible.'}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>

  return (
    <section className={styles.pagina} aria-labelledby="titulo-detalle-movimiento">
      <CajaBreadcrumb seccion="Movimientos" actual={movimiento.numero} onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>Movimiento de caja</p><h1 id="titulo-detalle-movimiento">{movimiento.numero}</h1><p>{etiquetasTipoMovimiento[movimiento.tipo]} · {etiquetasEfecto[movimiento.efecto]}</p><span className={`${styles.estado} ${claseEstadoMovimiento(movimiento.estado)}`}>{etiquetasEstadoMovimiento[movimiento.estado]}</span></div><div className={styles.accionesCabecera}><button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/turnos/${movimiento.turnoId}`)}>Ver turno</button>{permisos.includes('CAJA.INCIDENCIAS.CREAR') && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar(`/caja/incidencias/nueva?entidadTipo=MOVIMIENTO_CAJA&entidadId=${movimiento.id}`)}><IconoAccion nombre="agregar" />Reportar incidencia</button>}{permisos.includes('CAJA.MOVIMIENTOS.CONFIRMAR') && movimiento.estado === 'REGISTRADO' && <button className={styles.botonPrincipal} type="button" onClick={() => setAccion('confirmar')}><IconoAccion nombre="guardar" />Confirmar movimiento</button>}{permisos.includes('CAJA.MOVIMIENTOS.COMPENSAR') && movimiento.estado === 'CONFIRMADO' && <button className={styles.botonPeligro} type="button" onClick={() => setAccion('compensar')}><IconoAccion nombre="estado" />Compensar movimiento</button>}</div></header>
      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Información operativa</h2><dl><div><dt>Turno</dt><dd>{movimiento.turnoNumero ?? movimiento.turnoId}</dd></div><div><dt>Tipo de caja</dt><dd>{movimiento.caja?.tipo ? etiquetasTipoCaja[movimiento.caja.tipo] : 'No disponible'}</dd></div><div><dt>Fecha de negocio</dt><dd>{formatearFecha(movimiento.fechaNegocio)}</dd></div><div><dt>Registrado</dt><dd>{formatearFechaHora(movimiento.ocurridoEn)}</dd></div><div><dt>Confirmado</dt><dd>{formatearFechaHora(movimiento.confirmadoEn)}</dd></div><div><dt>Origen</dt><dd>{movimiento.origenModulo}</dd></div><div><dt>Efecto</dt><dd>{etiquetasEfecto[movimiento.efecto]}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Importe y saldos</h2><dl><div><dt>Monto</dt><dd><strong>{formatearCentavos(movimiento.montoCentavos)}</strong></dd></div><div><dt>Saldo anterior</dt><dd>{formatearCentavos(movimiento.saldoAnteriorCentavos)}</dd></div><div><dt>Saldo posterior</dt><dd>{formatearCentavos(movimiento.saldoPosteriorCentavos)}</dd></div><div><dt>Estado</dt><dd>{etiquetasEstadoMovimiento[movimiento.estado]}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Referencia</h2><dl><div><dt>Tipo</dt><dd>{movimiento.referenciaTipo}</dd></div><div><dt>Número</dt><dd>{movimiento.referenciaNumero ?? 'Sin número visible'}</dd></div><div className={styles.datoCompleto}><dt>Identificador</dt><dd>{movimiento.referenciaId}</dd></div><div className={styles.datoCompleto}><dt>Motivo</dt><dd>{movimiento.motivo}</dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Compensación</h2><dl><div className={styles.datoCompleto}><dt>Movimiento compensado</dt><dd>{movimiento.compensaMovimientoId ?? 'No aplica'}</dd></div><div><dt>Versión</dt><dd>{movimiento.version}</dd></div><div><dt>Última actualización</dt><dd>{formatearFechaHora(movimiento.actualizadoEn)}</dd></div></dl></article>
      </div>
      {permisos.includes('CAJA.MOVIMIENTOS.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`movimiento-${movimiento.id}`} descripcion="Registro, confirmación y compensaciones asociadas a este movimiento." etiquetasOperacion={{ REGISTRAR: 'Registro', CONFIRMAR: 'Confirmación', COMPENSAR: 'Compensación', COBRAR_VENTA: 'Cobro de venta', ANULAR_VENTA: 'Anulación de venta' }} cargarEventos={cargarAuditoria} revision={revision} />}
      <ModalEstado abierto={Boolean(accion)} tipo={accion === 'compensar' ? 'advertencia' : 'informacion'} titulo={accion === 'compensar' ? 'Compensar movimiento' : 'Confirmar movimiento'} mensaje={<ContenidoMotivo valor={motivo} error={errorMotivo} onChange={(valor) => { setMotivo(valor); setErrorMotivo(null) }} />} textoAccionPrincipal={accion === 'compensar' ? 'Generar compensación' : 'Confirmar movimiento'} onAccionPrincipal={() => void ejecutarAccion()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => { setAccion(null); setMotivo(''); setErrorMotivo(null) }} onCerrar={() => setAccion(null)} cargando={procesando} varianteAccionPrincipal={accion === 'compensar' ? 'peligro' : 'predeterminada'} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Operación completada" mensaje={mensajeExito ?? ''} textoAccionPrincipal={destinoExito ? 'Ver compensación' : 'Aceptar'} onAccionPrincipal={() => { if (destinoExito) onNavegar(destinoExito); else setMensajeExito(null) }} onCerrar={() => { if (destinoExito) onNavegar(destinoExito); else setMensajeExito(null) }} />
      <ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
    </section>
  )
}
