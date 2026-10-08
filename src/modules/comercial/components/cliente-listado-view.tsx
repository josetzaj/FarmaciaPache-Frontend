import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarComercial, listarClientes, obtenerOpcionesComercial } from '../comercial-api'
import type { ClienteComercial, ConsultaComercial, EstadoActivo, OpcionesComercial, TipoCliente } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

const opcionesIniciales: OpcionesComercial = {
  sucursales: [], productos: [],
  clientes: { tipos: ['PERSONA', 'EMPRESA'], estados: ['ACTIVO', 'INACTIVO'] },
  margenes: { alcances: ['GENERAL', 'PRODUCTO'], estados: ['ACTIVO', 'INACTIVO'] },
  precios: { estados: ['BORRADOR', 'VIGENTE', 'INACTIVO'] },
  ventas: { estados: ['BORRADOR', 'PENDIENTE_RECETA', 'LISTA_PARA_COBRO', 'CONFIRMADA', 'ANULADA'], estadosPago: ['PENDIENTE', 'PAGADO', 'REVERTIDO'], estadosDispensacion: ['PENDIENTE', 'DISPENSADA', 'REVERTIDA'], estadosFiscales: ['PENDIENTE', 'EMITIDA', 'ANULADA', 'ERROR'] },
}
const demoraBusquedaMs = 400

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}

