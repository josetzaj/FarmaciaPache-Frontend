import { useCallback, useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoPdf from '../../../assets/acciones/pdf.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { exportarPeriodoPlanilla, listarPeriodosPlanilla, obtenerOpcionesPlanilla } from '../planilla-api'
import { formatearCentavos, nombresMes, periodoTexto } from '../planilla-formatos'
import type { EstadoPeriodoPlanilla, OpcionesPlanilla, PeriodoPlanillaResumen, PeriodosPlanillaPaginados } from '../planilla.types'
import { PlanillaBreadcrumb } from './planilla-breadcrumb'
import styles from './planilla.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
const opcionesVacias: OpcionesPlanilla = { sucursales: [] }
const valores = (filtros: ColumnFiltersState, id: string) => {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}
const valorTexto = (filtros: ColumnFiltersState, id: string) => {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}
const valorOpcion = (filtros: ColumnFiltersState, id: string) => valores(filtros, id)?.[0]

export function PlanillaListadoView({ permisos, onNavegar }: Props) {
  const [resultado, setResultado] = useState<PeriodosPlanillaPaginados | null>(null)
  const [opciones, setOpciones] = useState<OpcionesPlanilla>(opcionesVacias)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'periodo', desc: true }])
  const [error, setError] = useState<string | null>(null)
  const [errorConstancia, setErrorConstancia] = useState<string | null>(null)
  const [descargandoConstanciaId, setDescargandoConstanciaId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeGenerar = permisos.includes('PLANILLAS.PERIODOS.GENERAR')
  const puedeVerSalarios = permisos.includes('PLANILLAS.CONFIGURACION_SALARIAL.VER')
  const puedeGestionar = permisos.includes('PLANILLAS.PERIODOS.ACTUALIZAR') || permisos.includes('PLANILLAS.PERIODOS.CERRAR')
  const puedeExportar = permisos.includes('PLANILLAS.PERIODOS.EXPORTAR')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesPlanilla(controlador.signal).then(setOpciones).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las sucursales.')
    })
    return () => controlador.abort()
  }, [])

  const parametros = useMemo(() => {
    const orden = ordenamiento[0]
    const anioTexto = valorTexto(filtros, 'periodo')
    return {
      pagina, tamanoPagina,
      anio: anioTexto && /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : undefined,
      meses: valores(filtros, 'mes')?.map(Number),
      estados: valores(filtros, 'estado') as EstadoPeriodoPlanilla[] | undefined,
      sucursalId: valorOpcion(filtros, 'sucursal'),
      orden: (['periodo', 'sucursal', 'total', 'estado'].includes(orden?.id ?? '') ? orden!.id : 'periodo') as 'periodo' | 'sucursal' | 'total' | 'estado',
      direccion: orden?.desc ? 'desc' as const : 'asc' as const,
    }
  }, [filtros, ordenamiento, pagina, tamanoPagina])

  useEffect(() => {
    const controlador = new AbortController()
    void listarPeriodosPlanilla(parametros, controlador.signal).then((datos) => {
      if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }
      setResultado(datos); setError(null)
    }).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las planillas.')
    })
    return () => controlador.abort()
  }, [pagina, parametros, revision])

  const descargarConstancia = useCallback(async (periodo: PeriodoPlanillaResumen) => {
    setDescargandoConstanciaId(periodo.id)
    setErrorConstancia(null)
    try {
      await exportarPeriodoPlanilla(periodo.id, 'pdf')
    } catch (actual) {
      setErrorConstancia(actual instanceof ErrorApi ? actual.message : `No fue posible descargar la constancia de ${periodoTexto(periodo.anio, periodo.mes)}.`)
    } finally {
      setDescargandoConstanciaId(null)
    }
  }, [])

  const columnas = useMemo<ColumnaTabla<PeriodoPlanillaResumen>[]>(() => [
    { id: 'periodo', titulo: 'Año', obtenerValor: (item) => item.anio, ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar año', placeholder: 'Ej. 2026' }, celda: (item) => <strong>{item.anio}</strong> },
    { id: 'mes', titulo: 'Mes', obtenerValor: (item) => item.mes, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar meses', buscable: false, opciones: nombresMes.map((nombre, indice) => ({ valor: String(indice + 1), etiqueta: nombre })) }, celda: (item) => nombresMes[item.mes - 1] },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => item.sucursal.nombre, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar sucursal', buscable: true, opciones: opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })) }, celda: (item) => <div className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></div> },
    { id: 'empleados', titulo: 'Empleados', obtenerValor: (item) => item.cantidadEmpleados, celda: (item) => item.cantidadEmpleados },
    { id: 'total', titulo: 'Total', obtenerValor: (item) => item.totalCentavos, ordenable: true, celda: (item) => <strong>{formatearCentavos(item.totalCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', buscable: false, opciones: [{ valor: 'BORRADOR', etiqueta: 'Borrador' }, { valor: 'CERRADA', etiqueta: 'Cerrada' }] }, celda: (item) => <span className={`${styles.estado} ${item.estado === 'CERRADA' ? styles.cerrada : styles.borrador}`}>{item.estado === 'CERRADA' ? 'Cerrada' : 'Borrador'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button className={styles.botonTabla} type="button" onClick={() => onNavegar(`/planillas/${item.id}`)}>Ver {periodoTexto(item.anio, item.mes)}</button>{puedeGestionar && item.estado === 'BORRADOR' && <button className={styles.botonAccionIcono} type="button" title={`Editar planilla de ${periodoTexto(item.anio, item.mes)}`} aria-label={`Editar planilla de ${periodoTexto(item.anio, item.mes)}`} onClick={() => onNavegar(`/planillas/${item.id}/editar`)}><img src={iconoEditar} alt="" /></button>}{puedeExportar && item.estado === 'CERRADA' && <button className={styles.botonAccionIcono} type="button" title={`Descargar constancia PDF de ${periodoTexto(item.anio, item.mes)}`} aria-label={`Descargar constancia PDF de ${periodoTexto(item.anio, item.mes)}`} disabled={descargandoConstanciaId === item.id} onClick={() => void descargarConstancia(item)}><img src={iconoPdf} alt="" /></button>}</div> },
  ], [descargarConstancia, descargandoConstanciaId, onNavegar, opciones.sucursales, puedeExportar, puedeGestionar])

  return <>
    <main className={styles.pagina}>
      <PlanillaBreadcrumb onNavegar={onNavegar} />
      <header className={styles.cabecera}><div><h1>Planillas</h1><p>Historial mensual por sucursal, con totales derivados y cierre inmutable.</p></div><div className={styles.acciones}>{puedeVerSalarios && <button className={styles.botonAccent} type="button" onClick={() => onNavegar('/planillas/configuracion-salarial')}>Configuración salarial</button>}{puedeGenerar && <button className={styles.botonNuevoPeriodo} type="button" onClick={() => onNavegar('/planillas/nuevo')}><img src={iconoAgregar} alt="" />Generar nuevo mes</button>}</div></header>
      <section className={`${styles.panel} ${styles.panelListado}`} aria-busy={!resultado && !error}>
        <div className={styles.resumenTabla}><div><strong>Períodos registrados</strong><small>Los gerentes consultan únicamente las planillas de la sucursal de su sesión.</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'planilla' : 'planillas'}</span>}{filtros.length > 0 && <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>Limpiar filtros</button>}</div></div>
        {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
        {!resultado && !error && <p className={styles.mensaje} role="status">Cargando planillas…</p>}
        {resultado?.items.length === 0 && <p className={styles.mensaje}>Todavía no existen planillas para los criterios seleccionados.</p>}
        {resultado && resultado.items.length > 0 && <><TablaDatos descripcion="Historial de planillas mensuales" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(nuevos) => { setFiltros(nuevos); setPagina(1) }} onOrdenamientoChange={(nuevo) => { setOrdenamiento(nuevo); setPagina(1) }} /><PaginacionTabla pagina={pagina} tamanoPagina={tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="planilla" unidadPlural="planillas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></>}
      </section>
    </main>
    <ModalEstado abierto={Boolean(errorConstancia)} tipo="error" titulo="No se pudo descargar la constancia" mensaje={errorConstancia ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorConstancia(null)} onCerrar={() => setErrorConstancia(null)} />
  </>
}

