import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { ejecutarAccionAbastecimiento, listarLotesAbastecimiento, listarUbicacionesAbastecimiento, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { LoteAbastecimiento, TrasladoInterno, UbicacionAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type Modo = 'aprobar' | 'preparar' | 'despachar' | 'recibir' | 'cerrar' | 'cancelar'
const numero = (valor: unknown) => Number(valor ?? 0)
const tituloModo: Record<Modo, string> = { aprobar: 'Resolver traslado', preparar: 'Preparar despacho', despachar: 'Registrar despacho', recibir: 'Recibir traslado', cerrar: 'Cerrar traslado', cancelar: 'Cancelar traslado' }
const accionApi: Record<Modo, string> = { aprobar: 'aprobacion', preparar: 'preparacion', despachar: 'despacho', recibir: 'recepcion', cerrar: 'cierre', cancelar: 'cancelacion' }

export function TrasladoAccionView({ trasladoId, modo, rutaBase = '/abastecimiento/traslados', onNavegar, onCambiosPendientes }: { trasladoId: string; modo: Modo; rutaBase?: '/abastecimiento/traslados' | '/abastecimiento/devoluciones-internas'; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [traslado, setTraslado] = useState<TrasladoInterno | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionAbastecimiento[]>([])
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('')
  const [catalogosLote, setCatalogosLote] = useState<Record<string, LoteAbastecimiento[]>>({})
  const [lotes, setLotes] = useState<Record<string, string>>({})
  const [motivosLote, setMotivosLote] = useState<Record<string, string>>({})
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [rechazadas, setRechazadas] = useState<Record<string, string>>({})
  const [incidencias, setIncidencias] = useState<Record<string, string>>({})
  const [aprobar, setAprobar] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [transportista, setTransportista] = useState('')
  const [referencia, setReferencia] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [costo, setCosto] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<TrasladoInterno | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<TrasladoInterno>('traslados', trasladoId, controlador.signal)
      .then(async (registro) => {
        setTraslado(registro)
        const inicial: Record<string, string> = {}
        const rechazo: Record<string, string> = {}
        registro.detalles.forEach((detalle) => {
          inicial[detalle.id] = String(modo === 'aprobar' ? numero(detalle.cantidadSolicitada) : modo === 'preparar' ? Math.max(0, numero(detalle.cantidadAprobada) - numero(detalle.cantidadDespachada)) : numero(detalle.cantidadEnDespacho))
          rechazo[detalle.id] = '0'
        })
        setCantidades(inicial)
        setRechazadas(rechazo)
        if (modo === 'preparar') {
          const disponibles = await listarUbicacionesAbastecimiento(registro.sucursalOrigenId, controlador.signal)
          setUbicaciones(disponibles.filter((ubicacion) => ubicacion.activa !== false && !ubicacion.bloqueada && ['BODEGA', 'VENTA'].includes(ubicacion.tipo)))
          if (registro.tipo === 'DEVOLUCION_INTERNA' && registro.ubicacionOrigenId) setUbicacionOrigenId(registro.ubicacionOrigenId)
        }
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el traslado.')
      })
    return () => controlador.abort()
  }, [modo, trasladoId])

  useEffect(() => {
    if (modo !== 'preparar' || !traslado || !ubicacionOrigenId) return
    const controlador = new AbortController()
    void Promise.all(traslado.detalles.map(async (detalle) => [detalle.id, await listarLotesAbastecimiento(traslado.sucursalOrigenId, ubicacionOrigenId, detalle.productoId, controlador.signal)] as const))
      .then((pares) => {
        setCatalogosLote(Object.fromEntries(pares))
        setLotes(Object.fromEntries(pares.map(([detalleId, catalogo]) => {
          const detalle = traslado.detalles.find((item) => item.id === detalleId)
          return [detalleId, detalle?.loteId ?? catalogo[0]?.id ?? (catalogo.length ? 'SIN_LOTE' : '')]
        })))
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los lotes disponibles.')
      })
    return () => controlador.abort()
  }, [modo, traslado, ubicacionOrigenId])

  const tieneCambios = Boolean(motivo || transportista || referencia || evidencia || costo || ubicacionOrigenId || !aprobar || Object.values(cantidades).some(Boolean) || Object.values(rechazadas).some((valor) => numero(valor) > 0))
  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  const disponible = useMemo(() => traslado && (modo === 'aprobar' ? traslado.estado === 'SOLICITADO' : modo === 'preparar' ? ['APROBADO', 'RECIBIDO'].includes(traslado.estado) : modo === 'despachar' ? traslado.estado === 'PREPARADO' : modo === 'recibir' ? traslado.estado === 'EN_TRANSITO' : modo === 'cerrar' ? traslado.estado === 'RECIBIDO' : ['SOLICITADO', 'APROBADO', 'PREPARADO'].includes(traslado.estado)), [modo, traslado])

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!traslado || !disponible) return
    const siguientes: Record<string, string> = {}
    if (['aprobar', 'recibir', 'cerrar', 'cancelar'].includes(modo) && motivo.trim().length < 5) siguientes.motivo = 'El motivo debe contener al menos 5 caracteres.'
    if (modo === 'aprobar' && aprobar && traslado.detalles.every((detalle) => numero(cantidades[detalle.id]) <= 0)) siguientes.detalles = 'Aprueba una cantidad mayor que cero.'
    if (modo === 'aprobar' && traslado.detalles.some((detalle) => numero(cantidades[detalle.id]) < 0 || numero(cantidades[detalle.id]) > numero(detalle.cantidadSolicitada))) siguientes.detalles = 'Las cantidades aprobadas deben estar entre cero y lo solicitado.'
    if (modo === 'preparar' && !ubicacionOrigenId) siguientes.ubicacionOrigenId = 'Selecciona la ubicación desde la que se preparará el despacho.'
    if (modo === 'preparar' && traslado.detalles.every((detalle) => numero(cantidades[detalle.id]) <= 0)) siguientes.detalles = 'Prepara una cantidad mayor que cero.'
    if (modo === 'preparar' && traslado.detalles.some((detalle) => numero(cantidades[detalle.id]) < 0 || numero(cantidades[detalle.id]) > numero(detalle.cantidadAprobada) - numero(detalle.cantidadDespachada))) siguientes.detalles = 'Las cantidades superan el saldo aprobado pendiente.'
    if (modo === 'preparar' && traslado.detalles.some((detalle) => numero(cantidades[detalle.id]) > 0 && (catalogosLote[detalle.id]?.length ?? 0) > 0 && !lotes[detalle.id])) siguientes.detalles = 'Selecciona el lote de cada producto preparado.'
    if (modo === 'despachar' && transportista.trim().length < 2) siguientes.transportista = 'Registra el transportista.'
    if (modo === 'despachar' && referencia.trim().length < 2) siguientes.referencia = 'Registra la referencia del transporte.'
    if (['despachar', 'recibir'].includes(modo) && evidencia.trim().length < 3) siguientes.evidencia = 'Registra una referencia de evidencia.'
    if (modo === 'recibir' && traslado.detalles.some((detalle) => Math.abs(numero(cantidades[detalle.id]) + numero(rechazadas[detalle.id]) - numero(detalle.cantidadEnDespacho)) > 0.000001)) siguientes.detalles = 'Lo aceptado más lo rechazado debe coincidir con lo despachado.'
    if (modo === 'recibir' && traslado.detalles.some((detalle) => numero(rechazadas[detalle.id]) > 0 && !incidencias[detalle.id]?.trim())) siguientes.detalles = 'Describe la incidencia de cada cantidad rechazada.'
    setErrores(siguientes)
    if (Object.keys(siguientes).length) return

    let datos: unknown
    if (modo === 'aprobar') datos = { version: traslado.version, aprobar, motivo: motivo.trim(), detalles: traslado.detalles.map((detalle) => ({ detalleId: detalle.id, cantidadAprobada: aprobar ? numero(cantidades[detalle.id]) : 0 })) }
    else if (modo === 'preparar') datos = { version: traslado.version, ubicacionOrigenId, detalles: traslado.detalles.map((detalle) => ({ detalleId: detalle.id, loteId: lotes[detalle.id] === 'SIN_LOTE' || !lotes[detalle.id] ? null : lotes[detalle.id], cantidadDespachada: numero(cantidades[detalle.id]), motivoSeleccionLote: motivosLote[detalle.id]?.trim() || null })) }
    else if (modo === 'despachar') datos = { version: traslado.version, transportista: transportista.trim(), transporteReferencia: referencia.trim(), evidenciaReferencia: evidencia.trim(), costoTransporte: costo ? numero(costo) : null }
    else if (modo === 'recibir') datos = { version: traslado.version, motivo: motivo.trim(), evidenciaReferencia: evidencia.trim(), detalles: traslado.detalles.map((detalle) => ({ detalleId: detalle.id, cantidadRecibida: numero(cantidades[detalle.id]), cantidadRechazada: numero(rechazadas[detalle.id]), incidencia: incidencias[detalle.id]?.trim() || null })) }
    else datos = { version: traslado.version, motivo: motivo.trim() }

    setGuardando(true)
    setError(null)
    try {
      setGuardado(await ejecutarAccionAbastecimiento<TrasladoInterno>('traslados', traslado.id, accionApi[modo], datos))
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la operación.')
    } finally {
      setGuardando(false)
    }
  }

  if (error && !traslado) return <section className={styles.pagina}><div className={styles.alertaError} role="alert">{error}</div></section>
  if (!traslado) return <section className={styles.pagina} aria-busy="true"><div className={styles.estadoVacio}><h1>Cargando traslado</h1></div></section>
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-accion-traslado">
      <AbastecimientoBreadcrumb recurso={rutaBase === '/abastecimiento/devoluciones-internas' ? 'devoluciones-internas' : 'traslados'} actual={tituloModo[modo]} onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Traslado {traslado.numero} · {etiquetaCodigo(traslado.estado)}</p><h1 id="titulo-accion-traslado">{tituloModo[modo]}</h1><p>Origen: {traslado.sucursalOrigen?.nombre ?? traslado.sucursalOrigenId} · Destino: {traslado.sucursalDestino?.nombre ?? traslado.sucursalDestinoId}</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      {!disponible && <div className={styles.alertaAdvertencia} role="alert">El estado actual ya no permite esta operación.</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        {modo === 'aprobar' && <fieldset disabled={guardando || !disponible}><legend>Decisión</legend><div className={styles.grillaDos}><label className={styles.campo}><span>Resultado</span><select value={aprobar ? 'APROBAR' : 'RECHAZAR'} onChange={(evento) => setAprobar(evento.target.value === 'APROBAR')}><option value="APROBAR">Aprobar solicitud</option><option value="RECHAZAR">Rechazar solicitud</option></select></label><CampoMotivo motivo={motivo} error={errores.motivo} onChange={setMotivo} /></div></fieldset>}
        {modo === 'preparar' && <fieldset disabled={guardando || !disponible}><legend>Ubicación de salida</legend><div className={styles.campo}><label htmlFor="traslado-ubicacion-origen">Ubicación origen <span>*</span></label><select id="traslado-ubicacion-origen" value={ubicacionOrigenId} disabled={traslado.tipo === 'DEVOLUCION_INTERNA'} aria-invalid={Boolean(errores.ubicacionOrigenId)} onChange={(evento) => { setUbicacionOrigenId(evento.target.value); setCatalogosLote({}); setLotes({}) }}><option value="">Selecciona una ubicación</option>{ubicaciones.map((ubicacion) => <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.codigo} — {ubicacion.nombre}</option>)}</select>{errores.ubicacionOrigenId && <small className={styles.errorCampo}>{errores.ubicacionOrigenId}</small>}<small className={styles.ayudaCampo}>{traslado.tipo === 'DEVOLUCION_INTERNA' ? 'La ubicación y el lote fueron identificados por la farmacia al solicitar la devolución.' : 'El lote y la disponibilidad se consultan desde esta ubicación.'}</small></div></fieldset>}
        {['aprobar', 'preparar', 'recibir'].includes(modo) && <fieldset disabled={guardando || !disponible}><legend>{modo === 'aprobar' ? 'Cantidades a aprobar' : modo === 'preparar' ? 'Productos del despacho' : 'Conteo físico recibido'}</legend><div className={styles.lineasProductos}>{traslado.detalles.map((detalle, indice) => <div className={styles.lineaProducto} key={detalle.id}><span className={styles.numeroLinea}>{indice + 1}</span><div className={styles.campoProducto}><strong>{detalle.producto?.nombre ?? detalle.productoId}</strong><small>{detalle.producto?.codigo ?? ''}</small></div><div className={styles.campo}><label htmlFor={`cantidad-${detalle.id}`}>{modo === 'recibir' ? 'Aceptado' : 'Cantidad'}</label><input id={`cantidad-${detalle.id}`} type="number" min="0" step="0.000001" value={cantidades[detalle.id] ?? '0'} disabled={modo === 'aprobar' && !aprobar} onChange={(evento) => setCantidades((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div>{modo === 'preparar' && <><div className={styles.campo}><label htmlFor={`lote-${detalle.id}`}>Lote</label><select id={`lote-${detalle.id}`} value={lotes[detalle.id] ?? ''} disabled={!ubicacionOrigenId || numero(cantidades[detalle.id]) <= 0} onChange={(evento) => setLotes((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))}><option value="">Selecciona un lote</option>{(catalogosLote[detalle.id] ?? []).map((lote) => <option key={lote.id ?? 'SIN_LOTE'} value={lote.id ?? 'SIN_LOTE'}>{lote.numeroLote} · disponible {lote.cantidadDisponible}</option>)}</select></div><div className={styles.campo}><label htmlFor={`motivo-lote-${detalle.id}`}>Criterio de selección</label><input id={`motivo-lote-${detalle.id}`} maxLength={500} value={motivosLote[detalle.id] ?? ''} onChange={(evento) => setMotivosLote((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div></>}{modo === 'recibir' && <><div className={styles.campo}><label htmlFor={`rechazada-${detalle.id}`}>Rechazado</label><input id={`rechazada-${detalle.id}`} type="number" min="0" step="0.000001" value={rechazadas[detalle.id] ?? '0'} onChange={(evento) => setRechazadas((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div><div className={styles.campo}><label htmlFor={`incidencia-${detalle.id}`}>Incidencia</label><input id={`incidencia-${detalle.id}`} maxLength={500} value={incidencias[detalle.id] ?? ''} onChange={(evento) => setIncidencias((actuales) => ({ ...actuales, [detalle.id]: evento.target.value }))} /></div></>}</div>)}</div>{errores.detalles && <small className={styles.errorCampo}>{errores.detalles}</small>}</fieldset>}
        {modo === 'despachar' && <fieldset disabled={guardando || !disponible}><legend>Transporte y evidencia</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="traslado-transportista">Transportista <span>*</span></label><input id="traslado-transportista" maxLength={150} value={transportista} onChange={(evento) => setTransportista(evento.target.value)} />{errores.transportista && <small className={styles.errorCampo}>{errores.transportista}</small>}</div><div className={styles.campo}><label htmlFor="traslado-referencia">Referencia del transporte <span>*</span></label><input id="traslado-referencia" maxLength={150} value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />{errores.referencia && <small className={styles.errorCampo}>{errores.referencia}</small>}</div><div className={styles.campo}><label htmlFor="traslado-evidencia">Referencia de evidencia <span>*</span></label><input id="traslado-evidencia" maxLength={500} value={evidencia} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <small className={styles.errorCampo}>{errores.evidencia}</small>}</div><div className={styles.campo}><label htmlFor="traslado-costo">Costo de transporte</label><input id="traslado-costo" type="number" min="0" step="0.01" value={costo} onChange={(evento) => setCosto(evento.target.value)} /></div></div></fieldset>}
        {modo === 'recibir' && <fieldset disabled={guardando || !disponible}><legend>Acta de recepción</legend><div className={styles.grillaDos}><CampoMotivo motivo={motivo} error={errores.motivo} onChange={setMotivo} /><div className={styles.campo}><label htmlFor="traslado-evidencia">Referencia de evidencia <span>*</span></label><input id="traslado-evidencia" maxLength={500} value={evidencia} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <small className={styles.errorCampo}>{errores.evidencia}</small>}</div></div><p className={styles.ayudaCampo}>Las cantidades aceptadas quedarán pendientes de ubicación y todavía no estarán disponibles para venta.</p></fieldset>}
        {['cerrar', 'cancelar'].includes(modo) && <fieldset disabled={guardando || !disponible}><legend>Justificación</legend><CampoMotivo motivo={motivo} error={errores.motivo} onChange={setMotivo} /></fieldset>}
        <div className={styles.accionesFormulario}><p>La operación quedará registrada en auditoría.</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(`${rutaBase}/${traslado.id}`)}><IconoAccion nombre="cancelar" />Volver</button><button className={modo === 'cancelar' || (modo === 'aprobar' && !aprobar) ? styles.botonPeligro : styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre="guardar" />{guardando ? 'Procesando…' : tituloModo[modo]}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Traslado actualizado" mensaje={guardado ? `El traslado ${guardado.numero} ahora está ${etiquetaCodigo(guardado.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver traslado" onAccionPrincipal={() => onNavegar(`${rutaBase}/${trasladoId}`)} onCerrar={() => onNavegar(`${rutaBase}/${trasladoId}`)} />
  </>
}

function CampoMotivo({ motivo, error, onChange }: { motivo: string; error?: string; onChange: (valor: string) => void }) {
  return <div className={styles.campo}><label htmlFor="traslado-motivo">Motivo <span>*</span></label><textarea id="traslado-motivo" rows={4} maxLength={500} value={motivo} aria-invalid={Boolean(error)} onChange={(evento) => onChange(evento.target.value)} />{error && <small className={styles.errorCampo}>{error}</small>}</div>
}
