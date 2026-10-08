import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { exportarCaja, listarCaja, obtenerOpcionesCaja } from '../caja-api'
import {
  convertirQuetzalesACentavos,
  etiquetasEfecto,
  etiquetasEstadoMovimiento,
  etiquetasEstadoTurno,
  etiquetasTipoCaja,
  etiquetasTipoMovimiento,
  formatearCentavos,
  formatearFecha,
  formatearFechaHora,
} from '../caja-formatos'
import type {
  ConsultaCaja,
  EstadoMovimientoCaja,
  EstadoTurnoCaja,
  MovimientoCaja,
  OpcionesFiltrosCaja,
  RecursoCaja,
  ResultadoPaginado,
  TurnoCaja,
} from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
type RegistroCaja = TurnoCaja | MovimientoCaja

const opcionesIniciales: OpcionesFiltrosCaja = {
  cajas: { opciones: [], estados: [], tipos: [] },
  sucursales: [],
  turnos: { estados: [] },
  movimientos: { estados: [], tipos: [] },
  arqueos: { estados: [], tipos: [] },
  cierres: { estados: [] },
  transferencias: { estados: [], custodias: [] },
  depositos: { estados: [] },
  tamanosPagina: [50, 100, 150, 200],
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}

function claseEstadoTurno(estado: EstadoTurnoCaja): string {
  if (estado === 'ABIERTO' || estado === 'REABIERTO') return styles.estadoExito
  if (estado === 'CERRADO') return styles.estadoNeutral
  if (estado === 'INVESTIGACION') return styles.estadoPeligro
  return styles.estadoAdvertencia
}

function claseEstadoMovimiento(estado: EstadoMovimientoCaja): string {
  if (estado === 'CONFIRMADO') return styles.estadoExito
  if (estado === 'INVESTIGACION') return styles.estadoPeligro
  if (estado === 'REGISTRADO') return styles.estadoAdvertencia
  return styles.estadoNeutral
}

