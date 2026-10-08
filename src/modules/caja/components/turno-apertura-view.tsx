import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { abrirTurnoCaja, obtenerDenominacionesCaja, obtenerOpcionesCaja } from '../caja-api'
import { crearClaveIdempotencia, etiquetasTipoCaja, formatearCentavos } from '../caja-formatos'
import type { DenominacionCaja, OpcionesFiltrosCaja, TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = {
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

const opcionesIniciales: OpcionesFiltrosCaja = {
  cajas: { opciones: [], estados: [], tipos: [] }, sucursales: [], turnos: { estados: [] }, movimientos: { estados: [], tipos: [] }, arqueos: { estados: [], tipos: [] }, cierres: { estados: [] }, transferencias: { estados: [], custodias: [] }, depositos: { estados: [] }, tamanosPagina: [50, 100, 150, 200],
}

export function TurnoAperturaView({ onNavegar, onCambiosPendientes }: Props) {
  const [opciones, setOpciones] = useState(opcionesIniciales)
  const [denominaciones, setDenominaciones] = useState<DenominacionCaja[]>([])
  const [cajaId, setCajaId] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [claveIdempotencia] = useState(() => crearClaveIdempotencia('apertura'))
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorCaja, setErrorCaja] = useState<string | null>(null)
  const [errorConteo, setErrorConteo] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creado, setCreado] = useState<TurnoCaja | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([obtenerOpcionesCaja(controlador.signal), obtenerDenominacionesCaja(controlador.signal)])
      .then(([opcionesCaja, denominacionesCaja]) => {
        setOpciones(opcionesCaja)
        setDenominaciones(denominacionesCaja.filter((denominacion) => denominacion.activa).sort((a, b) => a.orden - b.orden))
        setErrorCarga(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las cajas y denominaciones disponibles.')
      })
    return () => controlador.abort()
  }, [revision])

  const conteo = useMemo(() => denominaciones.map((denominacion) => ({
    denominacion,
    cantidad: Number(cantidades[denominacion.id] || 0),
  })), [cantidades, denominaciones])
  const fondoInicialCentavos = useMemo(() => conteo.reduce((total, item) => total + item.denominacion.valorCentavos * item.cantidad, 0), [conteo])
  const hayCambios = Boolean(cajaId || Object.values(cantidades).some((cantidad) => Number(cantidad) > 0)) && !creado

  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  const cajasDisponibles = opciones.cajas.opciones.filter((caja) => caja.estado === 'DISPONIBLE')
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setErrorCaja(cajaId ? null : 'Selecciona la caja que se abrirá.')
    const conteoValido = conteo.filter((item) => item.cantidad > 0)
    const cantidadesInvalidas = conteo.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 0)
    const mensajeConteo = cantidadesInvalidas
      ? 'Las cantidades deben ser números enteros iguales o mayores que cero.'
      : fondoInicialCentavos <= 0 || !conteoValido.length
        ? 'Registra al menos una denominación para calcular un fondo inicial mayor que cero.'
        : null
    setErrorConteo(mensajeConteo)
    if (!cajaId || mensajeConteo) {
      document.getElementById(!cajaId ? 'caja-apertura' : 'conteo-apertura')?.focus()
      return
    }
    setGuardando(true)
    setErrorEnvio(null)
    try {
      const turno = await abrirTurnoCaja({
        cajaId,
        fondoInicialCentavos,
        conteo: conteoValido.map((item) => ({ denominacionId: item.denominacion.id, cantidad: item.cantidad })),
        claveIdempotencia,
      })
      onCambiosPendientes(false)
      setCreado(turno)
    } catch (errorActual: unknown) {
      setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible abrir el turno de caja.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-apertura-turno">
      <header className={styles.cabeceraPagina}>
        <CajaBreadcrumb seccion="Turnos de caja" actual="Abrir turno" onNavegar={onNavegar} />
        <div><p className={styles.sobretitulo}>Operación de caja</p><h1 id="titulo-apertura-turno">Abrir turno de caja</h1><p>Selecciona la caja y registra el fondo inicial contado por denominación.</p></div>
      </header>
      {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {!errorCarga && cajasDisponibles.length === 0 && <div className={styles.alertaInformativa} role="status"><p>No hay cajas disponibles en la sucursal activa. Verifica que la caja no tenga otro turno abierto.</p></div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando || Boolean(errorCarga)}>
          <legend>Asignación del turno</legend>
          <p className={styles.descripcionSeccion}>El responsable y la sucursal se obtienen de la sesión autenticada.</p>
          <div className={styles.grillaDos}>
            <div className={styles.campo}>
              <label htmlFor="caja-apertura">Caja <span aria-hidden="true">*</span></label>
              <select id="caja-apertura" value={cajaId} aria-invalid={Boolean(errorCaja)} aria-describedby={errorCaja ? 'error-caja-apertura' : undefined} onChange={(evento) => { setCajaId(evento.target.value); setErrorCaja(null) }}>
                <option value="">Selecciona una caja</option>
                {cajasDisponibles.map((caja) => <option key={caja.id} value={caja.id}>{caja.codigo} · {caja.nombre}{caja.tipo ? ` · ${etiquetasTipoCaja[caja.tipo]}` : ''}</option>)}
              </select>
              {errorCaja && <small className={styles.errorCampo} id="error-caja-apertura">{errorCaja}</small>}
            </div>
            <div className={styles.campo}>
              <label>Fondo inicial calculado</label>
              <input value={formatearCentavos(fondoInicialCentavos)} readOnly aria-readonly="true" />
              <small className={styles.ayudaCampo}>El total se calcula automáticamente con el conteo.</small>
            </div>
          </div>
        </fieldset>
        <fieldset disabled={guardando || Boolean(errorCarga)}>
          <legend>Conteo del fondo inicial</legend>
          <p className={styles.descripcionSeccion}>Indica cuántas unidades recibes de cada denominación. El backend comprobará que el total coincida.</p>
          <div className={styles.contenedorTablaConteo} id="conteo-apertura" tabIndex={-1}>
            <table className={styles.tablaConteo}>
              <caption className={styles.ayudaCampo}>Denominaciones incluidas en el fondo inicial</caption>
              <thead><tr><th scope="col">Denominación</th><th scope="col">Valor</th><th scope="col">Cantidad</th><th scope="col">Subtotal</th></tr></thead>
              <tbody>{denominaciones.map((denominacion) => {
                const cantidad = cantidades[denominacion.id] ?? ''
                const cantidadNumerica = Number(cantidad || 0)
                return <tr key={denominacion.id}><th scope="row">{denominacion.nombre}</th><td>{formatearCentavos(denominacion.valorCentavos)}</td><td><input type="number" min="0" max="999999999999" step="1" inputMode="numeric" value={cantidad} aria-label={`Cantidad de ${denominacion.nombre}`} onChange={(evento) => { setCantidades((actual) => ({ ...actual, [denominacion.id]: evento.target.value })); setErrorConteo(null) }} /></td><td>{formatearCentavos(denominacion.valorCentavos * (Number.isFinite(cantidadNumerica) ? cantidadNumerica : 0))}</td></tr>
              })}</tbody>
            </table>
          </div>
          {errorConteo && <p className={styles.errorCampo} role="alert">{errorConteo}</p>}
          <p className={styles.totalConteo}><span>Total del fondo</span><strong>{formatearCentavos(fondoInicialCentavos)}</strong></p>
        </fieldset>
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/turnos')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !cajasDisponibles.length}><IconoAccion nombre="guardar" />{guardando ? 'Abriendo turno…' : 'Abrir turno'}</button></div></div>
      </form>
      <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo abrir el turno" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} />
      <ModalEstado abierto={Boolean(creado)} tipo="exito" titulo="Turno abierto" mensaje={creado ? `El turno ${creado.numero} quedó abierto con un fondo inicial de ${formatearCentavos(creado.fondoInicialCentavos)}.` : ''} textoAccionPrincipal="Ver turno" onAccionPrincipal={() => creado && onNavegar(`/caja/turnos/${creado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/turnos')} onCerrar={() => creado && onNavegar(`/caja/turnos/${creado.id}`)} />
    </section>
  )
}
