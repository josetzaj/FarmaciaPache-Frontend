import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import { listarPosicionesCostoInventario, obtenerOpcionesCostosInventario } from '../inventario-api'
import type { OpcionesCostosInventario, PosicionCostoInventario, PosicionesCostoInventarioPaginadas } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(valor)
const numero = (valor: number) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
const fechaHora = (valor: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))

export function InventarioCostosListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const puedeRegularizar = permisos.includes('INVENTARIO.COSTOS.REGULARIZAR')
  const [resultado, setResultado] = useState<PosicionesCostoInventarioPaginadas | null>(null)
  const [opciones, setOpciones] = useState<OpcionesCostosInventario>({ sucursales: [] })
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'producto', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesCostosInventario(controlador.signal).then(setOpciones).catch(() => undefined)
    return () => controlador.abort()
  }, [])

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entrada])

  useEffect(() => {
    const controlador = new AbortController()
    const orden = ['sucursal', 'producto', 'ubicacion', 'actualizado'].includes(ordenamiento[0]?.id ?? '') ? ordenamiento[0]!.id as 'sucursal' | 'producto' | 'ubicacion' | 'actualizado' : 'producto'
    void listarPosicionesCostoInventario({ pagina, tamanoPagina, busqueda: busqueda || undefined, sucursalIds: sucursalId ? [sucursalId] : undefined, orden, direccion: ordenamiento[0]?.desc ? 'desc' : 'asc' }, controlador.signal)
      .then((respuesta) => { if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) setPagina(respuesta.totalPaginas); else setResultado(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las posiciones de costo.') })
    return () => controlador.abort()
  }, [busqueda, ordenamiento, pagina, revision, sucursalId, tamanoPagina])

  const columnas = useMemo<ColumnaTabla<PosicionCostoInventario>[]>(() => {
    const columnasBase: ColumnaTabla<PosicionCostoInventario>[] = [
      { id: 'sucursal', titulo: 'Sucursal', ordenable: true, obtenerValor: (item) => item.sucursal.nombre, celda: (item) => <span className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></span> },
      { id: 'producto', titulo: 'Medicamento', ordenable: true, obtenerValor: (item) => item.producto.nombre, celda: (item) => <span className={styles.identidad}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span> },
      { id: 'ubicacion', titulo: 'Ubicación', ordenable: true, obtenerValor: (item) => item.ubicacion.nombre, celda: (item) => <span className={styles.identidad}><strong>{item.ubicacion.nombre}</strong><small>{item.ubicacion.codigo}</small></span> },
      { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.lote?.numero ?? '', celda: (item) => item.lote ? <span className={styles.identidad}><strong>{item.lote.numero}</strong><small>{item.lote.fechaVencimiento ? `Vence ${item.lote.fechaVencimiento.slice(0, 10)}` : 'Sin vencimiento'}</small></span> : <span className={styles.sinDato}>Sin lote</span> },
      { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, celda: (item) => item.estado.replaceAll('_', ' ') },
      { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => item.cantidad, celda: (item) => numero(item.cantidad) },
      { id: 'costo', titulo: 'Costo vigente', obtenerValor: (item) => item.costoUnitario ?? '', celda: (item) => item.costoUnitario === null ? <span className={styles.estado + ' ' + styles.estadoAdvertencia}>Sin costo</span> : <strong>{moneda(item.costoUnitario)}</strong> },
      { id: 'actualizado', titulo: 'Actualizado', ordenable: true, obtenerValor: (item) => item.actualizadoEn, celda: (item) => fechaHora(item.actualizadoEn) },
    ]
    if (puedeRegularizar) columnasBase.push({ id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button type="button" title="Regularizar costo" aria-label={`Regularizar costo de ${item.producto.nombre} en ${item.sucursal.nombre}`} onClick={() => onNavegar(`/inventario/costos/regularizar?saldoId=${item.saldoId}`)}><img src={iconoEditar} alt="" /></button></div> })
    return columnasBase
  }, [onNavegar, puedeRegularizar])

  const limpiar = () => { setEntrada(''); setBusqueda(''); setSucursalId(''); setPagina(1) }
  return <section className={styles.pagina} aria-labelledby="titulo-costos-inventario">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Regularización de costos" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-costos-inventario">Regularización de costos</h1><form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => evento.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-costos">Buscar posición</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-costos" type="search" value={entrada} maxLength={150} placeholder="Producto, lote, ubicación o sucursal" onChange={(evento) => setEntrada(evento.target.value)} /></div></form></div></header>
    <div className={styles.alertaAdvertencia} role="note"><p>Esta función es administrativa: corrige únicamente el costo contable de una existencia. No modifica cantidades ni cambia automáticamente el precio público.</p></div>
    <fieldset className={styles.panelFiltros}><legend>Filtros</legend><div className={styles.campo}><label htmlFor="costos-sucursal">Sucursal</label><select id="costos-sucursal" value={sucursalId} onChange={(evento) => { setSucursalId(evento.target.value); setPagina(1) }}><option value="">Todas las sucursales</option>{opciones.sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.codigo} — {sucursal.nombre}</option>)}</select></div>{(busqueda || sucursalId) && <button className={styles.botonNeutral} type="button" onClick={limpiar}>Limpiar filtros</button>}</fieldset>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla}><div className={styles.resumenTabla}><div><strong>Posiciones con existencia física</strong><small>Costo identificado por sucursal, medicamento, ubicación, lote y estado.</small></div><span>{resultado?.total ?? 0} posiciones</span></div>{resultado?.items.length ? <><TablaDatos descripcion="Posiciones de costo de inventario" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.saldoId} onFiltrosChange={() => undefined} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'producto', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="posición" unidadPlural="posiciones" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : resultado && !error ? <div className={styles.estadoVacio}><h2>Sin posiciones para mostrar</h2><p>{busqueda || sucursalId ? 'No hay coincidencias con los filtros actuales.' : 'No existen posiciones con inventario físico.'}</p></div> : null}</article>
  </section>
}
