import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { crearRegistroAbastecimiento, listarLotesAbastecimiento, listarProductosAbastecimiento, listarUbicacionesAbastecimiento, obtenerOpcionesAbastecimiento } from '../abastecimiento-api'
import type { CrearTrasladoInternoRequest, LoteAbastecimiento, OpcionesFiltrosAbastecimiento, PrioridadTrasladoInterno, ProductoAbastecimiento, TrasladoInterno, UbicacionAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type Linea = { clave: number; productoId: string; loteId: string; cantidad: string; causa: string }
const SIN_LOTE = 'SIN_LOTE'
const lineaNueva = (clave: number): Linea => ({ clave, productoId: '', loteId: '', cantidad: '', causa: '' })
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date())

export function DevolucionInternaCrearView({ sucursalActualId, onNavegar, onCambiosPendientes }: { sucursalActualId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [opciones, setOpciones] = useState<OpcionesFiltrosAbastecimiento | null>(null)
  const [productos, setProductos] = useState<ProductoAbastecimiento[]>([])
  const [ubicaciones, setUbicaciones] = useState<UbicacionAbastecimiento[]>([])
  const [destinoId, setDestinoId] = useState('')
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('')
  const [prioridad, setPrioridad] = useState<PrioridadTrasladoInterno>('NORMAL')
  const [requeridoEn, setRequeridoEn] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaNueva(1)])
  const [lotesPorLinea, setLotesPorLinea] = useState<Record<number, LoteAbastecimiento[]>>({})
  const [secuencia, setSecuencia] = useState(2)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<TrasladoInterno | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      obtenerOpcionesAbastecimiento(controlador.signal),
      listarProductosAbastecimiento('', controlador.signal),
      listarUbicacionesAbastecimiento(sucursalActualId, controlador.signal),
    ]).then(([catalogos, productosCargados, ubicacionesCargadas]) => {
      setOpciones(catalogos)
      setProductos(productosCargados)
      setUbicaciones(ubicacionesCargadas.filter((ubicacion) => ubicacion.activa !== false && !ubicacion.bloqueada && ['BODEGA', 'VENTA'].includes(ubicacion.tipo)))
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los catálogos de la devolución interna.')
    })
    return () => controlador.abort()
  }, [sucursalActualId])

  const bodegasDestino = useMemo(() => (opciones?.sucursalesTraslado ?? []).filter((sucursal) => sucursal.tipo === 'BODEGA' && sucursal.id !== sucursalActualId), [opciones, sucursalActualId])
  const productosSeleccionados = useMemo(() => new Set(lineas.map((linea) => linea.productoId).filter(Boolean)), [lineas])
  const tieneCambios = Boolean(destinoId || ubicacionOrigenId || requeridoEn || justificacion || evidencia || lineas.some((linea) => linea.productoId || linea.cantidad || linea.causa))
  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const actualizarLinea = (clave: number, cambio: Partial<Linea>) => setLineas((actuales) => actuales.map((linea) => linea.clave === clave ? { ...linea, ...cambio } : linea))
  const seleccionarProducto = async (clave: number, productoId: string) => {
    actualizarLinea(clave, { productoId, loteId: '', cantidad: '' })
    setLotesPorLinea((actuales) => ({ ...actuales, [clave]: [] }))
    if (!productoId || !ubicacionOrigenId) return
    try {
      const lotes = await listarLotesAbastecimiento(sucursalActualId, ubicacionOrigenId, productoId)
      setLotesPorLinea((actuales) => ({ ...actuales, [clave]: lotes }))
      if (lotes.length === 1) actualizarLinea(clave, { loteId: lotes[0].id ?? SIN_LOTE })
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible consultar los lotes disponibles.')
    }
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes: Record<string, string> = {}
    if (!destinoId) siguientes.destinoId = 'Selecciona la bodega que recibirá la devolución.'
    if (!ubicacionOrigenId) siguientes.ubicacionOrigenId = 'Selecciona la ubicación física de salida.'
    if (!requeridoEn || requeridoEn < hoy()) siguientes.requeridoEn = 'Selecciona una fecha vigente.'
    if (justificacion.trim().length < 10 || justificacion.trim().length > 1000) siguientes.justificacion = 'La justificación debe contener de 10 a 1000 caracteres.'
    if (evidencia.trim().length > 500) siguientes.evidencia = 'La referencia admite máximo 500 caracteres.'
    const validas = lineas.filter((linea) => linea.productoId || linea.loteId || linea.cantidad || linea.causa)
    if (!validas.length) siguientes.detalles = 'Agrega al menos un producto.'
    if (validas.some((linea) => !linea.productoId || !linea.loteId || !(Number(linea.cantidad) > 0))) siguientes.detalles = 'Completa producto, lote y cantidad en cada línea.'
    if (validas.some((linea) => linea.causa.trim().length < 5)) siguientes.detalles = 'Documenta una causa de al menos 5 caracteres por producto.'
    if (validas.some((linea) => {
      const lote = (lotesPorLinea[linea.clave] ?? []).find((item) => (item.id ?? SIN_LOTE) === linea.loteId)
      return !lote || Number(linea.cantidad) > Number(lote.cantidadDisponible)
    })) siguientes.detalles = 'La cantidad no puede superar la existencia disponible del lote y ubicación seleccionados.'
    if (new Set(validas.map((linea) => linea.productoId)).size !== validas.length) siguientes.detalles = 'No repitas productos en la misma solicitud.'
    setErrores(siguientes)
    if (Object.keys(siguientes).length) return

    const datos: CrearTrasladoInternoRequest = {
      tipo: 'DEVOLUCION_INTERNA',
      prioridad,
      requeridoEn,
      sucursalOrigenId: sucursalActualId,
      sucursalDestinoId: destinoId,
      ubicacionOrigenId,
      justificacion: justificacion.trim(),
      evidenciaReferencia: evidencia.trim() || null,
      detalles: validas.map((linea) => ({ productoId: linea.productoId, loteId: linea.loteId === SIN_LOTE ? null : linea.loteId, cantidadSolicitada: Number(linea.cantidad), observaciones: linea.causa.trim() })),
    }
    setGuardando(true)
    setError(null)
    try {
      setGuardada(await crearRegistroAbastecimiento<TrasladoInterno>('devoluciones-internas', datos))
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible solicitar la devolución interna.')
    } finally {
      setGuardando(false)
    }
  }

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-devolucion-interna">
      <AbastecimientoBreadcrumb recurso="devoluciones-internas" actual="Nueva devolución" onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Farmacia a Bodega Central</p><h1 id="titulo-devolucion-interna">Solicitar devolución interna</h1><p>Identifica desde el inicio la ubicación y el lote físico. Bodega revisará la solicitud antes de que la farmacia prepare y despache.</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando}><legend>Ruta y prioridad</legend><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="devolucion-interna-destino">Bodega destino <span>*</span></label><SelectorCatalogoBuscable id="devolucion-interna-destino" valor={destinoId} opciones={bodegasDestino.map((sucursal) => ({ valor: sucursal.id, etiqueta: `${sucursal.codigo} — ${sucursal.nombre}` }))} placeholder="Selecciona la bodega" invalido={Boolean(errores.destinoId)} onChange={setDestinoId} />{errores.destinoId && <small className={styles.errorCampo}>{errores.destinoId}</small>}</div><div className={styles.campo}><label htmlFor="devolucion-interna-prioridad">Prioridad <span>*</span></label><select id="devolucion-interna-prioridad" value={prioridad} onChange={(evento) => setPrioridad(evento.target.value as PrioridadTrasladoInterno)}><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="EMERGENCIA">Emergencia</option></select></div><div className={styles.campo}><label htmlFor="devolucion-interna-fecha">Requerido para <span>*</span></label><input id="devolucion-interna-fecha" type="date" min={hoy()} value={requeridoEn} onChange={(evento) => setRequeridoEn(evento.target.value)} />{errores.requeridoEn && <small className={styles.errorCampo}>{errores.requeridoEn}</small>}</div></div><div className={styles.campo}><label htmlFor="devolucion-interna-ubicacion">Ubicación física de salida <span>*</span></label><select id="devolucion-interna-ubicacion" value={ubicacionOrigenId} onChange={(evento) => { setUbicacionOrigenId(evento.target.value); setLineas([lineaNueva(1)]); setLotesPorLinea({}); setSecuencia(2) }}><option value="">Selecciona una ubicación</option>{ubicaciones.map((ubicacion) => <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.codigo} — {ubicacion.nombre}</option>)}</select>{errores.ubicacionOrigenId && <small className={styles.errorCampo}>{errores.ubicacionOrigenId}</small>}</div></fieldset>
        <fieldset disabled={guardando || !ubicacionOrigenId}><legend>Productos a devolver</legend><div className={styles.lineasProductos}>{lineas.map((linea, indice) => { const catalogo = lotesPorLinea[linea.clave] ?? []; const loteSeleccionado = catalogo.find((lote) => (lote.id ?? SIN_LOTE) === linea.loteId); return <div className={styles.lineaProducto} key={linea.clave}><span className={styles.numeroLinea}>{indice + 1}</span><div className={styles.campoProducto}><label htmlFor={`devolucion-producto-${linea.clave}`}>Producto</label><SelectorCatalogoBuscable id={`devolucion-producto-${linea.clave}`} valor={linea.productoId} opciones={productos.filter((producto) => producto.id === linea.productoId || !productosSeleccionados.has(producto.id)).map((producto) => ({ valor: producto.id, etiqueta: `${producto.codigo} — ${producto.nombre}` }))} placeholder="Selecciona un producto" onChange={(valor) => void seleccionarProducto(linea.clave, valor)} /></div><div className={styles.campo}><label htmlFor={`devolucion-lote-${linea.clave}`}>Lote</label><select id={`devolucion-lote-${linea.clave}`} value={linea.loteId} disabled={!linea.productoId} onChange={(evento) => actualizarLinea(linea.clave, { loteId: evento.target.value, cantidad: '' })}><option value="">Selecciona un lote</option>{catalogo.map((lote) => <option key={lote.id ?? SIN_LOTE} value={lote.id ?? SIN_LOTE}>{lote.numeroLote} · disponible {lote.cantidadDisponible}</option>)}</select></div><div className={styles.campo}><label htmlFor={`devolucion-cantidad-${linea.clave}`}>Cantidad</label><input id={`devolucion-cantidad-${linea.clave}`} type="number" min="0.000001" max={loteSeleccionado?.cantidadDisponible} step="0.000001" value={linea.cantidad} onChange={(evento) => actualizarLinea(linea.clave, { cantidad: evento.target.value })} /></div><div className={styles.campo}><label htmlFor={`devolucion-causa-${linea.clave}`}>Causa</label><input id={`devolucion-causa-${linea.clave}`} maxLength={500} value={linea.causa} onChange={(evento) => actualizarLinea(linea.clave, { causa: evento.target.value })} /></div><button className={styles.botonQuitarLinea} type="button" aria-label={`Quitar producto ${indice + 1}`} disabled={lineas.length === 1} onClick={() => setLineas((actuales) => actuales.filter((item) => item.clave !== linea.clave))}>×</button></div> })}</div>{errores.detalles && <small className={styles.errorCampo}>{errores.detalles}</small>}<button className={`${styles.botonSecundario} ${styles.botonAgregarLinea}`} type="button" onClick={() => { setLineas((actuales) => [...actuales, lineaNueva(secuencia)]); setSecuencia((valor) => valor + 1) }}><IconoAccion nombre="agregar" />Agregar producto</button></fieldset>
        <fieldset disabled={guardando}><legend>Justificación y evidencia</legend><div className={styles.campo}><label htmlFor="devolucion-interna-justificacion">Justificación <span>*</span></label><textarea id="devolucion-interna-justificacion" rows={5} maxLength={1000} value={justificacion} onChange={(evento) => setJustificacion(evento.target.value)} />{errores.justificacion && <small className={styles.errorCampo}>{errores.justificacion}</small>}</div><div className={styles.campo}><label htmlFor="devolucion-interna-evidencia">Referencia de evidencia</label><input id="devolucion-interna-evidencia" maxLength={500} value={evidencia} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <small className={styles.errorCampo}>{errores.evidencia}</small>}</div></fieldset>
        <div className={styles.accionesFormulario}><p><span>*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/abastecimiento/devoluciones-internas')}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={styles.botonPrimario} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : 'Solicitar devolución'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo="Devolución interna solicitada" mensaje={guardada ? `La devolución ${guardada.numero} quedó pendiente de aprobación en Bodega Central.` : ''} textoAccionPrincipal="Ver devolución" onAccionPrincipal={() => onNavegar(`/abastecimiento/devoluciones-internas/${guardada?.id}`)} onCerrar={() => onNavegar(`/abastecimiento/devoluciones-internas/${guardada?.id}`)} />
  </>
}
