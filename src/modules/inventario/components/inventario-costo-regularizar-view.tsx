import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerPosicionCostoInventario, registrarRegularizacionCostoInventario } from '../inventario-api'
import type { OperacionInventario, PosicionCostoInventario } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(valor)
const numero = (valor: number) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)

export function InventarioCostoRegularizarView({ saldoId, permisos, onNavegar, onCambiosPendientes }: { saldoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [posicion, setPosicion] = useState<PosicionCostoInventario | null>(null)
  const [referencia, setReferencia] = useState('')
  const [costo, setCosto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [operacion, setOperacion] = useState<OperacionInventario | null>(null)
  const hayCambios = Boolean(referencia || costo || motivo || evidencia)

  useEffect(() => { const controlador = new AbortController(); void obtenerPosicionCostoInventario(saldoId, controlador.signal).then((respuesta) => { setPosicion(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la posición de inventario.') }); return () => controlador.abort() }, [saldoId])
  useEffect(() => { onCambiosPendientes(!operacion && hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes, operacion])

  const validar = () => {
    const siguientes: Record<string, string> = {}
    const valorCosto = Number(costo)
    if (referencia.trim().length < 3 || referencia.trim().length > 100) siguientes.referencia = 'La referencia debe contener de 3 a 100 caracteres.'
    if (!/^\d+(?:\.\d{1,6})?$/.test(costo.trim()) || !Number.isFinite(valorCosto) || valorCosto <= 0) siguientes.costo = 'Ingresa un costo mayor que cero, con máximo seis decimales.'
    else if (posicion?.costoUnitario != null && Math.abs(posicion.costoUnitario - valorCosto) < 0.000001) siguientes.costo = 'El costo nuevo debe ser diferente del vigente.'
    if (motivo.trim().length < 10 || motivo.trim().length > 500) siguientes.motivo = 'El motivo debe contener de 10 a 500 caracteres.'
    if (evidencia.trim().length < 3 || evidencia.trim().length > 500) siguientes.evidencia = 'La evidencia debe contener de 3 a 500 caracteres.'
    setErrores(siguientes)
    return Object.keys(siguientes).length === 0
  }

  const enviar = (evento: FormEvent) => { evento.preventDefault(); if (validar()) setConfirmando(true) }
  const registrar = async () => {
    if (!posicion) return
    setGuardando(true); setError(null)
    try {
      const resultado = await registrarRegularizacionCostoInventario({ saldoId: posicion.saldoId, version: posicion.version, referencia: referencia.trim().toUpperCase(), costoUnitario: Number(costo), motivo: motivo.trim(), evidenciaReferencia: evidencia.trim() })
      setOperacion(resultado); setConfirmando(false); onCambiosPendientes(false)
    } catch (errorActual) { setConfirmando(false); setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible regularizar el costo.') } finally { setGuardando(false) }
  }

  if (!posicion && !error) return <section className={styles.pagina} aria-busy="true"><InventarioBreadcrumb anterior={{ etiqueta: 'Regularización de costos', ruta: '/inventario/costos' }} actual="Regularizar costo" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando posición</h1></div></section>
  return <><section className={styles.pagina} aria-labelledby="titulo-regularizar-costo">
    <header className={styles.cabecera}><InventarioBreadcrumb anterior={{ etiqueta: 'Regularización de costos', ruta: '/inventario/costos' }} actual="Regularizar costo" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-regularizar-costo">Regularizar costo unitario</h1></div></header>
    <div className={styles.alertaAdvertencia} role="note"><p>La cantidad física permanecerá igual. El nuevo costo generará una revisión pendiente en Precios, pero el precio público solo cambiará cuando una propuesta sea aprobada.</p></div>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p></div>}
    {posicion && <form className={styles.formularioOperacion} noValidate onSubmit={enviar}>
      <fieldset disabled={guardando || Boolean(operacion)}><legend>Posición seleccionada</legend><div className={styles.grillaFormulario}><div className={styles.campo}><label>Sucursal</label><input value={`${posicion.sucursal.codigo} — ${posicion.sucursal.nombre}`} readOnly /></div><div className={styles.campo}><label>Medicamento</label><input value={`${posicion.producto.codigo} — ${posicion.producto.nombre}`} readOnly /></div><div className={styles.campo}><label>Ubicación</label><input value={`${posicion.ubicacion.codigo} — ${posicion.ubicacion.nombre}`} readOnly /></div><div className={styles.campo}><label>Lote</label><input value={posicion.lote?.numero ?? 'Sin lote'} readOnly /></div><div className={styles.campo}><label>Estado</label><input value={posicion.estado.replaceAll('_', ' ')} readOnly /></div><div className={styles.campo}><label>Cantidad física</label><input value={numero(posicion.cantidad)} readOnly /></div><div className={styles.campo}><label>Costo vigente</label><input value={posicion.costoUnitario === null ? 'Sin costo' : moneda(posicion.costoUnitario)} readOnly /></div></div></fieldset>
      <fieldset disabled={guardando || Boolean(operacion)}><legend>Nuevo costo y respaldo administrativo</legend><div className={styles.grillaFormulario}><div className={styles.campo}><label htmlFor="regularizacion-referencia">Referencia *</label><input id="regularizacion-referencia" value={referencia} maxLength={100} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setReferencia(evento.target.value.toUpperCase())} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div><div className={styles.campo}><label htmlFor="regularizacion-costo">Nuevo costo unitario (Q) *</label><input id="regularizacion-costo" type="number" min="0.000001" step="0.000001" value={costo} aria-invalid={Boolean(errores.costo)} onChange={(evento) => setCosto(evento.target.value)} />{errores.costo && <span className={styles.campoError}>{errores.costo}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="regularizacion-motivo">Motivo *</label><textarea id="regularizacion-motivo" value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="regularizacion-evidencia">Evidencia *</label><input id="regularizacion-evidencia" value={evidencia} maxLength={500} placeholder="Factura, acta, expediente o enlace interno" aria-invalid={Boolean(errores.evidencia)} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <span className={styles.campoError}>{errores.evidencia}</span>}</div></div></fieldset>
      <div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/costos')}>Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(operacion)}><IconoAccion nombre="guardar" />Revisar y regularizar</button></div>
    </form>}
    {operacion && permisos.includes('INVENTARIO.COSTOS.VER_AUDITORIA') && <InventarioAuditoria tipo="costo" entidadId={operacion.id} titulo={`Regularización ${operacion.referencia} confirmada.`} />}
  </section>
  <ModalEstado abierto={confirmando} tipo="advertencia" titulo="Confirmar regularización de costo" mensaje={posicion ? `Esta acción modificará el costo del inventario, no la cantidad. La cantidad de ${posicion.producto.nombre} permanecerá en ${numero(posicion.cantidad)} y su costo pasará de ${posicion.costoUnitario === null ? 'sin costo' : moneda(posicion.costoUnitario)} a ${costo ? moneda(Number(costo)) : 'Q 0.00'}.` : ''} textoAccionPrincipal={guardando ? 'Registrando…' : 'Confirmar regularización'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void registrar()} textoAccionSecundaria="Seguir revisando" onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={guardando} />
  <ModalEstado abierto={Boolean(operacion)} tipo="exito" titulo="Costo regularizado" mensaje={operacion ? `La operación ${operacion.referencia} conservó la cantidad física y dejó el producto pendiente de revisión de precio.` : ''} textoAccionPrincipal="Ir a revisión de precio" onAccionPrincipal={() => posicion && onNavegar(`/comercial/precios/nuevo?productoId=${posicion.producto.id}`)} textoAccionSecundaria="Volver a costos" onAccionSecundaria={() => onNavegar('/inventario/costos')} onCerrar={() => onNavegar('/inventario/costos')} />
  </>
}
