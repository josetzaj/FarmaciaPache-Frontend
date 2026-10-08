import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarCaja, obtenerOpcionesCaja, registrarRendicionCaja } from '../caja-api'
import { convertirQuetzalesACentavos, crearClaveIdempotencia, formatearCentavos } from '../caja-formatos'
import type { OpcionesFiltrosCaja, RendicionRepartidor, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }

export function RendicionCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja | null>(null)
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [repartidorId, setRepartidorId] = useState('')
  const [turnoDestinoId, setTurnoDestinoId] = useState('')
  const [referencia, setReferencia] = useState('')
  const [cantidadEntregas, setCantidadEntregas] = useState('')
  const [fondoCambio, setFondoCambio] = useState('')
  const [cobrado, setCobrado] = useState('')
  const [cambioEntregado, setCambioEntregado] = useState('')
  const [efectivoEntregado, setEfectivoEntregado] = useState('')
  const [explicacion, setExplicacion] = useState('')
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('REN'))
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<RendicionRepartidor | null>(null)
  const hayCambios = Boolean(repartidorId || turnoDestinoId || referencia || cantidadEntregas || fondoCambio || cobrado || cambioEntregado || efectivoEntregado || explicacion)

  useEffect(() => { onCambiosPendientes(hayCambios && !creada); return () => onCambiosPendientes(false) }, [creada, hayCambios, onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([obtenerOpcionesCaja(controlador.signal), listarCaja<TurnoCaja>('turnos', { pagina: 1, tamanoPagina: 200, estados: ['ABIERTO', 'REABIERTO'], orden: 'fecha', direccion: 'desc' }, controlador.signal)]).then(([opcionesCaja, turnosCaja]) => { setOpciones(opcionesCaja); setTurnos(turnosCaja.items.filter((turno) => turno.caja?.tipo === 'VENTAS')); setErrorCarga(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar repartidores y turnos disponibles.') })
    return () => controlador.abort()
  }, [])

  const calculo = useMemo(() => {
    const fondo = fondoCambio ? convertirQuetzalesACentavos(fondoCambio) : 0
    const cobros = cobrado ? convertirQuetzalesACentavos(cobrado) : 0
    const cambio = cambioEntregado ? convertirQuetzalesACentavos(cambioEntregado) : 0
    const entregado = efectivoEntregado ? convertirQuetzalesACentavos(efectivoEntregado) : 0
    if ([fondo, cobros, cambio, entregado].some((valor) => valor === null)) return null
    const esperado = fondo! + cobros! - cambio!
    return esperado < 0 ? null : { fondo: fondo!, cobros: cobros!, cambio: cambio!, entregado: entregado!, esperado, diferencia: entregado! - esperado }
  }, [cambioEntregado, cobrado, efectivoEntregado, fondoCambio])

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const cantidad = Number(cantidadEntregas)
    const mensaje = !repartidorId ? 'Selecciona al repartidor.' : !turnoDestinoId ? 'Selecciona el turno receptor.' : referencia.trim().length < 3 ? 'Ingresa una referencia operativa de al menos 3 caracteres.' : !Number.isInteger(cantidad) || cantidad < 0 ? 'La cantidad de entregas debe ser un entero igual o mayor que cero.' : !calculo ? 'Revisa los importes; el cambio no puede superar el fondo más los cobros.' : calculo.diferencia !== 0 && explicacion.trim().length < 5 ? 'Explica la diferencia con al menos 5 caracteres.' : null
    setErrorFormulario(mensaje)
    if (mensaje || !calculo) return
    setGuardando(true); setErrorEnvio(null)
    try { const dato = await registrarRendicionCaja({ repartidorId, turnoDestinoId, referenciaOperativa: referencia.trim(), cantidadEntregas: cantidad, fondoCambioCentavos: calculo.fondo, cobradoCentavos: calculo.cobros, cambioEntregadoCentavos: calculo.cambio, efectivoEntregadoCentavos: calculo.entregado, explicacion: explicacion.trim() || null, claveIdempotencia }); onCambiosPendientes(false); setCreada(dato) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la rendición.') }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-rendicion-nueva"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Rendiciones" actual="Nueva rendición" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Cobro contra entrega</p><h1 id="titulo-rendicion-nueva">Registrar rendición</h1><p>Compara fondo, cobros, cambio entregado y efectivo recibido sin alterar las ventas históricas.</p></div></header>
    {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p></div>}
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando}><legend>Responsables y referencia</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="repartidor-rendicion">Repartidor <span aria-hidden="true">*</span></label><select id="repartidor-rendicion" value={repartidorId} onChange={(evento) => { setRepartidorId(evento.target.value); setErrorFormulario(null) }}><option value="">Selecciona un repartidor</option>{(opciones?.repartidores ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select></div><div className={styles.campo}><label htmlFor="turno-rendicion">Turno receptor <span aria-hidden="true">*</span></label><select id="turno-rendicion" value={turnoDestinoId} onChange={(evento) => { setTurnoDestinoId(evento.target.value); setErrorFormulario(null) }}><option value="">Selecciona un turno de caja de ventas</option>{turnos.map((turno) => <option key={turno.id} value={turno.id}>{turno.numero} · {turno.caja?.nombre ?? 'Caja'} · {turno.responsableNombre}</option>)}</select></div><div className={`${styles.campo} ${styles.campoDoble}`}><label htmlFor="referencia-rendicion">Referencia operativa <span aria-hidden="true">*</span></label><input id="referencia-rendicion" maxLength={100} value={referencia} onChange={(evento) => { setReferencia(evento.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="entregas-rendicion">Cantidad de entregas <span aria-hidden="true">*</span></label><input id="entregas-rendicion" type="number" min="0" step="1" value={cantidadEntregas} onChange={(evento) => { setCantidadEntregas(evento.target.value); setErrorFormulario(null) }} /></div></div></fieldset>
      <fieldset disabled={guardando}><legend>Liquidación de efectivo</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="fondo-rendicion">Fondo para cambio (Q) <span aria-hidden="true">*</span></label><input id="fondo-rendicion" type="number" min="0" step="0.01" value={fondoCambio} onChange={(evento) => { setFondoCambio(evento.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="cobrado-rendicion">Total cobrado (Q) <span aria-hidden="true">*</span></label><input id="cobrado-rendicion" type="number" min="0" step="0.01" value={cobrado} onChange={(evento) => { setCobrado(evento.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="cambio-rendicion">Cambio entregado (Q) <span aria-hidden="true">*</span></label><input id="cambio-rendicion" type="number" min="0" step="0.01" value={cambioEntregado} onChange={(evento) => { setCambioEntregado(evento.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="efectivo-rendicion">Efectivo entregado (Q) <span aria-hidden="true">*</span></label><input id="efectivo-rendicion" type="number" min="0" step="0.01" value={efectivoEntregado} onChange={(evento) => { setEfectivoEntregado(evento.target.value); setErrorFormulario(null) }} /></div><div className={`${styles.campo} ${styles.campoDoble}`}><label htmlFor="explicacion-rendicion">Explicación {calculo?.diferencia !== 0 && <span aria-hidden="true">*</span>}</label><textarea id="explicacion-rendicion" rows={4} maxLength={1000} value={explicacion} onChange={(evento) => { setExplicacion(evento.target.value); setErrorFormulario(null) }} /></div></div>{calculo && <div className={calculo.diferencia === 0 ? styles.alertaInformativa : styles.alertaAdvertencia}><p>Esperado: <strong>{formatearCentavos(calculo.esperado)}</strong> · Diferencia: <strong>{formatearCentavos(calculo.diferencia)}</strong></p></div>}{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset>
      <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/rendiciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga)}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar rendición'}</button></div></div></form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo registrar" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creada)} tipo="exito" titulo="Rendición registrada" mensaje={creada ? `La rendición ${creada.numero} quedó registrada con estado ${creada.estado === 'INVESTIGACION' ? 'en investigación' : 'pendiente de aprobación'}.` : ''} textoAccionPrincipal="Ver rendición" onAccionPrincipal={() => creada && onNavegar(`/caja/rendiciones/${creada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/rendiciones')} onCerrar={() => creada && onNavegar(`/caja/rendiciones/${creada.id}`)} />
  </section>
}
