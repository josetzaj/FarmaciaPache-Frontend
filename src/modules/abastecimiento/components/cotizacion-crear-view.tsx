import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import {
  crearCotizacionCompra,
  abrirPdfCotizacionCompra,
  listarRegistrosAbastecimiento,
  obtenerOpcionesAbastecimiento,
  obtenerRegistroAbastecimiento,
} from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type {
  CotizacionCompra,
  DetalleProductoAbastecimiento,
  OpcionesFiltrosAbastecimiento,
  SolicitudCompra,
} from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type LineaCotizacion = {
  productoId: string
  codigo: string
  producto: string
  cantidadSolicitada: number
  incluida: boolean
  cantidad: string
  precioUnitario: string
  impuesto: string
}

type DatosCotizacion = {
  solicitudId: string
  proveedorId: string
  numeroProveedor: string
  moneda: string
  tipoCambio: string
  fechaTipoCambio: string
  formaPago: string
  condicionesEntrega: string
  vigenteHasta: string
  plazoEntregaDias: string
  evidenciaReferencia: string
  detalles: LineaCotizacion[]
}

type CampoCotizacion = Exclude<keyof DatosCotizacion, 'detalles'> | 'detalles'
type ErroresCotizacion = Partial<Record<CampoCotizacion, string>>

function hoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function datosIniciales(): DatosCotizacion {
  return {
    solicitudId: '',
    proveedorId: '',
    numeroProveedor: '',
    moneda: 'GTQ',
    tipoCambio: '1',
    fechaTipoCambio: hoyGuatemala(),
    formaPago: '',
    condicionesEntrega: '',
    vigenteHasta: '',
    plazoEntregaDias: '',
    evidenciaReferencia: '',
    detalles: [],
  }
}

function decimalesValidos(valor: number, decimales: number): boolean {
  return Number.isInteger(valor * (10 ** decimales))
}

function validar(datos: DatosCotizacion, solicitud: SolicitudCompra | null): ErroresCotizacion {
  const errores: ErroresCotizacion = {}
  if (!datos.solicitudId || !solicitud) errores.solicitudId = 'Selecciona una solicitud aprobada.'
  if (!datos.proveedorId) errores.proveedorId = 'Selecciona el proveedor que presentó la oferta.'
  if (datos.numeroProveedor.trim().length < 1 || datos.numeroProveedor.trim().length > 80) errores.numeroProveedor = 'Ingresa el número de cotización del proveedor, con máximo 80 caracteres.'
  if (!/^[A-Z]{3}$/.test(datos.moneda.trim().toUpperCase())) errores.moneda = 'La moneda debe ser un código de tres letras, por ejemplo GTQ o USD.'
  const tipoCambio = Number(datos.tipoCambio)
  if (!Number.isFinite(tipoCambio) || tipoCambio <= 0 || !decimalesValidos(tipoCambio, 6)) errores.tipoCambio = 'Ingresa un tipo de cambio mayor que cero, con máximo seis decimales.'
  if (!datos.fechaTipoCambio) errores.fechaTipoCambio = 'Selecciona la fecha del tipo de cambio.'
  if (datos.formaPago.trim().length < 2 || datos.formaPago.trim().length > 150) errores.formaPago = 'La forma de pago debe contener de 2 a 150 caracteres.'
  if (datos.condicionesEntrega.trim().length < 5 || datos.condicionesEntrega.trim().length > 500) errores.condicionesEntrega = 'Las condiciones de entrega deben contener de 5 a 500 caracteres.'
  if (!datos.vigenteHasta) errores.vigenteHasta = 'Selecciona la vigencia de la oferta.'
  else if (datos.vigenteHasta < hoyGuatemala()) errores.vigenteHasta = 'La cotización no puede registrarse con una vigencia vencida.'
  const plazo = Number(datos.plazoEntregaDias)
  if (!Number.isInteger(plazo) || plazo < 0 || plazo > 3650) errores.plazoEntregaDias = 'El plazo debe ser un número entero entre 0 y 3650 días.'
  if (datos.evidenciaReferencia.trim().length < 3 || datos.evidenciaReferencia.trim().length > 500) errores.evidenciaReferencia = 'La evidencia debe contener de 3 a 500 caracteres.'

  const incluidas = datos.detalles.filter((linea) => linea.incluida)
  if (!incluidas.length) errores.detalles = 'Incluye al menos un producto de la solicitud.'
  else if (incluidas.some((linea) => {
    const cantidad = Number(linea.cantidad)
    const precio = Number(linea.precioUnitario)
    const impuesto = Number(linea.impuesto)
    return !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > linea.cantidadSolicitada || !decimalesValidos(cantidad, 6)
      || !Number.isFinite(precio) || precio <= 0 || !decimalesValidos(precio, 4)
      || !Number.isFinite(impuesto) || impuesto < 0 || !decimalesValidos(impuesto, 4)
  })) errores.detalles = 'Revisa cantidades, precios e impuestos. La cantidad no puede superar lo solicitado; precios e impuestos admiten hasta cuatro decimales.'
  return errores
}

