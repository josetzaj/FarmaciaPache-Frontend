import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { actualizarPoliticaMargen, crearPoliticaMargen, obtenerOpcionesComercial, obtenerPoliticaMargen } from '../comercial-api'
import type { AlcanceMargen, GuardarPoliticaMargenRequest, PoliticaMargen, ReferenciaCatalogo } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

type DatosPolitica = { nombre: string; alcance: AlcanceMargen; productoId: string; margenPorcentaje: string; motivo: string }
type CampoPolitica = keyof DatosPolitica
type ErroresPolitica = Partial<Record<CampoPolitica, string>>
const datosVacios: DatosPolitica = { nombre: '', alcance: 'GENERAL', productoId: '', margenPorcentaje: '', motivo: '' }
function desdePolitica(politica: PoliticaMargen): DatosPolitica { return { nombre: politica.nombre, alcance: politica.alcance, productoId: politica.producto?.id ?? '', margenPorcentaje: String(politica.margenPorcentaje), motivo: '' } }

function validar(datos: DatosPolitica, esEdicion: boolean): ErroresPolitica {
  const errores: ErroresPolitica = {}
  if (!datos.nombre.trim()) errores.nombre = 'Ingresa un nombre para reconocer la política.'
  if (datos.nombre.trim().length > 120) errores.nombre = 'Admite hasta 120 caracteres.'
  if (datos.alcance === 'PRODUCTO' && !datos.productoId) errores.productoId = 'Selecciona el producto al que se aplicará.'
  const margen = Number(datos.margenPorcentaje)
  if (!datos.margenPorcentaje.trim() || !Number.isFinite(margen) || margen < 0 || margen >= 100) errores.margenPorcentaje = 'Ingresa un porcentaje entre 0 y 99.9999.'
  if (esEdicion && !datos.motivo.trim()) errores.motivo = 'Explica el motivo de la actualización.'
  if (datos.motivo.trim().length > 500) errores.motivo = 'Admite hasta 500 caracteres.'
  return errores
}

