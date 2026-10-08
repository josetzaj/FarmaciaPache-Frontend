import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearTransferenciaCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import { convertirQuetzalesACentavos, crearClaveIdempotencia, etiquetasCustodia, formatearCentavos } from '../caja-formatos'
import type { EstadoCustodiaEfectivo, OpcionesFiltrosCaja, TransferenciaEfectivo, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const opcionesIniciales: OpcionesFiltrosCaja = { cajas: { opciones: [], estados: [], tipos: [] }, sucursales: [], turnos: { estados: [] }, movimientos: { estados: [], tipos: [] }, arqueos: { estados: [], tipos: [] }, cierres: { estados: [] }, transferencias: { estados: [], custodias: [] }, depositos: { estados: [] }, tamanosPagina: [50, 100, 150, 200] }

export function TransferenciaCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja>(opcionesIniciales)
  const [turnoOrigenId, setTurnoOrigenId] = useState('')
  const [cajaDestinoId, setCajaDestinoId] = useState('')
  const [custodiaDestino, setCustodiaDestino] = useState<EstadoCustodiaEfectivo>('CAJA_FUERTE')
  const [monto, setMonto] = useState('')
  const [bolsa, setBolsa] = useState('')
  const [sello, setSello] = useState('')
  const [transporte, setTransporte] = useState('')
  const [motivo, setMotivo] = useState('')
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('transferencia'))
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<TransferenciaEfectivo | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => { const controlador = new AbortController(); void Promise.all([listarCaja<TurnoCaja>('turnos', { pagina: 1, tamanoPagina: 200, estados: ['ABIERTO', 'REABIERTO'], orden: 'fecha', direccion: 'desc' }, controlador.signal), obtenerOpcionesCaja(controlador.signal)]).then(([respuestaTurnos, respuestaOpciones]) => { setTurnos(respuestaTurnos.items); setOpciones(respuestaOpciones); setErrorCarga(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los turnos y cajas disponibles.') }); return () => controlador.abort() }, [revision])
  const turno = turnos.find((item) => item.id === turnoOrigenId)
  const cajasDestino = useMemo(() => opciones.cajas.opciones.filter((caja) => caja.estado === 'DISPONIBLE' && caja.id !== turno?.cajaId), [opciones.cajas.opciones, turno?.cajaId])
  const hayCambios = Boolean(turnoOrigenId || cajaDestinoId || monto || bolsa || sello || transporte || motivo || custodiaDestino !== 'CAJA_FUERTE') && !creada
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const montoCentavos = convertirQuetzalesACentavos(monto)
    let mensaje: string | null = null
    if (!turno) mensaje = 'Selecciona el turno que entregará el efectivo.'
    else if (!montoCentavos || montoCentavos <= 0) mensaje = 'Ingresa un monto válido mayor que cero.'
    else if (montoCentavos > turno.saldoConfirmadoCentavos) mensaje = 'El monto supera el saldo confirmado del turno.'
    else if (!bolsa.trim()) mensaje = 'Registra el identificador de la bolsa.'
    else if (!sello.trim()) mensaje = 'Registra el sello de seguridad.'
    else if (motivo.trim().length < 5) mensaje = 'El motivo debe contener al menos 5 caracteres.'
    setErrorFormulario(mensaje)
    if (mensaje || !montoCentavos) return
    setGuardando(true); setErrorEnvio(null)
    try { const transferencia = await crearTransferenciaCaja({ turnoOrigenId, cajaDestinoId: cajaDestinoId || null, custodiaDestino, montoCentavos, bolsa: bolsa.trim(), sello: sello.trim(), transporte: transporte.trim() || null, motivo: motivo.trim(), claveIdempotencia }); onCambiosPendientes(false); setCreada(transferencia) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la transferencia.') }
    finally { setGuardando(false) }
  }
  return <section className={styles.pagina} aria-labelledby="titulo-transferencia"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Custodia y transferencias" actual="Nueva transferencia" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Cadena de custodia</p><h1 id="titulo-transferencia">Registrar transferencia de efectivo</h1><p>La entrega genera una salida confirmada y conserva bolsa, sello, transporte y responsables.</p></div></header>
    {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}{!errorCarga && !turnos.length && <div className={styles.alertaInformativa} role="status"><p>No hay turnos abiertos o reabiertos con los que se pueda iniciar una transferencia.</p></div>}
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando || Boolean(errorCarga)}><legend>Origen y destino</legend><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="turno-origen">Turno origen <span aria-hidden="true">*</span></label><select id="turno-origen" value={turnoOrigenId} onChange={(e) => { setTurnoOrigenId(e.target.value); setCajaDestinoId(''); setErrorFormulario(null) }}><option value="">Selecciona un turno</option>{turnos.map((item) => <option key={item.id} value={item.id}>{item.numero} · {item.caja?.nombre ?? 'Caja'} · {formatearCentavos(item.saldoConfirmadoCentavos)}</option>)}</select></div><div className={styles.campo}><label htmlFor="custodia-destino">Custodia destino <span aria-hidden="true">*</span></label><select id="custodia-destino" value={custodiaDestino} onChange={(e) => setCustodiaDestino(e.target.value as EstadoCustodiaEfectivo)}>{opciones.transferencias.custodias.map((item) => <option key={item} value={item}>{etiquetasCustodia[item]}</option>)}</select></div><div className={styles.campo}><label htmlFor="caja-destino">Caja destino</label><select id="caja-destino" value={cajaDestinoId} onChange={(e) => setCajaDestinoId(e.target.value)}><option value="">No aplica</option>{cajasDestino.map((caja) => <option key={caja.id} value={caja.id}>{caja.codigo} · {caja.nombre}</option>)}</select><small className={styles.ayudaCampo}>Si seleccionas una caja, la recepción exigirá un turno abierto en esa caja.</small></div></div></fieldset>
      <fieldset disabled={guardando || Boolean(errorCarga)}><legend>Valores bajo custodia</legend><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="monto-transferencia">Monto (Q) <span aria-hidden="true">*</span></label><input id="monto-transferencia" type="number" min="0.01" step="0.01" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="bolsa-transferencia">Bolsa <span aria-hidden="true">*</span></label><input id="bolsa-transferencia" maxLength={100} value={bolsa} onChange={(e) => { setBolsa(e.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="sello-transferencia">Sello <span aria-hidden="true">*</span></label><input id="sello-transferencia" maxLength={100} value={sello} onChange={(e) => { setSello(e.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="transporte-transferencia">Transporte</label><input id="transporte-transferencia" maxLength={200} value={transporte} onChange={(e) => setTransporte(e.target.value)} /></div><div className={`${styles.campo} ${styles.campoDoble}`}><label htmlFor="motivo-transferencia">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-transferencia" rows={3} maxLength={500} value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrorFormulario(null) }} /></div></div>{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset>
      <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/transferencias')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !turnos.length}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar entrega'}</button></div></div></form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo registrar la transferencia" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creada)} tipo="exito" titulo="Transferencia entregada" mensaje={creada ? `La transferencia ${creada.numero} quedó entregada por ${formatearCentavos(creada.montoCentavos)}.` : ''} textoAccionPrincipal="Ver transferencia" onAccionPrincipal={() => creada && onNavegar(`/caja/transferencias/${creada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/transferencias')} onCerrar={() => creada && onNavegar(`/caja/transferencias/${creada.id}`)} />
  </section>
}
