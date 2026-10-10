import { useEffect, useMemo, useState } from 'react'
import agregarIcono from '../../../assets/acciones/agregar.png'
import verIcono from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import { listarLiquidaciones, obtenerLiquidacionActiva, obtenerOpcionesCajaChica, solicitarLiquidacion } from '../caja-chica-api'
import { crearClaveIdempotencia, etiquetasEstadoLiquidacion, formatearCentavos, nombreMes } from '../caja-chica-formatos'
import type { EstadoLiquidacionActiva, EstadoLiquidacionCajaChica, LiquidacionCajaChicaResumen, OpcionesCajaChica, ResultadoPaginado } from '../caja-chica.types'
import { CajaChicaBreadcrumb } from './caja-chica-breadcrumb'
import localStyles from './caja-chica.module.css'
import styles from '../../caja/components/caja.module.css'

type Props = { permisos: string[]; onNavegar: (ruta: string) => void }
type FiltroEstado = EstadoLiquidacionCajaChica | 'TODOS'

const motivosNoDisponibles: Record<NonNullable<EstadoLiquidacionActiva['motivoNoDisponible']>, string> = {
  CAJA_CHICA_NO_CREADA: 'La sucursal no tiene una Caja Chica creada.',
  CAJA_CHICA_NO_DISPONIBLE: 'La Caja Chica de la sucursal no está disponible.',
  LIQUIDACION_ACTIVA_EXISTENTE: 'La sucursal ya tiene una liquidación solicitada o abierta.',
}

function claseEstado(estado: EstadoLiquidacionCajaChica): string {
  if (estado === 'ABIERTA') return `${styles.estado} ${styles.estadoExito}`
  if (estado === 'SOLICITADA') return `${styles.estado} ${styles.estadoAdvertencia}`
  return `${styles.estado} ${styles.estadoNeutral}`
}

