import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarComercial, listarPoliticasMargen } from '../comercial-api'
import type { ConsultaComercial, EstadoActivo, PoliticaMargen } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}
function numeroOpcional(valor: string): number | undefined { const numero = Number(valor); return valor.trim() && Number.isFinite(numero) ? numero : undefined }

export function PoliticaMargenListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarPoliticasMargen>> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [margenMin, setMargenMin] = useState('')
  const [margenMax, setMargenMax] = useState('')
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([])
  const [error, setError] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeCrear = permisos.includes('COMERCIAL.MARGENES.CREAR')
  const puedeActualizar = permisos.includes('COMERCIAL.MARGENES.ACTUALIZAR')
  const puedeExportar = permisos.includes('COMERCIAL.MARGENES.EXPORTAR')

  const parametros = useMemo<ConsultaComercial>(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined,
    tipos: valoresFiltro(filtros, 'alcance'),
    estados: valoresFiltro(filtros, 'estado') as EstadoActivo[] | undefined,
    margenMin: numeroOpcional(margenMin), margenMax: numeroOpcional(margenMax),
    orden: 'nombre', direccion: 'asc',
  }), [busqueda, filtros, margenMax, margenMin, pagina, tamanoPagina])

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const termino = busquedaEntrada.trim().replace(/\s+/g, ' ')
      ajustarPorBusqueda(termino); setBusqueda(termino); setPagina(1)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [ajustarPorBusqueda, busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarPoliticasMargen(parametros, controlador.signal).then((datos) => {
      if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }
      setResultado(datos); setError(null)
    }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las políticas de margen.') })
    return () => controlador.abort()
  }, [pagina, parametros, revision])

  const columnas = useMemo<ColumnaTabla<PoliticaMargen>[]>(() => [
    { id: 'nombre', titulo: 'Política', obtenerValor: (item) => item.nombre, celda: (item) => <strong>{item.nombre}</strong> },
    { id: 'alcance', titulo: 'Alcance', obtenerValor: (item) => item.alcance, filtro: { tipo: 'opciones', etiqueta: 'Alcance', multiple: true, buscable: false, opciones: [{ valor: 'GENERAL', etiqueta: 'General' }, { valor: 'PRODUCTO', etiqueta: 'Por producto' }] }, celda: (item) => item.alcance === 'GENERAL' ? 'General' : 'Por producto' },
    { id: 'producto', titulo: 'Producto', obtenerValor: (item) => item.producto?.nombre ?? '', celda: (item) => item.producto ? <div className={styles.identidad}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></div> : <span className={styles.sinDato}>Todos los productos</span> },
    { id: 'margen', titulo: 'Margen', obtenerValor: (item) => item.margenPorcentaje, celda: (item) => <strong>{item.margenPorcentaje.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.activo ? 'ACTIVO' : 'INACTIVO', filtro: { tipo: 'opciones', etiqueta: 'Estado', multiple: true, buscable: false, opciones: [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'INACTIVO', etiqueta: 'Inactivo' }] }, celda: (item) => <span className={`${styles.estado} ${item.activo ? styles.estadoActivo : styles.estadoInactivo}`}>{item.activo ? 'Activa' : 'Inactiva'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver política ${item.nombre}`} onClick={() => onNavegar(`/comercial/politicas-margen/${item.id}`)}><img src={iconoVer} alt="" /></button>{puedeActualizar && <button type="button" title="Editar" aria-label={`Editar política ${item.nombre}`} onClick={() => onNavegar(`/comercial/politicas-margen/${item.id}/editar`)}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [onNavegar, puedeActualizar])

  const exportar = async (formato: FormatoExportacion) => {
    setErrorExportacion(null)
    const { pagina: _pagina, tamanoPagina: _tamano, ...filtrosExportacion } = parametros
    try { await exportarComercial('politicas-margen', formato, filtrosExportacion) }
    catch (actual) { setErrorExportacion(actual instanceof ErrorApi ? actual.message : 'No fue posible exportar las políticas de margen.') }
  }
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setMargenMin(''); setMargenMax(''); restablecerFiltros(); setPagina(1) }
  const hayFiltros = Boolean(busqueda || margenMin || margenMax) || hayFiltrosAdicionales(filtros)

  return (
    <section className={styles.pagina} aria-labelledby="titulo-politicas-margen">
      <header className={styles.cabeceraPagina}>
        <ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" onNavegar={onNavegar} />
        <div className={`${styles.filaCabecera} ${styles.filaCabeceraConFiltros}`}>
          <h1 id="titulo-politicas-margen">Políticas de margen</h1>
          {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/comercial/politicas-margen/nueva')}><img src={iconoAgregar} alt="" />Nueva política</button>}
          {puedeExportar && <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />}
          <div className={styles.filtrosCabecera} aria-label="Filtros generales de políticas de margen">
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Margen mínimo</span>
              <input type="number" min="0" max="99.9999" step="0.0001" value={margenMin} aria-label="Margen mínimo" placeholder="Margen mínimo" onChange={(evento) => { setMargenMin(evento.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlNumeroCabecera}>
              <span className={styles.soloLectores}>Margen máximo</span>
              <input type="number" min="0" max="99.9999" step="0.0001" value={margenMax} aria-label="Margen máximo" placeholder="Margen máximo" onChange={(evento) => { setMargenMax(evento.target.value); setPagina(1) }} />
            </label>
          </div>
          <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => evento.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-politicas">Buscar política o producto</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-politicas" type="search" value={busquedaEntrada} maxLength={200} placeholder="Buscar política o producto" onChange={(evento) => setBusquedaEntrada(evento.target.value)} />{busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}</div></form>
        </div>
      </header>
      {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}><div><strong>Políticas registradas</strong><small>Usa el botón de cada encabezado para filtrar.</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} políticas</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
        {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar las políticas</h2><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : resultado?.items.length ? <><TablaDatos descripcion="Listado de políticas de margen" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={setOrdenamiento} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="política" unidadPlural="políticas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : resultado ? <div className={styles.estadoVacio}><h2>Sin políticas para mostrar</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'Registra la primera política de margen.'}</p>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div> : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando políticas</h2><p>Consultando la configuración comercial…</p></div>}
      </article>
    </section>
  )
}
