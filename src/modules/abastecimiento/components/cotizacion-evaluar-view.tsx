import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { evaluarCotizacionCompra, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { CotizacionCompra } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

function monto(valor: number, moneda: string): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(valor)
}

export function CotizacionEvaluarView({ cotizacionId, onNavegar, onCambiosPendientes }: { cotizacionId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [cotizacion, setCotizacion] = useState<CotizacionCompra | null>(null)
  const [puntaje, setPuntaje] = useState('')
  const [seleccionar, setSeleccionar] = useState(false)
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<{ puntaje?: string; justificacion?: string }>({})
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<CotizacionCompra | null>(null)
  const tieneCambios = Boolean(puntaje || justificacion || seleccionar)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<CotizacionCompra>('cotizaciones', cotizacionId, controlador.signal).then((respuesta) => { setCotizacion(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la cotización.') })
    return () => controlador.abort()
  }, [cotizacionId])

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const nuevosErrores: typeof errores = {}
    const puntajeNumero = Number(puntaje)
    if (!Number.isFinite(puntajeNumero) || puntajeNumero < 0 || puntajeNumero > 100) nuevosErrores.puntaje = 'El puntaje debe estar entre 0 y 100.'
    if (justificacion.trim().length < 5 || justificacion.trim().length > 1000) nuevosErrores.justificacion = 'La justificación debe contener de 5 a 1000 caracteres.'
    if (Object.keys(nuevosErrores).length) {
      setErrores(nuevosErrores)
      document.getElementById(`cotizacion-${Object.keys(nuevosErrores)[0]}`)?.focus()
      return
    }
    if (!cotizacion) return
    setGuardando(true)
    setError(null)
    try {
      const respuesta = await evaluarCotizacionCompra(cotizacion.id, { version: cotizacion.version, puntaje: puntajeNumero, seleccionar, justificacion: justificacion.trim() })
      setGuardado(respuesta)
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible evaluar la cotización.')
    } finally {
      setGuardando(false)
    }
  }

  if (!cotizacion && !error) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="cotizaciones" actual="Evaluar cotización" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando cotización</h1><p>Consultando la versión vigente de la oferta…</p></div></section>
  const accionDisponible = cotizacion?.estado === 'REGISTRADA'

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-evaluar-cotizacion">
        <AbastecimientoBreadcrumb recurso="cotizaciones" actual="Evaluar cotización" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Cotización {cotizacion?.numeroProveedor ?? ''}</p><h1 id="titulo-evaluar-cotizacion">Evaluar cotización</h1><p>La evaluación es independiente del registro. Seleccionar esta oferta adjudica la solicitud y descarta las demás cotizaciones relacionadas.</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        {cotizacion && !accionDisponible && <div className={styles.alertaAdvertencia} role="status">La cotización está {etiquetaCodigo(cotizacion.estado).toLowerCase()} y ya no admite evaluación.</div>}
        {cotizacion && <form className={styles.formulario} noValidate onSubmit={enviar}>
          <section className={styles.resumenDocumento} aria-label="Resumen de la cotización"><div><span>Proveedor</span><strong>{cotizacion.proveedor?.nombre ?? 'Proveedor relacionado'}</strong></div><div><span>Oferta</span><strong>{cotizacion.numeroProveedor}</strong></div><div><span>Total</span><strong>{monto(cotizacion.total, cotizacion.moneda)}</strong></div><div><span>Total en GTQ</span><strong>{monto(cotizacion.totalGtq, 'GTQ')}</strong></div></section>
          <fieldset disabled={guardando || !accionDisponible}>
            <legend>Decisión comercial</legend>
            <div className={styles.campo}><label htmlFor="cotizacion-puntaje">Puntaje <span aria-hidden="true">*</span></label><input id="cotizacion-puntaje" type="number" min="0" max="100" step="0.01" value={puntaje} aria-invalid={Boolean(errores.puntaje)} aria-describedby={errores.puntaje ? 'cotizacion-puntaje-error' : 'cotizacion-puntaje-ayuda'} onChange={(evento) => { setPuntaje(evento.target.value); setErrores((actual) => ({ ...actual, puntaje: undefined })) }} />{errores.puntaje ? <small id="cotizacion-puntaje-error" className={styles.errorCampo}>{errores.puntaje}</small> : <small id="cotizacion-puntaje-ayuda" className={styles.ayudaCampo}>Valor de 0 a 100 según evaluación técnica, comercial, temporal y de riesgo.</small>}</div>
            <div className={styles.opcionesDecision} role="radiogroup" aria-label="Resultado de la evaluación"><label className={!seleccionar ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="seleccion" checked={!seleccionar} onChange={() => setSeleccionar(false)} /><span><strong>Evaluar sin seleccionar</strong><small>Conserva el resultado como oferta evaluada y finaliza su evaluación.</small></span></label><label className={seleccionar ? styles.decisionSeleccionada : styles.decision}><input type="radio" name="seleccion" checked={seleccionar} onChange={() => setSeleccionar(true)} /><span><strong>Seleccionar esta oferta</strong><small>Adjudica la solicitud y descarta sus demás cotizaciones.</small></span></label></div>
            <div className={styles.campo}><label htmlFor="cotizacion-justificacion">Justificación <span aria-hidden="true">*</span></label><textarea id="cotizacion-justificacion" rows={6} maxLength={1000} value={justificacion} aria-invalid={Boolean(errores.justificacion)} aria-describedby={errores.justificacion ? 'cotizacion-justificacion-error' : 'cotizacion-justificacion-ayuda'} onChange={(evento) => { setJustificacion(evento.target.value); setErrores((actual) => ({ ...actual, justificacion: undefined })) }} />{errores.justificacion ? <small id="cotizacion-justificacion-error" className={styles.errorCampo}>{errores.justificacion}</small> : <small id="cotizacion-justificacion-ayuda" className={styles.ayudaCampo}>Explica precio, plazo, cumplimiento técnico, riesgo y fundamento de la decisión.</small>}</div>
          </fieldset>
          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(`/abastecimiento/cotizaciones/${cotizacion.id}`)}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !accionDisponible}><IconoAccion nombre="estado" />{guardando ? 'Procesando evaluación…' : seleccionar ? 'Evaluar y seleccionar' : 'Registrar evaluación'}</button></div></div>
        </form>}
      </section>
      <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo={seleccionar ? 'Cotización seleccionada' : 'Cotización evaluada'} mensaje={guardado ? `La cotización ${guardado.numeroProveedor} ahora está ${etiquetaCodigo(guardado.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver cotización" onAccionPrincipal={() => onNavegar(`/abastecimiento/cotizaciones/${cotizacionId}`)} onCerrar={() => onNavegar(`/abastecimiento/cotizaciones/${cotizacionId}`)} />
    </>
  )
}
