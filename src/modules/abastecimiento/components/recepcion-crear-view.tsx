import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { crearRecepcionCompra, listarTodosRegistrosAbastecimiento, listarUbicacionesAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { DetalleProductoAbastecimiento, EstadoIngresoRecepcion, OrdenCompra, RecepcionCompra, UbicacionAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type LineaRecepcion = {
  ordenDetalleId: string
  producto: DetalleProductoAbastecimiento['producto']
  cantidadOrdenada: number
  cantidadYaRecibida: number
  incluida: boolean
  cantidadRecibida: string
  cantidadAceptada: string
  cantidadRechazada: string
  estadoIngreso: EstadoIngresoRecepcion
  numeroLote: string
  fechaVencimiento: string
  registroSanitario: string
  costoUnitario: string
  observaciones: string
}

function hoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function decimalesValidos(valor: number, decimales: number): boolean {
  return Number.isInteger(valor * (10 ** decimales))
}

function crearLineas(orden: OrdenCompra): LineaRecepcion[] {
  return orden.detalles.map((detalle) => ({
    ordenDetalleId: detalle.id,
    producto: detalle.producto,
    cantidadOrdenada: Number(detalle.cantidadOrdenada ?? 0),
    cantidadYaRecibida: Number(detalle.cantidadRecibida ?? 0),
    incluida: false,
    cantidadRecibida: '',
    cantidadAceptada: '',
    cantidadRechazada: '',
    estadoIngreso: 'DISPONIBLE',
    numeroLote: '',
    fechaVencimiento: '',
    registroSanitario: '',
    costoUnitario: String(Number((Number(detalle.precioUnitario ?? 0) * Number(orden.tipoCambio || 1)).toFixed(4))),
    observaciones: '',
  }))
}

export function RecepcionCrearView({ sucursalActualId, ordenInicialId, onNavegar, onCambiosPendientes }: { sucursalActualId: string; ordenInicialId?: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [ordenId, setOrdenId] = useState(ordenInicialId ?? '')
  const [ubicaciones, setUbicaciones] = useState<UbicacionAbastecimiento[]>([])
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('')
  const [documentoProveedor, setDocumentoProveedor] = useState('')
  const [documentoPendiente, setDocumentoPendiente] = useState(false)
  const [regularizarAntesDe, setRegularizarAntesDe] = useState('')
  const [evidenciaDocumental, setEvidenciaDocumental] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [receptorNombre, setReceptorNombre] = useState('')
  const [receptorIdentificacion, setReceptorIdentificacion] = useState('')
  const [entregadoEn, setEntregadoEn] = useState('')
  const [lineas, setLineas] = useState<LineaRecepcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardada, setGuardada] = useState<RecepcionCompra | null>(null)
  const orden = useMemo(() => ordenes.find((item) => item.id === ordenId) ?? null, [ordenId, ordenes])
  const tieneCambios = Boolean(ordenId || ubicacionDestinoId || documentoProveedor || documentoPendiente || evidenciaDocumental || observaciones || receptorNombre || receptorIdentificacion || entregadoEn || lineas.some((linea) => linea.incluida))

  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void listarTodosRegistrosAbastecimiento<OrdenCompra>('ordenes', { estados: ['EMITIDA', 'CONFIRMADA_PROVEEDOR', 'RECEPCION_PARCIAL'], sucursalId: sucursalActualId }, controlador.signal)
      .then((respuesta) => { setOrdenes(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las órdenes pendientes de recepción.') })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [sucursalActualId])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.resolve().then(async () => {
      if (controlador.signal.aborted) return
      if (!orden) { setLineas([]); setUbicaciones([]); setUbicacionDestinoId(''); return }
      setLineas(crearLineas(orden)); setUbicacionDestinoId('')
      if (orden.tipoDestino === 'CLIENTE') { setUbicaciones([]); return }
      try {
        const respuesta = await listarUbicacionesAbastecimiento(orden.sucursalDestinoId, controlador.signal)
        if (!controlador.signal.aborted) setUbicaciones(respuesta.filter((item) => item.activa !== false && !item.bloqueada))
      } catch (errorActual) {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las ubicaciones de recepción.')
      }
    })
    return () => controlador.abort()
  }, [orden])

  const actualizarLinea = (id: string, cambio: Partial<LineaRecepcion>) => {
    setLineas((actuales) => actuales.map((linea) => linea.ordenDetalleId === id ? { ...linea, ...cambio } : linea))
    setErrores((actuales) => ({ ...actuales, detalles: '' }))
  }

  const validar = (): Record<string, string> => {
    const siguientes: Record<string, string> = {}
    if (!orden) siguientes.ordenId = 'Selecciona una orden pendiente de recepción.'
    if (orden?.tipoDestino === 'SUCURSAL' && !ubicacionDestinoId) siguientes.ubicacionDestinoId = 'Selecciona la ubicación autorizada de ingreso.'
    if (!documentoPendiente && (documentoProveedor.trim().length < 1 || documentoProveedor.trim().length > 100)) siguientes.documentoProveedor = 'Ingresa el documento del proveedor, con máximo 100 caracteres.'
    if (documentoPendiente && !regularizarAntesDe) siguientes.regularizarAntesDe = 'Indica el plazo de regularización documental.'
    else if (documentoPendiente && regularizarAntesDe < hoyGuatemala()) siguientes.regularizarAntesDe = 'El plazo de regularización no puede estar en el pasado.'
    if (evidenciaDocumental.trim().length < 3 || evidenciaDocumental.trim().length > 500) siguientes.evidenciaDocumental = 'La evidencia documental debe contener de 3 a 500 caracteres.'
    if (observaciones.trim().length > 1000) siguientes.observaciones = 'Las observaciones admiten máximo 1,000 caracteres.'
    if (orden?.tipoDestino === 'CLIENTE') {
      if (receptorNombre.trim().length < 1 || receptorNombre.trim().length > 180) siguientes.receptorNombre = 'Identifica al receptor de la entrega directa.'
      if (receptorIdentificacion.trim().length < 1 || receptorIdentificacion.trim().length > 100) siguientes.receptorIdentificacion = 'Registra la identificación del receptor.'
      if (!entregadoEn) siguientes.entregadoEn = 'Registra la fecha y hora de entrega.'
    }
    const incluidas = lineas.filter((linea) => linea.incluida)
    if (!incluidas.length) siguientes.detalles = 'Selecciona por lo menos un producto recibido.'
    for (const linea of incluidas) {
      const recibida = Number(linea.cantidadRecibida); const aceptada = Number(linea.cantidadAceptada); const rechazada = Number(linea.cantidadRechazada)
      const pendiente = linea.cantidadOrdenada - linea.cantidadYaRecibida
      if (!Number.isFinite(recibida) || recibida <= 0 || !decimalesValidos(recibida, 6)) siguientes.detalles = 'Cada cantidad recibida debe ser mayor que cero y admitir máximo seis decimales.'
      else if (!Number.isFinite(aceptada) || aceptada < 0 || !Number.isFinite(rechazada) || rechazada < 0 || Math.abs(recibida - aceptada - rechazada) > 0.000001) siguientes.detalles = 'En cada producto, la cantidad recibida debe ser igual a aceptada más rechazada.'
      else if (aceptada > pendiente + 0.000001) siguientes.detalles = 'La cantidad aceptada no puede superar el saldo pendiente de la orden.'
      const costo = Number(linea.costoUnitario)
      if (!linea.costoUnitario.trim() || !Number.isFinite(costo) || costo < 0 || !decimalesValidos(costo, 4)) siguientes.detalles = 'Cada costo unitario debe registrarse en GTQ y admitir máximo cuatro decimales.'
      if (aceptada > 0 && linea.producto?.controlaLote && !linea.numeroLote.trim()) siguientes.detalles = `El producto ${linea.producto.codigo} requiere número de lote.`
      if (aceptada > 0 && linea.producto?.requiereVencimiento && !linea.fechaVencimiento) siguientes.detalles = `El producto ${linea.producto.codigo} requiere fecha de vencimiento.`
      if (linea.observaciones.trim().length > 500) siguientes.detalles = 'La observación de cada producto admite máximo 500 caracteres.'
      if (siguientes.detalles) break
    }
    return siguientes
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes = validar(); setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) { document.getElementById(`recepcion-${primero}`)?.focus(); return }
    if (!orden) return
    setGuardando(true); setError(null)
    try {
      const respuesta = await crearRecepcionCompra({
        ordenId: orden.id,
        ubicacionDestinoId: orden.tipoDestino === 'SUCURSAL' ? ubicacionDestinoId : null,
        documentoProveedor: documentoPendiente ? null : documentoProveedor.trim(),
        documentoPendiente,
        regularizarAntesDe: documentoPendiente ? regularizarAntesDe : null,
        evidenciaDocumental: evidenciaDocumental.trim(),
        observaciones: observaciones.trim() || null,
        receptorNombre: orden.tipoDestino === 'CLIENTE' ? receptorNombre.trim() : null,
        receptorIdentificacion: orden.tipoDestino === 'CLIENTE' ? receptorIdentificacion.trim() : null,
        entregadoEn: orden.tipoDestino === 'CLIENTE' && entregadoEn ? new Date(entregadoEn).toISOString() : null,
        detalles: lineas.filter((linea) => linea.incluida).map((linea) => ({ ordenDetalleId: linea.ordenDetalleId, cantidadRecibida: Number(linea.cantidadRecibida), cantidadAceptada: Number(linea.cantidadAceptada), cantidadRechazada: Number(linea.cantidadRechazada), estadoIngreso: linea.estadoIngreso, numeroLote: linea.numeroLote.trim().toUpperCase() || null, fechaVencimiento: linea.fechaVencimiento || null, registroSanitario: linea.registroSanitario.trim() || null, costoUnitario: Number(linea.costoUnitario), observaciones: linea.observaciones.trim() || null })),
      })
      setGuardada(respuesta); onCambiosPendientes(false)
    } catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la recepción.') } finally { setGuardando(false) }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-nueva-recepcion">
        <AbastecimientoBreadcrumb recurso="recepciones" actual="Nueva recepción" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Recepción sin impacto inmediato</p><h1 id="titulo-nueva-recepcion">Registrar recepción</h1><p>Captura documento, ubicación, cantidades, lotes y diferencias. El inventario cambiará únicamente después de las validaciones documental, física y técnica.</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando || cargando}>
            <legend>Orden y destino</legend>
            <div className={styles.campo}><label htmlFor="recepcion-ordenId">Orden de compra <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="recepcion-ordenId" valor={ordenId} opciones={ordenes.map((item) => ({ valor: item.id, etiqueta: `${item.numero} · ${item.proveedor?.nombre ?? 'Proveedor'} · ${etiquetaCodigo(item.estado)}` }))} placeholder={cargando ? 'Cargando órdenes…' : 'Selecciona una orden'} invalido={Boolean(errores.ordenId)} onChange={(valor) => { setOrdenId(valor); setErrores({}) }} />{errores.ordenId && <small className={styles.errorCampo}>{errores.ordenId}</small>}</div>
            {orden && <section className={styles.resumenDocumento} aria-label="Resumen de la orden"><div><span>Proveedor</span><strong>{orden.proveedor?.nombre ?? 'Relacionado'}</strong></div><div><span>Sucursal</span><strong>{orden.sucursalDestino?.nombre ?? 'Relacionada'}</strong></div><div><span>Destino</span><strong>{orden.tipoDestino === 'CLIENTE' ? 'Entrega directa a cliente' : 'Ingreso a sucursal'}</strong></div><div><span>Estado</span><strong>{etiquetaCodigo(orden.estado)}</strong></div></section>}
            {orden?.tipoDestino === 'SUCURSAL' && <div className={styles.campo}><label htmlFor="recepcion-ubicacionDestinoId">Ubicación de ingreso <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="recepcion-ubicacionDestinoId" valor={ubicacionDestinoId} opciones={ubicaciones.map((item) => ({ valor: item.id, etiqueta: `${item.codigo} · ${item.nombre}` }))} placeholder="Selecciona una ubicación activa" invalido={Boolean(errores.ubicacionDestinoId)} onChange={(valor) => { setUbicacionDestinoId(valor); setErrores((actuales) => ({ ...actuales, ubicacionDestinoId: '' })) }} />{errores.ubicacionDestinoId && <small className={styles.errorCampo}>{errores.ubicacionDestinoId}</small>}</div>}
          </fieldset>

          <fieldset disabled={guardando || !orden}>
            <legend>Recepción documental</legend>
            <label className={documentoPendiente ? styles.decisionSeleccionada : styles.decision}><input type="checkbox" checked={documentoPendiente} onChange={(evento) => { setDocumentoPendiente(evento.target.checked); setDocumentoProveedor(''); setRegularizarAntesDe(''); setErrores((actuales) => ({ ...actuales, documentoProveedor: '', regularizarAntesDe: '' })) }} /><span><strong>Documento pendiente de regularización</strong><small>Solo se admite con una fecha límite visible y trazable.</small></span></label>
            <div className={styles.grillaDos}>
              {!documentoPendiente && <div className={styles.campo}><label htmlFor="recepcion-documentoProveedor">Factura o documento del proveedor <span aria-hidden="true">*</span></label><input id="recepcion-documentoProveedor" maxLength={100} value={documentoProveedor} aria-invalid={Boolean(errores.documentoProveedor)} onChange={(evento) => { setDocumentoProveedor(evento.target.value); setErrores((actuales) => ({ ...actuales, documentoProveedor: '' })) }} />{errores.documentoProveedor && <small className={styles.errorCampo}>{errores.documentoProveedor}</small>}</div>}
              {documentoPendiente && <div className={styles.campo}><label htmlFor="recepcion-regularizarAntesDe">Regularizar antes de <span aria-hidden="true">*</span></label><input id="recepcion-regularizarAntesDe" type="date" min={hoyGuatemala()} value={regularizarAntesDe} aria-invalid={Boolean(errores.regularizarAntesDe)} onChange={(evento) => { setRegularizarAntesDe(evento.target.value); setErrores((actuales) => ({ ...actuales, regularizarAntesDe: '' })) }} />{errores.regularizarAntesDe && <small className={styles.errorCampo}>{errores.regularizarAntesDe}</small>}</div>}
              <div className={styles.campo}><label htmlFor="recepcion-evidenciaDocumental">Evidencia documental <span aria-hidden="true">*</span></label><input id="recepcion-evidenciaDocumental" maxLength={500} value={evidenciaDocumental} aria-invalid={Boolean(errores.evidenciaDocumental)} placeholder="Factura, guía, archivo o referencia verificable" onChange={(evento) => { setEvidenciaDocumental(evento.target.value); setErrores((actuales) => ({ ...actuales, evidenciaDocumental: '' })) }} />{errores.evidenciaDocumental && <small className={styles.errorCampo}>{errores.evidenciaDocumental}</small>}</div>
            </div>
            <div className={styles.campo}><label htmlFor="recepcion-observaciones">Observaciones generales</label><textarea id="recepcion-observaciones" rows={4} maxLength={1000} value={observaciones} aria-invalid={Boolean(errores.observaciones)} onChange={(evento) => { setObservaciones(evento.target.value); setErrores((actuales) => ({ ...actuales, observaciones: '' })) }} />{errores.observaciones && <small className={styles.errorCampo}>{errores.observaciones}</small>}</div>
          </fieldset>

          {orden?.tipoDestino === 'CLIENTE' && <fieldset disabled={guardando}><legend>Entrega directa</legend><p className={styles.descripcionSeccion}>La entrega directa no ingresa a una ubicación de inventario, pero debe conservar receptor, identificación y fecha.</p><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="recepcion-receptorNombre">Receptor <span aria-hidden="true">*</span></label><input id="recepcion-receptorNombre" maxLength={180} value={receptorNombre} aria-invalid={Boolean(errores.receptorNombre)} onChange={(evento) => { setReceptorNombre(evento.target.value); setErrores((actuales) => ({ ...actuales, receptorNombre: '' })) }} />{errores.receptorNombre && <small className={styles.errorCampo}>{errores.receptorNombre}</small>}</div><div className={styles.campo}><label htmlFor="recepcion-receptorIdentificacion">Identificación <span aria-hidden="true">*</span></label><input id="recepcion-receptorIdentificacion" maxLength={100} value={receptorIdentificacion} aria-invalid={Boolean(errores.receptorIdentificacion)} onChange={(evento) => { setReceptorIdentificacion(evento.target.value); setErrores((actuales) => ({ ...actuales, receptorIdentificacion: '' })) }} />{errores.receptorIdentificacion && <small className={styles.errorCampo}>{errores.receptorIdentificacion}</small>}</div><div className={styles.campo}><label htmlFor="recepcion-entregadoEn">Fecha y hora de entrega <span aria-hidden="true">*</span></label><input id="recepcion-entregadoEn" type="datetime-local" value={entregadoEn} aria-invalid={Boolean(errores.entregadoEn)} onChange={(evento) => { setEntregadoEn(evento.target.value); setErrores((actuales) => ({ ...actuales, entregadoEn: '' })) }} />{errores.entregadoEn && <small className={styles.errorCampo}>{errores.entregadoEn}</small>}</div></div></fieldset>}

          {orden && <fieldset id="recepcion-detalles" tabIndex={-1} disabled={guardando}><legend>Recepción física por producto</legend><p className={styles.descripcionSeccion}>Registra lo recibido, separa lo aceptado de lo rechazado y documenta lote, vencimiento y estado de ingreso.</p>{errores.detalles && <div className={styles.alertaError} role="alert">{errores.detalles}</div>}<div className={styles.lineasRecepcion}>{lineas.map((linea) => { const pendiente = Math.max(0, linea.cantidadOrdenada - linea.cantidadYaRecibida); return <article key={linea.ordenDetalleId} className={`${styles.lineaRecepcion} ${!linea.incluida ? styles.lineaCotizacionExcluida : ''}`}><label className={styles.incluirCotizacion}><input type="checkbox" checked={linea.incluida} disabled={pendiente <= 0} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { incluida: evento.target.checked })} /><span><strong>{linea.producto?.codigo ?? 'Sin código'} · {linea.producto?.nombre ?? 'Producto'}</strong><small>Ordenada: {linea.cantidadOrdenada} · Aceptada antes: {linea.cantidadYaRecibida} · Pendiente: {pendiente}</small></span></label><div className={styles.grillaRecepcionCampos}>
            <div className={styles.campo}><label htmlFor={`recibida-${linea.ordenDetalleId}`}>Recibida</label><input id={`recibida-${linea.ordenDetalleId}`} type="number" min="0.000001" step="0.000001" value={linea.cantidadRecibida} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { cantidadRecibida: evento.target.value })} /></div>
            <div className={styles.campo}><label htmlFor={`aceptada-${linea.ordenDetalleId}`}>Aceptada</label><input id={`aceptada-${linea.ordenDetalleId}`} type="number" min="0" max={pendiente} step="0.000001" value={linea.cantidadAceptada} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { cantidadAceptada: evento.target.value })} /></div>
            <div className={styles.campo}><label htmlFor={`rechazada-${linea.ordenDetalleId}`}>Rechazada</label><input id={`rechazada-${linea.ordenDetalleId}`} type="number" min="0" step="0.000001" value={linea.cantidadRechazada} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { cantidadRechazada: evento.target.value })} /></div>
            <div className={styles.campo}><label htmlFor={`estado-${linea.ordenDetalleId}`}>Estado de ingreso</label><select id={`estado-${linea.ordenDetalleId}`} value={linea.estadoIngreso} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { estadoIngreso: evento.target.value as EstadoIngresoRecepcion })}><option value="DISPONIBLE">Disponible</option><option value="CUARENTENA">Cuarentena</option><option value="BLOQUEADO">Bloqueado</option></select></div>
            <div className={styles.campo}><label htmlFor={`lote-${linea.ordenDetalleId}`}>Lote{linea.producto?.controlaLote ? ' *' : ''}</label><input id={`lote-${linea.ordenDetalleId}`} maxLength={100} value={linea.numeroLote} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { numeroLote: evento.target.value.toUpperCase() })} /></div>
            <div className={styles.campo}><label htmlFor={`vence-${linea.ordenDetalleId}`}>Vencimiento{linea.producto?.requiereVencimiento ? ' *' : ''}</label><input id={`vence-${linea.ordenDetalleId}`} type="date" value={linea.fechaVencimiento} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { fechaVencimiento: evento.target.value })} /></div>
            <div className={styles.campo}><label htmlFor={`registro-${linea.ordenDetalleId}`}>Registro sanitario</label><input id={`registro-${linea.ordenDetalleId}`} maxLength={100} value={linea.registroSanitario} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { registroSanitario: evento.target.value })} /></div>
            <div className={styles.campo}><label htmlFor={`costo-${linea.ordenDetalleId}`}>Costo unitario GTQ</label><input id={`costo-${linea.ordenDetalleId}`} type="number" min="0" step="0.0001" value={linea.costoUnitario} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { costoUnitario: evento.target.value })} /></div>
            <div className={`${styles.campo} ${styles.campoRecepcionCompleto}`}><label htmlFor={`observacion-${linea.ordenDetalleId}`}>Observación o diferencia</label><input id={`observacion-${linea.ordenDetalleId}`} maxLength={500} value={linea.observaciones} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.ordenDetalleId, { observaciones: evento.target.value })} /></div>
          </div></article> })}</div></fieldset>}

          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/abastecimiento/recepciones')}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !orden}><IconoAccion nombre="guardar" />{guardando ? 'Registrando recepción…' : 'Registrar recepción'}</button></div></div>
        </form>
      </section>
      <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo="Recepción registrada" mensaje={guardada ? `La recepción ${guardada.numero} quedó registrada sin afectar inventario. Continúa con la validación documental.` : ''} textoAccionPrincipal="Ver recepción" onAccionPrincipal={() => onNavegar(`/abastecimiento/recepciones/${guardada?.id}`)} onCerrar={() => onNavegar(`/abastecimiento/recepciones/${guardada?.id}`)} />
    </>
  )
}
