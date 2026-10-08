import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { exportarExistenciasInventario, listarExistenciasInventario, listarUbicacionesInventario } from '../inventario-api'
import type {
  EstadoExistenciaInventario,
  ExistenciaProducto,
  ExistenciasInventarioPaginadas,
  ListarExistenciasInventarioParametros,
  OrdenExistenciasInventario,
  UbicacionInventario,
} from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const opcionesEstado: Array<{ valor: EstadoExistenciaInventario; etiqueta: string }> = [
  { valor: 'DISPONIBLE', etiqueta: 'Disponible' },
  { valor: 'RESERVADO', etiqueta: 'Reservado' },
  { valor: 'COMPROMETIDO', etiqueta: 'Comprometido' },
  { valor: 'EN_TRANSITO', etiqueta: 'En tránsito' },
  { valor: 'BLOQUEADO', etiqueta: 'Bloqueado' },
  { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'VENCIDO', etiqueta: 'Vencido' },
  { valor: 'DESTRUIDO', etiqueta: 'Destruido' },
]

const ordenes: Record<string, OrdenExistenciasInventario> = {
  producto: 'producto', codigo: 'codigo', disponible: 'disponible', actualizado: 'actualizado',
}

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) && valor.length
    ? valor.filter((item): item is string => typeof item === 'string')
    : undefined
}

function textoFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined
}

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function moneda(valor: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(valor)
}

