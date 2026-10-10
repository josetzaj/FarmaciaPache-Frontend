import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { listarConfiguracionSalarial, obtenerOpcionesPlanilla } from '../planilla-api'
import { formatearCentavos } from '../planilla-formatos'
import type { ConfiguracionSalarialEmpleado, ConfiguracionSalarialPaginada, OpcionesPlanilla } from '../planilla.types'
import { PlanillaBreadcrumb } from './planilla-breadcrumb'
import styles from './planilla.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
const opcionesVacias: OpcionesPlanilla = { sucursales: [] }
const valores = (filtros: ColumnFiltersState, id: string) => {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}
const valorOpcion = (filtros: ColumnFiltersState, id: string) => valores(filtros, id)?.[0]

export function ConfiguracionSalarialListadoView({ permisos, onNavegar }: Props) {
  const [resultado, setResultado] = useState<ConfiguracionSalarialPaginada | null>(null)
  const [opciones, setOpciones] = useState<OpcionesPlanilla>(opcionesVacias)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'empleado', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeActualizar = permisos.includes('PLANILLAS.CONFIGURACION_SALARIAL.ACTUALIZAR')

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesPlanilla(controlador.signal).then(setOpciones).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las sucursales.')
    })
    return () => controlador.abort()
  }, [])

  const parametros = useMemo(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || undefined,
      sucursalId: valorOpcion(filtros, 'sucursal'),
      estadosConfiguracion: valores(filtros, 'estado') as Array<'CONFIGURADO' | 'SIN_CONFIGURAR'> | undefined,
      orden: (orden?.id === 'sucursal' ? 'sucursal' : 'empleado') as 'empleado' | 'sucursal',
      direccion: orden?.desc ? 'desc' as const : 'asc' as const,
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])

  useEffect(() => {
    const controlador = new AbortController()
    void listarConfiguracionSalarial(parametros, controlador.signal).then((datos) => {
      if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }
      setResultado(datos); setError(null)
    }).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la configuración salarial.')
    })
    return () => controlador.abort()
  }, [pagina, parametros, revision])

  const columnas = useMemo<ColumnaTabla<ConfiguracionSalarialEmpleado>[]>(() => [
    {
      id: 'empleado', titulo: 'Empleado', obtenerValor: (item) => item.empleadoNombre, ordenable: true,
      celda: (item) => <div className={styles.identidad}><strong>{item.empleadoNombre}</strong><small>{item.empleadoCodigo} · {item.puestoNombre ?? 'Sin puesto'}</small></div>,
    },
    {
      id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => item.sucursal.nombre, ordenable: true,
      filtro: { tipo: 'opciones', etiqueta: 'Seleccionar sucursal', buscable: true, opciones: opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })) },
      celda: (item) => <div className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></div>,
    },
    { id: 'salario', titulo: 'Salario vigente', obtenerValor: (item) => item.condicionActual?.salarioBaseCentavos ?? -1, celda: (item) => item.condicionActual ? <strong>{formatearCentavos(item.condicionActual.salarioBaseCentavos)}</strong> : <span className={styles.datoSecundario}>Sin configurar</span> },
    { id: 'vigencia', titulo: 'Vigente desde', obtenerValor: (item) => item.condicionActual?.vigenteDesde ?? '', celda: (item) => item.condicionActual?.vigenteDesde ?? 'Sin fecha' },
    {
      id: 'estado', titulo: 'Configuración', obtenerValor: (item) => item.condicionActual ? 'CONFIGURADO' : 'SIN_CONFIGURAR',
      filtro: { tipo: 'opciones', etiqueta: 'Estado de configuración', buscable: false, opciones: [{ valor: 'CONFIGURADO', etiqueta: 'Configurado' }, { valor: 'SIN_CONFIGURAR', etiqueta: 'Sin configurar' }] },
      celda: (item) => <span className={`${styles.estado} ${item.condicionActual ? styles.configurado : styles.sinConfigurar}`}>{item.condicionActual ? 'Configurado' : 'Sin configurar'}</span>,
    },
    {
      id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '',
      celda: (item) => <div className={styles.accionesFila}><button className={styles.botonAccionIcono} type="button" title={puedeActualizar ? 'Configurar salario' : 'Ver historial salarial'} aria-label={`${puedeActualizar ? 'Configurar salario de' : 'Ver historial salarial de'} ${item.empleadoNombre}`} onClick={() => onNavegar(`/planillas/configuracion-salarial/${item.empleadoId}`)}><img src={puedeActualizar ? iconoEditar : iconoVer} alt="" /></button></div>,
    },
  ], [onNavegar, opciones.sucursales, puedeActualizar])

  const hayCriterios = Boolean(busqueda) || filtros.length > 0
  const limpiarCriterios = () => {
    setBusquedaEntrada('')
    setBusqueda('')
    setFiltros([])
    setPagina(1)
  }

  return <main className={styles.pagina}>
    <header className={styles.cabeceraPagina}>
      <PlanillaBreadcrumb actual="Configuración salarial" onNavegar={onNavegar} />
      <div className={styles.filaCabecera}>
        <div className={styles.tituloListado}><h1>Configuración salarial</h1><p>Administra el salario base por vigencias sin duplicar empleados ni reescribir el historial.</p></div>
        <button className={styles.botonAccent} type="button" onClick={() => onNavegar('/planillas')}>Ver planillas</button>
        <div className={styles.busquedaGeneral}>
          <div className={styles.controlBusqueda}>
            <img src={iconoBusqueda} alt="" />
            <input id="buscar-salario" type="search" value={busquedaEntrada} onChange={(event) => setBusquedaEntrada(event.target.value)} placeholder="Buscar empleados" aria-label="Buscar empleados" />
            {busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusquedaEntrada(''); setBusqueda(''); setPagina(1) }}>×</button>}
          </div>
          <small>Busca por nombre o código de empleado.</small>
        </div>
      </div>
    </header>
    <section className={`${styles.panel} ${styles.panelListado}`} aria-busy={!resultado && !error}>
      <div className={styles.resumenTabla}><div><strong>Empleados y salarios</strong><small>Salario vigente utilizado como referencia para generar futuras planillas.</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'empleado' : 'empleados'}</span>}{hayCriterios && <button type="button" onClick={limpiarCriterios}>Limpiar filtros</button>}</div></div>
      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {!resultado && !error && <p className={styles.mensaje} role="status">Cargando empleados…</p>}
      {resultado?.items.length === 0 && <p className={styles.mensaje}>No hay empleados que coincidan con los criterios.</p>}
      {resultado && resultado.items.length > 0 && <><TablaDatos descripcion="Configuración salarial de empleados" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.empleadoId} onFiltrosChange={(nuevos) => { setFiltros(nuevos); setPagina(1) }} onOrdenamientoChange={(nuevo) => { setOrdenamiento(nuevo); setPagina(1) }} /><PaginacionTabla pagina={pagina} tamanoPagina={tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="empleado" unidadPlural="empleados" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></>}
    </section>
  </main>
}

