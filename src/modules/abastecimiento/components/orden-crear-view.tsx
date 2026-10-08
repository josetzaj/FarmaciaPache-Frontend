import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { abrirPdfOrdenCompra, crearOrdenCompra, listarTodosRegistrosAbastecimiento } from '../abastecimiento-api'
import { etiquetaCodigo } from '../abastecimiento-config'
import type { CotizacionCompra, DetalleProductoAbastecimiento, OrdenCompra, TipoDestinoOrdenCompra } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

function hoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function monto(valor: unknown, moneda: string): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(Number(valor ?? 0))
}

export function OrdenCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionCompra[]>([])
  const [cotizacionId, setCotizacionId] = useState('')
  const [entregaEstimadaEn, setEntregaEstimadaEn] = useState('')
  const [tipoDestino, setTipoDestino] = useState<TipoDestinoOrdenCompra>('SUCURSAL')
  const [referenciaDestino, setReferenciaDestino] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardada, setGuardada] = useState<OrdenCompra | null>(null)
  const cotizacion = useMemo(() => cotizaciones.find((item) => item.id === cotizacionId) ?? null, [cotizacionId, cotizaciones])
  const tieneCambios = Boolean(cotizacionId || entregaEstimadaEn || referenciaDestino || tipoDestino !== 'SUCURSAL')

  useEffect(() => onCambiosPendientes(!guardada && tieneCambios), [guardada, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      listarTodosRegistrosAbastecimiento<CotizacionCompra>('cotizaciones', { estados: ['SELECCIONADA'] }, controlador.signal),
      listarTodosRegistrosAbastecimiento<OrdenCompra>('ordenes', {}, controlador.signal),
    ])
      .then(([seleccionadas, ordenes]) => { const emitidas = new Set(ordenes.map((item) => item.cotizacionId)); setCotizaciones(seleccionadas.filter((item) => !emitidas.has(item.id))); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las cotizaciones adjudicadas.') })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [])

  const columnas = useMemo<ColumnaTabla<DetalleProductoAbastecimiento>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: (item) => item.producto?.codigo ?? '', celda: (item) => <strong>{item.producto?.codigo ?? 'Sin código'}</strong> },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => item.producto?.nombre ?? 'Producto no disponible' },
    { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => Number(item.cantidad ?? 0), celda: (item) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(Number(item.cantidad ?? 0)) },
    { id: 'precio', titulo: 'Precio unitario', obtenerValor: (item) => Number(item.precioUnitario ?? 0), celda: (item) => cotizacion ? monto(item.precioUnitario, cotizacion.moneda) : '—' },
    { id: 'subtotal', titulo: 'Subtotal', obtenerValor: (item) => Number(item.subtotal ?? 0), celda: (item) => cotizacion ? <strong>{monto(item.subtotal, cotizacion.moneda)}</strong> : '—' },
  ], [cotizacion])

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes: Record<string, string> = {}
    if (!cotizacion) siguientes.cotizacionId = 'Selecciona una cotización adjudicada.'
    if (!entregaEstimadaEn) siguientes.entregaEstimadaEn = 'Selecciona la fecha estimada de entrega.'
    else if (entregaEstimadaEn < hoyGuatemala()) siguientes.entregaEstimadaEn = 'La entrega estimada no puede estar en el pasado.'
    if (tipoDestino === 'CLIENTE' && (referenciaDestino.trim().length < 1 || referenciaDestino.trim().length > 200)) siguientes.referenciaDestino = 'La entrega directa requiere una referencia trazable, con máximo 200 caracteres.'
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) { document.getElementById(`orden-${primero}`)?.focus(); return }
    if (!cotizacion) return
    setGuardando(true); setError(null)
    try {
      const respuesta = await crearOrdenCompra({ solicitudId: cotizacion.solicitudId, cotizacionId: cotizacion.id, entregaEstimadaEn, tipoDestino, referenciaDestino: tipoDestino === 'CLIENTE' ? referenciaDestino.trim() : null })
      setGuardada(respuesta); onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible emitir la orden de compra.')
    } finally { setGuardando(false) }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-nueva-orden">
        <AbastecimientoBreadcrumb recurso="ordenes" actual="Nueva orden" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Compromiso corporativo</p><h1 id="titulo-nueva-orden">Emitir orden de compra</h1><p>La orden toma precios, moneda, impuestos y condiciones de la cotización seleccionada; esos datos quedan conservados como fotografía comercial.</p></div></header>
        {error && <div className={styles.alertaError} role="alert">{error}</div>}
        <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando || cargando}>
            <legend>Origen adjudicado</legend>
            <p className={styles.descripcionSeccion}>Solo se muestran cotizaciones seleccionadas mediante una evaluación independiente.</p>
            <div className={styles.campo}><label htmlFor="orden-cotizacionId">Cotización seleccionada <span aria-hidden="true">*</span></label><SelectorCatalogoBuscable id="orden-cotizacionId" valor={cotizacionId} opciones={cotizaciones.map((item) => ({ valor: item.id, etiqueta: `${item.solicitud?.numero ?? 'Solicitud'} · ${item.proveedor?.nombre ?? 'Proveedor'} · ${monto(item.total, item.moneda)}` }))} placeholder={cargando ? 'Cargando cotizaciones…' : 'Selecciona una cotización'} invalido={Boolean(errores.cotizacionId)} onChange={(valor) => { setCotizacionId(valor); setErrores((actuales) => ({ ...actuales, cotizacionId: '' })) }} />{errores.cotizacionId && <small className={styles.errorCampo}>{errores.cotizacionId}</small>}{!cargando && !cotizaciones.length && <small className={styles.ayudaCampo}>No hay cotizaciones seleccionadas disponibles. Primero adjudica una cotización.</small>}</div>
          </fieldset>

          {cotizacion && <section className={styles.resumenDocumento} aria-label="Resumen de la cotización"><div><span>Solicitud</span><strong>{cotizacion.solicitud?.numero ?? 'Relacionada'}</strong></div><div><span>Proveedor</span><strong>{cotizacion.proveedor?.nombre ?? 'Relacionado'}</strong></div><div><span>Modalidad</span><strong>{etiquetaCodigo(cotizacion.solicitud?.modalidad)}</strong></div><div><span>Total en GTQ</span><strong>{monto(cotizacion.totalGtq, 'GTQ')}</strong></div></section>}

          <fieldset disabled={guardando || !cotizacion}>
            <legend>Destino y calendario</legend>
            <div className={styles.grillaDos}>
              <div className={styles.campo}><label htmlFor="orden-entregaEstimadaEn">Entrega estimada <span aria-hidden="true">*</span></label><input id="orden-entregaEstimadaEn" type="date" min={hoyGuatemala()} value={entregaEstimadaEn} aria-invalid={Boolean(errores.entregaEstimadaEn)} onChange={(evento) => { setEntregaEstimadaEn(evento.target.value); setErrores((actuales) => ({ ...actuales, entregaEstimadaEn: '' })) }} />{errores.entregaEstimadaEn && <small className={styles.errorCampo}>{errores.entregaEstimadaEn}</small>}</div>
              <div className={styles.campo}><label htmlFor="orden-tipoDestino">Tipo de destino <span aria-hidden="true">*</span></label><select id="orden-tipoDestino" value={tipoDestino} onChange={(evento) => { setTipoDestino(evento.target.value as TipoDestinoOrdenCompra); setReferenciaDestino(''); setErrores((actuales) => ({ ...actuales, referenciaDestino: '' })) }}><option value="SUCURSAL">Ingreso a sucursal</option><option value="CLIENTE">Entrega directa a cliente</option></select></div>
            </div>
            {tipoDestino === 'CLIENTE' && <div className={styles.campo}><label htmlFor="orden-referenciaDestino">Referencia del cliente o solicitud <span aria-hidden="true">*</span></label><input id="orden-referenciaDestino" value={referenciaDestino} maxLength={200} aria-invalid={Boolean(errores.referenciaDestino)} onChange={(evento) => { setReferenciaDestino(evento.target.value); setErrores((actuales) => ({ ...actuales, referenciaDestino: '' })) }} /><small className={errores.referenciaDestino ? styles.errorCampo : styles.ayudaCampo}>{errores.referenciaDestino ?? 'Identifica de forma trazable a quién se realizará la entrega directa.'}</small></div>}
          </fieldset>

          {cotizacion && <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>Productos de la orden</h2><p>Las cantidades y condiciones se copian de la oferta adjudicada y no son editables en esta etapa.</p></div><span>{cotizacion.detalles.length} productos</span></div><TablaDatos descripcion="Productos que integrarán la orden" datos={cotizacion.detalles} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /></article>}

          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/abastecimiento/ordenes')}><IconoAccion nombre="cancelar" />Volver sin guardar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !cotizacion}><IconoAccion nombre="guardar" />{guardando ? 'Emitiendo orden…' : 'Emitir orden'}</button></div></div>
        </form>
      </section>
      <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo="Orden emitida" mensaje={guardada ? `La orden ${guardada.numero} fue emitida y quedó pendiente de confirmación del proveedor.` : ''} textoAccionPrincipal="Ver orden" onAccionPrincipal={() => onNavegar(`/abastecimiento/ordenes/${guardada?.id}`)} textoAccionSecundaria="Ver PDF" onAccionSecundaria={() => guardada && void abrirPdfOrdenCompra(guardada.id).catch((errorActual: unknown) => setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar el PDF de la orden.'))} onCerrar={() => onNavegar(`/abastecimiento/ordenes/${guardada?.id}`)} />
    </>
  )
}
