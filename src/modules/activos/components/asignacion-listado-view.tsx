import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoPdf from '../../../assets/acciones/pdf.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales } from '../../../shared/hooks/use-filtros-listado-activos'
import { descargarPdfAsignacion, exportarAsignaciones, listarAsignaciones, listarMisAsignaciones } from '../activos-api'
import type { AsignacionActivo, AsignacionesPaginadas, EstadoAsignacionActivo, EstadoRevisionAsignacionActivo, ListarAsignacionesParametros } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

const etiquetas: Record<EstadoAsignacionActivo, string> = { VIGENTE: 'Vigente', PARCIAL: 'Devolución parcial', CERRADA: 'Cerrada' }
const clases: Record<EstadoAsignacionActivo, string> = { VIGENTE: styles.vigente, PARCIAL: styles.parcial, CERRADA: styles.cerrada }
const etiquetasRevision: Record<EstadoRevisionAsignacionActivo, string> = { PENDIENTE: 'Pendiente de revisión', SIN_DEVOLUCION: 'Revisada sin devolución', CON_DEVOLUCION: 'Revisada con devolución', CONFIRMADA_LEGACY: 'Registro anterior confirmado' }
const valores = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) ? valor.filter((item): item is EstadoAsignacionActivo => ['VIGENTE', 'PARCIAL', 'CERRADA'].includes(String(item))) : undefined }
const fechaHora = (valor: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))

