import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { obtenerAjusteInventario, obtenerAperturaInventario } from '../inventario-api'
import type { MovimientoOperacionInventarioDetalle, OperacionInventarioDetalle } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

type ClaseOperacion = 'APERTURA' | 'AJUSTE'

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function moneda(valor: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(valor)
}

function etiquetaTipo(tipo: OperacionInventarioDetalle['tipo']): string {
  if (tipo === 'APERTURA') return 'Apertura controlada'
  if (tipo === 'AJUSTE_POSITIVO') return 'Ajuste positivo'
  if (tipo === 'AJUSTE_NEGATIVO') return 'Ajuste negativo'
  return tipo.replaceAll('_', ' ')
}

export function InventarioOperacionDetalleView({ clase, operacionId, permisos, onNavegar }: { clase: ClaseOperacion; operacionId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [detalle, setDetalle] = useState<OperacionInventarioDetalle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const esApertura = clase === 'APERTURA'
  const listado = esApertura ? '/inventario/apertura' : '/inventario/ajustes'
  const tituloListado = esApertura ? 'Aperturas controladas' : 'Ajustes de inventario'
  const puedeVerAuditoria = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA') && permisos.includes('INVENTARIO.KARDEX.VER')

  useEffect(() => {
    const controlador = new AbortController()
    const obtener = esApertura ? obtenerAperturaInventario : obtenerAjusteInventario
    void obtener(operacionId, controlador.signal)
      .then((respuesta) => { setDetalle(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el detalle de la operación.') })
    return () => controlador.abort()
  }, [esApertura, operacionId, revision])

  const columnas = useMemo<ColumnaTabla<MovimientoOperacionInventarioDetalle>[]>(() => [
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.ocurridoEn, celda: (item) => fechaHora(item.ocurridoEn) },
    { id: 'efecto', titulo: 'Movimiento', obtenerValor: (item) => item.efecto, celda: (item) => item.efecto === 'ENTRADA' ? 'Entrada' : 'Salida' },
    { id: 'producto', titulo: 'Medicamento', obtenerValor: (item) => `${item.producto.nombre} ${item.producto.codigo}`, celda: (item) => <span className={styles.identidad}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span> },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacion.nombre, celda: (item) => <span className={styles.identidad}><strong>{item.ubicacion.nombre}</strong><small>{item.ubicacion.codigo}</small></span> },
    { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.lote?.numero ?? '', celda: (item) => item.lote ? <span className={styles.identidad}><strong>{item.lote.numero}</strong><small>{item.lote.fechaVencimiento ? `Vence ${new Date(item.lote.fechaVencimiento).toLocaleDateString('es-GT', { timeZone: 'UTC' })}` : 'Sin vencimiento'}</small></span> : <span className={styles.sinDato}>Sin lote</span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, celda: (item) => item.estado.replaceAll('_', ' ') },
    { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => item.cantidad, celda: (item) => numero(item.cantidad) },
    { id: 'costo', titulo: 'Costo unitario', obtenerValor: (item) => item.costoUnitario ?? '', celda: (item) => item.costoUnitario === null ? <span className={styles.sinDato}>Sin costo</span> : moneda(item.costoUnitario) },
    { id: 'saldo', titulo: 'Saldo', obtenerValor: (item) => item.saldoPosterior, celda: (item) => `${numero(item.saldoAnterior)} → ${numero(item.saldoPosterior)}` },
    { id: 'seleccionLote', titulo: 'Selección de lote', obtenerValor: (item) => item.motivoSeleccionLote ?? '', celda: (item) => item.motivoSeleccionLote ?? <span className={styles.sinDato}>Automática o no aplica</span> },
  ], [])

  if (error) return <section className={styles.pagina}><InventarioBreadcrumb actual="Detalle de operación" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => onNavegar(listado)}>Volver al listado</button></div></section>
  if (!detalle) return <section className={styles.pagina} aria-busy="true"><InventarioBreadcrumb actual="Detalle de operación" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h2>Cargando operación</h2><p>Consultando los datos y movimientos registrados…</p></div></section>

  const titulo = `${etiquetaTipo(detalle.tipo)} ${detalle.referencia}`
  return <section className={styles.pagina} aria-labelledby="titulo-operacion-inventario">
    <header className={styles.cabecera}><InventarioBreadcrumb actual={titulo} onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-operacion-inventario">{titulo}</h1><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(listado)}>Ver {tituloListado.toLocaleLowerCase('es-GT')}</button></div></header>
    <article className={styles.detalleMasivo}><dl><div><dt>Estado</dt><dd>{detalle.estado === 'CONFIRMADA' ? 'Confirmada' : detalle.estado}</dd></div><div><dt>Fecha</dt><dd>{fechaHora(detalle.fechaOperacion)}</dd></div><div><dt>Registrado por</dt><dd>{detalle.usuarioNombre}</dd></div><div><dt>Confirmación</dt><dd>{detalle.confirmadaEn ? fechaHora(detalle.confirmadaEn) : 'Pendiente'}</dd></div><div><dt>Movimientos</dt><dd>{detalle.totalMovimientos}</dd></div><div><dt>Cantidad total</dt><dd>{numero(detalle.cantidadTotal)}</dd></div><div><dt>Motivo</dt><dd>{detalle.motivo}</dd></div><div><dt>Evidencia</dt><dd>{detalle.evidenciaReferencia ?? 'Sin referencia'}</dd></div></dl></article>
    <article className={styles.panelTabla}><div className={styles.resumenTabla}><div><strong>Movimientos registrados</strong><small>Detalle por medicamento, ubicación, lote y saldo resultante.</small></div><span>{detalle.movimientos.length} movimientos</span></div>{detalle.movimientos.length ? <TablaDatos descripcion={`Movimientos de ${detalle.referencia}`} datos={detalle.movimientos} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /> : <div className={styles.estadoVacio}><h2>Sin movimientos asociados</h2><p>La operación no contiene movimientos históricos registrados.</p></div>}</article>
    {puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={detalle.id} titulo={`${titulo}.`} revision={revision} />}
  </section>
}