function lineaDesdeSolicitud(detalle: DetalleProductoAbastecimiento): LineaCotizacion {
  const cantidad = Number(detalle.cantidad ?? 0)
  return {
    productoId: detalle.productoId,
    codigo: detalle.producto?.codigo ?? 'Sin código',
    producto: detalle.producto?.nombre ?? 'Producto no disponible',
    cantidadSolicitada: cantidad,
    incluida: true,
    cantidad: String(cantidad),
    precioUnitario: '',
    impuesto: '0',
  }
}

function formatoMonto(valor: number, moneda: string): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: /^[A-Z]{3}$/.test(moneda) ? moneda : 'GTQ', maximumFractionDigits: 2 }).format(valor)
}

export function CotizacionCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const inicial = useMemo(() => datosIniciales(), [])
  const [datos, setDatos] = useState<DatosCotizacion>(inicial)
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([])
  const [solicitud, setSolicitud] = useState<SolicitudCompra | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosAbastecimiento | null>(null)
  const [errores, setErrores] = useState<ErroresCotizacion>({})
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<CotizacionCompra | null>(null)
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(inicial)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      obtenerOpcionesAbastecimiento(controlador.signal),
      listarRegistrosAbastecimiento<SolicitudCompra>('solicitudes', { pagina: 1, tamanoPagina: 200, estados: ['APROBADA', 'EN_COTIZACION'] }, controlador.signal),
    ]).then(([catalogos, respuesta]) => {
      setOpciones(catalogos)
      setSolicitudes(respuesta.items.filter((item) => item.modalidad === 'ORDINARIA' || ['RECEPCION_CENTRAL_URGENTE', 'COMPRA_DIRECTA_SUCURSAL'].includes(item.viaAtencionUrgente ?? '')))
      setErrorCarga(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las solicitudes y proveedores disponibles.')
    })
    return () => controlador.abort()
  }, [])

  useEffect(() => {
    if (!datos.solicitudId) return
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<SolicitudCompra>('solicitudes', datos.solicitudId, controlador.signal).then((respuesta) => {
      setSolicitud(respuesta)
      setDatos((actual) => ({ ...actual, detalles: respuesta.detalles.map(lineaDesdeSolicitud) }))
      setErrorCarga(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el detalle de la solicitud.')
    })
    return () => controlador.abort()
  }, [datos.solicitudId])

  const opcionesSolicitudes = useMemo(() => solicitudes.map((item) => ({ valor: item.id, etiqueta: `${item.numero} — ${item.referenciaNecesidad} · ${etiquetaCodigo(item.modalidad)}` })), [solicitudes])
  const proveedoresDisponibles = useMemo(() => (opciones?.proveedores ?? []).filter((item) => solicitud?.modalidad === 'ORDINARIA' ? item.autorizado : true), [opciones, solicitud?.modalidad])
  const opcionesProveedores = useMemo(() => proveedoresDisponibles.map((item) => ({ valor: item.id, etiqueta: `${item.codigo} — ${item.nombre}${item.autorizado ? '' : ' · No homologado'}` })), [proveedoresDisponibles])
  const total = datos.detalles.filter((linea) => linea.incluida).reduce((suma, linea) => suma + Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0) + Number(linea.impuesto || 0), 0)
  const totalGtq = total * Number(datos.tipoCambio || 0)

  const actualizar = <K extends Exclude<keyof DatosCotizacion, 'detalles'>>(campo: K, valor: DatosCotizacion[K]) => {
    if (campo === 'solicitudId') setSolicitud(null)
    setDatos((actual) => {
      if (campo === 'solicitudId') return { ...actual, solicitudId: valor as string, proveedorId: '', detalles: [] }
      if (campo === 'moneda') {
        const moneda = String(valor).toUpperCase()
        return { ...actual, moneda, ...(moneda === 'GTQ' ? { tipoCambio: '1' } : {}) }
      }
      return { ...actual, [campo]: valor }
    })
    setErrores((actual) => ({ ...actual, [campo]: undefined, ...(campo === 'solicitudId' ? { detalles: undefined, proveedorId: undefined } : {}) }))
    setErrorGeneral(null)
  }

  const actualizarLinea = (productoId: string, campo: 'incluida' | 'cantidad' | 'precioUnitario' | 'impuesto', valor: boolean | string) => {
    setDatos((actual) => ({ ...actual, detalles: actual.detalles.map((linea) => linea.productoId === productoId ? { ...linea, [campo]: valor } : linea) }))
    setErrores((actual) => ({ ...actual, detalles: undefined }))
    setErrorGeneral(null)
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const erroresActuales = validar(datos, solicitud)
    if (Object.keys(erroresActuales).length) {
      setErrores(erroresActuales)
      setErrorGeneral('Revisa los campos señalados antes de registrar la cotización.')
      document.getElementById(`cotizacion-${Object.keys(erroresActuales)[0]}`)?.focus()
      return
    }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      const creada = await crearCotizacionCompra({
        solicitudId: datos.solicitudId,
        proveedorId: datos.proveedorId,
        numeroProveedor: datos.numeroProveedor.trim(),
        moneda: datos.moneda.trim().toUpperCase(),
        tipoCambio: Number(datos.tipoCambio),
        fechaTipoCambio: datos.fechaTipoCambio,
        formaPago: datos.formaPago.trim(),
        condicionesEntrega: datos.condicionesEntrega.trim(),
        vigenteHasta: datos.vigenteHasta,
        plazoEntregaDias: Number(datos.plazoEntregaDias),
        evidenciaReferencia: datos.evidenciaReferencia.trim(),
        detalles: datos.detalles.filter((linea) => linea.incluida).map((linea) => ({ productoId: linea.productoId, cantidad: Number(linea.cantidad), precioUnitario: Number(linea.precioUnitario), impuesto: Number(linea.impuesto) })),
      })
      setGuardado(creada)
      onCambiosPendientes(false)
    } catch (errorActual) {
      setErrorGeneral(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la cotización.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-crear-cotizacion">
        <AbastecimientoBreadcrumb recurso="cotizaciones" actual="Nueva cotización" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Compras y abastecimiento</p><h1 id="titulo-crear-cotizacion">Registrar cotización</h1><p>Documenta la oferta del proveedor sobre una solicitud aprobada. Registrar la oferta no la adjudica ni modifica inventario.</p></div></header>
        {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => window.location.reload()}>Reintentar carga</button></div>}
        {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}
        <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando}>
            <legend>Origen de la oferta</legend>
            <p className={styles.descripcionSeccion}>Solo aparecen solicitudes aprobadas que requieren compra y proveedores válidos para su modalidad.</p>
            <div className={styles.grillaDos}>
              <div className={styles.campoProducto}><label htmlFor="cotizacion-solicitudId">Solicitud <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="cotizacion-solicitudId" opciones={opcionesSolicitudes} placeholder={solicitudes.length ? 'Selecciona una solicitud' : 'No hay solicitudes cotizables'} valor={datos.solicitudId} invalido={Boolean(errores.solicitudId)} onChange={(valor) => actualizar('solicitudId', valor)} />{errores.solicitudId && <small className={styles.errorCampo}>{errores.solicitudId}</small>}</div>
              <div className={styles.campoProducto}><label htmlFor="cotizacion-proveedorId">Proveedor <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="cotizacion-proveedorId" opciones={opcionesProveedores} placeholder={datos.solicitudId ? 'Selecciona un proveedor' : 'Selecciona primero una solicitud'} valor={datos.proveedorId} deshabilitado={!datos.solicitudId} invalido={Boolean(errores.proveedorId)} onChange={(valor) => actualizar('proveedorId', valor)} />{errores.proveedorId && <small className={styles.errorCampo}>{errores.proveedorId}</small>}</div>
            </div>
            {solicitud && <section className={styles.resumenDocumento} aria-label="Resumen de la solicitud"><div><span>Número</span><strong>{solicitud.numero}</strong></div><div><span>Modalidad</span><strong>{etiquetaCodigo(solicitud.modalidad)}</strong></div><div><span>Estado</span><strong>{etiquetaCodigo(solicitud.estado)}</strong></div><div><span>Productos</span><strong>{solicitud.detalles.length}</strong></div></section>}
          </fieldset>

          <fieldset disabled={guardando}>
            <legend>Condiciones comerciales</legend>
            <div className={styles.grillaTres}>
              <Campo id="numeroProveedor" etiqueta="Número del proveedor" valor={datos.numeroProveedor} requerido maxLength={80} error={errores.numeroProveedor} onChange={(valor) => actualizar('numeroProveedor', valor)} />
              <Campo id="moneda" etiqueta="Moneda" valor={datos.moneda} requerido maxLength={3} error={errores.moneda} ayuda="Código ISO de tres letras, por ejemplo GTQ o USD." onChange={(valor) => actualizar('moneda', valor.replace(/[^A-Za-z]/g, '').slice(0, 3))} />
              <Campo id="tipoCambio" etiqueta="Tipo de cambio a GTQ" tipo="number" valor={datos.tipoCambio} requerido min="0.000001" step="0.000001" deshabilitado={datos.moneda === 'GTQ'} error={errores.tipoCambio} onChange={(valor) => actualizar('tipoCambio', valor)} />
              <Campo id="fechaTipoCambio" etiqueta="Fecha del tipo de cambio" tipo="date" valor={datos.fechaTipoCambio} requerido error={errores.fechaTipoCambio} onChange={(valor) => actualizar('fechaTipoCambio', valor)} />
              <Campo id="vigenteHasta" etiqueta="Vigente hasta" tipo="date" valor={datos.vigenteHasta} requerido min={hoyGuatemala()} error={errores.vigenteHasta} onChange={(valor) => actualizar('vigenteHasta', valor)} />
              <Campo id="plazoEntregaDias" etiqueta="Plazo de entrega (días)" tipo="number" valor={datos.plazoEntregaDias} requerido min="0" max="3650" step="1" error={errores.plazoEntregaDias} onChange={(valor) => actualizar('plazoEntregaDias', valor)} />
            </div>
            <Campo id="formaPago" etiqueta="Forma de pago" valor={datos.formaPago} requerido maxLength={150} error={errores.formaPago} onChange={(valor) => actualizar('formaPago', valor)} />
            <Campo id="condicionesEntrega" etiqueta="Condiciones de entrega" tipo="textarea" valor={datos.condicionesEntrega} requerido maxLength={500} error={errores.condicionesEntrega} onChange={(valor) => actualizar('condicionesEntrega', valor)} />
            <Campo id="evidenciaReferencia" etiqueta="Referencia de evidencia" valor={datos.evidenciaReferencia} requerido maxLength={500} error={errores.evidenciaReferencia} ayuda="Documento, correo, enlace interno o referencia verificable de la oferta." onChange={(valor) => actualizar('evidenciaReferencia', valor)} />
          </fieldset>

          <fieldset disabled={guardando || !solicitud}>
            <legend>Productos cotizados</legend>
            <p className={styles.descripcionSeccion}>La oferta solo puede incluir productos y cantidades de la solicitud. Desmarca un producto cuando el proveedor no lo cotice.</p>
            <div id="cotizacion-detalles" tabIndex={-1} className={styles.lineasCotizacion} aria-invalid={Boolean(errores.detalles)}>
              {datos.detalles.map((linea) => {
                const subtotal = Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0) + Number(linea.impuesto || 0)
                return <div className={`${styles.lineaCotizacion} ${!linea.incluida ? styles.lineaCotizacionExcluida : ''}`} key={linea.productoId}>
                  <label className={styles.incluirCotizacion}><input type="checkbox" checked={linea.incluida} onChange={(evento) => actualizarLinea(linea.productoId, 'incluida', evento.target.checked)} /><span><strong>{linea.codigo}</strong><small>{linea.producto}</small></span></label>
                  <div className={styles.campo}><label htmlFor={`cotizacion-cantidad-${linea.productoId}`}>Cantidad <span aria-hidden="true">*</span></label><input id={`cotizacion-cantidad-${linea.productoId}`} type="number" min="0.000001" max={linea.cantidadSolicitada} step="0.000001" value={linea.cantidad} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.productoId, 'cantidad', evento.target.value)} /><small className={styles.ayudaCampo}>Solicitada: {new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(linea.cantidadSolicitada)}</small></div>
                  <div className={styles.campo}><label htmlFor={`cotizacion-precio-${linea.productoId}`}>Precio unitario <span aria-hidden="true">*</span></label><input id={`cotizacion-precio-${linea.productoId}`} type="number" min="0.0001" max="999999999999" step="0.0001" value={linea.precioUnitario} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.productoId, 'precioUnitario', evento.target.value)} /></div>
                  <div className={styles.campo}><label htmlFor={`cotizacion-impuesto-${linea.productoId}`}>Impuesto</label><input id={`cotizacion-impuesto-${linea.productoId}`} type="number" min="0" max="999999999999" step="0.0001" value={linea.impuesto} disabled={!linea.incluida} onChange={(evento) => actualizarLinea(linea.productoId, 'impuesto', evento.target.value)} /></div>
                  <div className={styles.subtotalLinea}><span>Subtotal</span><strong>{formatoMonto(subtotal, datos.moneda)}</strong></div>
                </div>
              })}
              {!datos.detalles.length && <div className={styles.estadoVacioCompacto}><h3>Selecciona una solicitud</h3><p>Los productos aprobados aparecerán aquí para registrar precios e impuestos.</p></div>}
            </div>
            {errores.detalles && <small className={styles.errorCampo} role="alert">{errores.detalles}</small>}
            <section className={styles.totalesCotizacion} aria-live="polite"><div><span>Total de la oferta</span><strong>{formatoMonto(total, datos.moneda)}</strong></div><div><span>Total en GTQ</span><strong>{formatoMonto(totalGtq, 'GTQ')}</strong></div></section>
          </fieldset>

          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/abastecimiento/cotizaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || Boolean(errorCarga) || !solicitud}><IconoAccion nombre="guardar" />{guardando ? 'Registrando cotización…' : 'Registrar cotización'}</button></div></div>
        </form>
      </section>
      <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Cotización registrada" mensaje={guardado ? `La cotización ${guardado.numeroProveedor} fue registrada y quedó pendiente de evaluación.` : ''} textoAccionPrincipal="Ver cotización" onAccionPrincipal={() => guardado && onNavegar(`/abastecimiento/cotizaciones/${guardado.id}`)} textoAccionSecundaria="Ver PDF" onAccionSecundaria={() => guardado && void abrirPdfCotizacionCompra(guardado.id).catch((errorActual: unknown) => setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar el PDF de la cotización.'))} onCerrar={() => guardado && onNavegar(`/abastecimiento/cotizaciones/${guardado.id}`)} />
    </>
  )
}

