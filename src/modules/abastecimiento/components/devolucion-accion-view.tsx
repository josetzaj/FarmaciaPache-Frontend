import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { ejecutarAccionAbastecimiento, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type {
  DevolucionProveedor,
  EvaluarRetornoDevolucionProveedorRequest,
  RegistrarRetornoDevolucionProveedorRequest,
} from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

export type ModoAccionDevolucion = 'autorizar' | 'segregar' | 'despachar' | 'recibir' | 'retorno' | 'evaluar-retorno' | 'compensar' | 'cerrar' | 'cancelar'

const numero = (valor: unknown) => Number(valor ?? 0)
const titulos: Record<ModoAccionDevolucion, string> = {
  autorizar: 'Autorizar devolución',
  segregar: 'Segregar productos',
  despachar: 'Despachar devolución',
  recibir: 'Registrar recepción del proveedor',
  retorno: 'Registrar retorno físico',
  'evaluar-retorno': 'Evaluar productos retornados',
  compensar: 'Registrar compensación',
  cerrar: 'Cerrar devolución',
  cancelar: 'Cancelar devolución',
}

type AccionPendiente = { accion: string; datos: unknown }

function accionDisponible(devolucion: DevolucionProveedor, modo: ModoAccionDevolucion): boolean {
  if (modo === 'autorizar') return ['SOLICITADA', 'APROBACION_INTERNA'].includes(devolucion.estado)
  if (modo === 'segregar') return devolucion.estado === 'AUTORIZADA_PROVEEDOR'
  if (modo === 'despachar') return devolucion.estado === 'SEGREGADA'
  if (modo === 'recibir') return devolucion.estado === 'DESPACHADA'
  if (modo === 'retorno') return devolucion.estado === 'RETORNO_PENDIENTE'
  if (modo === 'evaluar-retorno') return devolucion.estado === 'RETORNO_CUARENTENA'
  if (modo === 'compensar') return devolucion.estado === 'RECIBIDA_PROVEEDOR'
  if (modo === 'cerrar') return devolucion.estado === 'COMPENSADA'
  return ['SOLICITADA', 'APROBACION_INTERNA', 'AUTORIZADA_PROVEEDOR', 'SEGREGADA'].includes(devolucion.estado)
}

function mensajeConfirmacion(modo: ModoAccionDevolucion, devolucion: DevolucionProveedor): string {
  if (modo === 'segregar') return 'Esta acción modificará el inventario: las cantidades disponibles pasarán a estado bloqueado.'
  if (modo === 'despachar') return 'Esta acción modificará el inventario: se confirmará la salida física de los productos segregados.'
  if (modo === 'retorno') return 'Esta acción modificará el inventario: todo lo rechazado por el proveedor reingresará en cuarentena.'
  if (modo === 'evaluar-retorno') return 'Esta acción modificará el inventario: las cantidades declaradas aptas pasarán de cuarentena a disponible.'
  if (modo === 'cancelar' && devolucion.estado === 'SEGREGADA') return 'Esta acción modificará el inventario: los productos bloqueados volverán a estar disponibles.'
  return 'Esta acción cambiará el estado de la devolución y quedará registrada en auditoría.'
}

export function DevolucionAccionView({ devolucionId, modo, onNavegar, onCambiosPendientes }: { devolucionId: string; modo: ModoAccionDevolucion; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [devolucion, setDevolucion] = useState<DevolucionProveedor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<DevolucionProveedor | null>(null)
  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente | null>(null)
  const [aprobar, setAprobar] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [autorizacion, setAutorizacion] = useState('')
  const [referencia, setReferencia] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [rechazadas, setRechazadas] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<DevolucionProveedor>('devoluciones', devolucionId, controlador.signal)
      .then((respuesta) => {
        setDevolucion(respuesta)
        setCantidades(Object.fromEntries(respuesta.detalles.map((detalle) => [detalle.id, String(
          modo === 'evaluar-retorno'
            ? numero(detalle.cantidadRechazadaProveedor)
            : respuesta.estado === 'APROBACION_INTERNA'
              ? numero(detalle.cantidad)
              : numero(detalle.cantidadAutorizada),
        )])))
        setRechazadas(Object.fromEntries(respuesta.detalles.map((detalle) => [detalle.id, '0'])))
      })
      .catch((excepcion: unknown) => {
        if (!controlador.signal.aborted) setError(excepcion instanceof ErrorApi ? excepcion.message : 'No fue posible cargar la devolución.')
      })
    return () => controlador.abort()
  }, [devolucionId, modo])

  const disponible = useMemo(() => Boolean(devolucion && accionDisponible(devolucion, modo)), [devolucion, modo])
  const tieneCambios = Boolean(motivo || autorizacion || referencia || evidencia || !aprobar || Object.values(rechazadas).some((valor) => numero(valor) > 0))
  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const ejecutar = async ({ accion, datos }: AccionPendiente) => {
    if (!devolucion) return
    setGuardando(true)
    setError(null)
    try {
      setGuardada(await ejecutarAccionAbastecimiento<DevolucionProveedor>('devoluciones', devolucion.id, accion, datos))
      setAccionPendiente(null)
      onCambiosPendientes(false)
    } catch (excepcion) {
      setError(excepcion instanceof ErrorApi ? excepcion.message : 'No fue posible completar la acción.')
      setAccionPendiente(null)
    } finally {
      setGuardando(false)
    }
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!devolucion || !disponible) return
    const nuevosErrores: Record<string, string> = {}
    const faseProveedor = modo === 'autorizar' && devolucion.estado === 'APROBACION_INTERNA'
    const requiereMotivo = ['autorizar', 'recibir', 'retorno', 'evaluar-retorno', 'compensar', 'cerrar', 'cancelar'].includes(modo)
    const requiereEvidencia = ['recibir', 'retorno', 'evaluar-retorno'].includes(modo)

    if (requiereMotivo && (motivo.trim().length < 5 || motivo.trim().length > 500)) nuevosErrores.motivo = 'El motivo debe contener de 5 a 500 caracteres.'
    if (requiereEvidencia && (evidencia.trim().length < 3 || evidencia.trim().length > 500)) nuevosErrores.evidencia = 'La evidencia debe contener de 3 a 500 caracteres.'
    if (faseProveedor && aprobar && (autorizacion.trim().length < 1 || autorizacion.trim().length > 200)) nuevosErrores.autorizacion = 'Ingresa la autorización del proveedor, con máximo 200 caracteres.'
    if (faseProveedor && aprobar && devolucion.detalles.every((detalle) => numero(cantidades[detalle.id]) <= 0)) nuevosErrores.detalles = 'Autoriza al menos una cantidad mayor que cero.'
    if (faseProveedor && aprobar && devolucion.detalles.some((detalle) => numero(cantidades[detalle.id]) < 0 || numero(cantidades[detalle.id]) > numero(detalle.cantidad))) nuevosErrores.detalles = 'La cantidad autorizada no puede exceder lo solicitado.'
    if (modo === 'recibir' && devolucion.detalles.some((detalle) => numero(cantidades[detalle.id]) + numero(rechazadas[detalle.id]) !== numero(detalle.cantidadAutorizada))) nuevosErrores.detalles = 'Aceptado más rechazado debe coincidir con la cantidad autorizada.'
    if (modo === 'evaluar-retorno' && devolucion.detalles.filter((detalle) => numero(detalle.cantidadRechazadaProveedor) > 0).some((detalle) => numero(cantidades[detalle.id]) + numero(rechazadas[detalle.id]) !== numero(detalle.cantidadRechazadaProveedor))) nuevosErrores.detalles = 'La cantidad liberada más la no apta debe coincidir con la cantidad retornada.'
    if (modo === 'compensar' && (referencia.trim().length < 3 || referencia.trim().length > 200)) nuevosErrores.referencia = 'La referencia debe contener de 3 a 200 caracteres.'
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length) return

    let pendiente: AccionPendiente
    if (modo === 'autorizar') pendiente = { accion: 'autorizacion', datos: { version: devolucion.version, aprobar, motivo: motivo.trim(), autorizacionProveedor: faseProveedor && aprobar ? autorizacion.trim() : undefined, detalles: faseProveedor && aprobar ? devolucion.detalles.map((detalle) => ({ detalleId: detalle.id, cantidadAutorizada: numero(cantidades[detalle.id]) })) : undefined } }
    else if (modo === 'segregar' || modo === 'despachar') pendiente = { accion: modo === 'segregar' ? 'segregacion' : 'despacho', datos: { version: devolucion.version } }
    else if (modo === 'recibir') pendiente = { accion: 'recepcion-proveedor', datos: { version: devolucion.version, motivo: motivo.trim(), evidenciaReferencia: evidencia.trim(), detalles: devolucion.detalles.map((detalle) => ({ detalleId: detalle.id, cantidadAceptada: numero(cantidades[detalle.id]), cantidadRechazada: numero(rechazadas[detalle.id]) })) } }
    else if (modo === 'retorno') pendiente = { accion: 'retorno', datos: { version: devolucion.version, motivo: motivo.trim(), evidenciaReferencia: evidencia.trim() } satisfies RegistrarRetornoDevolucionProveedorRequest }
    else if (modo === 'evaluar-retorno') pendiente = { accion: 'evaluacion-retorno', datos: { version: devolucion.version, motivo: motivo.trim(), evidenciaReferencia: evidencia.trim(), detalles: devolucion.detalles.filter((detalle) => numero(detalle.cantidadRechazadaProveedor) > 0).map((detalle) => ({ detalleId: detalle.id, cantidadLiberada: numero(cantidades[detalle.id]), cantidadNoApta: numero(rechazadas[detalle.id]) })) } satisfies EvaluarRetornoDevolucionProveedorRequest }
    else if (modo === 'compensar') pendiente = { accion: 'compensacion', datos: { version: devolucion.version, referencia: referencia.trim(), motivo: motivo.trim() } }
    else pendiente = { accion: modo === 'cerrar' ? 'cierre' : 'cancelacion', datos: { version: devolucion.version, motivo: motivo.trim() } }

    if (['segregar', 'despachar', 'retorno', 'evaluar-retorno', 'cancelar'].includes(modo)) setAccionPendiente(pendiente)
    else void ejecutar(pendiente)
  }

  if (!devolucion && !error) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="devoluciones" actual={titulos[modo]} onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando devolución</h1></div></section>
  const faseProveedor = devolucion?.estado === 'APROBACION_INTERNA'
  const detallesRetornados = devolucion?.detalles.filter((detalle) => numero(detalle.cantidadRechazadaProveedor) > 0) ?? []

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-accion-devolucion">
      <AbastecimientoBreadcrumb recurso="devoluciones" actual={titulos[modo]} onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Devolución {devolucion?.numero ?? ''}</p><h1 id="titulo-accion-devolucion">{modo === 'autorizar' && faseProveedor ? 'Registrar autorización del proveedor' : titulos[modo]}</h1><p>{modo === 'segregar' ? 'La segregación inmoviliza el producto antes de su salida física.' : modo === 'retorno' ? 'Confirma que todo lo rechazado volvió físicamente y debe ingresar a cuarentena.' : modo === 'evaluar-retorno' ? 'Libera únicamente lo apto; la cantidad no apta continuará en cuarentena.' : modo === 'compensar' ? 'La compensación documental se registra separada de cualquier movimiento de inventario o dinero.' : 'La acción quedará registrada con su versión y responsable.'}</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      {devolucion && !disponible && <div className={styles.alertaAdvertencia}>La devolución está {etiquetaCodigo(devolucion.estado).toLowerCase()} y no admite esta acción.</div>}
      {devolucion && <form className={styles.formulario} onSubmit={enviar}>
        <section className={styles.resumenDocumento}><div><span>Estado</span><strong>{etiquetaCodigo(devolucion.estado)}</strong></div><div><span>Proveedor</span><strong>{devolucion.proveedor?.nombre}</strong></div><div><span>Ubicación</span><strong>{devolucion.ubicacion?.nombre}</strong></div><div><span>Productos</span><strong>{devolucion.detalles.length}</strong></div></section>
        <fieldset disabled={guardando || !disponible}><legend>{titulos[modo]}</legend>
          {modo === 'autorizar' && <div className={styles.opcionesDecision}><label className={aprobar ? styles.decisionSeleccionada : styles.decision}><input type="radio" checked={aprobar} onChange={() => setAprobar(true)} /><span><strong>{faseProveedor ? 'Proveedor autoriza' : 'Aprobar internamente'}</strong><small>Permite avanzar a la siguiente etapa.</small></span></label><label className={!aprobar ? styles.decisionSeleccionada : styles.decision}><input type="radio" checked={!aprobar} onChange={() => setAprobar(false)} /><span><strong>Rechazar devolución</strong><small>Finaliza el proceso conservando el motivo.</small></span></label></div>}
          {modo === 'autorizar' && faseProveedor && aprobar && <><div className={styles.campo}><label htmlFor="autorizacion-proveedor">Referencia de autorización <span>*</span></label><input id="autorizacion-proveedor" maxLength={200} value={autorizacion} onChange={(evento) => setAutorizacion(evento.target.value)} />{errores.autorizacion && <small className={styles.errorCampo}>{errores.autorizacion}</small>}</div><div className={styles.lineasRecepcion}>{devolucion.detalles.map((detalle) => <article className={styles.lineaRecepcion} key={detalle.id}><strong>{detalle.producto?.codigo} — {detalle.producto?.nombre}</strong><div className={styles.campo}><label htmlFor={`autorizada-${detalle.id}`}>Cantidad autorizada de {numero(detalle.cantidad)}</label><input id={`autorizada-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidad)} step="0.000001" value={cantidades[detalle.id] ?? ''} onChange={(evento) => setCantidades((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div></article>)}</div></>}
          {modo === 'recibir' && <div className={styles.lineasRecepcion}>{devolucion.detalles.map((detalle) => <article className={styles.lineaRecepcion} key={detalle.id}><strong>{detalle.producto?.codigo} — {detalle.producto?.nombre}</strong><small className={styles.ayudaCampo}>Autorizada: {numero(detalle.cantidadAutorizada)}</small><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor={`aceptada-${detalle.id}`}>Aceptada por proveedor</label><input id={`aceptada-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadAutorizada)} step="0.000001" value={cantidades[detalle.id] ?? ''} onChange={(evento) => setCantidades((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div><div className={styles.campo}><label htmlFor={`rechazada-${detalle.id}`}>Rechazada por proveedor</label><input id={`rechazada-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadAutorizada)} step="0.000001" value={rechazadas[detalle.id] ?? ''} onChange={(evento) => setRechazadas((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div></div></article>)}</div>}
          {modo === 'retorno' && <div className={styles.lineasRecepcion}>{detallesRetornados.map((detalle) => <article className={styles.lineaRecepcion} key={detalle.id}><strong>{detalle.producto?.codigo} — {detalle.producto?.nombre}</strong><small className={styles.ayudaCampo}>Retornará a cuarentena: {numero(detalle.cantidadRechazadaProveedor)} · Lote: {detalle.lote?.numeroLote ?? 'Sin lote'}</small></article>)}</div>}
          {modo === 'evaluar-retorno' && <div className={styles.lineasRecepcion}>{detallesRetornados.map((detalle) => <article className={styles.lineaRecepcion} key={detalle.id}><strong>{detalle.producto?.codigo} — {detalle.producto?.nombre}</strong><small className={styles.ayudaCampo}>En cuarentena: {numero(detalle.cantidadRechazadaProveedor)} · Lote: {detalle.lote?.numeroLote ?? 'Sin lote'}</small><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor={`liberada-${detalle.id}`}>Cantidad apta para liberar</label><input id={`liberada-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadRechazadaProveedor)} step="0.000001" value={cantidades[detalle.id] ?? ''} onChange={(evento) => setCantidades((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div><div className={styles.campo}><label htmlFor={`no-apta-${detalle.id}`}>Cantidad no apta</label><input id={`no-apta-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadRechazadaProveedor)} step="0.000001" value={rechazadas[detalle.id] ?? ''} onChange={(evento) => setRechazadas((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div></div></article>)}</div>}
          {['recibir', 'retorno', 'evaluar-retorno'].includes(modo) && <div className={styles.campo}><label htmlFor="evidencia-devolucion">Evidencia <span>*</span></label><input id="evidencia-devolucion" maxLength={500} value={evidencia} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <small className={styles.errorCampo}>{errores.evidencia}</small>}</div>}
          {modo === 'compensar' && <div className={styles.campo}><label htmlFor="referencia-compensacion">Referencia de compensación <span>*</span></label><input id="referencia-compensacion" maxLength={200} value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />{errores.referencia && <small className={styles.errorCampo}>{errores.referencia}</small>}</div>}
          {['autorizar', 'recibir', 'retorno', 'evaluar-retorno', 'compensar', 'cerrar', 'cancelar'].includes(modo) && <div className={styles.campo}><label htmlFor="motivo-devolucion">Motivo <span>*</span></label><textarea id="motivo-devolucion" rows={5} maxLength={500} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <small className={styles.errorCampo}>{errores.motivo}</small>}</div>}
          {['segregar', 'despachar'].includes(modo) && <div className={styles.alertaAdvertencia}>{modo === 'segregar' ? 'Los productos autorizados pasarán a estado bloqueado y conservarán su costo antes de la devolución.' : 'Se registrará la salida física de las cantidades segregadas con su costo. Esta acción no registra todavía la compensación.'}</div>}
          {errores.detalles && <small className={styles.errorCampo}>{errores.detalles}</small>}
        </fieldset>
        <div className={styles.accionesFormulario}><p>* Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(`/abastecimiento/devoluciones/${devolucion.id}`)}><IconoAccion nombre="cancelar" />Volver</button><button className={modo === 'cancelar' || (modo === 'autorizar' && !aprobar) ? styles.botonPeligro : styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre="guardar" />{guardando ? 'Procesando…' : titulos[modo]}</button></div></div>
      </form>}
    </section>
    <ModalEstado abierto={Boolean(accionPendiente && devolucion)} tipo="advertencia" titulo="Confirmar acción de inventario" mensaje={devolucion ? mensajeConfirmacion(modo, devolucion) : ''} textoAccionPrincipal="Confirmar" onAccionPrincipal={() => { if (accionPendiente) void ejecutar(accionPendiente) }} textoAccionSecundaria="Volver" onAccionSecundaria={() => setAccionPendiente(null)} onCerrar={() => setAccionPendiente(null)} cargando={guardando} varianteAccionPrincipal={modo === 'cancelar' ? 'peligro' : 'predeterminada'} />
    <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo="Devolución actualizada" mensaje={guardada ? `La devolución ${guardada.numero} ahora está ${etiquetaCodigo(guardada.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver devolución" onAccionPrincipal={() => onNavegar(`/abastecimiento/devoluciones/${devolucionId}`)} onCerrar={() => onNavegar(`/abastecimiento/devoluciones/${devolucionId}`)} />
  </>
}
