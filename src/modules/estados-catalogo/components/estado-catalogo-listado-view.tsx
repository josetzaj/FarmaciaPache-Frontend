import { useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarEstadosCatalogo, listarEstadosCatalogo } from '../estado-catalogo-api'
import type { DireccionEstadoCatalogo, EstadoCatalogo, EstadosCatalogoPaginados, ListarEstadosCatalogoParametros, OrdenEstadoCatalogo, SituacionEstadoCatalogo } from '../estado-catalogo.types'
import { EstadoCatalogoBreadcrumb } from './estado-catalogo-breadcrumb'
import { EstadoCatalogoInactivarModal } from './estado-catalogo-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
const valorTexto = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return typeof valor === 'string' && valor ? valor : undefined }
const valores = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) && valor.length ? valor.filter((item): item is string => typeof item === 'string') : undefined }
function validarBusqueda(valor: string): string | null { const limpio = valor.trim(); if (limpio.length === 1) return 'Escribe al menos 2 caracteres para buscar.'; if (limpio.length > 120) return 'La búsqueda no puede superar 120 caracteres.'; return null }

export function EstadoCatalogoListadoView({ permisos, onNavegar }: Props) {
  const puedeCrear = permisos.includes('CATALOGOS.ESTADOS.CREAR')
  const puedeEditar = permisos.includes('CATALOGOS.ESTADOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('CATALOGOS.ESTADOS.INACTIVAR')
  const [resultado, setResultado] = useState<EstadosCatalogoPaginados | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'nombre', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState<string | null>(null)
  const [estadoAInactivar, setEstadoAInactivar] = useState<EstadoCatalogo | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  const parametros = useMemo<ListarEstadosCatalogoParametros>(() => {
    const orden = ordenamiento[0]
    return { pagina, tamanoPagina, busqueda: busqueda || undefined, estado: valorTexto(filtros, 'nombre'), estados: valores(filtros, 'estado') as SituacionEstadoCatalogo[] | undefined, orden: (orden?.id ?? 'nombre') as OrdenEstadoCatalogo, direccion: (orden?.desc ? 'desc' : 'asc') as DireccionEstadoCatalogo }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarEstadosCatalogo(parametros, controlador.signal).then((respuesta) => { setResultado(respuesta); setError(null) }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los estados.')
    }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, parametros])

  const columnas = useMemo<ColumnaTabla<EstadoCatalogo>[]>(() => [
    { id: 'nombre', titulo: 'Estado', obtenerValor: (estado) => `${estado.nombre} ${estado.codigo}`, ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar estado', placeholder: 'Nombre o código' }, celda: (estado) => <div className={styles.identidadRol}><strong>{estado.nombre}</strong><small>{estado.codigo}</small></div> },
    { id: 'descripcion', titulo: 'Descripción', obtenerValor: (estado) => estado.descripcion ?? '', celda: (estado) => estado.descripcion ?? <span className={styles.sinDato}>Sin descripción</span> },
    { id: 'estado', titulo: 'Situación', obtenerValor: (estado) => estado.activo ? 'ACTIVO' : 'INACTIVO', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar situación', buscable: false, opciones: [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'INACTIVO', etiqueta: 'Inactivo' }] }, celda: (estado) => <span className={`${styles.estado} ${estado.activo ? styles.activo : styles.inactivo}`}>{estado.activo ? 'Activo' : 'Inactivo'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (estado) => estado.id, celda: (estado) => <div className={styles.accionesFila}>
      <button type="button" title="Ver estado" aria-label={`Ver estado ${estado.nombre}`} onClick={() => onNavegar(`/catalogos/estados/${estado.id}`)}><img src={iconoVer} alt="" /></button>
      {puedeEditar && <button type="button" title="Editar estado" aria-label={`Editar estado ${estado.nombre}`} onClick={() => onNavegar(`/catalogos/estados/${estado.id}/editar`)}><img src={iconoEditar} alt="" /></button>}
      {puedeInactivar && estado.activo && <button className={styles.accionPeligro} type="button" title="Desactivar estado" aria-label={`Desactivar estado ${estado.nombre}`} onClick={() => setEstadoAInactivar(estado)}><img src={iconoEliminar} alt="" /></button>}
    </div> },
  ], [onNavegar, puedeEditar, puedeInactivar])

  const aplicarBusqueda = (evento: FormEvent<HTMLFormElement>) => { evento.preventDefault(); const errorActual = validarBusqueda(busquedaEntrada); setErrorBusqueda(errorActual); if (errorActual) return; const termino = busquedaEntrada.trim(); ajustarPorBusqueda(termino); setBusqueda(termino); setPagina(1) }
  const limpiarTodo = () => { setBusquedaEntrada(''); setBusqueda(''); restablecerFiltros(); setOrdenamiento([{ id: 'nombre', desc: false }]); setPagina(1); setErrorBusqueda(null) }
  const exportar = async (formato: FormatoExportacion) => {
    try { await exportarEstadosCatalogo({ formato, busqueda: parametros.busqueda, estado: parametros.estado, estados: parametros.estados, orden: parametros.orden, direccion: parametros.direccion }) }
    catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar los estados.') }
  }
  const hayFiltros = Boolean(busqueda) || hayFiltrosAdicionales(filtros)

  return (
    <section className={styles.pagina}>
      <div className={styles.cabeceraPagina}><EstadoCatalogoBreadcrumb onNavegar={onNavegar} /><div className={styles.filaCabecera}>
        <h1>Catálogo de estados</h1>
        {puedeCrear && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar('/catalogos/estados/nuevo')}><img src={iconoAgregar} alt="" /><span>Nuevo estado</span></button>}
        <BotonExportar deshabilitado={cargando} onExportar={exportar} />
        <form className={styles.busquedaGeneral} onSubmit={aplicarBusqueda}><div className={styles.controlBusquedaGeneral}><img className={styles.iconoBusquedaGeneral} src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={120} placeholder="Buscar estados" aria-label="Buscar estados" onChange={(evento) => { setBusquedaEntrada(evento.target.value); setErrorBusqueda(null) }} />{(busquedaEntrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusquedaEntrada(''); setBusqueda(''); ajustarPorBusqueda(''); setPagina(1); setErrorBusqueda(null) }}>×</button>}</div><small className={errorBusqueda ? styles.ayudaBusquedaInvalida : undefined}>{errorBusqueda ?? 'Busca por nombre, código o descripción.'}</small></form>
      </div></div>
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Estados registrados</strong><small>{cargando ? 'Actualizando información…' : 'Administra los estados generales disponibles en el sistema.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'estado' : 'estados'}</span>}{hayFiltros && <button type="button" onClick={limpiarTodo}>Limpiar filtros</button>}</div></div>
        {resultado?.items.length ? <><TablaDatos descripcion="Listado del catálogo de estados con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(estado) => estado.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'nombre', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="estado" unidadPlural="estados" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><span aria-hidden="true">⌁</span><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay estados activos registrados'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Crea el primer estado del catálogo.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar('/catalogos/estados/nuevo')}>Crear estado</button>}</div> : null}
      </article>
      <EstadoCatalogoInactivarModal estado={estadoAInactivar} onCerrar={() => setEstadoAInactivar(null)} onInactivado={(estado) => { setEstadoAInactivar(null); setMensajeExito(`El estado ${estado.nombre} fue desactivado correctamente.`); setRevision((valor) => valor + 1) }} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Estado desactivado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
    </section>
  )
}