export function PoliticaMargenFormularioView({ politicaId, onNavegar, onCambiosPendientes }: { politicaId?: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const esEdicion = Boolean(politicaId)
  const [politica, setPolitica] = useState<PoliticaMargen | null>(null)
  const [productos, setProductos] = useState<ReferenciaCatalogo[]>([])
  const [datos, setDatos] = useState<DatosPolitica>(datosVacios)
  const [errores, setErrores] = useState<ErroresPolitica>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<PoliticaMargen | null>(null)
  const originales = useMemo(() => politica ? desdePolitica(politica) : datosVacios, [politica])
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(originales)

  useEffect(() => {
    const controlador = new AbortController()
    const solicitudes: Promise<unknown>[] = [obtenerOpcionesComercial(controlador.signal).then((opciones) => setProductos(opciones.productos))]
    if (politicaId) solicitudes.push(obtenerPoliticaMargen(politicaId, controlador.signal).then((actual) => { setPolitica(actual); setDatos(desdePolitica(actual)) }))
    void Promise.all(solicitudes).then(() => setCargando(false)).catch((error: unknown) => { if (!controlador.signal.aborted) { setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar la política y sus catálogos.'); setCargando(false) } })
    return () => controlador.abort()
  }, [politicaId])
  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const actualizar = <K extends CampoPolitica>(campo: K, valor: DatosPolitica[K]) => { setDatos((actual) => ({ ...actual, [campo]: valor })); setErrores((actual) => ({ ...actual, [campo]: undefined })); setErrorGeneral(null) }
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); const actuales = validar(datos, esEdicion)
    if (Object.keys(actuales).length) { setErrores(actuales); setErrorGeneral('Revisa los campos señalados antes de guardar.'); document.getElementById(`politica-${Object.keys(actuales)[0]}`)?.focus(); return }
    const base: GuardarPoliticaMargenRequest = { nombre: datos.nombre.trim(), alcance: datos.alcance, productoId: datos.alcance === 'PRODUCTO' ? datos.productoId : null, margenPorcentaje: Number(datos.margenPorcentaje) }
    setGuardando(true); setErrorGeneral(null)
    try {
      const respuesta = politica ? await actualizarPoliticaMargen(politica.id, { ...base, activo: politica.activo, version: politica.version, motivo: datos.motivo.trim() }) : await crearPoliticaMargen(base)
      setGuardada(respuesta); onCambiosPendientes(false)
    } catch (actual) {
      if (actual instanceof ErrorApi) { const backend: ErroresPolitica = {}; actual.detalles.forEach((detalle) => { if (detalle.campo in datos) backend[detalle.campo as CampoPolitica] = detalle.mensaje }); setErrores(backend); setErrorGeneral(actual.message) }
      else setErrorGeneral(`No fue posible ${esEdicion ? 'actualizar' : 'registrar'} la política de margen.`)
    } finally { setGuardando(false) }
  }

  if (cargando) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual="Cargando" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando política</h1><p>Consultando la configuración y los productos…</p></div></section>
  if (esEdicion && !politica) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual="Editar política" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible abrir la política</h1><p>{errorGeneral}</p><button type="button" onClick={() => onNavegar('/comercial/politicas-margen')}>Volver al listado</button></div></section>

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-formulario-politica">
      <ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual={esEdicion ? 'Editar política' : 'Nueva política'} onNavegar={onNavegar} />
      <header className={styles.cabeceraPagina}><div><p className={styles.sobretitulo}>Ventas y atención al cliente</p><h1 id="titulo-formulario-politica">{esEdicion ? 'Editar política de margen' : 'Registrar política de margen'}</h1><p>El porcentaje se usa para calcular el precio sugerido sobre el mayor entre costo promedio y costo de reposición.</p></div></header>
      <div className={styles.notaInformativa}><strong>Fórmula vigente</strong><span>Precio sugerido = costo base ÷ (1 − margen / 100). El costo base es el mayor entre costo promedio ponderado y costo de reposición.</span></div>
      {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando}><legend>Definición de la política</legend><p className={styles.descripcionSeccion}>Solo puede existir una política activa para el mismo alcance.</p><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="politica-nombre">Nombre <span aria-hidden="true">*</span></label><input id="politica-nombre" value={datos.nombre} maxLength={120} aria-invalid={Boolean(errores.nombre)} onChange={(evento) => actualizar('nombre', evento.target.value)} />{errores.nombre && <small className={styles.errorCampo}>{errores.nombre}</small>}</div><div className={styles.campo}><label htmlFor="politica-alcance">Alcance <span aria-hidden="true">*</span></label><select id="politica-alcance" value={datos.alcance} onChange={(evento) => { const alcance = evento.target.value as AlcanceMargen; setDatos((actual) => ({ ...actual, alcance, productoId: alcance === 'GENERAL' ? '' : actual.productoId })); setErrores((actual) => ({ ...actual, alcance: undefined, productoId: undefined })) }}><option value="GENERAL">General</option><option value="PRODUCTO">Por producto</option></select></div></div>{datos.alcance === 'PRODUCTO' && <div className={styles.campo}><label htmlFor="politica-productoId">Producto <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="politica-productoId" valor={datos.productoId} opciones={productos.map((producto) => ({ valor: producto.id, etiqueta: `${producto.codigo} — ${producto.nombre}` }))} placeholder="Selecciona el medicamento o producto" invalido={Boolean(errores.productoId)} deshabilitado={guardando} onChange={(valor) => actualizar('productoId', valor)} />{errores.productoId && <small className={styles.errorCampo}>{errores.productoId}</small>}</div>}<div className={styles.campoCorto}><label htmlFor="politica-margenPorcentaje">Margen (%) <span aria-hidden="true">*</span></label><input id="politica-margenPorcentaje" type="number" min="0" max="99.9999" step="0.0001" value={datos.margenPorcentaje} aria-invalid={Boolean(errores.margenPorcentaje)} onChange={(evento) => actualizar('margenPorcentaje', evento.target.value)} />{errores.margenPorcentaje && <small className={styles.errorCampo}>{errores.margenPorcentaje}</small>}<small className={styles.ayudaCampo}>Ejemplo: escribe 25 para un margen de 25%.</small></div></fieldset>
        {esEdicion && <fieldset disabled={guardando}><legend>Justificación</legend><div className={styles.campo}><label htmlFor="politica-motivo">Motivo del cambio <span aria-hidden="true">*</span></label><textarea id="politica-motivo" rows={3} maxLength={500} value={datos.motivo} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => actualizar('motivo', evento.target.value)} />{errores.motivo && <small className={styles.errorCampo}>{errores.motivo}</small>}<small className={styles.ayudaCampo}>El motivo formará parte de la auditoría de la política.</small></div></fieldset>}
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(politica ? `/comercial/politicas-margen/${politica.id}` : '/comercial/politicas-margen')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar política'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo={esEdicion ? 'Política actualizada' : 'Política registrada'} mensaje={guardada ? `${guardada.nombre} quedó guardada correctamente.` : ''} textoAccionPrincipal="Ver política" onAccionPrincipal={() => guardada && onNavegar(`/comercial/politicas-margen/${guardada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/comercial/politicas-margen')} onCerrar={() => guardada && onNavegar(`/comercial/politicas-margen/${guardada.id}`)} />
  </>
}
