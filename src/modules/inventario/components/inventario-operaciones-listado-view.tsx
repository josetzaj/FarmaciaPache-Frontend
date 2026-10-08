import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { listarAjustesInventario, listarAperturasInventario } from '../inventario-api'
import type { OperacionInventarioResumen, OperacionesInventarioPaginadas } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

type ClaseOperacion = 'APERTURA' | 'AJUSTE'

const ordenes: Record<string, 'referencia' | 'fecha' | 'tipo' | 'usuario'> = {
  referencia: 'referencia', fecha: 'fecha', tipo: 'tipo', usuario: 'usuario',
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function textoFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}

function opcionFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) && typeof valor[0] === 'string' ? valor[0] : undefined
}

function etiquetaTipo(tipo: OperacionInventarioResumen['tipo']): string {
  if (tipo === 'APERTURA') return 'Apertura controlada'
  if (tipo === 'AJUSTE_POSITIVO') return 'Ajuste positivo'
  if (tipo === 'AJUSTE_NEGATIVO') return 'Ajuste negativo'
  return tipo.replaceAll('_', ' ')
}

export function InventarioOperacionesListadoView({ clase, onNavegar }: { clase: ClaseOperacion; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const esApertura = clase === 'APERTURA'
  const titulo = esApertura ? 'Aperturas controladas' : 'Ajustes de inventario'
  const rutaNueva = esApertura ? '/inventario/apertura/nueva' : '/inventario/ajustes/nuevo'
  const [resultado, setResultado] = useState<OperacionesInventarioPaginadas | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { const tiempo = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400); return () => window.clearTimeout(tiempo) }, [entrada])

  const parametros = useMemo(() => {
    const orden = ordenamiento[0]
    const tipo = opcionFiltro(filtros, 'tipo')
    const tipoAjuste: 'POSITIVO' | 'NEGATIVO' | undefined = tipo === 'POSITIVO' || tipo === 'NEGATIVO' ? tipo : undefined
    const fecha = textoFiltro(filtros, 'fecha')
    return {
      pagina, tamanoPagina, busqueda: busqueda || undefined,
      tipoAjuste,
      desde: fecha, hasta: fecha,
      orden: ordenes[orden?.id ?? 'fecha'] ?? 'fecha', direccion: orden?.desc ? 'desc' as const : 'asc' as const,
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ clase, parametros, revision }), [clase, parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    const cargar = esApertura ? listarAperturasInventario : listarAjustesInventario
    void cargar(parametros, controlador.signal)
      .then((datos) => { if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }; setResultado(datos); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : `No fue posible cargar ${esApertura ? 'las aperturas' : 'los ajustes'}.`) })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, esApertura, pagina, parametros])

  const columnas = useMemo<ColumnaTabla<OperacionInventarioResumen>[]>(() => [
    { id: 'referencia', titulo: 'Referencia', obtenerValor: (item) => item.referencia, ordenable: true, celda: (item) => <strong>{item.referencia}</strong> },
    ...(!esApertura ? [{ id: 'tipo', titulo: 'Tipo', obtenerValor: (item: OperacionInventarioResumen) => item.tipo, ordenable: true, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar tipo', multiple: false, buscable: false, opciones: [{ valor: 'POSITIVO', etiqueta: 'Positivo' }, { valor: 'NEGATIVO', etiqueta: 'Negativo' }] }, celda: (item: OperacionInventarioResumen) => <span className={`${styles.estado} ${item.tipo === 'AJUSTE_POSITIVO' ? styles.estadoCorrecto : styles.estadoAdvertencia}`}>{etiquetaTipo(item.tipo)}</span> }] : []),
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.fechaOperacion, ordenable: true, filtro: { tipo: 'fecha', etiqueta: 'Fecha de operación' }, celda: (item) => fechaHora(item.fechaOperacion) },
    { id: 'movimientos', titulo: 'Movimientos', obtenerValor: (item) => item.totalMovimientos, celda: (item) => numero(item.totalMovimientos) },
    { id: 'cantidad', titulo: 'Cantidad total', obtenerValor: (item) => item.cantidadTotal, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidadTotal)}</span> },
    { id: 'usuario', titulo: 'Registrado por', obtenerValor: (item) => item.usuarioNombre, ordenable: true, celda: (item) => item.usuarioNombre },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, celda: (item) => <span className={`${styles.estado} ${item.estado === 'CONFIRMADA' ? styles.estadoCorrecto : styles.estadoNeutral}`}>{item.estado === 'CONFIRMADA' ? 'Confirmada' : item.estado}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver detalle de ${item.referencia}`} onClick={() => onNavegar(`${esApertura ? '/inventario/apertura' : '/inventario/ajustes'}/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [esApertura, onNavegar])

  return <section className={styles.pagina} aria-labelledby="titulo-listado-operaciones">
    <header className={styles.cabecera}><InventarioBreadcrumb actual={titulo} onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-listado-operaciones">{titulo}</h1><button className={styles.botonNuevo} type="button" onClick={() => onNavegar(rutaNueva)}><img src={iconoAgregar} alt="" />{esApertura ? 'Nueva apertura' : 'Nuevo ajuste'}</button><form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}><label className={styles.soloLectores} htmlFor="buscar-operaciones">Buscar operaciones</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-operaciones" type="search" value={entrada} maxLength={150} placeholder="Referencia, motivo, evidencia o usuario" onChange={(evento) => setEntrada(evento.target.value)} /></div></form></div></header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>{esApertura ? 'Historial de aperturas' : 'Historial de ajustes'}</strong><small>{esApertura ? 'Aperturas iniciales confirmadas para la sucursal.' : 'Correcciones positivas y negativas confirmadas.'}</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} {resultado.total === 1 ? (esApertura ? 'apertura' : 'ajuste') : (esApertura ? 'aperturas' : 'ajustes')}</span>}{Boolean(busqueda || filtros.length) && <button type="button" onClick={() => { setEntrada(''); setBusqueda(''); setFiltros([]); setPagina(1) }}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion={titulo} datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={esApertura ? 'apertura' : 'ajuste'} unidadPlural={esApertura ? 'aperturas' : 'ajustes'} onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{busqueda || filtros.length ? 'Sin coincidencias' : esApertura ? 'Sin aperturas registradas' : 'Sin ajustes registrados'}</h2><p>{busqueda || filtros.length ? 'Ajusta la búsqueda o los filtros aplicados.' : `Utiliza “${esApertura ? 'Nueva apertura' : 'Nuevo ajuste'}” para registrar la primera operación.`}</p></div> : null}</article>
  </section>
}