function fechaHora(valor: string): string {
  if (!valor) return 'Sin movimientos'
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

export function InventarioExistenciasView({
  permisos,
  onNavegar,
}: {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}) {
  const [resultado, setResultado] = useState<ExistenciasInventarioPaginadas | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'producto', desc: false }])
  const [soloConExistencia, setSoloConExistencia] = useState(true)
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorUbicaciones, setErrorUbicaciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const puedeExportar = permisos.includes('INVENTARIO.EXISTENCIAS.EXPORTAR')
  const puedeGestionarUbicaciones = permisos.includes('INVENTARIO.UBICACIONES.VER')

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(false, controlador.signal)
      .then((items) => { setUbicaciones(items); setErrorUbicaciones(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorUbicaciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las ubicaciones para filtrar.')
      })
    return () => controlador.abort()
  }, [revision])

  const parametros = useMemo<ListarExistenciasInventarioParametros>(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || textoFiltro(filtros, 'producto'),
      ubicacionId: arregloFiltro(filtros, 'ubicacion')?.[0],
      estados: arregloFiltro(filtros, 'estado') as EstadoExistenciaInventario[] | undefined,
      soloConExistencia,
      soloBajoMinimo,
      orden: ordenes[orden?.id ?? 'producto'] ?? 'producto',
      direccion: orden?.desc ? 'desc' : 'asc',
    }
  }, [busqueda, filtros, ordenamiento, pagina, soloBajoMinimo, soloConExistencia, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarExistenciasInventario(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }
        setResultado(respuesta); setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las existencias.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, pagina, parametros])

  const columnas = useMemo<ColumnaTabla<ExistenciaProducto>[]>(() => [
    {
      id: 'producto', titulo: 'Producto', obtenerValor: (item) => `${item.producto.nombre} ${item.producto.codigo}`,
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar producto', placeholder: 'Nombre o código' },
      celda: (item) => <div className={styles.identidadProductoInventario}><span className={styles.miniaturaProductoInventario}><span aria-hidden="true">Rx</span>{item.producto.imagenUrl && <img src={`${construirUrlApi(item.producto.imagenUrl)}?v=${item.producto.version}`} alt="" crossOrigin="use-credentials" onError={(evento) => { evento.currentTarget.style.display = 'none' }} />}</span><span className={styles.identidad}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}{!item.producto.activo ? ' · Medicamento inactivo' : ''}</small></span></div>,
    },
    { id: 'fisica', titulo: 'Existencia física', obtenerValor: (item) => item.cantidadFisica, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidadFisica)}</span> },
    { id: 'disponible', titulo: 'Disponible', obtenerValor: (item) => item.cantidadDisponible, ordenable: true, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidadDisponible)}</span> },
    { id: 'costo', titulo: 'Costo unitario', obtenerValor: (item) => item.ultimoCostoUnitario ?? '', celda: (item) => item.ultimoCostoUnitario === null ? <span className={styles.sinDato}>Sin costo</span> : <span className={styles.cantidad}>{moneda(item.ultimoCostoUnitario)}</span> },
    { id: 'stock', titulo: 'Estado de stock', obtenerValor: (item) => item.bajoMinimo ? 'BAJO_MINIMO' : 'DENTRO_MINIMO', celda: (item) => <span className={`${styles.estado} ${item.bajoMinimo ? styles.estadoAdvertencia : styles.estadoCorrecto}`}>{item.bajoMinimo ? 'Bajo mínimo' : 'Dentro del mínimo'}</span> },
    { id: 'reservada', titulo: 'Reservada / comprometida', obtenerValor: (item) => item.cantidadReservada + item.cantidadComprometida, celda: (item) => <div className={styles.identidad}><strong>{numero(item.cantidadReservada + item.cantidadComprometida)}</strong><small>{numero(item.cantidadReservada)} reservada · {numero(item.cantidadComprometida)} comprometida</small></div> },
    {
      id: 'estado', titulo: 'Restringida', obtenerValor: (item) => item.cantidadBloqueada + item.cantidadCuarentena,
      filtro: { tipo: 'opciones', etiqueta: 'Estados de existencia', opciones: opcionesEstado },
      celda: (item) => <div className={styles.identidad}><strong>{numero(item.cantidadBloqueada + item.cantidadCuarentena)}</strong><small>{numero(item.cantidadBloqueada)} bloqueada · {numero(item.cantidadCuarentena)} cuarentena</small></div>,
    },
    {
      id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.posiciones.map((posicion) => posicion.ubicacion.nombre).join(' '),
      filtro: { tipo: 'opciones', etiqueta: 'Seleccionar ubicación', multiple: false, opciones: ubicaciones.map((item) => ({ valor: item.id, etiqueta: `${item.nombre} (${item.codigo})` })) },
      celda: (item) => `${new Set(item.posiciones.map((posicion) => posicion.ubicacion.id)).size} ${new Set(item.posiciones.map((posicion) => posicion.ubicacion.id)).size === 1 ? 'ubicación' : 'ubicaciones'}`,
    },
    {
      id: 'actualizado', titulo: 'Último movimiento', obtenerValor: (item) => item.actualizadoEn,
      ordenable: true, celda: (item) => fechaHora(item.actualizadoEn),
    },
    {
      id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.producto.id,
      celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle de existencia" aria-label={`Ver detalle de existencia de ${item.producto.nombre}`} onClick={() => onNavegar(`/inventario/existencias/${item.producto.id}`)}><img src={iconoVer} alt="" /></button></div>,
    },
  ], [onNavegar, ubicaciones])

  const exportar = async (formato: FormatoExportacion) => {
    try {
      const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...criterios } = parametros
      await exportarExistenciasInventario({ ...criterios, formato })
    } catch (errorActual) {
      setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar las existencias.')
    }
  }

  const limpiar = () => { setEntrada(''); setBusqueda(''); setFiltros([]); setSoloConExistencia(true); setSoloBajoMinimo(false); setPagina(1) }
  const hayCriterios = Boolean(busqueda || filtros.length || !soloConExistencia || soloBajoMinimo)

  return (
    <section className={styles.pagina} aria-labelledby="titulo-existencias-inventario">
      <header className={styles.cabecera}>
        <InventarioBreadcrumb actual="Existencias" onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <h1 id="titulo-existencias-inventario">Existencias</h1>
          {puedeGestionarUbicaciones && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/inventario/ubicaciones')}>Gestionar ubicaciones</button>}
          {puedeExportar && <BotonExportar deshabilitado={!resultado?.total || cargando} onExportar={exportar} />}
          <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}>
            <label className={styles.soloLectores} htmlFor="buscar-existencias">Buscar productos</label>
            <div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-existencias" type="search" value={entrada} maxLength={150} placeholder="Buscar producto o código" onChange={(evento) => setEntrada(evento.target.value)} />{entrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setEntrada('')}>×</button>}</div>
            <small>La búsqueda se aplica automáticamente después de una pausa breve.</small>
          </form>
        </div>
      </header>
      <div className={styles.panelOpciones} aria-label="Opciones de consulta"><label><input type="checkbox" checked={soloConExistencia} onChange={(evento) => { setSoloConExistencia(evento.target.checked); setPagina(1) }} />Solo productos con existencia</label><label><input type="checkbox" checked={soloBajoMinimo} onChange={(evento) => { setSoloBajoMinimo(evento.target.checked); setPagina(1) }} />Solo bajo mínimo</label>{hayCriterios && <button className={styles.botonNeutral} type="button" onClick={limpiar}>Restablecer consulta</button>}</div>
      {errorUbicaciones && <div className={styles.alertaAdvertencia} role="status"><p>{errorUbicaciones} El filtro por ubicación no está disponible temporalmente.</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}><div><strong>Inventario de la sucursal</strong><small>Cantidades consolidadas por producto, ubicación, lote y estado.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} {resultado.total === 1 ? 'producto' : 'productos'}</span>}{filtros.length > 0 && <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>Limpiar filtros ({filtros.length})</button>}</div></div>
        {resultado?.items.length ? <><TablaDatos descripcion="Existencias farmacéuticas con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.producto.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'producto', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="producto" unidadPlural="productos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayCriterios ? 'Sin coincidencias' : 'Inventario sin existencias'}</h2><p>{hayCriterios ? 'Ajusta o restablece los criterios de consulta.' : 'Registra una apertura controlada para comenzar a operar.'}</p></div> : null}
      </article>
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
    </section>
  )
}