function etiquetaTipo(tipo: TipoCliente): string { return tipo === 'PERSONA' ? 'Persona' : 'Empresa' }
function fecha(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

export function ClienteListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarClientes>> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesComercial>(opcionesIniciales)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'nombre', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const puedeCrear = permisos.includes('COMERCIAL.CLIENTES.CREAR')
  const puedeActualizar = permisos.includes('COMERCIAL.CLIENTES.ACTUALIZAR')
  const puedeExportar = permisos.includes('COMERCIAL.CLIENTES.EXPORTAR')
  const parametros = useMemo<ConsultaComercial>(() => {
    const orden = ordenamiento[0]
    return {
      pagina, tamanoPagina, busqueda: busqueda || undefined,
      tipos: valoresFiltro(filtros, 'tipo'),
      sucursalIds: valoresFiltro(filtros, 'sucursal'),
      estados: valoresFiltro(filtros, 'estado') as EstadoActivo[] | undefined,
      orden: orden?.id ?? 'nombre', direccion: orden?.desc ? 'desc' : 'asc',
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesComercial(controlador.signal).then((datos) => { setOpciones(datos); setErrorOpciones(null) }).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setErrorOpciones(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las opciones de filtro.')
    })
    return () => controlador.abort()
  }, [revision])

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const termino = busquedaEntrada.trim().replace(/\s+/g, ' ')
      ajustarPorBusqueda(termino)
      setBusqueda(termino)
      setPagina(1)
    }, demoraBusquedaMs)
    return () => window.clearTimeout(temporizador)
  }, [ajustarPorBusqueda, busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarClientes(parametros, controlador.signal).then((datos) => {
      if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }
      setResultado(datos); setError(null)
    }).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar los clientes.')
    })
    return () => controlador.abort()
  }, [pagina, parametros, revision])

  const columnas = useMemo<ColumnaTabla<ClienteComercial>[]>(() => [
    { id: 'nombre', titulo: 'Cliente', obtenerValor: (item) => item.nombre, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.nombre}</strong><small>{etiquetaTipo(item.tipo)}</small></div> },
    { id: 'tipo', titulo: 'Tipo', obtenerValor: (item) => item.tipo, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Tipo de cliente', multiple: true, buscable: false, opciones: [{ valor: 'PERSONA', etiqueta: 'Persona' }, { valor: 'EMPRESA', etiqueta: 'Empresa' }] }, celda: (item) => etiquetaTipo(item.tipo) },
    { id: 'identificacion', titulo: 'Identificación', obtenerValor: (item) => item.identificacion ?? '', ordenable: true, celda: (item) => item.identificacion ? <div className={styles.identidad}><strong>{item.identificacion}</strong><small>{item.tipoIdentificacion}</small></div> : <span className={styles.sinDato}>Sin identificación</span> },
    { id: 'contacto', titulo: 'Contacto', obtenerValor: (item) => item.telefono ?? item.correo ?? '', celda: (item) => <div className={styles.identidad}><strong>{item.telefono ?? 'Sin teléfono'}</strong><small>{item.correo ?? 'Sin correo'}</small></div> },
    { id: 'sucursal', titulo: 'Sucursal de registro', obtenerValor: (item) => item.sucursalRegistro?.nombre ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Sucursal de registro', multiple: true, opciones: opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })) }, celda: (item) => item.sucursalRegistro ? <div className={styles.identidad}><strong>{item.sucursalRegistro.nombre}</strong><small>{item.sucursalRegistro.codigo}</small></div> : <span className={styles.sinDato}>No disponible</span> },
    { id: 'fecha', titulo: 'Registro', obtenerValor: (item) => item.creadoEn, ordenable: true, celda: (item) => fecha(item.creadoEn) },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.activo ? 'ACTIVO' : 'INACTIVO', filtro: { tipo: 'opciones', etiqueta: 'Estado', multiple: true, buscable: false, opciones: [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'INACTIVO', etiqueta: 'Inactivo' }] }, celda: (item) => <span className={`${styles.estado} ${item.activo ? styles.estadoActivo : styles.estadoInactivo}`}>{item.activo ? 'Activo' : 'Inactivo'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button type="button" aria-label={`Ver cliente ${item.nombre}`} title="Ver detalle" onClick={() => onNavegar(`/clientes/${item.id}`)}><img src={iconoVer} alt="" /></button>{puedeActualizar && <button type="button" aria-label={`Editar cliente ${item.nombre}`} title="Editar" onClick={() => onNavegar(`/clientes/${item.id}/editar`)}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [onNavegar, opciones.sucursales, puedeActualizar])

  const exportar = async (formato: FormatoExportacion) => {
    setErrorExportacion(null)
    const { pagina: _pagina, tamanoPagina: _tamano, ...filtrosExportacion } = parametros
    try { await exportarComercial('clientes', formato, filtrosExportacion) }
    catch (actual) { setErrorExportacion(actual instanceof ErrorApi ? actual.message : 'No fue posible exportar los clientes.') }
  }

  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); restablecerFiltros(); setPagina(1) }
  const hayFiltros = Boolean(busqueda) || hayFiltrosAdicionales(filtros)

  return (
    <section className={styles.pagina} aria-labelledby="titulo-clientes">
      <header className={styles.cabeceraPagina}>
        <ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <h1 id="titulo-clientes">Clientes</h1>
          {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/clientes/nuevo')}><img src={iconoAgregar} alt="" />Nuevo cliente</button>}
          {puedeExportar && <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />}
          <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => evento.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-clientes">Buscar por nombre, identificación o teléfono</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-clientes" type="search" value={busquedaEntrada} maxLength={200} placeholder="Buscar por nombre, identificación o teléfono" onChange={(evento) => setBusquedaEntrada(evento.target.value)} />{busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}</div></form>
        </div>
      </header>
      {errorOpciones && <div className={styles.alertaAdvertencia} role="status">{errorOpciones}</div>}
      {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}><div><strong>Clientes registrados</strong><small>Usa el botón de cada encabezado para filtrar u ordenar.</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} clientes</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
        {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar los clientes</h2><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : resultado?.items.length ? <><TablaDatos descripcion="Listado de clientes" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="cliente" unidadPlural="clientes" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : resultado ? <div className={styles.estadoVacio}><h2>Sin clientes para mostrar</h2><p>{hayFiltros ? 'No hay coincidencias con los filtros actuales.' : 'Registra el primer cliente para comenzar.'}</p>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div> : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando clientes</h2><p>Consultando la información comercial…</p></div>}
      </article>
    </section>
  )
}
