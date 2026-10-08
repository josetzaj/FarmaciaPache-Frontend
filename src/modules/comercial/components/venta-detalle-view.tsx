import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { anularVenta, obtenerVenta, prepararVentaParaCobro } from '../comercial-api'
import type { EstadoVenta, VentaComercial } from '../comercial.types'
import { AccionConMotivoModal } from './accion-con-motivo-modal'
import { ComercialAuditoria } from './comercial-auditoria'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'
import { ReciboVentaModal, type DatosPagoRecibo } from './recibo-venta-modal'
import { AnularVentaCobradaModal, CobrarVentaModal, type ResultadoCobroVenta } from './venta-caja-modales'
import { VentaDetalleTablas } from './venta-detalle-tablas'

const etiquetas: Record<EstadoVenta, string> = { BORRADOR: 'Borrador', PENDIENTE_RECETA: 'Pendiente de receta', LISTA_PARA_COBRO: 'Lista para cobro', CONFIRMADA: 'Confirmada', ANULADA: 'Anulada' }
const moneda = (valor: number | undefined) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor ?? 0)
const fecha = (valor: string | null | undefined) => valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) : 'No aplica'
const claseEstado = (estado: EstadoVenta) => estado === 'CONFIRMADA' ? styles.estadoActivo : estado === 'ANULADA' ? styles.estadoPeligro : ['PENDIENTE_RECETA', 'LISTA_PARA_COBRO'].includes(estado) ? styles.estadoAdvertencia : styles.estadoInactivo

