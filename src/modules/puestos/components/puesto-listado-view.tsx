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
import { exportarPuestos, listarDepartamentosParaPuestos, listarPuestos } from '../puesto-api'
import type { DepartamentoDisponiblePuesto, DireccionPuesto, EstadoPuesto, ListarPuestosParametros, OrdenPuesto, Puesto, PuestosPaginados } from '../puesto.types'
import { PuestoBreadcrumb } from './puesto-breadcrumb'
import { PuestoInactivarModal } from './puesto-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
const valorTexto = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return typeof valor === 'string' && valor ? valor : undefined }
const valores = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) && valor.length ? valor.filter((item): item is string => typeof item === 'string') : undefined }
function validarBusqueda(valor: string): string | null { const limpio = valor.trim(); if (limpio.length === 1) return 'Escribe al menos 2 caracteres para buscar.'; if (limpio.length > 150) return 'La búsqueda no puede superar 150 caracteres.'; return null }

export function PuestoListadoView({ permisos, onNavegar }: Props) {
  const [resultado, setResultado] = useState<PuestosPaginados | null>(null)
  const [departamentos, setDepartamentos] = useState<DepartamentoDisponiblePuesto[]>([])
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'nombre', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorDepartamentos, setErrorDepartamentos] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [revision, setRevision] = useState(0)
  const [puestoAInactivar, setPuestoAInactivar] = useState<Puesto | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const puedeCrear = permisos.includes('ORGANIZACION.PUESTOS.CREAR')
  const puedeEditar = permisos.includes('ORGANIZACION.PUESTOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ORGANIZACION.PUESTOS.INACTIVAR')
  const parametros = useMemo<ListarPuestosParametros>(() => { const orden = ordenamiento[0]; return { pagina, tamanoPagina, busqueda: busqueda || undefined, puesto: valorTexto(filtros, 'nombre'), departamentos: valores(filtros, 'departamento'), estados: valores(filtros, 'estado') as EstadoPuesto[] | undefined, orden: (orden?.id ?? 'nombre') as OrdenPuesto, direccion: (orden?.desc ? 'desc' : 'asc') as DireccionPuesto } }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => { const controlador = new AbortController(); void listarDepartamentosParaPuestos(controlador.signal).then((respuesta) => { setDepartamentos(respuesta); setErrorDepartamentos(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorDepartamentos(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los departamentos.') }); return () => controlador.abort() }, [revision])
  useEffect(() => { const controlador = new AbortController(); void listarPuestos(parametros, controlador.signal).then((respuesta) => { setResultado(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los puestos.') }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) }); return () => controlador.abort() }, [clave, parametros])

  const opcionesDepartamentos = useMemo(() => departamentos.map((departamento) => ({ valor: departamento.id, etiqueta: `${departamento.codigo} — ${departamento.nombre}` })), [departamentos])
  const columnas = useMemo<ColumnaTabla<Puesto>[]>(() => [
    { id: 'nombre', titulo: 'Puesto', obtenerValor: (puesto) => `${puesto.nombre} ${puesto.codigo}`, ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar puesto', placeholder: 'Nombre o código' }, celda: (puesto) => <div className={styles.identidadRol}><strong>{puesto.nombre}</strong><small>{puesto.codigo}</small></div> },
    { id: 'departamento', titulo: 'Departamento', obtenerValor: (puesto) => puesto.departamentoOrganizacionalNombre, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar departamento', opciones: opcionesDepartamentos }, celda: (puesto) => <div className={styles.identidadRol}><strong>{puesto.departamentoOrganizacionalNombre}</strong><small>{puesto.departamentoOrganizacionalCodigo}</small></div> },
    { id: 'descripcion', titulo: 'Descripción', obtenerValor: (puesto) => puesto.descripcion ?? '', celda: (puesto) => puesto.descripcion ?? <span className={styles.sinDato}>Sin descripción</span> },
    { id: 'estado', titulo: 'Situación', obtenerValor: (puesto) => puesto.activo ? 'ACTIVO' : 'INACTIVO', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar situación', buscable: false, opciones: [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'INACTIVO', etiqueta: 'Inactivo' }] }, celda: (puesto) => <span className={`${styles.estado} ${puesto.activo ? styles.activo : styles.inactivo}`}>{puesto.activo ? 'Activo' : 'Inactivo'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (puesto) => puesto.id, celda: (puesto) => <div className={styles.accionesFila}><button type="button" title="Ver puesto" aria-label={`Ver puesto ${puesto.nombre}`} onClick={() => onNavegar(`/organizacion/puestos/${puesto.id}`)}><img src={iconoVer} alt="" /></button>{puedeEditar && <button type="button" title="Editar puesto" aria-label={`Editar puesto ${puesto.nombre}`} onClick={() => onNavegar(`/organizacion/puestos/${puesto.id}/editar`)}><img src={iconoEditar} alt="" /></button>}{puedeInactivar && puesto.activo && <button className={styles.accionPeligro} type="button" title="Desactivar puesto" aria-label={`Desactivar puesto ${puesto.nombre}`} onClick={() => setPuestoAInactivar(puesto)}><img src={iconoEliminar} alt="" /></button>}</div> },
  ], [onNavegar, opcionesDepartamentos, puedeEditar, puedeInactivar])

  const aplicarBusqueda = (evento: FormEvent) => { evento.preventDefault(); const validacion = validarBusqueda(busquedaEntrada); setErrorBusqueda(validacion); if (!validacion) { const termino = busquedaEntrada.trim(); ajustarPorBusqueda(termino); setBusqueda(termino); setPagina(1) } }
  const hayFiltros = Boolean(busqueda) || hayFiltrosAdicionales(filtros)
  const limpiarTodo = () => { setBusquedaEntrada(''); setBusqueda(''); restablecerFiltros(); setPagina(1); setErrorBusqueda(null) }
  const exportar = async (formato: FormatoExportacion) => { try { await exportarPuestos({ formato, busqueda: parametros.busqueda, puesto: parametros.puesto, departamentos: parametros.departamentos, estados: parametros.estados, orden: parametros.orden, direccion: parametros.direccion }) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar los puestos.') } }

  return <section className={styles.pagina}><div className={styles.cabeceraPagina}><PuestoBreadcrumb onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1>Puestos organizacionales</h1>{puedeCrear && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar('/organizacion/puestos/nuevo')}><img src={iconoAgregar} alt="" /><span>Nuevo puesto</span></button>}<BotonExportar deshabilitado={cargando} onExportar={exportar} /><form className={styles.busquedaGeneral} onSubmit={aplicarBusqueda}><div className={styles.controlBusquedaGeneral}><img className={styles.iconoBusquedaGeneral} src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder="Buscar puestos" aria-label="Buscar puestos" onChange={(evento) => { setBusquedaEntrada(evento.target.value); setErrorBusqueda(null) }} />{(busquedaEntrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusquedaEntrada(''); setBusqueda(''); ajustarPorBusqueda(''); setPagina(1); setErrorBusqueda(null) }}>×</button>}</div><small className={errorBusqueda ? styles.ayudaBusquedaInvalida : undefined}>{errorBusqueda ?? 'Busca por puesto, código, descripción o departamento.'}</small></form></div></div>{(error || errorDepartamentos) && <div className={styles.alertaError} role="alert"><p>{error ?? errorDepartamentos}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}<article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Puestos registrados</strong><small>{cargando ? 'Actualizando información…' : 'Administra los cargos definidos dentro de cada departamento.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'puesto' : 'puestos'}</span>}{hayFiltros && <button type="button" onClick={limpiarTodo}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Listado de puestos organizacionales con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(puesto) => puesto.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'nombre', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="puesto" unidadPlural="puestos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><span aria-hidden="true">⌁</span><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay puestos activos registrados'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Crea el primer puesto organizacional.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar('/organizacion/puestos/nuevo')}>Crear puesto</button>}</div> : null}</article><PuestoInactivarModal puesto={puestoAInactivar} onCerrar={() => setPuestoAInactivar(null)} onInactivado={(puesto) => { setPuestoAInactivar(null); setMensajeExito(`El puesto ${puesto.nombre} fue desactivado correctamente.`); setRevision((valor) => valor + 1) }} /><ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Puesto desactivado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} /><ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} /></section>
}
