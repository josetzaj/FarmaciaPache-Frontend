import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearConciliacionCaja, listarCaja } from '../caja-api'
import { crearClaveIdempotencia, etiquetasEstadoConciliacion, etiquetasEstadoDeposito, etiquetasEstadoRendicion, etiquetasEstadoTurno, etiquetasTipoConciliacion } from '../caja-formatos'
import type { ConciliacionCaja, DepositoEfectivo, RendicionRepartidor, TipoConciliacionCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
type Fuente = TurnoCaja | DepositoEfectivo | RendicionRepartidor
const tipos: TipoConciliacionCaja[] = ['TURNO', 'DEPOSITO', 'RENDICION']

function etiquetaFuente(tipo: TipoConciliacionCaja, fuente: Fuente): string {
  if (tipo === 'TURNO') { const turno = fuente as TurnoCaja; return `${turno.numero} · ${turno.caja?.nombre ?? 'Caja'} · ${etiquetasEstadoTurno[turno.estado]}` }
  if (tipo === 'DEPOSITO') { const deposito = fuente as DepositoEfectivo; return `${deposito.numero} · ${deposito.cuenta?.alias ?? 'Cuenta'} · ${etiquetasEstadoDeposito[deposito.estado]}` }
  const rendicion = fuente as RendicionRepartidor
  return `${rendicion.numero} · ${rendicion.repartidorNombre} · ${etiquetasEstadoRendicion[rendicion.estado]}`
}

export function ConciliacionCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [tipo, setTipo] = useState<TipoConciliacionCaja>('TURNO')
  const [referenciaId, setReferenciaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fuentes, setFuentes] = useState<Fuente[]>([])
  const [cargandoFuentes, setCargandoFuentes] = useState(true)
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('CON'))
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<ConciliacionCaja | null>(null)
  const hayCambios = Boolean(referenciaId || observacion)
  useEffect(() => { onCambiosPendientes(hayCambios && !creada); return () => onCambiosPendientes(false) }, [creada, hayCambios, onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    const recurso = tipo === 'TURNO' ? 'turnos' : tipo === 'DEPOSITO' ? 'depositos' : 'rendiciones'
    void listarCaja<Fuente>(recurso, { pagina: 1, tamanoPagina: 200, orden: 'fecha', direccion: 'desc' }, controlador.signal).then((dato) => { setFuentes(dato.items); setErrorEnvio(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los registros conciliables.') }).finally(() => { if (!controlador.signal.aborted) setCargandoFuentes(false) })
    return () => controlador.abort()
  }, [tipo])

  const fuenteSeleccionada = useMemo(() => fuentes.find((fuente) => fuente.id === referenciaId), [fuentes, referenciaId])
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const mensaje = !referenciaId ? 'Selecciona el registro que se conciliará.' : observacion.trim() && observacion.trim().length < 5 ? 'La observación debe contener al menos 5 caracteres.' : null
    setErrorFormulario(mensaje)
    if (mensaje) return
    setGuardando(true); setErrorEnvio(null)
    try { const dato = await crearConciliacionCaja({ tipo, referenciaId, observacion: observacion.trim() || null, claveIdempotencia }); onCambiosPendientes(false); setCreada(dato) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible crear la conciliación.') }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-conciliacion-nueva"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Conciliaciones" actual="Nueva conciliación" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Control formal</p><h1 id="titulo-conciliacion-nueva">Crear conciliación</h1><p>La conciliación conserva el importe original y vuelve a calcular los valores al confirmarse.</p></div></header>
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando}><legend>Origen de conciliación</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="tipo-conciliacion">Tipo <span aria-hidden="true">*</span></label><select id="tipo-conciliacion" value={tipo} onChange={(evento) => { setTipo(evento.target.value as TipoConciliacionCaja); setReferenciaId(''); setFuentes([]); setCargandoFuentes(true); setErrorFormulario(null) }}>{tipos.map((valor) => <option key={valor} value={valor}>{etiquetasTipoConciliacion[valor]}</option>)}</select></div><div className={styles.campo}><label htmlFor="referencia-conciliacion">Registro <span aria-hidden="true">*</span></label><select id="referencia-conciliacion" value={referenciaId} disabled={cargandoFuentes} onChange={(evento) => { setReferenciaId(evento.target.value); setErrorFormulario(null) }}><option value="">{cargandoFuentes ? 'Cargando registros…' : 'Selecciona un registro'}</option>{fuentes.map((fuente) => <option key={fuente.id} value={fuente.id}>{etiquetaFuente(tipo, fuente)}</option>)}</select></div><div className={`${styles.campo} ${styles.campoDoble}`}><label htmlFor="observacion-conciliacion">Observación</label><textarea id="observacion-conciliacion" rows={4} maxLength={1000} value={observacion} onChange={(evento) => { setObservacion(evento.target.value); setErrorFormulario(null) }} /></div></div>{fuenteSeleccionada && <div className={styles.alertaInformativa}><p>Se conciliará <strong>{etiquetaFuente(tipo, fuenteSeleccionada)}</strong>.</p></div>}{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset><div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/conciliaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || cargandoFuentes}><IconoAccion nombre="guardar" />{guardando ? 'Creando…' : 'Crear conciliación'}</button></div></div></form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo crear" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creada)} tipo="exito" titulo="Conciliación creada" mensaje={creada ? `La conciliación ${creada.numero} quedó ${etiquetasEstadoConciliacion[creada.estado].toLowerCase()}.` : ''} textoAccionPrincipal="Ver conciliación" onAccionPrincipal={() => creada && onNavegar(`/caja/conciliaciones/${creada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/conciliaciones')} onCerrar={() => creada && onNavegar(`/caja/conciliaciones/${creada.id}`)} />
  </section>
}
