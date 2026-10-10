import { useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarActivos, listarActivos, obtenerOpcionesRegistroActivo } from '../activos-api'
import type { Activo, ActivosPaginados, ListarActivosParametros, OpcionesRegistroActivo, SituacionActivo } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

const etiquetasSituacion: Record<SituacionActivo, string> = { DISPONIBLE: 'Disponible', ASIGNADO: 'Asignado', MANTENIMIENTO: 'Mantenimiento', BAJA: 'Baja' }
const clasesSituacion: Record<SituacionActivo, string> = { DISPONIBLE: styles.disponible, ASIGNADO: styles.asignado, MANTENIMIENTO: styles.mantenimiento, BAJA: styles.baja }
const valores = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined }

export function ActivoListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<ActivosPaginados | null>(null)
  const [opciones, setOpciones] = useState<OpcionesRegistroActivo | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, cambiarFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'codigo', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [finalizada, setFinalizada] = useState('')
  const parametros = useMemo<ListarActivosParametros>(() => { const orden = ordenamiento[0]; return { pagina, tamanoPagina, busqueda: busqueda || undefined, sucursalIds: valores(filtros, 'sucursal'), tipoActivoIds: valores(filtros, 'tipo'), condicionIds: valores(filtros, 'condicion'), situaciones: valores(filtros, 'situacion') as SituacionActivo[] | undefined, orden: (orden?.id ?? 'codigo') as ListarActivosParametros['orden'], direccion: orden?.desc ? 'desc' : 'asc' } }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = clave !== finalizada

  useEffect(() => { const controlador = new AbortController(); void obtenerOpcionesRegistroActivo(controlador.signal).then(setOpciones).catch(() => undefined); return () => controlador.abort() }, [])
  useEffect(() => { const controlador = new AbortController(); void listarActivos(parametros, controlador.signal).then((respuesta) => { setResultado(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los activos.') }).finally(() => { if (!controlador.signal.aborted) setFinalizada(clave) }); return () => controlador.abort() }, [clave, parametros])

  const columnas = useMemo<ColumnaTabla<Activo>[]>(() => [
    { id: 'codigo', titulo: 'Activo', obtenerValor: (activo) => `${activo.codigoInterno} ${activo.tipoActivo.nombre}`, ordenable: true, celda: (activo) => <div className={styles.identidad}><strong>{activo.codigoInterno}</strong><small>{activo.tipoActivo.nombre}</small></div> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (activo) => activo.sucursal.id, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar sucursales', buscable: true, opciones: (opciones?.sucursales ?? []).map((sucursal) => ({ valor: sucursal.id, etiqueta: `${sucursal.codigo} · ${sucursal.nombre}` })) }, celda: (activo) => <div className={styles.identidad}><strong>{activo.sucursal.nombre}</strong><small>{activo.sucursal.codigo}</small></div> },
    { id: 'tipo', titulo: 'Tipo', obtenerValor: (activo) => activo.tipoActivo.id, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos', buscable: true, opciones: (opciones?.tipos ?? []).map((tipo) => ({ valor: tipo.id, etiqueta: `${tipo.prefijo} · ${tipo.nombre}` })) }, celda: (activo) => activo.tipoActivo.nombre },
    { id: 'descripcion', titulo: 'Descripción', obtenerValor: (activo) => [activo.marca, activo.modelo, activo.numeroSerie].filter(Boolean).join(' '), celda: (activo) => <div className={styles.identidad}><strong>{[activo.marca, activo.modelo].filter(Boolean).join(' ') || 'Sin marca o modelo'}</strong><small>{activo.numeroSerie ? `Serie: ${activo.numeroSerie}` : 'Sin número de serie'}</small></div> },
    { id: 'condicion', titulo: 'Condición', obtenerValor: (activo) => activo.condicion.id, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar condiciones', buscable: true, opciones: (opciones?.condiciones ?? []).map((condicion) => ({ valor: condicion.id, etiqueta: condicion.nombre })) }, celda: (activo) => activo.condicion.nombre },
    { id: 'situacion', titulo: 'Situación', obtenerValor: (activo) => activo.situacion, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar situaciones', buscable: false, opciones: Object.entries(etiquetasSituacion).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (activo) => <span className={`${styles.estado} ${clasesSituacion[activo.situacion]}`}>{etiquetasSituacion[activo.situacion]}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (activo) => activo.id, celda: (activo) => <div className={styles.accionesFila}><button type="button" title="Ver activo" aria-label={`Ver activo ${activo.codigoInterno}`} onClick={() => onNavegar(`/activos/${activo.id}`)}><img src={iconoVer} alt="" /></button>{permisos.includes('ACTIVOS.ACTIVOS.ACTUALIZAR') && activo.situacion !== 'BAJA' && <button type="button" title="Editar activo" aria-label={`Editar activo ${activo.codigoInterno}`} onClick={() => onNavegar(`/activos/${activo.id}/editar`)}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [onNavegar, opciones, permisos])

  const buscar = (evento: FormEvent) => { evento.preventDefault(); const valor = entrada.trim(); if (valor.length === 1) { setErrorBusqueda('Escribe al menos 2 caracteres para buscar.'); return }; setErrorBusqueda(null); setBusqueda(valor); setPagina(1) }
  const limpiar = () => { setEntrada(''); setBusqueda(''); cambiarFiltros([]); setOrdenamiento([{ id: 'codigo', desc: false }]); setPagina(1); setErrorBusqueda(null) }
  const exportar = async (formato: FormatoExportacion) => { try { await exportarActivos({ formato, busqueda: parametros.busqueda, sucursalIds: parametros.sucursalIds, tipoActivoIds: parametros.tipoActivoIds, condicionIds: parametros.condicionIds, situaciones: parametros.situaciones, orden: parametros.orden, direccion: parametros.direccion }) } catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar los activos.') } }
  const hayFiltros = Boolean(busqueda) || hayFiltrosAdicionales(filtros)

  return <section className={styles.pagina}><header className={styles.cabeceraPagina}><ActivosBreadcrumb onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1>Activos administrativos</h1>{permisos.includes('ACTIVOS.ACTIVOS.CREAR') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/activos/nuevo')}><img src={iconoAgregar} alt="" />Nuevo activo</button>}{permisos.includes('ACTIVOS.ACTIVOS.EXPORTAR') && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<form className={styles.busquedaGeneral} onSubmit={buscar}><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={entrada} maxLength={150} placeholder="Buscar activos" aria-label="Buscar activos" onChange={(evento) => { setEntrada(evento.target.value); setErrorBusqueda(null) }} />{(entrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={limpiar}>×</button>}</div><small className={errorBusqueda ? styles.errorCampo : undefined}>{errorBusqueda ?? 'Busca por código, tipo, marca, modelo o serie.'}</small></form></div></header>{error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}<article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Activos registrados</strong><small>Bienes administrativos bajo control de las sucursales.</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'activo' : 'activos'}</span>}{hayFiltros && <button type="button" onClick={limpiar}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Listado de activos administrativos con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(activo) => activo.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'codigo', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="activo" unidadPlural="activos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'Sin activos registrados'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Registra el primer activo administrativo.'}</p>{!hayFiltros && permisos.includes('ACTIVOS.ACTIVOS.CREAR') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/activos/nuevo')}>Registrar activo</button>}</div> : null}</article><ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} /></section>
}
