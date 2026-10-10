import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import { listarDiasTurnosCaja, obtenerResumenOperativoCaja } from '../caja-api'
import { fechaActualCaja, formatearCentavos, formatearFecha } from '../caja-formatos'
import type { DiaTurnosCaja, ResultadoPaginado, ResumenOperativoCaja } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import { ResumenOperativoCaja as TarjetasResumen } from './resumen-operativo-caja'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }

const estadoConsolidacion = (estado: DiaTurnosCaja['estadoConsolidacion']) => estado ? estado.replaceAll('_', ' ').toLocaleLowerCase('es-GT').replace(/^./, (letra) => letra.toUpperCase()) : 'Sin consolidar'

export function TurnosDiaListadoView({ permisos, onNavegar }: Props) {
  const hoy = fechaActualCaja()
  const [resultado, setResultado] = useState<ResultadoPaginado<DiaTurnosCaja> | null>(null)
  const [resumen, setResumen] = useState<Extract<ResumenOperativoCaja, { recurso: 'turnos' }> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [error, setError] = useState<string | null>(null)
  const [errorResumen, setErrorResumen] = useState<string | null>(null)
  const [resumenSolicitudFinalizada, setResumenSolicitudFinalizada] = useState('')
  const [revision, setRevision] = useState(0)
  const parametros = useMemo(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, desde: desde || undefined, hasta: hasta || undefined, orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' as const : 'asc' as const }), [busqueda, desde, hasta, ordenamiento, pagina, tamanoPagina])
  const claveResumen = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const resumenCargando = resumenSolicitudFinalizada !== claveResumen

  useEffect(() => { const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400); return () => window.clearTimeout(temporizador) }, [busquedaEntrada])
  useEffect(() => { const controlador = new AbortController(); void listarDiasTurnosCaja(parametros, controlador.signal).then((respuesta) => { if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return } setResultado(respuesta); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar los días de operación.') }); return () => controlador.abort() }, [pagina, parametros, revision])
  useEffect(() => { const controlador = new AbortController(); void obtenerResumenOperativoCaja<Extract<ResumenOperativoCaja, { recurso: 'turnos' }>>('turnos', parametros, controlador.signal).then((respuesta) => { setResumen(respuesta); setErrorResumen(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setErrorResumen(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar el resumen de turnos.') }).finally(() => { if (!controlador.signal.aborted) setResumenSolicitudFinalizada(claveResumen) }); return () => controlador.abort() }, [claveResumen, parametros])

  const columnas = useMemo<ColumnaTabla<DiaTurnosCaja>[]>(() => [
    { id: 'fecha', titulo: 'Día de operación', obtenerValor: (dia) => dia.fechaNegocio, ordenable: true, celda: (dia) => <strong>{formatearFecha(dia.fechaNegocio)}</strong> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (dia) => dia.sucursalNombre, ordenable: true, celda: (dia) => <div className={styles.identidad}><strong>{dia.sucursalNombre}</strong><small>{dia.sucursalCodigo}</small></div> },
    { id: 'turnos', titulo: 'Turnos', obtenerValor: (dia) => dia.totalTurnos, ordenable: true, celda: (dia) => <div className={styles.identidad}><strong>{dia.totalTurnos}</strong><small>{dia.turnosAbiertos} abiertos · {dia.turnosCerrados} cerrados</small></div> },
    { id: 'fondo', titulo: 'Fondo del día', obtenerValor: (dia) => dia.fondoInicialCentavos, celda: (dia) => formatearCentavos(dia.fondoInicialCentavos) },
    { id: 'saldo', titulo: 'Saldo actual', obtenerValor: (dia) => dia.saldoConfirmadoCentavos, ordenable: true, celda: (dia) => <strong>{formatearCentavos(dia.saldoConfirmadoCentavos)}</strong> },
    { id: 'consolidacion', titulo: 'Consolidación', obtenerValor: (dia) => dia.estadoConsolidacion ?? '', celda: (dia) => <span className={`${styles.estado} ${dia.estadoConsolidacion === 'APROBADA' ? styles.estadoExito : styles.estadoAdvertencia}`}>{estadoConsolidacion(dia.estadoConsolidacion)}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (dia) => dia.id, celda: (dia) => <div className={styles.accionesFila}><button type="button" title="Ver turnos" aria-label={`Ver turnos del ${dia.fechaNegocio}`} onClick={() => onNavegar(`/caja/turnos/dia/${dia.fechaNegocio}?sucursalId=${encodeURIComponent(dia.sucursalId)}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar])
  const hayFiltros = Boolean(busqueda || desde !== hoy || hasta !== hoy)
  const indicadores = [
    { etiqueta: 'Saldo de caja', valor: formatearCentavos(resumen?.saldoCentavos), detalle: `${resumen?.turnosCantidad ?? 0} turnos en el período seleccionado`, tono: 'informacion' as const },
    { etiqueta: 'Ventas realizadas', valor: String(resumen?.ventasCantidad ?? 0), detalle: `${formatearCentavos(resumen?.ventasCentavos)} cobrados`, tono: 'entrada' as const },
  ]

  return <section className={styles.pagina} aria-labelledby="titulo-dias-turnos">
    <header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Turnos de caja" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-dias-turnos">Turnos de caja</h1>{permisos.includes('CAJA.TURNOS.ABRIR') && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/caja/turnos/nuevo')}><img src={iconoAgregar} alt="" />Abrir turno</button>}<div className={styles.busquedaGeneral}><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder="Buscar sucursal" aria-label="Buscar día por sucursal" onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></span></div></div></header>
    <div className={styles.filtrosGenerales} aria-label="Filtros por fecha"><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} /></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} /></label>{hayFiltros && <button type="button" onClick={() => { setBusquedaEntrada(''); setBusqueda(''); setDesde(hoy); setHasta(hoy); setPagina(1) }}>Restablecer filtros</button>}</div>
    <TarjetasResumen indicadores={indicadores} cargando={resumenCargando} error={errorResumen} onReintentar={() => setRevision((valor) => valor + 1)} />
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla}><div className={styles.resumenTabla}><div><strong>Días de operación</strong><small>Abre un día para consultar sus turnos, movimientos y ventas.</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} días</span>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Turnos agrupados por día" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(dia) => dia.id} onFiltrosChange={() => undefined} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="día" unidadPlural="días" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !error && resultado ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay días de operación'}</h2><p>{hayFiltros ? 'Ajusta los filtros aplicados.' : 'Los días aparecerán al abrir el primer turno.'}</p></div> : null}</article>
  </section>
}