export function LiquidacionListadoView({ permisos, onNavegar }: Props) {
  const parametrosRuta = new URL(window.location.href).searchParams
  const [resultado, setResultado] = useState<ResultadoPaginado<LiquidacionCajaChicaResumen> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesCajaChica | null>(null)
  const [activa, setActiva] = useState<EstadoLiquidacionActiva | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entradaBusqueda, setEntradaBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sucursalId, setSucursalId] = useState(parametrosRuta.get('sucursalId') ?? '')
  const [periodo, setPeriodo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS')
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'periodo', desc: true }])
  const [confirmando, setConfirmando] = useState(false)
  const [claveSolicitud, setClaveSolicitud] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const puedeSolicitar = permisos.includes('CAJA.LIQUIDACIONES.SOLICITAR')
  const orden = ordenamiento[0]
  const [anio, mes] = periodo ? periodo.split('-').map(Number) : [undefined, undefined]
  const parametros = useMemo(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined,
    sucursalIds: sucursalId ? [sucursalId] : undefined,
    estados: filtroEstado === 'TODOS' ? undefined : [filtroEstado], mes, anio,
    orden: ((orden?.id ?? 'periodo') as 'numero' | 'sucursal' | 'periodo' | 'estado' | 'fondo'),
    direccion: orden?.desc === false ? 'asc' as const : 'desc' as const,
  }), [anio, busqueda, filtroEstado, mes, orden?.desc, orden?.id, pagina, sucursalId, tamanoPagina])
  const claveCarga = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveCarga

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entradaBusqueda.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entradaBusqueda])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      listarLiquidaciones(parametros, controlador.signal),
      obtenerOpcionesCajaChica(controlador.signal),
      obtenerLiquidacionActiva(controlador.signal),
    ]).then(([liquidaciones, opcionesActuales, estadoActivo]) => {
      if (liquidaciones.totalPaginas > 0 && pagina > liquidaciones.totalPaginas) { setPagina(liquidaciones.totalPaginas); return }
      setResultado(liquidaciones); setOpciones(opcionesActuales); setActiva(estadoActivo); setError(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las liquidaciones.')
    }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveCarga) })
    return () => controlador.abort()
  }, [claveCarga, pagina, parametros])

  const abrirSolicitud = () => {
    if (!activa?.puedeSolicitar || !activa.caja) return
    setClaveSolicitud(crearClaveIdempotencia('solicitar-liquidacion')); setErrorAccion(null); setConfirmando(true)
  }
  const ejecutarSolicitud = async () => {
    if (!activa?.caja || procesando) return
    setProcesando(true); setErrorAccion(null)
    try {
      const creada = await solicitarLiquidacion({ versionCaja: activa.caja.version, claveIdempotencia: claveSolicitud })
      setConfirmando(false); setMensajeExito(`La liquidación ${creada.numero} quedó solicitada. Debe autorizarla un usuario distinto.`); setRevision((valor) => valor + 1)
    } catch (errorActual) { setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible solicitar la liquidación.') }
    finally { setProcesando(false) }
  }

  const columnas = useMemo<ColumnaTabla<LiquidacionCajaChicaResumen>[]>(() => [
    { id: 'numero', titulo: 'Identificación', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.numero}</strong><small>Secuencia {item.secuencia}</small></span> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => item.sucursal.nombre, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></span> },
    { id: 'periodo', titulo: 'Período', obtenerValor: (item) => `${item.anio}-${item.mes}`, ordenable: true, celda: (item) => nombreMes(item.mes, item.anio) },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, celda: (item) => <span className={claseEstado(item.estado)}>{etiquetasEstadoLiquidacion[item.estado]}</span> },
    { id: 'fondo', titulo: 'Fondo', obtenerValor: (item) => item.totales.fondoAutorizadoCentavos, ordenable: true, celda: (item) => formatearCentavos(item.totales.fondoAutorizadoCentavos) },
    { id: 'gastos', titulo: 'Gastos netos', obtenerValor: (item) => item.totales.gastosNetosCentavos, celda: (item) => <strong>{formatearCentavos(item.totales.gastosNetosCentavos)}</strong> },
    { id: 'saldo', titulo: 'Saldo', obtenerValor: (item) => item.totales.saldoActualCentavos, celda: (item) => formatearCentavos(item.totales.saldoActualCentavos) },
    { id: 'disponible', titulo: 'Disponible', obtenerValor: (item) => item.totales.efectivoDisponibleCentavos, celda: (item) => formatearCentavos(item.totales.efectivoDisponibleCentavos) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver detalle de ${item.numero}`} onClick={() => onNavegar(`/caja/liquidaciones/${item.sucursal.id}/${item.id}`)}><img src={verIcono} alt="" /></button></div> },
  ], [onNavegar])

  const motivoActivo = activa?.motivoNoDisponible ? motivosNoDisponibles[activa.motivoNoDisponible] : null
  const hayFiltros = Boolean(entradaBusqueda || sucursalId || periodo || filtroEstado !== 'TODOS')
  return <section className={styles.pagina} aria-labelledby="titulo-liquidaciones">
    <header className={styles.cabeceraPagina}>
      <CajaChicaBreadcrumb seccion="Liquidaciones" onNavegar={onNavegar} />
      <div className={styles.filaCabecera}><h1 id="titulo-liquidaciones">Liquidaciones de Caja Chica</h1>{puedeSolicitar && <button className={styles.botonNuevo} type="button" disabled={!activa?.puedeSolicitar} title={motivoActivo ?? undefined} onClick={abrirSolicitud}><img src={agregarIcono} alt="" />Nueva liquidación</button>}</div>
    </header>
    {activa?.liquidacion && <aside className={localStyles.resumenActivo}><div><strong>Liquidación activa: {activa.liquidacion.numero}</strong><span>{activa.liquidacion.sucursal.nombre} · {etiquetasEstadoLiquidacion[activa.liquidacion.estado]}</span><small>Este control permanece visible aunque filtres las liquidaciones cerradas.</small></div><button type="button" onClick={() => onNavegar(`/caja/liquidaciones/${activa.liquidacion!.sucursal.id}/${activa.liquidacion!.id}`)}>Ver liquidación activa</button></aside>}
    {!activa?.liquidacion && motivoActivo && puedeSolicitar && <div className={styles.alertaInformativa}><p>{motivoActivo}</p></div>}
    <div className={localStyles.pestanasEstado} role="group" aria-label="Filtrar por estado">{(['TODOS', 'SOLICITADA', 'ABIERTA', 'CERRADA'] as const).map((valor) => <button key={valor} type="button" className={filtroEstado === valor ? localStyles.activa : undefined} aria-pressed={filtroEstado === valor} onClick={() => { setFiltroEstado(valor); setPagina(1) }}>{valor === 'TODOS' ? 'Todos' : etiquetasEstadoLiquidacion[valor]}</button>)}</div>
    <div className={localStyles.filtros}>
      <label>Buscar<input value={entradaBusqueda} placeholder="Número o sucursal" onChange={(evento) => setEntradaBusqueda(evento.target.value)} /></label>
      <label>Sucursal<select value={sucursalId} onChange={(evento) => { setSucursalId(evento.target.value); setPagina(1) }}><option value="">Todas</option>{opciones?.sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre} ({sucursal.codigo})</option>)}</select></label>
      <label>Mes<input type="month" value={periodo} onChange={(evento) => { setPeriodo(evento.target.value); setPagina(1) }} /></label>
      {hayFiltros && <button type="button" onClick={() => { setEntradaBusqueda(''); setBusqueda(''); setSucursalId(''); setPeriodo(''); setFiltroEstado('TODOS'); setPagina(1) }}>Limpiar</button>}
    </div>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}>
      <div className={styles.resumenTabla}><div><strong>Historial de liquidaciones</strong><small>{cargando ? 'Actualizando información…' : 'Los filtros se aplican antes de contar y paginar.'}</small></div>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'liquidación' : 'liquidaciones'}</span>}</div>
      {resultado?.items.length ? <><TablaDatos descripcion="Liquidaciones de Caja Chica" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'periodo', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="liquidación" unidadPlural="liquidaciones" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay liquidaciones'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros.' : 'La primera liquidación aparecerá cuando la sucursal la solicite.'}</p></div> : null}
    </article>
    <ModalEstado abierto={confirmando} tipo="informacion" titulo="Solicitar nueva liquidación" mensaje={<div className={localStyles.formularioModal}><p className={localStyles.ayuda}>Se conservará el fondo vigente de {activa?.caja ? formatearCentavos(activa.caja.fondoAutorizadoCentavos) : 'la caja'} y el sobrante de la liquidación anterior. La solicitud no entrega efectivo.</p>{errorAccion && <div className={styles.alertaError} role="alert"><p>{errorAccion}</p></div>}</div>} textoAccionPrincipal={procesando ? 'Solicitando…' : 'Solicitar liquidación'} iconoAccionPrincipal={<IconoAccion nombre="enviar" />} onAccionPrincipal={() => void ejecutarSolicitud()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={procesando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Liquidación solicitada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </section>
}
