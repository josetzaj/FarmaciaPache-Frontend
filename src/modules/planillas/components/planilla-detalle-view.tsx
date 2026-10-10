import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PistaAuditoria } from '../../../shared/auditoria'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarDetallesPlanilla, cerrarPeriodoPlanilla, exportarPeriodoPlanilla, listarAuditoriaPeriodo, obtenerPeriodoPlanilla } from '../planilla-api'
import { centavosATexto, fechaGuatemala, formatearCentavos, periodoTexto, textoACentavos } from '../planilla-formatos'
import type { PeriodoPlanillaDetalle } from '../planilla.types'
import { PlanillaBreadcrumb } from './planilla-breadcrumb'
import styles from './planilla.module.css'

type Props = { periodoId: string; modoEdicion: boolean; permisos: readonly string[]; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
type EdicionDetalle = { monto: string; observacion: string }
type ResultadoOperacion = { tipo: 'exito' | 'advertencia'; titulo: string; mensaje: string }

function crearEdicion(planilla: PeriodoPlanillaDetalle): Record<string, EdicionDetalle> {
  return Object.fromEntries(planilla.detalles.map((detalle) => [detalle.id, { monto: centavosATexto(detalle.montoPagarCentavos), observacion: detalle.observacion ?? '' }]))
}

export function PlanillaDetalleView({ periodoId, modoEdicion, permisos, onNavegar, onCambiosPendientes }: Props) {
  const [planilla, setPlanilla] = useState<PeriodoPlanillaDetalle | null>(null)
  const [edicion, setEdicion] = useState<Record<string, EdicionDetalle>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [resultadoOperacion, setResultadoOperacion] = useState<ResultadoOperacion | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeActualizar = permisos.includes('PLANILLAS.PERIODOS.ACTUALIZAR')
  const puedeCerrar = permisos.includes('PLANILLAS.PERIODOS.CERRAR')
  const puedeExportar = permisos.includes('PLANILLAS.PERIODOS.EXPORTAR')
  const puedeAuditoria = permisos.includes('PLANILLAS.PERIODOS.VER_AUDITORIA')
  const editable = modoEdicion && planilla?.estado === 'BORRADOR' && puedeActualizar

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerPeriodoPlanilla(periodoId, controlador.signal).then((respuesta) => { setPlanilla(respuesta); setEdicion(crearEdicion(respuesta)); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la planilla.') })
    return () => controlador.abort()
  }, [periodoId, revision])

  const tieneCambios = useMemo(() => Boolean(planilla && planilla.detalles.some((detalle) => {
    const actual = edicion[detalle.id]
    return actual && (actual.monto !== centavosATexto(detalle.montoPagarCentavos) || actual.observacion.trim() !== (detalle.observacion ?? ''))
  })), [edicion, planilla])
  useEffect(() => onCambiosPendientes(tieneCambios), [onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const totalVista = useMemo(() => planilla?.detalles.reduce((suma, detalle) => suma + (textoACentavos(edicion[detalle.id]?.monto ?? '') ?? 0), 0) ?? 0, [edicion, planilla])

  const guardar = async () => {
    if (!planilla || !editable) return
    const detalles = []
    for (const detalle of planilla.detalles) {
      const actual = edicion[detalle.id]!
      const monto = textoACentavos(actual.monto)
      if (monto === null || monto < 0) { setError(`Revisa el monto de ${detalle.empleadoNombre}.`); return }
      if (monto !== detalle.salarioBaseCentavos && !actual.observacion.trim()) { setError(`Agrega una observación para justificar el cambio de ${detalle.empleadoNombre}.`); return }
      detalles.push({ id: detalle.id, version: detalle.version, montoPagarCentavos: monto, observacion: actual.observacion.trim() || null })
    }
    setGuardando(true); setError(null)
    try {
      const respuesta = await actualizarDetallesPlanilla(periodoId, { versionPeriodo: planilla.version, detalles })
      setPlanilla(respuesta); setEdicion(crearEdicion(respuesta)); onCambiosPendientes(false); setRevision((valor) => valor + 1); setResultadoOperacion({ tipo: 'exito', titulo: 'Cambios guardados', mensaje: 'Los montos y observaciones quedaron guardados, y el total fue recalculado por el sistema.' })
    } catch (actual) { setError(actual instanceof ErrorApi ? actual.message : 'No fue posible guardar la planilla.') } finally { setGuardando(false) }
  }

  const cerrar = async () => {
    if (!planilla) return
    setGuardando(true); setError(null)
    try {
      const respuesta = await cerrarPeriodoPlanilla(periodoId, planilla.version)
      setPlanilla(respuesta); setEdicion(crearEdicion(respuesta)); setConfirmarCierre(false); setRevision((valor) => valor + 1)
      if (!puedeExportar) {
        setResultadoOperacion({ tipo: 'advertencia', titulo: 'Planilla cerrada', mensaje: 'La planilla quedó cerrada correctamente, pero tu usuario no tiene permiso para descargar la constancia PDF.' })
        return
      }
      try {
        await exportarPeriodoPlanilla(periodoId, 'pdf')
        setResultadoOperacion({ tipo: 'exito', titulo: 'Planilla cerrada', mensaje: 'La planilla quedó cerrada como constancia del gasto mensual y el PDF fue descargado.' })
      } catch (actual) {
        setResultadoOperacion({ tipo: 'advertencia', titulo: 'Planilla cerrada; PDF pendiente', mensaje: actual instanceof ErrorApi ? `La planilla se cerró correctamente, pero no se pudo descargar la constancia: ${actual.message} Puedes intentarlo de nuevo desde el listado.` : 'La planilla se cerró correctamente, pero no se pudo descargar la constancia PDF. Puedes intentarlo de nuevo desde el listado.' })
      }
    } catch (actual) { setConfirmarCierre(false); setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cerrar la planilla.') } finally { setGuardando(false) }
  }

  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarPeriodoPlanilla(periodoId, formato); setRevision((valor) => valor + 1) } catch (actual) { setErrorExportacion(actual instanceof ErrorApi ? actual.message : 'No fue posible exportar la planilla.') }
  }
  const cargarAuditoria = useCallback((parametros: Parameters<typeof listarAuditoriaPeriodo>[1], signal?: AbortSignal) => listarAuditoriaPeriodo(periodoId, parametros, signal), [periodoId])

  if (!planilla) return <main className={styles.pagina}><PlanillaBreadcrumb onNavegar={onNavegar} /><section className={styles.panel}>{error ? <div className={styles.error} role="alert">{error} <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : <p className={styles.mensaje} role="status">Cargando planilla…</p>}</section></main>

  return <>
    <main className={styles.pagina}>
      <PlanillaBreadcrumb actual={`${modoEdicion ? 'Editar ' : ''}${periodoTexto(planilla.anio, planilla.mes)}`} onNavegar={onNavegar} />
      <header className={styles.cabecera}><div><h1>Planilla de {periodoTexto(planilla.anio, planilla.mes)}</h1><p>{planilla.sucursal.codigo} — {planilla.sucursal.nombre} · {planilla.cantidadEmpleados} empleados</p></div><div className={styles.acciones}>{puedeExportar && <BotonExportar onExportar={exportar} />}{modoEdicion && planilla.estado === 'BORRADOR' && puedeCerrar && <button className={styles.botonPeligro} type="button" disabled={guardando || tieneCambios} onClick={() => setConfirmarCierre(true)}>Cerrar planilla</button>}</div></header>
      <div className={styles.totalPrincipal}><span>Total general {tieneCambios ? '(vista previa)' : ''}</span><strong>{formatearCentavos(totalVista)}</strong></div>
      {planilla.estado === 'CERRADA' ? <p className={styles.mensaje}>Planilla cerrada el {planilla.cerradoEn ? fechaGuatemala(planilla.cerradoEn) : 'día registrado'}. Los montos y observaciones están bloqueados.</p> : !modoEdicion ? <p className={styles.aviso}>Esta vista es de solo lectura. Utiliza la acción Editar del listado para modificar o cerrar la planilla.</p> : !editable ? <p className={styles.aviso}>{puedeCerrar ? 'Revisa la información antes de cerrar la planilla. Los montos y observaciones son de solo lectura para tu usuario.' : 'Tu acceso a esta planilla es únicamente de consulta.'}</p> : <p className={styles.aviso}>El cierre registra el gasto mensual. No crea transferencias, cheques, depósitos ni movimientos de caja.</p>}
      {tieneCambios && puedeCerrar && <p className={styles.aviso}>Guarda los cambios antes de cerrar la planilla.</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      <section className={styles.panel} aria-label="Detalle de empleados"><div className={styles.tablaHoja}><table><caption className={styles.soloLectores}>Montos de la planilla por empleado</caption><thead><tr><th scope="col">Empleado</th><th scope="col">Puesto</th><th scope="col">Salario base</th><th scope="col">Monto a pagar</th><th scope="col">Observación</th></tr></thead><tbody>{planilla.detalles.map((detalle) => <tr key={detalle.id}><th scope="row"><span className={styles.identidad}><strong>{detalle.empleadoNombre}</strong><small>{detalle.empleadoCodigo}</small></span></th><td>{detalle.puestoNombre ?? 'Sin puesto'}</td><td className={styles.monto}>{formatearCentavos(detalle.salarioBaseCentavos)}</td><td className={editable ? styles.celdaEditable : styles.monto}>{editable ? <><label className={styles.soloLectores} htmlFor={`monto-${detalle.id}`}>Monto a pagar a {detalle.empleadoNombre}</label><input id={`monto-${detalle.id}`} type="text" inputMode="decimal" value={edicion[detalle.id]?.monto ?? ''} onChange={(evento) => setEdicion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id]!, monto: evento.target.value } }))} /></> : formatearCentavos(detalle.montoPagarCentavos)}</td><td className={editable ? styles.celdaEditable : undefined}>{editable ? <><label className={styles.soloLectores} htmlFor={`observacion-${detalle.id}`}>Observación para {detalle.empleadoNombre}</label><textarea id={`observacion-${detalle.id}`} maxLength={500} value={edicion[detalle.id]?.observacion ?? ''} onChange={(evento) => setEdicion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id]!, observacion: evento.target.value } }))} placeholder="Obligatoria si cambia el monto" /></> : detalle.observacion ?? <span className={styles.datoSecundario}>Sin observación</span>}</td></tr>)}</tbody></table></div>{editable && <div className={styles.acciones}><button className={styles.botonSecundario} type="button" disabled={guardando || !tieneCambios} onClick={() => setEdicion(crearEdicion(planilla))}>Descartar cambios</button><button className={styles.botonPrimario} type="button" disabled={guardando || !tieneCambios} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>}</section>
      {puedeAuditoria && <PistaAuditoria claveEntidad={`planilla-${periodoId}`} descripcion="Generación, cambios, exportaciones y cierre de esta planilla." etiquetasOperacion={{ GENERAR: 'Generó la planilla', ACTUALIZAR_DETALLES: 'Actualizó montos', EXPORTAR: 'Exportó la planilla', CERRAR: 'Cerró la planilla' }} cargarEventos={cargarAuditoria} revision={revision} />}
    </main>
    <ModalEstado abierto={confirmarCierre} tipo="advertencia" titulo="Cerrar planilla" mensaje={<>La planilla de <strong>{periodoTexto(planilla.anio, planilla.mes)}</strong> quedará bloqueada como constancia del gasto mensual por <strong>{formatearCentavos(planilla.totalCentavos)}</strong>. Esta acción no genera pagos ni movimientos de caja.</>} textoAccionPrincipal="Cerrar planilla" varianteAccionPrincipal="peligro" onAccionPrincipal={() => void cerrar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setConfirmarCierre(false)} onCerrar={() => setConfirmarCierre(false)} cargando={guardando} />
    <ModalEstado abierto={Boolean(resultadoOperacion)} tipo={resultadoOperacion?.tipo ?? 'exito'} titulo={resultadoOperacion?.titulo ?? ''} mensaje={resultadoOperacion?.mensaje ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => onNavegar('/planillas')} onCerrar={() => onNavegar('/planillas')} />
    <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
  </>
}