function CajaListadoView({ recurso, permisos, onNavegar }: Props & { recurso: RecursoCaja }) {
  const esTurnos = recurso === 'turnos'
  const [resultado, setResultado] = useState<ResultadoPaginado<RegistroCaja> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosCaja>(opcionesIniciales)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [montoMinimo, setMontoMinimo] = useState('')
  const [montoMaximo, setMontoMaximo] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const cajaIdsFiltradas = useMemo(() => {
    const cajasSeleccionadas = valoresFiltro(filtros, 'caja')
    const tiposSeleccionados = valoresFiltro(filtros, 'tipoCaja')
    if (!tiposSeleccionados?.length) return cajasSeleccionadas
    const cajasDelTipo = opciones.cajas.opciones.filter((caja) => tiposSeleccionados.includes(caja.tipo)).map((caja) => caja.id)
    return cajasSeleccionadas?.length ? cajasSeleccionadas.filter((id) => cajasDelTipo.includes(id)) : cajasDelTipo
  }, [filtros, opciones.cajas.opciones])

  const parametros = useMemo<ConsultaCaja>(() => ({
    pagina,
    tamanoPagina,
    busqueda: busqueda || undefined,
    sucursalIds: valoresFiltro(filtros, 'sucursal'),
    cajaIds: cajaIdsFiltradas,
    estados: valoresFiltro(filtros, 'estado'),
    tipos: esTurnos ? undefined : valoresFiltro(filtros, 'tipo'),
    desde: desde || undefined,
    hasta: hasta || undefined,
    montoMinCentavos: montoMinimo ? convertirQuetzalesACentavos(montoMinimo) ?? undefined : undefined,
    montoMaxCentavos: montoMaximo ? convertirQuetzalesACentavos(montoMaximo) ?? undefined : undefined,
    orden: ordenamiento[0]?.id ?? 'fecha',
    direccion: ordenamiento[0]?.desc ? 'desc' : 'asc',
  }), [busqueda, cajaIdsFiltradas, desde, esTurnos, filtros, hasta, montoMaximo, montoMinimo, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ recurso, parametros, revision }), [parametros, recurso, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesCaja(controlador.signal)
      .then((respuesta) => { setOpciones(respuesta); setErrorOpciones(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorOpciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las opciones de filtros.')
      })
    return () => controlador.abort()
  }, [revision])

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' '))
      setPagina(1)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<RegistroCaja>(recurso, parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setResultado(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : `No fue posible cargar ${esTurnos ? 'los turnos' : 'los movimientos'}.`)
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, esTurnos, pagina, parametros, recurso])

  const opcionesSucursales = opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo }))
  const columnasTurnos = useMemo<ColumnaTabla<TurnoCaja>[]>(() => [
    { id: 'numero', titulo: 'Turno', obtenerValor: (turno) => turno.numero, ordenable: true, celda: (turno) => <div className={styles.identidad}><strong>{turno.numero}</strong><small>{formatearFecha(turno.fechaNegocio)}</small></div> },
    { id: 'caja', titulo: 'Caja', obtenerValor: (turno) => turno.caja?.nombre ?? '', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar cajas', multiple: true, opciones: opciones.cajas.opciones.map((caja) => ({ valor: caja.id, etiqueta: caja.nombre, descripcion: caja.codigo })) }, celda: (turno) => <div className={styles.identidad}><strong>{turno.caja?.nombre ?? 'No disponible'}</strong><small>{turno.caja?.codigo ?? turno.cajaId}</small></div> },
    { id: 'tipoCaja', titulo: 'Tipo de caja', obtenerValor: (turno) => turno.caja?.tipo ?? '', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos de caja', multiple: true, buscable: false, opciones: opciones.cajas.tipos.map((tipoCaja) => ({ valor: tipoCaja, etiqueta: etiquetasTipoCaja[tipoCaja] })) }, celda: (turno) => turno.caja?.tipo ? <span className={`${styles.estado} ${turno.caja.tipo === 'CAJA_CHICA' ? styles.estadoInfo : styles.estadoNeutral}`}>{etiquetasTipoCaja[turno.caja.tipo]}</span> : <span className={styles.sinDato}>No disponible</span> },
    { id: 'responsable', titulo: 'Responsable', obtenerValor: (turno) => turno.responsableNombre, ordenable: true, celda: (turno) => turno.responsableNombre },
    ...(opcionesSucursales.length ? [{ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (turno: TurnoCaja) => opciones.sucursales.find((x) => x.id === turno.sucursalId)?.nombre ?? turno.sucursalId, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: opcionesSucursales }, celda: (turno: TurnoCaja) => opciones.sucursales.find((x) => x.id === turno.sucursalId)?.nombre ?? turno.sucursalId }] : []),
    { id: 'saldo', titulo: 'Saldo confirmado', obtenerValor: (turno) => turno.saldoConfirmadoCentavos, ordenable: true, celda: (turno) => <strong>{formatearCentavos(turno.saldoConfirmadoCentavos)}</strong> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (turno) => turno.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.turnos.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoTurno[estado] })) }, celda: (turno) => <span className={`${styles.estado} ${claseEstadoTurno(turno.estado)}`}>{etiquetasEstadoTurno[turno.estado]}</span> },
    { id: 'fecha', titulo: 'Apertura', obtenerValor: (turno) => turno.abiertoEn, ordenable: true, celda: (turno) => formatearFechaHora(turno.abiertoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (turno) => turno.id, celda: (turno) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver turno ${turno.numero}`} onClick={() => onNavegar(`/caja/turnos/${turno.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, opciones, opcionesSucursales])

  const columnasMovimientos = useMemo<ColumnaTabla<MovimientoCaja>[]>(() => [
    { id: 'numero', titulo: 'Movimiento', obtenerValor: (movimiento) => movimiento.numero, ordenable: true, celda: (movimiento) => <strong>{movimiento.numero}</strong> },
    { id: 'turno', titulo: 'Turno', obtenerValor: (movimiento) => movimiento.turnoNumero ?? movimiento.turnoId, celda: (movimiento) => movimiento.turnoNumero ?? movimiento.turnoId },
    { id: 'tipoCaja', titulo: 'Tipo de caja', obtenerValor: (movimiento) => movimiento.caja?.tipo ?? '', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos de caja', multiple: true, buscable: false, opciones: opciones.cajas.tipos.map((tipoCaja) => ({ valor: tipoCaja, etiqueta: etiquetasTipoCaja[tipoCaja] })) }, celda: (movimiento) => movimiento.caja?.tipo ? <span className={`${styles.estado} ${movimiento.caja.tipo === 'CAJA_CHICA' ? styles.estadoInfo : styles.estadoNeutral}`}>{etiquetasTipoCaja[movimiento.caja.tipo]}</span> : <span className={styles.sinDato}>No disponible</span> },
    { id: 'tipo', titulo: 'Tipo', obtenerValor: (movimiento) => movimiento.tipo, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos', multiple: true, opciones: opciones.movimientos.tipos.map((tipo) => ({ valor: tipo, etiqueta: etiquetasTipoMovimiento[tipo] })) }, celda: (movimiento) => etiquetasTipoMovimiento[movimiento.tipo] },
    { id: 'efecto', titulo: 'Efecto', obtenerValor: (movimiento) => movimiento.efecto, celda: (movimiento) => etiquetasEfecto[movimiento.efecto] },
    { id: 'monto', titulo: 'Monto', obtenerValor: (movimiento) => movimiento.montoCentavos, ordenable: true, celda: (movimiento) => <span className={movimiento.efecto === 'ENTRADA' ? styles.montoEntrada : styles.montoSalida}>{movimiento.efecto === 'ENTRADA' ? '+' : '−'} {formatearCentavos(movimiento.montoCentavos)}</span> },
    ...(opcionesSucursales.length ? [{ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (movimiento: MovimientoCaja) => opciones.sucursales.find((x) => x.id === movimiento.sucursalId)?.nombre ?? movimiento.sucursalId, filtro: { tipo: 'opciones' as const, etiqueta: 'Seleccionar sucursales', multiple: true, opciones: opcionesSucursales }, celda: (movimiento: MovimientoCaja) => opciones.sucursales.find((x) => x.id === movimiento.sucursalId)?.nombre ?? movimiento.sucursalId }] : []),
    { id: 'estado', titulo: 'Estado', obtenerValor: (movimiento) => movimiento.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, buscable: false, opciones: opciones.movimientos.estados.map((estado) => ({ valor: estado, etiqueta: etiquetasEstadoMovimiento[estado] })) }, celda: (movimiento) => <span className={`${styles.estado} ${claseEstadoMovimiento(movimiento.estado)}`}>{etiquetasEstadoMovimiento[movimiento.estado]}</span> },
    { id: 'fecha', titulo: 'Registro', obtenerValor: (movimiento) => movimiento.ocurridoEn, ordenable: true, celda: (movimiento) => formatearFechaHora(movimiento.ocurridoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (movimiento) => movimiento.id, celda: (movimiento) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver movimiento ${movimiento.numero}`} onClick={() => onNavegar(`/caja/movimientos/${movimiento.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, opciones, opcionesSucursales])

  const hayFiltros = Boolean(busqueda || desde || hasta || montoMinimo || montoMaximo || filtros.length)
  const limpiarFiltros = () => {
    setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setMontoMinimo(''); setMontoMaximo(''); setFiltros([]); setPagina(1)
  }
  const exportar = async (formato: FormatoExportacion) => {
    setErrorExportacion(null)
    const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros
    try { await exportarCaja(recurso, formato, filtrosExportacion) }
    catch (errorActual: unknown) { setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la exportación.') }
  }
  const columnas = esTurnos ? columnasTurnos as ColumnaTabla<RegistroCaja>[] : columnasMovimientos as ColumnaTabla<RegistroCaja>[]
  const puedeCrear = permisos.includes(esTurnos ? 'CAJA.TURNOS.ABRIR' : 'CAJA.MOVIMIENTOS.REGISTRAR')
  const puedeExportar = permisos.includes(esTurnos ? 'CAJA.TURNOS.EXPORTAR' : 'CAJA.MOVIMIENTOS.EXPORTAR')
  const rutaNueva = esTurnos ? '/caja/turnos/nuevo' : '/caja/movimientos/nuevo'
  const titulo = esTurnos ? 'Turnos de caja' : 'Movimientos de caja'

  return (
    <section className={styles.pagina} aria-labelledby="titulo-listado-caja">
      <header className={styles.cabeceraPagina}>
        <CajaBreadcrumb seccion={esTurnos ? 'Turnos de caja' : 'Movimientos'} onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <div><h1 id="titulo-listado-caja">{titulo}</h1><p>{esTurnos ? 'Consulta aperturas, responsables, saldos y estado operativo.' : 'Consulta ingresos y salidas con su saldo, referencia y trazabilidad.'}</p></div>
          {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar(rutaNueva)}><img src={iconoAgregar} alt="" />{esTurnos ? 'Abrir turno' : 'Registrar movimiento'}</button>}
          {puedeExportar && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}
          <label className={styles.busquedaGeneral}><span>Búsqueda general</span><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} maxLength={150} placeholder={esTurnos ? 'Número o responsable' : 'Número, referencia o motivo'} onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></span></label>
        </div>
      </header>

      <div className={styles.filtrosGenerales} aria-label="Filtros generales">
        <label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} /></label>
        <label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} /></label>
        <label>{esTurnos ? 'Saldo mínimo (Q)' : 'Monto mínimo (Q)'}<input type="number" min="0" step="0.01" inputMode="decimal" value={montoMinimo} placeholder="0.00" onChange={(evento) => { setMontoMinimo(evento.target.value); setPagina(1) }} /></label>
        <label>{esTurnos ? 'Saldo máximo (Q)' : 'Monto máximo (Q)'}<input type="number" min="0" step="0.01" inputMode="decimal" value={montoMaximo} placeholder="0.00" onChange={(evento) => { setMontoMaximo(evento.target.value); setPagina(1) }} /></label>
      </div>

      {errorOpciones && <div className={styles.alertaError} role="alert"><p>{errorOpciones}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}><div><strong>{esTurnos ? 'Turnos registrados' : 'Movimientos registrados'}</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros y la exportación se procesan en el servidor.'}</small></div><div className={styles.accionesResumen}>{resultado && <span>{resultado.total} registros</span>}{hayFiltros && <button type="button" onClick={limpiarFiltros}>Limpiar filtros</button>}</div></div>
        {resultado?.items.length ? <>
          <TablaDatos descripcion={`${titulo} con filtros por columna`} datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(registro) => registro.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }]); setPagina(1) }} />
          <PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={esTurnos ? 'turno' : 'movimiento'} unidadPlural={esTurnos ? 'turnos' : 'movimientos'} onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} />
        </> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : `No hay ${esTurnos ? 'turnos' : 'movimientos'} registrados`}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : esTurnos ? 'Abre el primer turno para iniciar la operación de caja.' : 'Los movimientos aparecerán conforme se registren operaciones de caja.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar(rutaNueva)}>{esTurnos ? 'Abrir turno' : 'Registrar movimiento'}</button>}</div> : null}
      </article>
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
    </section>
  )
}

export function TurnoListadoView(props: Props) { return <CajaListadoView {...props} recurso="turnos" /> }
export function MovimientoListadoView(props: Props) { return <CajaListadoView {...props} recurso="movimientos" /> }
