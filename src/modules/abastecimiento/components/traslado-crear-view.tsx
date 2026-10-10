import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { crearRegistroAbastecimiento, listarProductosAbastecimiento, obtenerOpcionesAbastecimiento } from '../abastecimiento-api'
import type { CrearTrasladoInternoRequest, OpcionesFiltrosAbastecimiento, PrioridadTrasladoInterno, ProductoAbastecimiento, TipoTrasladoInterno, TrasladoInterno } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type Linea = { clave: number; productoId: string; cantidad: string; observaciones: string }
const lineaNueva = (clave: number): Linea => ({ clave, productoId: '', cantidad: '', observaciones: '' })
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date())
const esPuntoVenta = (tipoSucursal: string) => tipoSucursal === 'FARMACIA' || tipoSucursal === 'STAND'

export function TrasladoCrearView({ sucursalActualId, consultaInicial = '', onNavegar, onCambiosPendientes }: { sucursalActualId: string; consultaInicial?: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const parametrosIniciales = useMemo(() => new URLSearchParams(consultaInicial), [consultaInicial])
  const tipoSolicitado = parametrosIniciales.get('tipo')
  const tipoInicial: TipoTrasladoInterno = tipoSolicitado === 'TRASLADO_HORIZONTAL' || tipoSolicitado === 'REDISTRIBUCION' || tipoSolicitado === 'ABASTECIMIENTO' ? tipoSolicitado : 'ABASTECIMIENTO'
  const vieneDeVenta = parametrosIniciales.get('origen') === 'venta'
  const [opciones, setOpciones] = useState<OpcionesFiltrosAbastecimiento | null>(null)
  const [productos, setProductos] = useState<ProductoAbastecimiento[]>([])
  const [tipo, setTipo] = useState<TipoTrasladoInterno>(tipoInicial)
  const [prioridad, setPrioridad] = useState<PrioridadTrasladoInterno>('NORMAL')
  const [requeridoEn, setRequeridoEn] = useState('')
  const [sucursalOrigenId, setSucursalOrigenId] = useState('')
  const [sucursalDestinoId, setSucursalDestinoId] = useState(sucursalActualId)
  const [justificacion, setJustificacion] = useState(vieneDeVenta ? 'Solicitud originada desde Nueva venta por existencia disponible en otra sucursal.' : '')
  const [evidencia, setEvidencia] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaNueva(1)])
  const [secuencia, setSecuencia] = useState(2)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<TrasladoInterno | null>(null)
  const gestionGlobal = opciones?.gestionGlobal ?? false
  const sucursalSesion = opciones?.sucursalesTraslado.find((sucursal) => sucursal.id === sucursalActualId)
  const origenesPermitidos = useMemo(() => (opciones?.sucursalesTraslado ?? []).filter((sucursal) => {
    if (tipo === 'ABASTECIMIENTO' || tipo === 'REDISTRIBUCION') return sucursal.tipo === 'BODEGA'
    return esPuntoVenta(sucursal.tipo)
  }), [opciones, tipo])
  const destinosPermitidos = useMemo(() => (opciones?.sucursalesTraslado ?? []).filter((sucursal) => {
    if (tipo === 'ABASTECIMIENTO' || tipo === 'TRASLADO_HORIZONTAL') return esPuntoVenta(sucursal.tipo)
    return sucursal.tipo === 'BODEGA'
  }), [opciones, tipo])
  const tieneCambios = Boolean(sucursalOrigenId || requeridoEn || justificacion || evidencia || lineas.some((linea) => linea.productoId || linea.cantidad || linea.observaciones))

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([obtenerOpcionesAbastecimiento(controlador.signal), listarProductosAbastecimiento('', controlador.signal)])
      .then(([opcionesCargadas, productosCargados]) => {
        setOpciones(opcionesCargadas)
        setProductos(productosCargados)
        if (!opcionesCargadas.gestionGlobal) setSucursalDestinoId(opcionesCargadas.sucursalContextoId)
        const sucursalOrigenInicial = parametrosIniciales.get('sucursalOrigenId')
        const origen = opcionesCargadas.sucursalesTraslado.find((sucursal) => sucursal.id === sucursalOrigenInicial)
        const origenCompatible = origen && (tipoInicial === 'ABASTECIMIENTO' || tipoInicial === 'REDISTRIBUCION' ? origen.tipo === 'BODEGA' : esPuntoVenta(origen.tipo))
        if (origenCompatible && origen.id !== opcionesCargadas.sucursalContextoId) setSucursalOrigenId(origen.id)
        const productoIdInicial = parametrosIniciales.get('productoId')
        const productoValido = productosCargados.some((producto) => producto.id === productoIdInicial)
        const cantidadInicial = Number(parametrosIniciales.get('cantidad'))
        if (productoValido && productoIdInicial) setLineas([{ clave: 1, productoId: productoIdInicial, cantidad: cantidadInicial > 0 ? String(cantidadInicial) : '1', observaciones: '' }])
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los catálogos.')
      })
    return () => controlador.abort()
  }, [parametrosIniciales, tipoInicial])
  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  const productosSeleccionados = useMemo(() => new Set(lineas.map((linea) => linea.productoId).filter(Boolean)), [lineas])

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes: Record<string, string> = {}
    if (!sucursalOrigenId) siguientes.sucursalOrigenId = 'Selecciona la sucursal de origen.'
    if (!sucursalDestinoId) siguientes.sucursalDestinoId = 'Selecciona la sucursal de destino.'
    if (sucursalOrigenId && sucursalOrigenId === sucursalDestinoId) siguientes.sucursalDestinoId = 'El origen y el destino deben ser diferentes.'
    if (!requeridoEn || requeridoEn < hoy()) siguientes.requeridoEn = 'Selecciona una fecha vigente.'
    if (justificacion.trim().length < 10 || justificacion.trim().length > 1000) siguientes.justificacion = 'La justificación debe contener de 10 a 1000 caracteres.'
    if (evidencia.trim().length > 500) siguientes.evidencia = 'La referencia admite máximo 500 caracteres.'
    const validas = lineas.filter((linea) => linea.productoId || linea.cantidad || linea.observaciones)
    if (!validas.length) siguientes.detalles = 'Agrega al menos un producto.'
    if (validas.some((linea) => !linea.productoId || !(Number(linea.cantidad) > 0))) siguientes.detalles = 'Completa el producto y una cantidad mayor que cero en cada línea.'
    if (new Set(validas.map((linea) => linea.productoId)).size !== validas.length) siguientes.detalles = 'No repitas productos en la solicitud.'
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      document.getElementById(`traslado-${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    const datos: CrearTrasladoInternoRequest = {
      tipo,
      prioridad,
      requeridoEn,
      sucursalOrigenId,
      ...(gestionGlobal ? { sucursalDestinoId } : {}),
      justificacion: justificacion.trim(),
      evidenciaReferencia: evidencia.trim() || null,
      detalles: validas.map((linea) => ({ productoId: linea.productoId, cantidadSolicitada: Number(linea.cantidad), observaciones: linea.observaciones.trim() || null })),
    }
    setGuardando(true)
    setError(null)
    try {
      setGuardado(await crearRegistroAbastecimiento<TrasladoInterno>('traslados', datos))
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible crear el traslado.')
    } finally {
      setGuardando(false)
    }
  }

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-nuevo-traslado">
      <AbastecimientoBreadcrumb recurso="traslados" actual="Nueva solicitud" onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Movimiento entre sucursales</p><h1 id="titulo-nuevo-traslado">Solicitar traslado interno</h1><p>La solicitud identifica productos y cantidades. La ubicación y el lote de salida se confirman después, durante la preparación.</p></div></header>
      {vieneDeVenta && <div className={styles.notaInformativa}><strong>Solicitud iniciada desde Nueva venta</strong><span>Se precargaron la sucursal de origen y el medicamento seleccionado. Revisa la cantidad, la fecha requerida y la justificación antes de guardar.</span></div>}
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando}>
          <legend>Ruta y prioridad</legend>
          <div className={styles.grillaTres}>
            <div className={styles.campo}><label htmlFor="traslado-tipo">Tipo <span>*</span></label><select id="traslado-tipo" value={tipo} onChange={(evento) => { setTipo(evento.target.value as TipoTrasladoInterno); setSucursalOrigenId(''); if (gestionGlobal) setSucursalDestinoId('') }}><option value="ABASTECIMIENTO">Abastecimiento</option><option value="TRASLADO_HORIZONTAL">Traslado horizontal</option><option value="REDISTRIBUCION">Redistribución</option></select></div>
            <div className={styles.campo}><label htmlFor="traslado-prioridad">Prioridad <span>*</span></label><select id="traslado-prioridad" value={prioridad} onChange={(evento) => setPrioridad(evento.target.value as PrioridadTrasladoInterno)}><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="EMERGENCIA">Emergencia</option></select></div>
            <div className={styles.campo}><label htmlFor="traslado-requeridoEn">Requerido para <span>*</span></label><input id="traslado-requeridoEn" type="date" min={hoy()} value={requeridoEn} aria-invalid={Boolean(errores.requeridoEn)} onChange={(evento) => setRequeridoEn(evento.target.value)} />{errores.requeridoEn && <small className={styles.errorCampo}>{errores.requeridoEn}</small>}</div>
          </div>
          <div className={styles.grillaDos}>
            <div className={styles.campo}><label htmlFor="traslado-sucursalOrigenId">Sucursal origen <span>*</span></label><SelectorCatalogoBuscable id="traslado-sucursalOrigenId" valor={sucursalOrigenId} opciones={origenesPermitidos.filter((sucursal) => sucursal.id !== sucursalDestinoId).map((sucursal) => ({ valor: sucursal.id, etiqueta: `${sucursal.codigo} — ${sucursal.nombre}` }))} placeholder="Selecciona el origen" invalido={Boolean(errores.sucursalOrigenId)} onChange={setSucursalOrigenId} />{errores.sucursalOrigenId && <small className={styles.errorCampo}>{errores.sucursalOrigenId}</small>}</div>
            <div className={styles.campo}>
              <label htmlFor="traslado-sucursalDestinoId">Sucursal destino <span>*</span></label>
              {gestionGlobal
                ? <SelectorCatalogoBuscable id="traslado-sucursalDestinoId" valor={sucursalDestinoId} opciones={destinosPermitidos.filter((sucursal) => sucursal.id !== sucursalOrigenId).map((sucursal) => ({ valor: sucursal.id, etiqueta: `${sucursal.codigo} — ${sucursal.nombre}` }))} placeholder="Selecciona el destino" invalido={Boolean(errores.sucursalDestinoId)} onChange={setSucursalDestinoId} />
                : <input id="traslado-sucursalDestinoId" value={sucursalSesion ? `${sucursalSesion.codigo} — ${sucursalSesion.nombre}` : 'Sucursal de la sesión'} readOnly aria-describedby="ayuda-destino-traslado" />}
              <small id="ayuda-destino-traslado" className={styles.ayudaCampo}>{gestionGlobal ? `Ruta permitida: ${tipo === 'ABASTECIMIENTO' ? 'bodega a farmacia' : tipo === 'DEVOLUCION_INTERNA' ? 'farmacia a bodega' : tipo === 'TRASLADO_HORIZONTAL' ? 'farmacia a farmacia' : 'bodega a bodega'}.` : 'El destino se deriva de tu sucursal activa y el backend valida que corresponda al tipo de traslado.'}</small>
              {errores.sucursalDestinoId && <small className={styles.errorCampo}>{errores.sucursalDestinoId}</small>}
            </div>
          </div>
        </fieldset>
        <fieldset disabled={guardando}>
          <legend>Productos solicitados</legend>
          <div className={styles.lineasProductos}>{lineas.map((linea, indice) => <div className={styles.lineaProducto} key={linea.clave}><span className={styles.numeroLinea}>{indice + 1}</span><div className={styles.campoProducto}><label htmlFor={`traslado-producto-${linea.clave}`}>Producto</label><SelectorCatalogoBuscable id={`traslado-producto-${linea.clave}`} valor={linea.productoId} opciones={productos.filter((producto) => producto.id === linea.productoId || !productosSeleccionados.has(producto.id)).map((producto) => ({ valor: producto.id, etiqueta: `${producto.codigo} — ${producto.nombre}` }))} placeholder="Selecciona un producto" onChange={(valor) => setLineas((actuales) => actuales.map((item) => item.clave === linea.clave ? { ...item, productoId: valor } : item))} /></div><div className={styles.campo}><label htmlFor={`traslado-cantidad-${linea.clave}`}>Cantidad</label><input id={`traslado-cantidad-${linea.clave}`} type="number" min="0.000001" step="0.000001" value={linea.cantidad} onChange={(evento) => setLineas((actuales) => actuales.map((item) => item.clave === linea.clave ? { ...item, cantidad: evento.target.value } : item))} /></div><div className={styles.campo}><label htmlFor={`traslado-observacion-${linea.clave}`}>Observaciones</label><input id={`traslado-observacion-${linea.clave}`} maxLength={500} value={linea.observaciones} onChange={(evento) => setLineas((actuales) => actuales.map((item) => item.clave === linea.clave ? { ...item, observaciones: evento.target.value } : item))} /></div><button className={styles.botonQuitarLinea} type="button" aria-label={`Quitar producto ${indice + 1}`} disabled={lineas.length === 1} onClick={() => setLineas((actuales) => actuales.filter((item) => item.clave !== linea.clave))}>×</button></div>)}</div>
          {errores.detalles && <small className={styles.errorCampo}>{errores.detalles}</small>}
          <button className={`${styles.botonSecundario} ${styles.botonAgregarLinea}`} type="button" onClick={() => { setLineas((actuales) => [...actuales, lineaNueva(secuencia)]); setSecuencia((valor) => valor + 1) }}><IconoAccion nombre="agregar" />Agregar producto</button>
        </fieldset>
        <fieldset disabled={guardando}><legend>Justificación y evidencia</legend><div className={styles.campo}><label htmlFor="traslado-justificacion">Justificación <span>*</span></label><textarea id="traslado-justificacion" rows={5} maxLength={1000} value={justificacion} aria-invalid={Boolean(errores.justificacion)} onChange={(evento) => setJustificacion(evento.target.value)} />{errores.justificacion && <small className={styles.errorCampo}>{errores.justificacion}</small>}</div><div className={styles.campo}><label htmlFor="traslado-evidencia">Referencia de evidencia</label><input id="traslado-evidencia" maxLength={500} value={evidencia} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <small className={styles.errorCampo}>{errores.evidencia}</small>}</div></fieldset>
        <div className={styles.accionesFormulario}><p><span>*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/abastecimiento/traslados')}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={styles.botonPrimario} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : 'Crear solicitud'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Traslado solicitado" mensaje={guardado ? `El traslado ${guardado.numero} quedó registrado sin afectar existencias.` : ''} textoAccionPrincipal="Ver traslado" onAccionPrincipal={() => onNavegar(`/abastecimiento/traslados/${guardado?.id}`)} onCerrar={() => onNavegar(`/abastecimiento/traslados/${guardado?.id}`)} />
  </>
}
