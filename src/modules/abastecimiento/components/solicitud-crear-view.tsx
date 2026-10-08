import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { crearSolicitudCompra, listarProductosAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type {
  CrearSolicitudCompraRequest,
  ModalidadCompra,
  PrioridadCompraUrgente,
  ProductoAbastecimiento,
  SolicitudCompra,
  ViaAtencionUrgente,
} from '../abastecimiento.types'
import { ordenViasAtencionUrgente } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type LineaFormulario = { clave: string; productoId: string; cantidad: string; observaciones: string }
type DatosSolicitud = {
  modalidad: ModalidadCompra
  prioridad: PrioridadCompraUrgente | ''
  viaAtencionUrgente: ViaAtencionUrgente | ''
  justificacion: string
  referenciaNecesidad: string
  evidenciaReferencia: string
  requeridaEn: string
  detalles: LineaFormulario[]
}

type CampoSolicitud = Exclude<keyof DatosSolicitud, 'detalles'> | 'detalles'
type ErroresSolicitud = Partial<Record<CampoSolicitud, string>>

const prioridades: PrioridadCompraUrgente[] = ['CRITICA', 'ALTA', 'PREVENTIVA']

function nuevaLinea(indice: number): LineaFormulario {
  return { clave: `linea-${Date.now()}-${indice}`, productoId: '', cantidad: '', observaciones: '' }
}

function hoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function datosIniciales(): DatosSolicitud {
  return { modalidad: 'ORDINARIA', prioridad: '', viaAtencionUrgente: '', justificacion: '', referenciaNecesidad: '', evidenciaReferencia: '', requeridaEn: hoyGuatemala(), detalles: [nuevaLinea(0)] }
}

function decimalesValidos(valor: number): boolean {
  return Number.isInteger(valor * 1_000_000)
}

function validar(datos: DatosSolicitud): ErroresSolicitud {
  const errores: ErroresSolicitud = {}
  if (datos.justificacion.trim().length < 10 || datos.justificacion.trim().length > 1000) errores.justificacion = 'La justificación debe contener de 10 a 1000 caracteres.'
  if (datos.referenciaNecesidad.trim().length < 3 || datos.referenciaNecesidad.trim().length > 200) errores.referenciaNecesidad = 'La referencia debe contener de 3 a 200 caracteres.'
  if (!datos.requeridaEn) errores.requeridaEn = 'Selecciona la fecha requerida.'
  else if (datos.requeridaEn < hoyGuatemala()) errores.requeridaEn = 'La fecha requerida no puede ser anterior a hoy.'
  if (datos.evidenciaReferencia.trim().length > 500) errores.evidenciaReferencia = 'La evidencia admite hasta 500 caracteres.'
  if (datos.modalidad === 'URGENTE') {
    if (!datos.prioridad) errores.prioridad = 'Selecciona la prioridad de la urgencia.'
    if (!datos.viaAtencionUrgente) errores.viaAtencionUrgente = 'Selecciona hasta qué vía se evaluó la atención.'
    if (datos.evidenciaReferencia.trim().length < 3) errores.evidenciaReferencia = 'La compra urgente requiere una referencia de evidencia.'
  }
  const productos = datos.detalles.map((linea) => linea.productoId).filter(Boolean)
  if (!datos.detalles.length || datos.detalles.some((linea) => !linea.productoId || !linea.cantidad || Number(linea.cantidad) <= 0 || Number(linea.cantidad) > 999_999_999_999 || !decimalesValidos(Number(linea.cantidad)))) errores.detalles = 'Cada línea requiere un producto y una cantidad mayor que cero, con máximo seis decimales.'
  else if (new Set(productos).size !== productos.length) errores.detalles = 'No se permiten productos duplicados.'
  else if (datos.detalles.some((linea) => linea.observaciones.trim().length > 500)) errores.detalles = 'Las observaciones de cada producto admiten hasta 500 caracteres.'
  return errores
}

export function SolicitudCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const inicial = useMemo(() => datosIniciales(), [])
  const [datos, setDatos] = useState<DatosSolicitud>(inicial)
  const [errores, setErrores] = useState<ErroresSolicitud>({})
  const [productos, setProductos] = useState<ProductoAbastecimiento[]>([])
  const [busquedaProductos, setBusquedaProductos] = useState('')
  const [errorProductos, setErrorProductos] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<SolicitudCompra | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(inicial)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    const temporizador = window.setTimeout(() => {
      void listarProductosAbastecimiento(busquedaProductos.trim(), controlador.signal).then((respuesta) => {
        setProductos((actuales) => {
          const porId = new Map(actuales.map((producto) => [producto.id, producto]))
          respuesta.forEach((producto) => porId.set(producto.id, producto))
          return [...porId.values()]
        })
        setErrorProductos(null)
      }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorProductos(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los productos.') })
    }, busquedaProductos ? 350 : 0)
    return () => {
      window.clearTimeout(temporizador)
      controlador.abort()
    }
  }, [busquedaProductos])

  const opcionesProductos = useMemo(() => productos.map((producto) => ({ valor: producto.id, etiqueta: `${producto.codigo} — ${producto.nombre}${producto.presentacion ? ` · ${producto.presentacion}` : ''}` })), [productos])
  const alternativas = datos.viaAtencionUrgente ? ordenViasAtencionUrgente.slice(0, ordenViasAtencionUrgente.indexOf(datos.viaAtencionUrgente as ViaAtencionUrgente) + 1) : []

  const actualizar = <K extends Exclude<keyof DatosSolicitud, 'detalles'>>(campo: K, valor: DatosSolicitud[K]) => {
    setDatos((actual) => {
      if (campo === 'modalidad' && valor === 'ORDINARIA') return { ...actual, modalidad: 'ORDINARIA', prioridad: '', viaAtencionUrgente: '', evidenciaReferencia: actual.evidenciaReferencia }
      return { ...actual, [campo]: valor }
    })
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral(null)
  }

  const actualizarLinea = (clave: string, campo: Exclude<keyof LineaFormulario, 'clave'>, valor: string) => {
    setDatos((actual) => ({ ...actual, detalles: actual.detalles.map((linea) => linea.clave === clave ? { ...linea, [campo]: valor } : linea) }))
    setErrores((actual) => ({ ...actual, detalles: undefined }))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const erroresActuales = validar(datos)
    if (Object.keys(erroresActuales).length) {
      setErrores(erroresActuales)
      setErrorGeneral('Revisa los campos señalados antes de registrar la solicitud.')
      document.getElementById(`solicitud-${Object.keys(erroresActuales)[0]}`)?.focus()
      return
    }
    const solicitud: CrearSolicitudCompraRequest = {
      modalidad: datos.modalidad,
      prioridad: datos.modalidad === 'URGENTE' ? datos.prioridad as PrioridadCompraUrgente : null,
      viaAtencionUrgente: datos.modalidad === 'URGENTE' ? datos.viaAtencionUrgente as ViaAtencionUrgente : null,
      alternativasEvaluadas: datos.modalidad === 'URGENTE' ? [...alternativas] : null,
      justificacion: datos.justificacion.trim(),
      referenciaNecesidad: datos.referenciaNecesidad.trim(),
      evidenciaReferencia: datos.evidenciaReferencia.trim() || null,
      requeridaEn: datos.requeridaEn,
      detalles: datos.detalles.map((linea) => ({ productoId: linea.productoId, cantidad: Number(linea.cantidad), observaciones: linea.observaciones.trim() || null })),
    }
    setGuardando(true)
    setErrorGeneral(null)
    try { const creada = await crearSolicitudCompra(solicitud); setGuardado(creada); onCambiosPendientes(false) } catch (errorActual) { setErrorGeneral(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la solicitud.') } finally { setGuardando(false) }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-crear-solicitud">
        <AbastecimientoBreadcrumb recurso="solicitudes" actual="Nueva solicitud" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Compras y abastecimiento</p><h1 id="titulo-crear-solicitud">Registrar solicitud de compra</h1><p>Documenta la necesidad. La sucursal solicitante se toma de la sesión activa.</p></div></header>
        {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}
        <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando}>
            <legend>Necesidad</legend>
            <p className={styles.descripcionSeccion}>Relaciona la solicitud con el origen operativo que la generó.</p>
            <div className={styles.grillaDos}>
              <div className={styles.campo}><label htmlFor="solicitud-modalidad">Modalidad <span aria-hidden="true">*</span></label><select id="solicitud-modalidad" value={datos.modalidad} onChange={(evento) => actualizar('modalidad', evento.target.value as ModalidadCompra)}><option value="ORDINARIA">Ordinaria</option><option value="URGENTE">Urgente</option></select></div>
              <CampoSolicitud id="requeridaEn" etiqueta="Fecha requerida" tipo="date" requerido valor={datos.requeridaEn} error={errores.requeridaEn} min={hoyGuatemala()} onChange={(valor) => actualizar('requeridaEn', valor)} />
            </div>
            <CampoSolicitud id="referenciaNecesidad" etiqueta="Referencia de la necesidad" requerido valor={datos.referenciaNecesidad} error={errores.referenciaNecesidad} maxLength={200} ayuda="Ej. alerta de reposición, pedido, venta o necesidad operativa." onChange={(valor) => actualizar('referenciaNecesidad', valor)} />
            <div className={styles.campo}><label htmlFor="solicitud-justificacion">Justificación <span aria-hidden="true">*</span></label><textarea id="solicitud-justificacion" value={datos.justificacion} rows={5} maxLength={1000} aria-invalid={Boolean(errores.justificacion)} aria-describedby={errores.justificacion ? 'solicitud-justificacion-error' : 'solicitud-justificacion-ayuda'} onChange={(evento) => actualizar('justificacion', evento.target.value)} />{errores.justificacion ? <small id="solicitud-justificacion-error" className={styles.errorCampo}>{errores.justificacion}</small> : <small id="solicitud-justificacion-ayuda" className={styles.ayudaCampo}>Explica la necesidad y la consecuencia de no atenderla.</small>}</div>
          </fieldset>

          {datos.modalidad === 'URGENTE' && <fieldset disabled={guardando} className={styles.seccionUrgente}>
            <legend>Control de compra urgente</legend>
            <p className={styles.descripcionSeccion}>La urgencia acelera la decisión, pero conserva autorización, evidencia y el orden corporativo de atención.</p>
            <div className={styles.grillaDos}>
              <div className={styles.campo}><label htmlFor="solicitud-prioridad">Prioridad <span aria-hidden="true">*</span></label><select id="solicitud-prioridad" value={datos.prioridad} aria-invalid={Boolean(errores.prioridad)} onChange={(evento) => actualizar('prioridad', evento.target.value as PrioridadCompraUrgente | '')}><option value="">Selecciona una prioridad</option>{prioridades.map((valor) => <option key={valor} value={valor}>{etiquetaCodigo(valor)}</option>)}</select>{errores.prioridad && <small className={styles.errorCampo}>{errores.prioridad}</small>}</div>
              <div className={styles.campo}><label htmlFor="solicitud-viaAtencionUrgente">Última vía evaluada <span aria-hidden="true">*</span></label><select id="solicitud-viaAtencionUrgente" value={datos.viaAtencionUrgente} aria-invalid={Boolean(errores.viaAtencionUrgente)} onChange={(evento) => actualizar('viaAtencionUrgente', evento.target.value as ViaAtencionUrgente | '')}><option value="">Selecciona la vía alcanzada</option>{ordenViasAtencionUrgente.map((valor) => <option key={valor} value={valor}>{etiquetaCodigo(valor)}</option>)}</select>{errores.viaAtencionUrgente && <small className={styles.errorCampo}>{errores.viaAtencionUrgente}</small>}</div>
            </div>
            <div className={styles.secuenciaUrgente} aria-live="polite"><strong>Alternativas que quedarán documentadas</strong>{alternativas.length ? <ol>{alternativas.map((via) => <li key={via}>{etiquetaCodigo(via)}</li>)}</ol> : <p>Selecciona la última vía evaluada para construir la secuencia obligatoria.</p>}</div>
            <CampoSolicitud id="evidenciaReferencia" etiqueta="Referencia de evidencia" requerido valor={datos.evidenciaReferencia} error={errores.evidenciaReferencia} maxLength={500} ayuda="Número de documento, enlace interno o referencia verificable." onChange={(valor) => actualizar('evidenciaReferencia', valor)} />
          </fieldset>}

          {datos.modalidad === 'ORDINARIA' && <fieldset disabled={guardando}><legend>Respaldo documental</legend><CampoSolicitud id="evidenciaReferencia" etiqueta="Referencia de evidencia" valor={datos.evidenciaReferencia} error={errores.evidenciaReferencia} maxLength={500} onChange={(valor) => actualizar('evidenciaReferencia', valor)} /></fieldset>}

          <fieldset disabled={guardando}>
            <legend>Productos solicitados</legend>
            <p className={styles.descripcionSeccion}>Solicitar no modifica inventario. Cada producto se registra una sola vez.</p>
            <div className={styles.campoBusquedaProducto}><label htmlFor="busqueda-catalogo-productos">Buscar en el catálogo de productos</label><input id="busqueda-catalogo-productos" type="search" value={busquedaProductos} maxLength={150} placeholder="Código o nombre del producto" onChange={(evento) => setBusquedaProductos(evento.target.value)} /><small>La búsqueda consulta el catálogo operativo y agrega las coincidencias a los selectores.</small></div>
            {errorProductos && <div className={styles.alertaError} role="alert">{errorProductos}</div>}
            <div id="solicitud-detalles" tabIndex={-1} className={styles.lineasProductos} aria-invalid={Boolean(errores.detalles)}>
              {datos.detalles.map((linea, indice) => <div className={styles.lineaProducto} key={linea.clave}>
                <div className={styles.numeroLinea} aria-hidden="true">{indice + 1}</div>
                <div className={styles.campoProducto}><label htmlFor={`producto-${linea.clave}`}>Producto <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id={`producto-${linea.clave}`} opciones={opcionesProductos} placeholder={productos.length ? 'Selecciona un producto' : 'Cargando productos…'} valor={linea.productoId} invalido={Boolean(errores.detalles && !linea.productoId)} onChange={(valor) => actualizarLinea(linea.clave, 'productoId', valor)} /></div>
                <div className={styles.campo}><label htmlFor={`cantidad-${linea.clave}`}>Cantidad <span aria-hidden="true">*</span></label><input id={`cantidad-${linea.clave}`} type="number" min="0.000001" max="999999999999" step="0.000001" value={linea.cantidad} onChange={(evento) => actualizarLinea(linea.clave, 'cantidad', evento.target.value)} /></div>
                <div className={styles.campo}><label htmlFor={`observaciones-${linea.clave}`}>Observaciones</label><input id={`observaciones-${linea.clave}`} value={linea.observaciones} maxLength={500} onChange={(evento) => actualizarLinea(linea.clave, 'observaciones', evento.target.value)} /></div>
                <button className={styles.botonQuitarLinea} type="button" disabled={datos.detalles.length === 1} aria-label={`Quitar producto ${indice + 1}`} title="Quitar producto" onClick={() => setDatos((actual) => ({ ...actual, detalles: actual.detalles.filter((item) => item.clave !== linea.clave) }))}>×</button>
              </div>)}
            </div>
            {errores.detalles && <small className={styles.errorCampo} role="alert">{errores.detalles}</small>}
            <button className={styles.botonAgregarLinea} type="button" disabled={datos.detalles.length >= 500} onClick={() => setDatos((actual) => ({ ...actual, detalles: [...actual.detalles, nuevaLinea(actual.detalles.length)] }))}>+ Agregar producto</button>
          </fieldset>

          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/abastecimiento/solicitudes')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || Boolean(errorProductos)}><IconoAccion nombre="enviar" />{guardando ? 'Registrando solicitud…' : 'Registrar solicitud'}</button></div></div>
        </form>
      </section>
      <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Solicitud registrada" mensaje={guardado ? `La solicitud ${guardado.numero} fue registrada y quedó pendiente de resolución.` : ''} textoAccionPrincipal="Ver solicitud" onAccionPrincipal={() => guardado && onNavegar(`/abastecimiento/solicitudes/${guardado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/abastecimiento/solicitudes')} onCerrar={() => guardado && onNavegar(`/abastecimiento/solicitudes/${guardado.id}`)} />
    </>
  )
}

function CampoSolicitud({ id, etiqueta, valor, onChange, requerido, error, ayuda, tipo = 'text', maxLength, min }: { id: Exclude<CampoSolicitud, 'modalidad' | 'prioridad' | 'viaAtencionUrgente' | 'justificacion' | 'detalles'>; etiqueta: string; valor: string; onChange: (valor: string) => void; requerido?: boolean; error?: string; ayuda?: string; tipo?: 'text' | 'date'; maxLength?: number; min?: string }) {
  const entradaId = `solicitud-${id}`
  return <div className={styles.campo}><label htmlFor={entradaId}>{etiqueta} {requerido && <span aria-hidden="true">*</span>}</label><input id={entradaId} type={tipo} value={valor} required={requerido} maxLength={maxLength} min={min} aria-invalid={Boolean(error)} aria-describedby={error ? `${entradaId}-error` : ayuda ? `${entradaId}-ayuda` : undefined} onChange={(evento) => onChange(evento.target.value)} />{error && <small id={`${entradaId}-error`} className={styles.errorCampo}>{error}</small>}{!error && ayuda && <small id={`${entradaId}-ayuda`} className={styles.ayudaCampo}>{ayuda}</small>}</div>
}
