import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import type { VentaComercial } from '../../comercial/comercial.types'
import { ReciboVentaModal, type DatosPagoRecibo } from '../../comercial/components/recibo-venta-modal'
import { VentaDetalleTablas } from '../../comercial/components/venta-detalle-tablas'
import { CobrarVentaModal, type ResultadoCobroVenta } from '../../comercial/components/venta-caja-modales'
import { obtenerTurnoVentasActualCaja, obtenerVentaPendienteCaja } from '../caja-api'
import { formatearCentavos } from '../caja-formatos'
import type { TurnoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

const moneda = (valor: number | undefined) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor ?? 0)
const fecha = (valor: string | null | undefined) => valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) : 'No aplica'

export function VentaPendienteCobroDetalleView({ ventaId, modoCobro, permisos, onNavegar }: { ventaId: string; modoCobro: boolean; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [venta, setVenta] = useState<VentaComercial | null>(null)
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [cobrar, setCobrar] = useState(false)
  const [recibo, setRecibo] = useState<{ venta: VentaComercial; pago: DatosPagoRecibo } | null>(null)
  const [retiroPendiente, setRetiroPendiente] = useState<{ turnoId: string; montoCentavos: number } | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([obtenerVentaPendienteCaja(ventaId, controlador.signal), obtenerTurnoVentasActualCaja(controlador.signal)])
      .then(([ventaActual, turnoActual]) => { setVenta(ventaActual); setTurno(turnoActual); setError(null) })
      .catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la venta pendiente.') })
    return () => controlador.abort()
  }, [revision, ventaId])

  if (error) return <section className={styles.pagina}><CajaBreadcrumb seccion="Cobros pendientes" actual="Detalle" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible cargar la venta</h1><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!venta || turno === undefined) return <section className={styles.pagina} aria-busy="true"><CajaBreadcrumb seccion="Cobros pendientes" actual="Detalle" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando cobro pendiente</h1><p>Consultando el detalle y el turno de caja actual…</p></div></section>

  const completarCobro = (resultado: ResultadoCobroVenta) => {
    setCobrar(false)
    setVenta(resultado.venta)
    setRecibo({ venta: resultado.venta, pago: resultado })
    if (resultado.requiereRetiro) setRetiroPendiente({ turnoId: resultado.turno.id, montoCentavos: resultado.montoRetiroSugeridoCentavos })
  }

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-venta-pendiente">
      <CajaBreadcrumb seccion="Cobros pendientes" actual={modoCobro ? 'Cobrar venta' : 'Detalle'} onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>{venta.sucursal ? `${venta.sucursal.codigo} — ${venta.sucursal.nombre}` : 'Sucursal no disponible'}</p><h1 id="titulo-venta-pendiente">{venta.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${styles.estadoAdvertencia}`}>Pendiente de cobro</span></div></div></header>
      {!turno && <div className={styles.alertaAdvertencia} role="alert"><p><strong>Falta abrir tu caja.</strong> Para confirmar el cobro necesitas un turno abierto o reabierto, a tu nombre, en una caja de Ventas de esta sucursal.</p><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/caja/turnos/nuevo')}>Abrir turno de caja</button></div>}
      {turno && <div className={styles.alertaInformativa}><p><strong>Turno disponible:</strong> {turno.numero} · {turno.caja?.nombre ?? 'Caja de ventas'} · {turno.responsableNombre}</p></div>}
      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Comprador y datos fiscales</h2><dl><div className={styles.datoCompleto}><dt>Cliente</dt><dd>{venta.cliente}</dd></div><div><dt>Identificación</dt><dd>{venta.tipoIdentificacionFiscal}: {venta.identificacionFiscal}</dd></div><div><dt>Estado fiscal</dt><dd>{venta.estadoFiscal}</dd></div><div className={styles.datoCompleto}><dt>Dirección</dt><dd>{venta.direccionFiscal || 'No registrada'}</dd></div>{venta.pacienteNombre && <><div><dt>Paciente</dt><dd>{venta.pacienteNombre}</dd></div><div><dt>Identificación del paciente</dt><dd>{venta.pacienteIdentificacion}</dd></div></>}</dl></article>
        <article className={styles.tarjetaDetalle}><h2>Resumen del cobro</h2><dl><div><dt>Subtotal</dt><dd>{moneda(venta.subtotal)}</dd></div><div><dt>IVA incluido</dt><dd>{moneda(venta.impuesto)}</dd></div><div><dt>Total</dt><dd><strong>{moneda(venta.total)}</strong></dd></div><div><dt>Pago</dt><dd>Pendiente</dd></div><div><dt>Dispensación</dt><dd>Pendiente</dd></div><div><dt>Creada</dt><dd>{fecha(venta.creadoEn)}</dd></div></dl></article>
      </div>
      <VentaDetalleTablas venta={venta} permisos={permisos} onNavegar={onNavegar} />
      <div className={styles.accionesFormulario}><p>{modoCobro ? 'Al confirmar, Caja registrará el efectivo e Inventario descontará los productos en una sola operación.' : 'Revisa el detalle antes de continuar al cobro.'}</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/caja/ventas-pendientes')}>Volver a pendientes</button>{modoCobro ? <button className={styles.botonPrincipal} type="button" disabled={!turno} onClick={() => setCobrar(true)}><IconoAccion nombre="cobrar" />Confirmar cobro</button> : <button className={styles.botonPrincipal} type="button" onClick={() => onNavegar(`/caja/ventas-pendientes/${venta.id}/cobrar`)}><IconoAccion nombre="cobrar" />Cobrar venta</button>}</div></div>
    </section>
    {cobrar && <CobrarVentaModal abierto venta={venta} onCerrar={() => setCobrar(false)} onCobrada={completarCobro} />}
    {recibo && <ReciboVentaModal abierto venta={recibo.venta} pago={recibo.pago} onCerrar={() => { setRecibo(null); if (!retiroPendiente) onNavegar('/caja/ventas-pendientes') }} />}
    <ModalEstado abierto={Boolean(retiroPendiente && !recibo)} tipo="advertencia" titulo="Retiro de efectivo requerido" mensaje={retiroPendiente ? `Este cobro alcanzó el umbral de la caja. Registra una transferencia por ${formatearCentavos(retiroPendiente.montoCentavos)} para dejar el fondo base antes del siguiente cobro.` : ''} textoAccionPrincipal="Registrar transferencia" onAccionPrincipal={() => retiroPendiente && onNavegar(`/caja/transferencias/nueva?turnoId=${encodeURIComponent(retiroPendiente.turnoId)}`)} textoAccionSecundaria="Volver a pendientes" onAccionSecundaria={() => onNavegar('/caja/ventas-pendientes')} onCerrar={() => onNavegar('/caja/ventas-pendientes')} />
  </>
}