function Campo({ id, etiqueta, valor, onChange, requerido, error, ayuda, tipo = 'text', maxLength, min, max, step, deshabilitado }: { id: Exclude<CampoCotizacion, 'solicitudId' | 'proveedorId' | 'detalles'>; etiqueta: string; valor: string; onChange: (valor: string) => void; requerido?: boolean; error?: string; ayuda?: string; tipo?: 'text' | 'date' | 'number' | 'textarea'; maxLength?: number; min?: string; max?: string; step?: string; deshabilitado?: boolean }) {
  const entradaId = `cotizacion-${id}`
  return <div className={styles.campo}><label htmlFor={entradaId}>{etiqueta} {requerido && <span aria-hidden="true">*</span>}</label>{tipo === 'textarea' ? <textarea id={entradaId} value={valor} rows={4} required={requerido} maxLength={maxLength} disabled={deshabilitado} aria-invalid={Boolean(error)} aria-describedby={error ? `${entradaId}-error` : ayuda ? `${entradaId}-ayuda` : undefined} onChange={(evento) => onChange(evento.target.value)} /> : <input id={entradaId} type={tipo} value={valor} required={requerido} maxLength={maxLength} min={min} max={max} step={step} disabled={deshabilitado} aria-invalid={Boolean(error)} aria-describedby={error ? `${entradaId}-error` : ayuda ? `${entradaId}-ayuda` : undefined} onChange={(evento) => onChange(evento.target.value)} />}{error && <small id={`${entradaId}-error`} className={styles.errorCampo}>{error}</small>}{!error && ayuda && <small id={`${entradaId}-ayuda`} className={styles.ayudaCampo}>{ayuda}</small>}</div>
}
