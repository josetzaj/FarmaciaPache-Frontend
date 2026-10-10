import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { aprobarPrecio, obtenerPrecio } from '../comercial-api'
import type { EstadoPrecio, PrecioProducto } from '../comercial.types'
import { AccionConMotivoModal } from './accion-con-motivo-modal'
import { ComercialAuditoria } from './comercial-auditoria'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

const etiquetas: Record<EstadoPrecio, string> = { BORRADOR: 'Borrador', VIGENTE: 'Vigente', INACTIVO: 'Inactivo' }
const moneda = (valor: number, decimales = 2) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor)
const fecha = (valor: string | null) => valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) : 'No registrada'

export function PrecioDetalleView({ precioId, permisos, onNavegar }: { precioId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [precio, setPrecio] = useState<PrecioProducto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [aprobar, setAprobar] = useState(false)
  const [exito, setExito] = useState(false)
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerPrecio(precioId, controlador.signal)
      .then((respuesta) => { setPrecio(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el precio.') })
    return () => controlador.abort()
  }, [precioId, revision])
  if (error) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Precios" rutaListado="/comercial/precios" actual="Detalle" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible cargar el precio</h1><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!precio) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Precios" rutaListado="/comercial/precios" actual="Detalle" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando precio</h1></div></section>
  const confirmar = async (motivo: string) => { const actualizado = await aprobarPrecio(precio.id, precio.version, motivo); setPrecio(actualizado); setAprobar(false); setExito(true); setRevision((valor) => valor + 1) }
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-detalle-precio">
      <ComercialBreadcrumb seccion="Precios" rutaListado="/comercial/precios" actual="Detalle de precio" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>{precio.codigo}</p><h1 id="titulo-detalle-precio">{precio.producto}</h1><span className={`${styles.estado} ${precio.estado === 'VIGENTE' ? styles.estadoActivo : styles.estadoInactivo}`}>{etiquetas[precio.estado]}</span></div>{precio.estado === 'BORRADOR' && !precio.requiereRevision && permisos.includes('COMERCIAL.PRECIOS.APROBAR') && <div className={styles.accionesCabecera}><button className={styles.botonEstado} type="button" onClick={() => setAprobar(true)}><IconoAccion nombre="estado" />Aprobar precio</button></div>}</header>
      {precio.estado !== 'INACTIVO' && precio.requiereRevision && <div className={styles.alertaAdvertencia} role="alert"><strong>Esta propuesta necesita recalcularse antes de aprobar.</strong><ul>{precio.motivosRevision.map((motivo) => <li key={motivo}>{motivo}</li>)}</ul>{precio.costoBaseActual !== null && precio.precioSugeridoActual !== null && <p>Costo base actual: {moneda(precio.costoBaseActual, 4)}. Precio sugerido actual: {moneda(precio.precioSugeridoActual)}.</p>}{permisos.includes('COMERCIAL.PRECIOS.PROPONER') && <button className={styles.botonNeutral} type="button" onClick={() => onNavegar(`/comercial/precios/nuevo?productoId=${precio.productoId}`)}>Crear propuesta actualizada</button>}</div>}
      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}><h2>Precio calculado</h2><dl><div><dt>Costo promedio</dt><dd>{moneda(precio.costoPromedio, 4)}</dd></div><div><dt>Costo de reposición</dt><dd>{moneda(precio.costoReposicion, 4)}</dd></div><div><dt>Costo base</dt><dd><strong>{moneda(precio.costoBase, 4)}</strong></dd></div><div><dt>Margen</dt><dd>{precio.margenPorcentaje}%</dd></div><div><dt>Precio sugerido</dt><dd>{moneda(precio.precioSugerido)}</dd></div><div><dt>Precio de venta</dt><dd><strong>{moneda(precio.precioVenta)}</strong></dd></div></dl></article>
        <article className={styles.tarjetaDetalle}><h2>Control y vigencia</h2><dl><div className={styles.datoCompleto}><dt>Política aplicada</dt><dd>{precio.politicaMargen}</dd></div><div><dt>Vigente desde</dt><dd>{fecha(precio.vigenteDesde)}</dd></div><div><dt>Vigente hasta</dt><dd>{fecha(precio.vigenteHasta)}</dd></div><div className={styles.datoCompleto}><dt>Motivo</dt><dd>{precio.motivo}</dd></div></dl></article>
      </div>
      <div className={styles.notaInformativa}><strong>Lectura del cálculo</strong><span>{precio.estado === 'INACTIVO' ? 'Este precio forma parte del historial y ya no admite aprobación ni propuestas derivadas.' : <>Se tomó {precio.costoReposicion >= precio.costoPromedio ? 'el costo de reposición' : 'el costo promedio ponderado'} como base por ser el mayor. La aprobación volverá este precio vigente y cerrará el precio anterior del producto.</>}</span></div>
      {permisos.includes('COMERCIAL.PRECIOS.VER_AUDITORIA') && permisos.includes('COMERCIAL.PRECIOS.VER_COSTOS') && <ComercialAuditoria recurso="precios" entidadId={precio.id} revision={revision} />}
    </section>
    <AccionConMotivoModal abierto={aprobar} titulo="Aprobar precio" mensaje={`Se habilitará ${moneda(precio.precioVenta)} como precio vigente de ${precio.producto}.`} textoAccion="Aprobar precio" onCerrar={() => setAprobar(false)} onConfirmar={confirmar} />
    <ModalEstado abierto={exito} tipo="exito" titulo="Precio aprobado" mensaje="El precio quedó vigente y ya puede utilizarse en nuevas ventas." textoAccionPrincipal="Entendido" onAccionPrincipal={() => setExito(false)} onCerrar={() => setExito(false)} />
  </>
}
