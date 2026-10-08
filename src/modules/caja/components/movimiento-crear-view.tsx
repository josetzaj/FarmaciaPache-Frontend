import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarCaja, obtenerTurnoCaja, registrarMovimientoCaja } from '../caja-api'
import { convertirQuetzalesACentavos, crearClaveIdempotencia, etiquetasEstadoTurno, etiquetasTipoCaja, etiquetasTipoMovimiento, formatearCentavos } from '../caja-formatos'
import type { MovimientoCaja, TipoMovimientoCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = {
  turnoInicialId?: string
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

const tiposManuales: TipoMovimientoCaja[] = ['INGRESO_EXTRAORDINARIO', 'EGRESO_AUTORIZADO', 'RETIRO_PARCIAL']

export function MovimientoCrearView({ turnoInicialId, onNavegar, onCambiosPendientes }: Props) {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [turnoId, setTurnoId] = useState(turnoInicialId ?? '')
  const [tipo, setTipo] = useState<TipoMovimientoCaja | ''>('')
  const [monto, setMonto] = useState('')
  const [referenciaTipo, setReferenciaTipo] = useState('OPERACION_MANUAL')
  const [referenciaId, setReferenciaId] = useState('')
  const [referenciaNumero, setReferenciaNumero] = useState('')
  const [motivo, setMotivo] = useState('')
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('movimiento'))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creado, setCreado] = useState<MovimientoCaja | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    const consulta = {
      pagina: 1, tamanoPagina: 200, estados: ['ABIERTO', 'REABIERTO'], orden: 'fecha', direccion: 'desc' as const,
    }
    void listarCaja<TurnoCaja>('turnos', consulta, controlador.signal)
      .then(async (respuesta) => {
        let disponibles = respuesta.items
        if (turnoInicialId && !disponibles.some((turno) => turno.id === turnoInicialId)) {
          try {
            const inicial = await obtenerTurnoCaja(turnoInicialId, controlador.signal)
            if (inicial.estado === 'ABIERTO' || inicial.estado === 'REABIERTO') disponibles = [inicial, ...disponibles]
          } catch { /* El listado seguirá mostrando los turnos operables disponibles. */ }
        }
        setTurnos(disponibles)
        setErrorCarga(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los turnos operables.')
      })
    return () => controlador.abort()
  }, [revision, turnoInicialId])

  const turnoSeleccionado = useMemo(() => turnos.find((turno) => turno.id === turnoId) ?? null, [turnoId, turnos])
  const tiposDisponibles = useMemo(() => turnoSeleccionado?.caja?.tipo === 'CAJA_CHICA' ? tiposManuales : tiposManuales.filter((valor) => valor !== 'EGRESO_AUTORIZADO'), [turnoSeleccionado])
  const hayCambios = Boolean(turnoId || tipo || monto || referenciaId || referenciaNumero || motivo) && !creado
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  const actualizarCampo = (campo: string) => setErrores((actual) => {
    const siguientes = { ...actual }; delete siguientes[campo]; return siguientes
  })

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const siguientes: Record<string, string> = {}
    const montoCentavos = convertirQuetzalesACentavos(monto)
    if (!turnoId) siguientes.turnoId = 'Selecciona un turno abierto.'
    if (!tipo) siguientes.tipo = 'Selecciona el tipo de movimiento.'
    if (montoCentavos === null || montoCentavos <= 0) siguientes.monto = 'Ingresa un monto mayor que cero con máximo dos decimales.'
    if (referenciaTipo.trim().length < 2) siguientes.referenciaTipo = 'Indica un tipo de referencia de al menos 2 caracteres.'
    if (!referenciaId.trim()) siguientes.referenciaId = 'Indica el identificador o documento de respaldo.'
    if (motivo.trim().length < 5) siguientes.motivo = 'El motivo debe contener al menos 5 caracteres.'
    setErrores(siguientes)
    const primerError = Object.keys(siguientes)[0]
    if (primerError) { document.getElementById(`movimiento-${primerError}`)?.focus(); return }
    setGuardando(true)
    setErrorEnvio(null)
    try {
      const movimiento = await registrarMovimientoCaja({
        turnoId,
        tipo: tipo as TipoMovimientoCaja,
        montoCentavos: montoCentavos!,
        referenciaTipo: referenciaTipo.trim().toUpperCase(),
        referenciaId: referenciaId.trim(),
        referenciaNumero: referenciaNumero.trim() || null,
        motivo: motivo.trim(),
        claveIdempotencia,
      })
      onCambiosPendientes(false)
      setCreado(movimiento)
    } catch (errorActual: unknown) {
      setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar el movimiento.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-registrar-movimiento">
      <header className={styles.cabeceraPagina}>
        <CajaBreadcrumb seccion="Movimientos" actual="Registrar movimiento" onNavegar={onNavegar} />
        <div><p className={styles.sobretitulo}>Operación de caja</p><h1 id="titulo-registrar-movimiento">Registrar movimiento</h1><p>Registra un ingreso o salida manual. Los cobros, anulaciones y transferencias se originan desde sus procesos correspondientes.</p></div>
      </header>
      {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {!errorCarga && turnos.length === 0 && <div className={styles.alertaInformativa} role="status"><p>No hay turnos abiertos o reabiertos disponibles para registrar movimientos.</p></div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando || Boolean(errorCarga)}>
          <legend>Movimiento y turno</legend>
          <p className={styles.descripcionSeccion}>El saldo cambia únicamente cuando un usuario autorizado confirma el movimiento.</p>
          <div className={styles.grillaDos}>
            <div className={styles.campo}><label htmlFor="movimiento-turnoId">Turno <span aria-hidden="true">*</span></label><select id="movimiento-turnoId" value={turnoId} aria-invalid={Boolean(errores.turnoId)} aria-describedby={errores.turnoId ? 'error-movimiento-turno' : undefined} onChange={(evento) => { setTurnoId(evento.target.value); setTipo(''); actualizarCampo('turnoId'); actualizarCampo('tipo') }}><option value="">Selecciona un turno</option>{turnos.map((turno) => <option key={turno.id} value={turno.id}>{turno.numero} · {turno.caja?.nombre ?? 'Caja'}{turno.caja?.tipo ? ` · ${etiquetasTipoCaja[turno.caja.tipo]}` : ''} · {etiquetasEstadoTurno[turno.estado]}</option>)}</select>{errores.turnoId && <small className={styles.errorCampo} id="error-movimiento-turno">{errores.turnoId}</small>}</div>
            <div className={styles.campo}><label htmlFor="movimiento-tipo">Tipo <span aria-hidden="true">*</span></label><select id="movimiento-tipo" value={tipo} disabled={!turnoSeleccionado} aria-invalid={Boolean(errores.tipo)} aria-describedby={errores.tipo ? 'error-movimiento-tipo' : undefined} onChange={(evento) => { setTipo(evento.target.value as TipoMovimientoCaja | ''); actualizarCampo('tipo') }}><option value="">Selecciona el tipo</option>{tiposDisponibles.map((valor) => <option key={valor} value={valor}>{etiquetasTipoMovimiento[valor]}</option>)}</select>{errores.tipo && <small className={styles.errorCampo} id="error-movimiento-tipo">{errores.tipo}</small>}</div>
          </div>
          {turnoSeleccionado && <div className={styles.alertaInformativa}><p><strong>{turnoSeleccionado.caja?.tipo === 'CAJA_CHICA' ? 'Caja chica:' : 'Caja de ventas:'}</strong> saldo confirmado actual <strong>{formatearCentavos(turnoSeleccionado.saldoConfirmadoCentavos)}</strong>. {turnoSeleccionado.caja?.tipo === 'CAJA_CHICA' ? 'Permite ingresos extraordinarios, egresos autorizados y retiros parciales con respaldo.' : 'Los egresos autorizados se registran únicamente en Caja chica.'}</p></div>}
        </fieldset>
        <fieldset disabled={guardando || Boolean(errorCarga)}>
          <legend>Importe y referencia</legend>
          <div className={styles.grillaTres}>
            <div className={styles.campo}><label htmlFor="movimiento-monto">Monto (Q) <span aria-hidden="true">*</span></label><input id="movimiento-monto" type="number" min="0.01" step="0.01" inputMode="decimal" value={monto} placeholder="0.00" aria-invalid={Boolean(errores.monto)} aria-describedby={errores.monto ? 'error-movimiento-monto' : undefined} onChange={(evento) => { setMonto(evento.target.value); actualizarCampo('monto') }} />{errores.monto && <small className={styles.errorCampo} id="error-movimiento-monto">{errores.monto}</small>}</div>
            <div className={styles.campo}><label htmlFor="movimiento-referenciaTipo">Tipo de referencia <span aria-hidden="true">*</span></label><input id="movimiento-referenciaTipo" value={referenciaTipo} maxLength={50} aria-invalid={Boolean(errores.referenciaTipo)} onChange={(evento) => { setReferenciaTipo(evento.target.value); actualizarCampo('referenciaTipo') }} />{errores.referenciaTipo && <small className={styles.errorCampo}>{errores.referenciaTipo}</small>}</div>
            <div className={styles.campo}><label htmlFor="movimiento-referenciaId">Identificador de respaldo <span aria-hidden="true">*</span></label><input id="movimiento-referenciaId" value={referenciaId} maxLength={100} placeholder="Factura, vale o documento" aria-invalid={Boolean(errores.referenciaId)} onChange={(evento) => { setReferenciaId(evento.target.value); actualizarCampo('referenciaId') }} />{errores.referenciaId && <small className={styles.errorCampo}>{errores.referenciaId}</small>}</div>
          </div>
          <div className={styles.grillaDos}>
            <div className={styles.campo}><label htmlFor="movimiento-referenciaNumero">Número visible de referencia</label><input id="movimiento-referenciaNumero" value={referenciaNumero} maxLength={100} placeholder="Opcional" onChange={(evento) => setReferenciaNumero(evento.target.value)} /></div>
            <div className={styles.campo}><label htmlFor="movimiento-motivo">Motivo <span aria-hidden="true">*</span></label><textarea id="movimiento-motivo" rows={3} value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} aria-describedby={errores.motivo ? 'error-movimiento-motivo' : undefined} onChange={(evento) => { setMotivo(evento.target.value); actualizarCampo('motivo') }} />{errores.motivo && <small className={styles.errorCampo} id="error-movimiento-motivo">{errores.motivo}</small>}</div>
          </div>
        </fieldset>
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/movimientos')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !turnos.length}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar movimiento'}</button></div></div>
      </form>
      <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo registrar" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} />
      <ModalEstado abierto={Boolean(creado)} tipo="exito" titulo="Movimiento registrado" mensaje={creado ? `${creado.numero} quedó registrado por ${formatearCentavos(creado.montoCentavos)} y está pendiente de confirmación.` : ''} textoAccionPrincipal="Ver movimiento" onAccionPrincipal={() => creado && onNavegar(`/caja/movimientos/${creado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/movimientos')} onCerrar={() => creado && onNavegar(`/caja/movimientos/${creado.id}`)} />
    </section>
  )
}