export function VentaDetalleView({ ventaId, permisos, onNavegar }: { ventaId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [venta, setVenta] = useState<VentaComercial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [accion, setAccion] = useState<'preparar' | 'anular' | null>(null)
  const [accionCaja, setAccionCaja] = useState<'cobrar' | 'anular' | null>(null)
  const [recibo, setRecibo] = useState<{ venta: VentaComercial; pago?: DatosPagoRecibo } | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerVenta(ventaId, controlador.signal).then((actual) => { setVenta(actual); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la venta.') })
    return () => controlador.abort()
  }, [revision, ventaId])
  if (error) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual="Detalle de venta" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible cargar la venta</h1><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!venta) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual="Detalle de venta" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando venta</h1><p>Consultando detalle, productos y trazabilidad…</p></div></section>
  const editable = ['BORRADOR', 'PENDIENTE_RECETA'].includes(venta.estado)
  const confirmarAccion = async (motivo: string) => {
    const actualizada = accion === 'preparar' ? await prepararVentaParaCobro(venta.id, venta.version, motivo) : await anularVenta(venta.id, venta.version, motivo)
    setVenta(actualizada); setAccion(null); setMensaje(accion === 'preparar' ? 'La venta quedó lista para que Caja registre el cobro.' : 'La venta quedó anulada.'); setRevision((valor) => valor + 1)
  }
  const ventaCobrada = (resultado: ResultadoCobroVenta) => {
    setVenta(resultado.venta)
    setAccionCaja(null)
    setRecibo({ venta: resultado.venta, pago: resultado })
    setRevision((valor) => valor + 1)
  }
  const ventaCobradaAnulada = (actualizada: VentaComercial) => {
    setVenta(actualizada)
    setAccionCaja(null)
    setMensaje('La venta cobrada quedó anulada; Caja registró el reintegro e Inventario repuso los lotes dispensados.')
    setRevision((valor) => valor + 1)
  }
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-detalle-venta">
      <ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual="Detalle de venta" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div>
          <p className={styles.sobretitulo}>{venta.sucursal ? `${venta.sucursal.codigo} — ${venta.sucursal.nombre}` : 'Sucursal no disponible'}</p>
          <h1 id="titulo-detalle-venta">{venta.numero}</h1>
          <span className={`${styles.estado} ${claseEstado(venta.estado)}`}>{etiquetas[venta.estado]}</span>
        </div>
        <div className={styles.accionesCabecera}>
          {editable && permisos.includes('COMERCIAL.VENTAS.ACTUALIZAR') && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/ventas/${venta.id}/editar`)}><IconoAccion nombre="editar" />Editar información</button>}
          {editable && permisos.includes('COMERCIAL.VENTAS.PREPARAR_COBRO') && <button className={styles.botonEstado} type="button" onClick={() => setAccion('preparar')}><IconoAccion nombre="enviar" />Preparar cobro</button>}
          {venta.estado === 'LISTA_PARA_COBRO' && permisos.includes('CAJA.VENTAS.COBRAR') && <button className={styles.botonPrincipal} type="button" onClick={() => setAccionCaja('cobrar')}><IconoAccion nombre="guardar" />Cobrar</button>}
          {venta.estado === 'CONFIRMADA' && <button className={styles.botonSecundario} type="button" onClick={() => setRecibo({ venta })}><IconoAccion nombre="enviar" />Ver comprobante</button>}
          {venta.estado === 'CONFIRMADA' && permisos.includes('CAJA.VENTAS.ANULAR') && <button className={styles.botonPeligro} type="button" onClick={() => setAccionCaja('anular')}><IconoAccion nombre="cancelar" />Anular venta cobrada</button>}
          {venta.estado !== 'CONFIRMADA' && venta.estado !== 'ANULADA' && permisos.includes('COMERCIAL.VENTAS.ANULAR') && <button className={styles.botonPeligro} type="button" onClick={() => setAccion('anular')}><IconoAccion nombre="cancelar" />Anular venta</button>}
        </div>
      </header>
      {venta.estado === 'LISTA_PARA_COBRO' && <div className={styles.notaInformativa}><strong>Lista para cobrar</strong><span>{permisos.includes('CAJA.VENTAS.COBRAR') ? 'Usa el botón Cobrar para registrar el efectivo, calcular el cambio y ejecutar la dispensación.' : 'La venta ya no se edita aquí. Un usuario con permiso de Caja debe registrar el pago para confirmarla.'}</span></div>}
      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Comprador y fiscal</h2><dl><div className={styles.datoCompleto}><dt>Cliente</dt><dd>{venta.cliente}</dd></div><div><dt>Identificación</dt><dd>{venta.tipoIdentificacionFiscal}: {venta.identificacionFiscal}</dd></div><div><dt>Estado fiscal</dt><dd>{venta.estadoFiscal}</dd></div><div className={styles.datoCompleto}><dt>Dirección</dt><dd>{venta.direccionFiscal || 'No registrada'}</dd></div>{venta.pacienteNombre && <><div><dt>Paciente</dt><dd>{venta.pacienteNombre}</dd></div><div><dt>Identificación del paciente</dt><dd>{venta.pacienteIdentificacion}</dd></div></>}</dl></article>
        <article className={styles.tarjetaDetalle}><h2>Totales y estados</h2><dl><div><dt>Subtotal</dt><dd>{moneda(venta.subtotal)}</dd></div><div><dt>IVA incluido</dt><dd>{moneda(venta.impuesto)}</dd></div><div><dt>Total</dt><dd><strong>{moneda(venta.total)}</strong></dd></div><div><dt>Pago</dt><dd>{venta.estadoPago}</dd></div><div><dt>Dispensación</dt><dd>{venta.estadoDispensacion}</dd></div><div><dt>Creada</dt><dd>{fecha(venta.creadoEn)}</dd></div></dl></article>
      </div>
      <VentaDetalleTablas venta={venta} permisos={permisos} onNavegar={onNavegar} />
      {venta.motivoAnulacion && <div className={styles.alertaAdvertencia}><strong>Motivo de anulación:</strong> {venta.motivoAnulacion}</div>}
      {permisos.includes('COMERCIAL.VENTAS.VER_AUDITORIA') && permisos.includes('COMERCIAL.VENTAS.VER') && <ComercialAuditoria recurso="ventas" entidadId={venta.id} revision={revision} />}
    </section>
    <AccionConMotivoModal abierto={Boolean(accion)} titulo={accion === 'preparar' ? 'Preparar venta para cobro' : 'Anular venta'} mensaje={accion === 'preparar' ? 'Se verificarán recetas, precios vigentes y existencias. Después la venta quedará disponible para Caja.' : 'La venta dejará de estar disponible para cobro, pero conservará todo su historial.'} textoAccion={accion === 'preparar' ? 'Preparar cobro' : 'Anular venta'} peligrosa={accion === 'anular'} onCerrar={() => setAccion(null)} onConfirmar={confirmarAccion} />
    {accionCaja === 'cobrar' && <CobrarVentaModal abierto venta={venta} onCerrar={() => setAccionCaja(null)} onCobrada={ventaCobrada} />}
    {accionCaja === 'anular' && <AnularVentaCobradaModal abierto venta={venta} onCerrar={() => setAccionCaja(null)} onAnulada={ventaCobradaAnulada} />}
    {recibo && <ReciboVentaModal abierto venta={recibo.venta} pago={recibo.pago} onCerrar={() => setRecibo(null)} />}
    <ModalEstado abierto={Boolean(mensaje)} tipo="exito" titulo="Operación completada" mensaje={mensaje ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />
  </>
}
