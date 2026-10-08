import { useEffect, useId, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { anularVentaCobradaCaja, cobrarVentaCaja, listarCaja } from '../../caja/caja-api'
import { convertirQuetzalesACentavos, crearClaveIdempotencia, formatearCentavos } from '../../caja/caja-formatos'
import type { MovimientoCaja, TurnoCaja } from '../../caja/caja.types'
import { obtenerVenta } from '../comercial-api'
import type { VentaComercial } from '../comercial.types'
import styles from './comercial.module.css'

export type ResultadoCobroVenta = {
  venta: VentaComercial
  movimiento: MovimientoCaja
  turno: TurnoCaja
  recibidoCentavos: number
  cambioCentavos: number
}

type PropiedadesBase = {
  abierto: boolean
  venta: VentaComercial
  onCerrar: () => void
}

function mensajeError(error: unknown, alternativo: string) {
  return error instanceof ErrorApi ? error.message : alternativo
}

function useTurnosCajaVenta(abierto: boolean, venta: VentaComercial) {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [cargando, setCargando] = useState(abierto)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    const controlador = new AbortController()
    void listarCaja<TurnoCaja>('turnos', {
      pagina: 1,
      tamanoPagina: 200,
      sucursalIds: venta.sucursal?.id ? [venta.sucursal.id] : undefined,
      estados: ['ABIERTO', 'REABIERTO'],
      tipos: ['VENTAS'],
      orden: 'fecha',
      direccion: 'desc',
    }, controlador.signal)
      .then((respuesta) => {
        const disponibles = respuesta.items.filter((turno) =>
          turno.caja?.tipo === 'VENTAS'
          && (!venta.sucursal?.id || turno.sucursalId === venta.sucursal.id),
        )
        setTurnos(disponibles)
      })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setError(mensajeError(actual, 'No fue posible consultar los turnos de caja.'))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [abierto, venta.id, venta.sucursal?.id])

  return { turnos, cargando, error }
}

function SelectorTurno({ id, turnos, turnoId, cargando, onCambiar }: {
  id: string
  turnos: TurnoCaja[]
  turnoId: string
  cargando: boolean
  onCambiar: (turnoId: string) => void
}) {
  return <>
    <label htmlFor={id}>Turno de caja <span aria-hidden="true">*</span></label>
    <select id={id} value={turnoId} disabled={cargando} onChange={(evento) => onCambiar(evento.target.value)}>
      <option value="">{cargando ? 'Consultando turnos…' : 'Selecciona un turno'}</option>
      {turnos.map((turno) => <option key={turno.id} value={turno.id}>{turno.numero} · {turno.caja?.nombre ?? 'Caja de ventas'} · {turno.responsableNombre}</option>)}
    </select>
  </>
}

export function CobrarVentaModal({ abierto, venta, onCerrar, onCobrada }: PropiedadesBase & { onCobrada: (resultado: ResultadoCobroVenta) => void }) {
  const turnoIdCampo = useId()
  const efectivoCampo = useId()
  const { turnos, cargando: cargandoTurnos, error: errorTurnos } = useTurnosCajaVenta(abierto, venta)
  const [turnoId, setTurnoId] = useState('')
  const [efectivo, setEfectivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('cobro-venta'))
  const totalCentavos = Math.round(venta.total * 100)
  const recibidoCentavos = useMemo(() => convertirQuetzalesACentavos(efectivo), [efectivo])
  const cambioCentavos = recibidoCentavos === null ? null : recibidoCentavos - totalCentavos
  const turnoSeleccionadoId = turnoId || (turnos.length === 1 ? turnos[0].id : '')

  const cobrar = async () => {
    if (!turnoSeleccionadoId) return setError('Selecciona el turno de caja que recibirá el efectivo.')
    if (recibidoCentavos === null || recibidoCentavos <= 0) return setError('Ingresa un monto de efectivo válido con máximo dos decimales.')
    if (recibidoCentavos < totalCentavos) return setError(`El efectivo recibido debe cubrir el total de ${formatearCentavos(totalCentavos)}.`)
    const turno = turnos.find((actual) => actual.id === turnoSeleccionadoId)
    if (!turno) return setError('El turno seleccionado ya no está disponible. Cierra y vuelve a abrir el cobro.')
    setGuardando(true)
    setError(null)
    try {
      const resultado = await cobrarVentaCaja<VentaComercial>({
        turnoId: turnoSeleccionadoId,
        ventaId: venta.id,
        ventaVersion: venta.version,
        recibidoCentavos,
        cambioCentavos: recibidoCentavos - totalCentavos,
        claveIdempotencia,
      })
      const actualizada = resultado.venta ?? await obtenerVenta(venta.id)
      onCobrada({
        venta: actualizada,
        movimiento: resultado.movimiento,
        turno,
        recibidoCentavos,
        cambioCentavos: recibidoCentavos - totalCentavos,
      })
    } catch (actual: unknown) {
      setError(mensajeError(actual, 'No fue posible cobrar la venta.'))
    } finally {
      setGuardando(false)
    }
  }

  const sinTurnos = !cargandoTurnos && !errorTurnos && turnos.length === 0
  return <ModalEstado
    abierto={abierto}
    tipo="informacion"
    ancho="amplio"
    titulo={`Cobrar venta ${venta.numero}`}
    mensaje={<div className={styles.contenidoConfirmacion}>
      <p>Registra el efectivo recibido. La venta se confirmará y el inventario se descontará en la misma operación.</p>
      <div className={styles.resumenCobro}>
        <span>Total a cobrar</span>
        <strong>{formatearCentavos(totalCentavos)}</strong>
      </div>
      <div className={styles.campoModal}>
        <SelectorTurno id={turnoIdCampo} turnos={turnos} turnoId={turnoSeleccionadoId} cargando={cargandoTurnos} onCambiar={(valor) => { setTurnoId(valor); setError(null) }} />
      </div>
      <div className={styles.campoModal}>
        <label htmlFor={efectivoCampo}>Efectivo recibido (Q) <span aria-hidden="true">*</span></label>
        <input id={efectivoCampo} type="number" min="0.01" step="0.01" inputMode="decimal" value={efectivo} onChange={(evento) => { setEfectivo(evento.target.value); setError(null) }} aria-invalid={Boolean(error && recibidoCentavos === null)} placeholder="0.00" />
      </div>
      <div className={`${styles.resumenCobro} ${cambioCentavos !== null && cambioCentavos >= 0 ? styles.resumenCambio : ''}`} aria-live="polite">
        <span>Cambio a entregar</span>
        <strong>{cambioCentavos === null || cambioCentavos < 0 ? 'Pendiente' : formatearCentavos(cambioCentavos)}</strong>
      </div>
      {sinTurnos && <p className={styles.errorCampo} role="alert">No hay un turno abierto o reabierto en una caja de Ventas de esta sucursal. Abre el turno antes de cobrar.</p>}
      {(errorTurnos || error) && <p className={styles.errorCampo} role="alert">{errorTurnos ?? error}</p>}
    </div>}
    textoAccionPrincipal="Cobrar y generar recibo"
    iconoAccionPrincipal={<IconoAccion nombre="guardar" />}
    onAccionPrincipal={() => void cobrar()}
    textoAccionSecundaria="Cancelar"
    onAccionSecundaria={onCerrar}
    onCerrar={onCerrar}
    cargando={guardando}
  />
}

