import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarCaja, obtenerDenominacionesCaja, registrarArqueoCaja } from '../caja-api'
import { crearClaveIdempotencia, etiquetasTipoArqueo, formatearCentavos } from '../caja-formatos'
import type { ArqueoCaja, DenominacionCaja, TipoArqueoCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const tiposArqueo: TipoArqueoCaja[] = ['ORDINARIO', 'CIEGO', 'SORPRESIVO', 'INCIDENCIA', 'CIERRE']

export function ArqueoCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [denominaciones, setDenominaciones] = useState<DenominacionCaja[]>([])
  const [turnoId, setTurnoId] = useState('')
  const [tipo, setTipo] = useState<TipoArqueoCaja>('ORDINARIO')
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [explicacion, setExplicacion] = useState('')
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('arqueo'))
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creado, setCreado] = useState<ArqueoCaja | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      listarCaja<TurnoCaja>('turnos', { pagina: 1, tamanoPagina: 200, estados: ['ABIERTO', 'REABIERTO'], orden: 'fecha', direccion: 'desc' }, controlador.signal),
      obtenerDenominacionesCaja(controlador.signal),
    ]).then(([turnosRespuesta, denominacionesRespuesta]) => {
      setTurnos(turnosRespuesta.items)
      setDenominaciones(denominacionesRespuesta.filter((item) => item.activa).sort((a, b) => a.orden - b.orden))
      setErrorCarga(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los turnos y denominaciones.')
    })
    return () => controlador.abort()
  }, [revision])

  const conteo = useMemo(() => denominaciones.map((denominacion) => ({ denominacion, cantidad: Number(cantidades[denominacion.id] || 0) })), [cantidades, denominaciones])
  const declaradoCentavos = useMemo(() => conteo.reduce((total, item) => total + item.denominacion.valorCentavos * item.cantidad, 0), [conteo])
  const turnoSeleccionado = turnos.find((turno) => turno.id === turnoId)
  const esCiego = tipo === 'CIEGO' || tipo === 'SORPRESIVO'
  const diferencia = !esCiego && turnoSeleccionado ? declaradoCentavos - turnoSeleccionado.saldoConfirmadoCentavos : null
  const hayCambios = Boolean(turnoId || tipo !== 'ORDINARIO' || explicacion || Object.values(cantidades).some((cantidad) => Number(cantidad) > 0)) && !creado
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const conteoValido = conteo.filter((item) => item.cantidad > 0)
    let mensaje: string | null = null
    if (!turnoId) mensaje = 'Selecciona el turno que se arqueará.'
    else if (!conteoValido.length || declaradoCentavos <= 0) mensaje = 'Registra al menos una denominación con cantidad mayor que cero.'
    else if (conteo.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 0)) mensaje = 'Las cantidades deben ser números enteros iguales o mayores que cero.'
    else if (diferencia !== null && diferencia !== 0 && explicacion.trim().length < 5) mensaje = 'Explica la diferencia detectada con al menos 5 caracteres.'
    setErrorFormulario(mensaje)
    if (mensaje) return
    setGuardando(true); setErrorEnvio(null)
    try {
      const arqueo = await registrarArqueoCaja({ turnoId, tipo, conteo: conteoValido.map((item) => ({ denominacionId: item.denominacion.id, cantidad: item.cantidad })), explicacion: explicacion.trim() || null, claveIdempotencia })
      onCambiosPendientes(false); setCreado(arqueo)
    } catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar el arqueo.') }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-crear-arqueo">
    <header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Arqueos" actual="Registrar arqueo" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Control de efectivo</p><h1 id="titulo-crear-arqueo">Registrar arqueo de caja</h1><p>Cuenta el efectivo por denominación. El sistema calcula la diferencia y aplica la aprobación correspondiente.</p></div></header>
    {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}
    {!errorCarga && !turnos.length && <div className={styles.alertaInformativa} role="status"><p>No hay turnos abiertos o reabiertos disponibles para arqueo.</p></div>}
    <form className={styles.formulario} noValidate onSubmit={enviar}>
      <fieldset disabled={guardando || Boolean(errorCarga)}><legend>Datos del arqueo</legend><p className={styles.descripcionSeccion}>Los arqueos ciegos y sorpresivos no muestran el saldo esperado durante la captura.</p><div className={styles.grillaTres}>
        <div className={styles.campo}><label htmlFor="turno-arqueo">Turno <span aria-hidden="true">*</span></label><select id="turno-arqueo" value={turnoId} onChange={(e) => { setTurnoId(e.target.value); setErrorFormulario(null) }}><option value="">Selecciona un turno</option>{turnos.map((turno) => <option key={turno.id} value={turno.id}>{turno.numero} · {turno.caja?.nombre ?? 'Caja'} · {turno.responsableNombre}</option>)}</select></div>
        <div className={styles.campo}><label htmlFor="tipo-arqueo">Tipo <span aria-hidden="true">*</span></label><select id="tipo-arqueo" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoArqueoCaja); setErrorFormulario(null) }}>{tiposArqueo.map((item) => <option key={item} value={item}>{etiquetasTipoArqueo[item]}</option>)}</select></div>
        <div className={styles.campo}><label>Total declarado</label><input value={formatearCentavos(declaradoCentavos)} readOnly /></div>
      </div></fieldset>
      <fieldset disabled={guardando || Boolean(errorCarga)}><legend>Conteo por denominación</legend><div className={styles.contenedorTablaConteo}><table className={styles.tablaConteo}><caption className={styles.ayudaCampo}>Efectivo contado físicamente</caption><thead><tr><th scope="col">Denominación</th><th scope="col">Valor</th><th scope="col">Cantidad</th><th scope="col">Subtotal</th></tr></thead><tbody>{denominaciones.map((denominacion) => { const cantidad = cantidades[denominacion.id] ?? ''; const numero = Number(cantidad || 0); return <tr key={denominacion.id}><th scope="row">{denominacion.nombre}</th><td>{formatearCentavos(denominacion.valorCentavos)}</td><td><input type="number" min="0" step="1" inputMode="numeric" value={cantidad} aria-label={`Cantidad de ${denominacion.nombre}`} onChange={(e) => { setCantidades((actual) => ({ ...actual, [denominacion.id]: e.target.value })); setErrorFormulario(null) }} /></td><td>{formatearCentavos(denominacion.valorCentavos * (Number.isFinite(numero) ? numero : 0))}</td></tr> })}</tbody></table></div><p className={styles.totalConteo}><span>Total declarado</span><strong>{formatearCentavos(declaradoCentavos)}</strong></p></fieldset>
      <fieldset disabled={guardando || Boolean(errorCarga)}><legend>Justificación</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="explicacion-arqueo">Explicación {diferencia !== null && diferencia !== 0 && <span aria-hidden="true">*</span>}</label><textarea id="explicacion-arqueo" rows={4} maxLength={1000} value={explicacion} onChange={(e) => { setExplicacion(e.target.value); setErrorFormulario(null) }} /><small className={styles.ayudaCampo}>Obligatoria si existe diferencia. En un conteo ciego el backend la solicitará únicamente cuando corresponda.</small></div><div className={styles.resumenConteo}><span>Resultado previo</span>{esCiego ? <strong>Oculto por control ciego</strong> : <><small>Esperado: {formatearCentavos(turnoSeleccionado?.saldoConfirmadoCentavos)}</small><strong>Diferencia: {formatearCentavos(diferencia)}</strong></>}</div></div>{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset>
      <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/arqueos')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !turnos.length}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar arqueo'}</button></div></div>
    </form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo registrar el arqueo" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} />
    <ModalEstado abierto={Boolean(creado)} tipo="exito" titulo="Arqueo registrado" mensaje={creado ? `El arqueo ${creado.numero} quedó ${creado.estado === 'PENDIENTE_APROBACION' ? 'pendiente de aprobación' : 'aprobado'}.` : ''} textoAccionPrincipal="Ver arqueo" onAccionPrincipal={() => creado && onNavegar(`/caja/arqueos/${creado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/arqueos')} onCerrar={() => creado && onNavegar(`/caja/arqueos/${creado.id}`)} />
  </section>
}
