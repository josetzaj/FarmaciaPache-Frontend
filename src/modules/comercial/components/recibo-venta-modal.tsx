import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { formatearCentavos } from '../../caja/caja-formatos'
import type { MovimientoCaja, TurnoCaja } from '../../caja/caja.types'
import type { VentaComercial } from '../comercial.types'
import styles from './comercial.module.css'

const fechaHora = (valor: string | null | undefined) => valor
  ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
  : 'No disponible'

const centavos = (valor: number | undefined) => Math.round((valor ?? 0) * 100)

export type DatosPagoRecibo = {
  movimiento?: MovimientoCaja
  turno?: TurnoCaja
  recibidoCentavos?: number
  cambioCentavos?: number
}

export function ReciboVentaModal({ abierto, venta, pago, onCerrar }: {
  abierto: boolean
  venta: VentaComercial
  pago?: DatosPagoRecibo | null
  onCerrar: () => void
}) {
  return <ModalEstado
    abierto={abierto}
    tipo="exito"
    ancho="amplio"
    titulo="Comprobante de venta"
    mensaje={<article className={styles.reciboComprobante} aria-label={`Comprobante de la venta ${venta.numero}`}>
      <header className={styles.reciboCabecera}>
        <div>
          <p className={styles.reciboMarca}>Farmacia Pache</p>
          <h3>Comprobante interno de venta</h3>
          <p>{venta.sucursal ? `${venta.sucursal.codigo} · ${venta.sucursal.nombre}` : 'Sucursal no disponible'}</p>
        </div>
        <div className={styles.reciboNumero}>
          <span>Venta</span>
          <strong>{venta.numero}</strong>
          <small>{fechaHora(venta.confirmadaEn)}</small>
        </div>
      </header>

      <dl className={styles.reciboDatos}>
        <div><dt>Cliente</dt><dd>{venta.cliente}</dd></div>
        <div><dt>Identificación</dt><dd>{venta.tipoIdentificacionFiscal}: {venta.identificacionFiscal}</dd></div>
        <div><dt>Forma de pago</dt><dd>Efectivo</dd></div>
        <div><dt>Movimiento de caja</dt><dd>{pago?.movimiento?.numero ?? venta.cajaReferenciaId ?? 'Registrado'}</dd></div>
        {pago?.turno && <div><dt>Turno</dt><dd>{pago.turno.numero} · {pago.turno.caja?.nombre ?? 'Caja de ventas'}</dd></div>}
        {venta.direccionFiscal && <div><dt>Dirección</dt><dd>{venta.direccionFiscal}</dd></div>}
      </dl>

      <div className={styles.reciboTablaContenedor}>
        <table className={styles.reciboTabla}>
          <caption>Productos dispensados</caption>
          <thead><tr><th scope="col">Producto</th><th scope="col">Cant.</th><th scope="col">Precio</th><th scope="col">Total</th></tr></thead>
          <tbody>
            {(venta.detalles ?? []).map((detalle) => <tr key={detalle.id}>
              <td><strong>{detalle.producto}</strong><small>{detalle.codigo}</small></td>
              <td>{detalle.cantidad}</td>
              <td>{formatearCentavos(centavos(detalle.precioUnitario))}</td>
              <td>{formatearCentavos(centavos(detalle.total))}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className={styles.reciboResumen}>
        <div><span>Subtotal</span><strong>{formatearCentavos(centavos(venta.subtotal))}</strong></div>
        <div><span>IVA incluido</span><strong>{formatearCentavos(centavos(venta.impuesto))}</strong></div>
        <div><span>Descuento</span><strong>{formatearCentavos(centavos(venta.descuento))}</strong></div>
        <div className={styles.reciboTotal}><span>Total pagado</span><strong>{formatearCentavos(centavos(venta.total))}</strong></div>
        {pago?.recibidoCentavos !== undefined && <div><span>Efectivo recibido</span><strong>{formatearCentavos(pago.recibidoCentavos)}</strong></div>}
        {pago?.cambioCentavos !== undefined && <div><span>Cambio entregado</span><strong>{formatearCentavos(pago.cambioCentavos)}</strong></div>}
      </div>

      <footer className={styles.reciboPie}>
        <p>Gracias por su compra.</p>
        <small>Este comprobante interno acredita la operación en el sistema y no sustituye una factura FEL.</small>
      </footer>
    </article>}
    textoAccionPrincipal="Imprimir comprobante"
    iconoAccionPrincipal={<IconoAccion nombre="enviar" />}
    onAccionPrincipal={() => window.print()}
    textoAccionSecundaria="Cerrar"
    onAccionSecundaria={onCerrar}
    onCerrar={onCerrar}
  />
}