export function AnularVentaCobradaModal({ abierto, venta, onCerrar, onAnulada }: PropiedadesBase & { onAnulada: (venta: VentaComercial) => void }) {
  const turnoIdCampo = useId()
  const motivoCampo = useId()
  const { turnos, cargando: cargandoTurnos, error: errorTurnos } = useTurnosCajaVenta(abierto, venta)
  const [turnoId, setTurnoId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('anulacion-venta'))
  const turnoSeleccionadoId = turnoId || (turnos.length === 1 ? turnos[0].id : '')

  const anular = async () => {
    if (!turnoSeleccionadoId) return setError('Selecciona el turno de caja que registrará el reintegro.')
    if (motivo.trim().length < 5) return setError('Escribe un motivo de al menos 5 caracteres.')
    setGuardando(true)
    setError(null)
    try {
      const resultado = await anularVentaCobradaCaja<VentaComercial>({ turnoId: turnoSeleccionadoId, ventaId: venta.id, ventaVersion: venta.version, motivo: motivo.trim(), claveIdempotencia })
      onAnulada(resultado.venta ?? await obtenerVenta(venta.id))
    } catch (actual: unknown) {
      setError(mensajeError(actual, 'No fue posible anular la venta cobrada.'))
    } finally {
      setGuardando(false)
    }
  }

  const sinTurnos = !cargandoTurnos && !errorTurnos && turnos.length === 0
  return <ModalEstado
    abierto={abierto}
    tipo="advertencia"
    ancho="amplio"
    titulo={`Anular venta cobrada ${venta.numero}`}
    mensaje={<div className={styles.contenidoConfirmacion}>
      <p>Esta acción registrará una salida de caja por {formatearCentavos(Math.round(venta.total * 100))} y devolverá al inventario los lotes dispensados.</p>
      <div className={styles.campoModal}>
        <SelectorTurno id={turnoIdCampo} turnos={turnos} turnoId={turnoSeleccionadoId} cargando={cargandoTurnos} onCambiar={(valor) => { setTurnoId(valor); setError(null) }} />
      </div>
      <div className={styles.campoModal}>
        <label htmlFor={motivoCampo}>Motivo de anulación <span aria-hidden="true">*</span></label>
        <textarea id={motivoCampo} rows={4} minLength={5} maxLength={500} value={motivo} onChange={(evento) => { setMotivo(evento.target.value); setError(null) }} aria-invalid={Boolean(error && motivo.trim().length < 5)} />
        <small className={styles.ayudaCampo}>Entre 5 y 500 caracteres. El motivo quedará en auditoría.</small>
      </div>
      {sinTurnos && <p className={styles.errorCampo} role="alert">No hay un turno abierto o reabierto en una caja de Ventas de esta sucursal.</p>}
      {(errorTurnos || error) && <p className={styles.errorCampo} role="alert">{errorTurnos ?? error}</p>}
    </div>}
    textoAccionPrincipal="Anular y reintegrar"
    iconoAccionPrincipal={<IconoAccion nombre="cancelar" />}
    varianteAccionPrincipal="peligro"
    onAccionPrincipal={() => void anular()}
    textoAccionSecundaria="Conservar venta"
    onAccionSecundaria={onCerrar}
    onCerrar={onCerrar}
    cargando={guardando}
  />
}
