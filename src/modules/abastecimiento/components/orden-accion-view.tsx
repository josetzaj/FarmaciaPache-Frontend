import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { cancelarOrdenCompra, cerrarOrdenCompra, confirmarOrdenCompra, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { OrdenCompra } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type ModoOrden = 'confirmar' | 'cerrar' | 'cancelar'

const titulos: Record<ModoOrden, string> = { confirmar: 'Confirmar proveedor', cerrar: 'Cerrar orden', cancelar: 'Cancelar orden' }

export function OrdenAccionView({ ordenId, modo, onNavegar, onCambiosPendientes }: { ordenId: string; modo: ModoOrden; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [orden, setOrden] = useState<OrdenCompra | null>(null)
  const [motivo, setMotivo] = useState('')
  const [documentosCompletos, setDocumentosCompletos] = useState(false)
  const [validacionFinanciera, setValidacionFinanciera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<OrdenCompra | null>(null)
  const tieneCambios = Boolean(motivo || documentosCompletos || validacionFinanciera)

  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<OrdenCompra>('ordenes', ordenId, controlador.signal).then(setOrden).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la orden.') })
    return () => controlador.abort()
  }, [ordenId])

  const disponible = Boolean(orden && (modo === 'confirmar' ? orden.estado === 'EMITIDA' : modo === 'cerrar' ? orden.estado === 'RECIBIDA' : ['EMITIDA', 'CONFIRMADA_PROVEEDOR', 'RECEPCION_PARCIAL'].includes(orden.estado)))
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (motivo.trim().length < 5 || motivo.trim().length > 500) { setErrorMotivo('El motivo debe contener de 5 a 500 caracteres.'); document.getElementById('orden-motivo-accion')?.focus(); return }
    if (!orden || !disponible) return
    if (modo === 'cerrar' && (!documentosCompletos || !validacionFinanciera)) { setError('Debes confirmar que la documentación está completa y que la validación financiera fue realizada.'); return }
    setGuardando(true); setError(null)
    try {
      const datos = { version: orden.version, motivo: motivo.trim() }
      const respuesta = modo === 'confirmar' ? await confirmarOrdenCompra(orden.id, datos) : modo === 'cerrar' ? await cerrarOrdenCompra(orden.id, { ...datos, documentosCompletos, validacionFinanciera }) : await cancelarOrdenCompra(orden.id, datos)
      setGuardada(respuesta); onCambiosPendientes(false)
    } catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la acción.') } finally { setGuardando(false) }
  }

  if (!orden && !error) return <section className={styles.pagina} aria-busy="true"><AbastecimientoBreadcrumb recurso="ordenes" actual={titulos[modo]} onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando orden</h1><p>Consultando la versión vigente…</p></div></section>
  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-accion-orden">
        <AbastecimientoBreadcrumb recurso="ordenes" actual={titulos[modo]} onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Orden {orden?.numero ?? ''}</p><h1 id="titulo-accion-orden">{titulos[modo]}</h1><p>{modo === 'confirmar' ? 'Registra la confirmación expresa del proveedor y conserva su fundamento.' : modo === 'cerrar' ? 'El cierre exige recepción completa, documentos regularizados y validación financiera.' : 'La cancelación conserva las recepciones previas y el motivo de la decisión.'}</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        {orden && !disponible && <div className={styles.alertaAdvertencia} role="status">La orden está {etiquetaCodigo(orden.estado).toLowerCase()} y no admite esta acción.</div>}
        {orden && <form className={styles.formulario} noValidate onSubmit={enviar}>
          <section className={styles.resumenDocumento} aria-label="Resumen de la orden"><div><span>Estado actual</span><strong>{etiquetaCodigo(orden.estado)}</strong></div><div><span>Proveedor</span><strong>{orden.proveedor?.nombre ?? 'Relacionado'}</strong></div><div><span>Destino</span><strong>{orden.tipoDestino === 'CLIENTE' ? 'Entrega directa' : orden.sucursalDestino?.nombre ?? 'Sucursal'}</strong></div><div><span>Productos</span><strong>{orden.detalles.length}</strong></div></section>
          <fieldset disabled={guardando || !disponible}>
            <legend>Confirmación trazable</legend>
            {modo === 'cerrar' && <div className={styles.opcionesDecision}><label className={documentosCompletos ? styles.decisionSeleccionada : styles.decision}><input type="checkbox" checked={documentosCompletos} onChange={(evento) => setDocumentosCompletos(evento.target.checked)} /><span><strong>Documentación completa</strong><small>No existen recepciones con documentos pendientes.</small></span></label><label className={validacionFinanciera ? styles.decisionSeleccionada : styles.decision}><input type="checkbox" checked={validacionFinanciera} onChange={(evento) => setValidacionFinanciera(evento.target.checked)} /><span><strong>Validación financiera realizada</strong><small>La orden fue conciliada con el proceso de pago correspondiente.</small></span></label></div>}
            <div className={styles.campo}><label htmlFor="orden-motivo-accion">Motivo <span aria-hidden="true">*</span></label><textarea id="orden-motivo-accion" rows={6} maxLength={500} value={motivo} aria-invalid={Boolean(errorMotivo)} onChange={(evento) => { setMotivo(evento.target.value); setErrorMotivo(null) }} /><small className={errorMotivo ? styles.errorCampo : styles.ayudaCampo}>{errorMotivo ?? 'Describe la evidencia o fundamento de esta acción.'}</small></div>
          </fieldset>
          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(`/abastecimiento/ordenes/${orden.id}`)}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={modo === 'cancelar' ? styles.botonPeligro : styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre={modo === 'cancelar' ? 'desactivar' : 'guardar'} />{guardando ? 'Procesando…' : titulos[modo]}</button></div></div>
        </form>}
      </section>
      <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo="Orden actualizada" mensaje={guardada ? `La orden ${guardada.numero} ahora está ${etiquetaCodigo(guardada.estado).toLowerCase()}.` : ''} textoAccionPrincipal="Ver orden" onAccionPrincipal={() => onNavegar(`/abastecimiento/ordenes/${ordenId}`)} onCerrar={() => onNavegar(`/abastecimiento/ordenes/${ordenId}`)} />
    </>
  )
}