export function AsignacionListadoView({ permisos, onNavegar, propias = false }: { permisos: readonly string[]; onNavegar: (ruta: string) => void; propias?: boolean }) {
  const [resultado, setResultado] = useState<AsignacionesPaginadas | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtros, cambiarFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [error, setError] = useState<string | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [finalizada, setFinalizada] = useState('')
  const parametros = useMemo<ListarAsignacionesParametros>(() => { const orden = ordenamiento[0]; return { pagina, tamanoPagina, busqueda: busqueda || undefined, estados: valores(filtros, 'estado'), fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined, orden: (orden?.id ?? 'fecha') as ListarAsignacionesParametros['orden'], direccion: orden?.desc === false ? 'asc' : 'desc' } }, [busqueda, fechaDesde, fechaHasta, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision, propias }), [parametros, propias, revision])
  const cargando = clave !== finalizada

  useEffect(() => {
    const controlador = new AbortController()
    const cargar = propias ? listarMisAsignaciones : listarAsignaciones
    void cargar(parametros, controlador.signal).then((respuesta) => { setResultado(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las asignaciones.') }).finally(() => { if (!controlador.signal.aborted) setFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, parametros, propias])

  const descargarPdf = useCallback(async (asignacion: AsignacionActivo) => { try { await descargarPdfAsignacion(asignacion.id, asignacion.numeroActa) } catch (errorActual: unknown) { setErrorPdf(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible descargar el PDF de la asignación.') } }, [])
  const columnas = useMemo<ColumnaTabla<AsignacionActivo>[]>(() => [
    { id: 'numero', titulo: 'Acta', obtenerValor: (asignacion) => asignacion.numeroActa, ordenable: true, celda: (asignacion) => <strong>{asignacion.numeroActa}</strong> },
    { id: 'empleado', titulo: 'Empleado', obtenerValor: (asignacion) => `${asignacion.empleado.nombreCompleto} ${asignacion.empleado.codigo}`, ordenable: true, celda: (asignacion) => <div className={styles.identidad}><strong>{asignacion.empleado.nombreCompleto}</strong><small>{asignacion.empleado.codigo}{asignacion.empleado.puesto ? ` · ${asignacion.empleado.puesto}` : ''}</small></div> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (asignacion) => `${asignacion.sucursal.nombre} ${asignacion.sucursal.codigo}`, celda: (asignacion) => <div className={styles.identidad}><strong>{asignacion.sucursal.nombre}</strong><small>{asignacion.sucursal.codigo}</small></div> },
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (asignacion) => asignacion.fechaAsignacion, ordenable: true, celda: (asignacion) => fechaHora(asignacion.fechaAsignacion) },
    { id: 'activos', titulo: 'Activos', obtenerValor: (asignacion) => asignacion.cantidadActivos, celda: (asignacion) => <div className={styles.identidad}><strong>{asignacion.cantidadActivos}</strong><small>{asignacion.cantidadPendientes} pendientes</small></div> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (asignacion) => asignacion.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', buscable: false, opciones: Object.entries(etiquetas).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (asignacion) => <div className={styles.identidad}><span className={`${styles.estado} ${clases[asignacion.estado]}`}>{etiquetas[asignacion.estado]}</span><small>{etiquetasRevision[asignacion.revisionEmpleado.estado]}</small></div> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (asignacion) => asignacion.id, celda: (asignacion) => <div className={styles.accionesFila}><button type="button" title="Ver asignación" aria-label={`Ver asignación ${asignacion.numeroActa}`} onClick={() => onNavegar(`${propias ? '/activos/mis-asignaciones' : '/activos/asignaciones'}/${asignacion.id}`)}><img src={iconoVer} alt="" /></button>{!propias && permisos.includes('ACTIVOS.ASIGNACIONES.EXPORTAR') && <button type="button" title="Descargar PDF" aria-label={`Descargar PDF de ${asignacion.numeroActa}`} onClick={() => void descargarPdf(asignacion)}><img src={iconoPdf} alt="" /></button>}</div> },
  ], [descargarPdf, onNavegar, permisos, propias])

  const buscar = (evento: FormEvent) => { evento.preventDefault(); const valor = entrada.trim(); if (valor.length === 1) { setErrorBusqueda('Escribe al menos 2 caracteres para buscar.'); return }; if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) { setErrorBusqueda('La fecha final no puede ser anterior a la inicial.'); return }; setErrorBusqueda(null); setBusqueda(valor); setPagina(1) }
  const limpiar = () => { setEntrada(''); setBusqueda(''); setFechaDesde(''); setFechaHasta(''); cambiarFiltros([]); setOrdenamiento([{ id: 'fecha', desc: true }]); setPagina(1); setErrorBusqueda(null) }
  const exportar = async (formato: FormatoExportacion) => { if (propias) return; try { await exportarAsignaciones({ formato, busqueda: parametros.busqueda, estados: parametros.estados, fechaDesde: parametros.fechaDesde, fechaHasta: parametros.fechaHasta, orden: parametros.orden, direccion: parametros.direccion }) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar las asignaciones.') } }
  const hayFiltros = Boolean(busqueda || fechaDesde || fechaHasta) || hayFiltrosAdicionales(filtros)
  const seccion = propias ? 'Mis activos' : 'Asignaciones'

  return <section className={styles.pagina}><header className={styles.cabeceraPagina}><ActivosBreadcrumb seccion={seccion} onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1>{propias ? 'Mis activos asignados' : 'Asignaciones de activos'}</h1>{!propias && permisos.includes('ACTIVOS.ASIGNACIONES.CREAR') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/activos/asignaciones/nueva')}><img src={iconoAgregar} alt="" />Nueva asignación</button>}{!propias && permisos.includes('ACTIVOS.ASIGNACIONES.EXPORTAR') && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<form className={styles.busquedaGeneral} onSubmit={buscar}><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={entrada} maxLength={150} placeholder="Buscar asignaciones" aria-label="Buscar asignaciones" onChange={(evento) => { setEntrada(evento.target.value); setErrorBusqueda(null) }} />{(entrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={limpiar}>×</button>}</div><small className={errorBusqueda ? styles.errorCampo : undefined}>{errorBusqueda ?? 'Busca por acta, empleado, código o sucursal.'}</small></form></div><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="fechaDesde">Desde</label><input id="fechaDesde" type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); setPagina(1) }} /></div><div className={styles.campo}><label htmlFor="fechaHasta">Hasta</label><input id="fechaHasta" type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); setPagina(1) }} /></div></div></header>{error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}<article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>{propias ? 'Asignaciones recibidas' : 'Actas registradas'}</strong><small>{propias ? 'Revisa los activos que se encuentran bajo tu custodia.' : 'Consulta las asignaciones administrativas de todas las sucursales.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'asignación' : 'asignaciones'}</span>}{hayFiltros && <button type="button" onClick={limpiar}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion={propias ? 'Listado de mis asignaciones de activos' : 'Listado de asignaciones de activos'} datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(asignacion) => asignacion.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="asignación" unidadPlural="asignaciones" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'Sin asignaciones registradas'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : propias ? 'No tienes activos asignados.' : 'Crea la primera asignación de activos.'}</p></div> : null}</article><ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} /><ModalEstado abierto={Boolean(errorPdf)} tipo="error" titulo="No se pudo descargar el PDF" mensaje={errorPdf ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorPdf(null)} onCerrar={() => setErrorPdf(null)} /></section>
}
