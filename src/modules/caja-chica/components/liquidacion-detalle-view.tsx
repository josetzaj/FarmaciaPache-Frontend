import { useCallback, useEffect, useMemo, useState } from 'react'
import descargarIcono from '../../../assets/acciones/descargar.png'
import { PistaAuditoria, type ConsultaAuditoria } from '../../../shared/auditoria'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import {
  autorizarLiquidacion, cerrarLiquidacion, descargarComprobante, listarAuditoriaLiquidacion,
  listarMovimientos, obtenerLiquidacion, obtenerLiquidacionActiva, recibirReposicion,
  registrarCorreccion, registrarGasto, resolverMovimiento,
} from '../caja-chica-api'
import {
  convertirQuetzalesACentavos, crearClaveIdempotencia, etiquetasEstadoLiquidacion,
  etiquetasEstadoMovimiento, etiquetasEstadoReposicion, etiquetasNaturaleza, fechaActualGuatemala,
  formatearCentavos, formatearFecha, formatearFechaHora, nombreMes, tamanoArchivo,
} from '../caja-chica-formatos'
import type {
  EstadoLiquidacionActiva, EstadoMovimientoCajaChica, LiquidacionCajaChicaDetalle,
  MovimientoCajaChica, NaturalezaMovimientoCajaChica, ResultadoPaginado,
} from '../caja-chica.types'
import { CajaChicaBreadcrumb } from './caja-chica-breadcrumb'
import localStyles from './caja-chica.module.css'
import styles from '../../caja/components/caja.module.css'

type Props = { sucursalId: string; liquidacionId: string; permisos: string[]; onNavegar: (ruta: string) => void }
type ModalAccion =
  | { tipo: 'autorizar'; clave: string }
  | { tipo: 'recibir'; clave: string }
  | { tipo: 'gasto'; clave: string }
  | { tipo: 'cierre'; clave: string }
  | { tipo: 'resolver'; movimiento: MovimientoCajaChica; accion: 'confirmacion' | 'cancelacion'; clave: string }
  | { tipo: 'correccion'; movimiento: MovimientoCajaChica; liquidacionDestino: LiquidacionCajaChicaDetalle; clave: string }
  | null

function claseEstado(estado: EstadoMovimientoCajaChica): string {
  if (estado === 'CONFIRMADO') return `${styles.estado} ${styles.estadoExito}`
  if (estado === 'PENDIENTE') return `${styles.estado} ${styles.estadoAdvertencia}`
  return `${styles.estado} ${styles.estadoNeutral}`
}

function ultimoDiaMes(anio: number, mes: number): string {
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
}

function fechaMinima(liquidacion: LiquidacionCajaChicaDetalle): string {
  const inicioMes = `${liquidacion.anio}-${String(liquidacion.mes).padStart(2, '0')}-01`
  const apertura = liquidacion.auditoriaProceso.autorizadaEn
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(liquidacion.auditoriaProceso.autorizadaEn))
    : null
  return apertura && apertura > inicioMes ? apertura : inicioMes
}

function mensajeError(error: unknown): string {
  return error instanceof ErrorApi ? error.message : 'No fue posible completar la acción.'
}

export function LiquidacionDetalleView({ sucursalId, liquidacionId, permisos, onNavegar }: Props) {
  const [liquidacion, setLiquidacion] = useState<LiquidacionCajaChicaDetalle | null>(null)
  const [activa, setActiva] = useState<EstadoLiquidacionActiva | null>(null)
  const [movimientos, setMovimientos] = useState<ResultadoPaginado<MovimientoCajaChica> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: false }])
  const [modal, setModal] = useState<ModalAccion>(null)
  const [motivo, setMotivo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(fechaActualGuatemala())
  const [concepto, setConcepto] = useState('')
  const [naturaleza, setNaturaleza] = useState<NaturalezaMovimientoCajaChica>('RECUPERACION')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [descargando, setDescargando] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const orden = ordenamiento[0]

  const parametrosMovimientos = useMemo(() => ({ pagina, tamanoPagina, orden: ((orden?.id ?? 'fecha') as 'fecha' | 'numero' | 'concepto' | 'monto' | 'estado'), direccion: orden?.desc ? 'desc' as const : 'asc' as const }), [orden?.desc, orden?.id, pagina, tamanoPagina])
  const claveCarga = useMemo(() => JSON.stringify({ liquidacionId, parametrosMovimientos, revision }), [liquidacionId, parametrosMovimientos, revision])
  const cargando = solicitudFinalizada !== claveCarga
  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      obtenerLiquidacion(liquidacionId, controlador.signal),
      listarMovimientos(liquidacionId, parametrosMovimientos, controlador.signal),
      obtenerLiquidacionActiva(controlador.signal).catch(() => null),
    ]).then(([detalle, paginaMovimientos, estadoActivo]) => {
      if (detalle.sucursal.id !== sucursalId) { setError('La liquidación no corresponde a la sucursal indicada en la ruta.'); return }
      if (paginaMovimientos.totalPaginas > 0 && pagina > paginaMovimientos.totalPaginas) { setPagina(paginaMovimientos.totalPaginas); return }
      setLiquidacion(detalle); setMovimientos(paginaMovimientos); setActiva(estadoActivo); setError(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el detalle de la liquidación.')
    }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveCarga) })
    return () => controlador.abort()
  }, [claveCarga, liquidacionId, pagina, parametrosMovimientos, sucursalId])

  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => listarAuditoriaLiquidacion(liquidacionId, consulta, signal), [liquidacionId])
  const reiniciarFormulario = () => { setMotivo(''); setReferencia(''); setMonto(''); setFecha(fechaActualGuatemala()); setConcepto(''); setNaturaleza('RECUPERACION'); setArchivo(null); setErrores({}); setErrorAccion(null) }
  const abrirModal = (siguiente: NonNullable<ModalAccion>) => { reiniciarFormulario(); setModal(siguiente) }
  const cerrarModal = () => { if (!procesando) setModal(null) }
  const refrescar = (mensaje: string) => { setModal(null); setMensajeExito(mensaje); setRevision((valor) => valor + 1) }

  const validarTexto = (valor: string, campo: string, minimo: number, etiqueta: string, siguientes: Record<string, string>) => {
    if (valor.trim().length < minimo) siguientes[campo] = `${etiqueta} debe tener al menos ${minimo} caracteres.`
  }
  const ejecutarAccion = async () => {
    if (!modal || !liquidacion || procesando) return
    const siguientes: Record<string, string> = {}
    const centavos = convertirQuetzalesACentavos(monto, modal.tipo === 'cierre')
    if (modal.tipo === 'autorizar' || modal.tipo === 'cierre' || modal.tipo === 'resolver' || modal.tipo === 'correccion') validarTexto(motivo, 'motivo', 5, 'El motivo', siguientes)
    if (modal.tipo === 'recibir' || modal.tipo === 'correccion') validarTexto(referencia, 'referencia', 2, 'La referencia', siguientes)
    if (modal.tipo === 'gasto' || modal.tipo === 'cierre' || modal.tipo === 'correccion') {
      if (centavos === null) siguientes.monto = modal.tipo === 'cierre' ? 'Ingresa un efectivo declarado válido.' : 'Ingresa un importe positivo con máximo dos decimales.'
    }
    if (modal.tipo === 'gasto') {
      validarTexto(concepto, 'concepto', 3, 'El concepto', siguientes)
      if (!archivo) siguientes.archivo = 'Selecciona el comprobante PDF.'
      else if (archivo.size <= 0 || archivo.size > 10 * 1024 * 1024) siguientes.archivo = 'El PDF debe pesar como máximo 10 MB.'
      else if (archivo.type !== 'application/pdf' || !archivo.name.toLowerCase().endsWith('.pdf')) siguientes.archivo = 'Selecciona un archivo PDF válido.'
    }
    if (modal.tipo === 'gasto' || modal.tipo === 'correccion') {
      const destino = modal.tipo === 'correccion' ? modal.liquidacionDestino : liquidacion
      const minima = fechaMinima(destino); const maxima = [fechaActualGuatemala(), ultimoDiaMes(destino.anio, destino.mes)].sort()[0]!
      if (!fecha || fecha < minima || fecha > maxima) siguientes.fecha = `La fecha debe estar entre ${formatearFecha(minima)} y ${formatearFecha(maxima)}.`
    }
    setErrores(siguientes)
    if (Object.keys(siguientes).length) return
    setProcesando(true); setErrorAccion(null)
    try {
      if (modal.tipo === 'autorizar') {
        const actualizada = await autorizarLiquidacion(liquidacion.id, { version: liquidacion.version, motivo: motivo.trim(), claveIdempotencia: modal.clave })
        refrescar(`La liquidación ${actualizada.numero} quedó abierta. La reposición está autorizada, pero aún no aumenta el efectivo.`)
      } else if (modal.tipo === 'recibir') {
        const actualizada = await recibirReposicion(liquidacion.id, { version: liquidacion.reposicion!.version, referencia: referencia.trim(), claveIdempotencia: modal.clave })
        refrescar(`Se confirmó una sola vez la recepción de ${formatearCentavos(actualizada.reposicion?.montoCentavos)}.`)
      } else if (modal.tipo === 'gasto' && centavos !== null && archivo) {
        await registrarGasto(liquidacion.id, { versionLiquidacion: liquidacion.version, montoCentavos: centavos, fechaGasto: fecha, concepto: concepto.trim(), claveIdempotencia: modal.clave, comprobante: archivo })
        refrescar('El gasto quedó pendiente y su importe está reservado hasta confirmarlo o cancelarlo.')
      } else if (modal.tipo === 'cierre' && centavos !== null) {
        const actualizada = await cerrarLiquidacion(liquidacion.id, { version: liquidacion.version, efectivoDeclaradoCentavos: centavos, motivo: motivo.trim(), claveIdempotencia: modal.clave })
        refrescar(`La liquidación ${actualizada.numero} quedó cerrada con saldo final de ${formatearCentavos(actualizada.saldoFinalCentavos)}.`)
      } else if (modal.tipo === 'resolver') {
        const grupo = modal.movimiento.tipo === 'GASTO' ? 'gastos' : 'correcciones'
        await resolverMovimiento(grupo, modal.movimiento.id, modal.accion, { version: modal.movimiento.version, motivo: motivo.trim(), claveIdempotencia: modal.clave })
        refrescar(`El movimiento ${modal.movimiento.numero} quedó ${modal.accion === 'confirmacion' ? 'confirmado' : 'cancelado'}.`)
      } else if (modal.tipo === 'correccion' && centavos !== null) {
        const creada = await registrarCorreccion(modal.liquidacionDestino.id, { versionLiquidacion: modal.liquidacionDestino.version, movimientoOriginalId: modal.movimiento.id, naturaleza, montoCentavos: centavos, fechaGasto: fecha, motivo: motivo.trim(), evidenciaReferencia: referencia.trim(), claveIdempotencia: modal.clave })
        const cambiaDetalle = modal.liquidacionDestino.id !== liquidacion.id
        setModal(null); setMensajeExito(`La corrección ${creada.numero} quedó pendiente de aprobación independiente.`)
        if (cambiaDetalle) onNavegar(`/caja/liquidaciones/${modal.liquidacionDestino.sucursal.id}/${modal.liquidacionDestino.id}`)
        else setRevision((valor) => valor + 1)
      }
    } catch (errorActual) { setErrorAccion(mensajeError(errorActual)) }
    finally { setProcesando(false) }
  }

  const ejecutarDescarga = useCallback(async (movimiento: MovimientoCajaChica) => {
    if (!movimiento.comprobante || descargando) return
    setDescargando(movimiento.id); setErrorAccion(null)
    try { await descargarComprobante(movimiento.id, movimiento.comprobante.nombreOriginal) }
    catch (errorActual) { setErrorAccion(mensajeError(errorActual)) }
    finally { setDescargando(null) }
  }, [descargando])

  const correccionActivaPorOriginal = useMemo(() => new Set(movimientos?.items.filter((item) => item.tipo === 'CORRECCION' && item.estado !== 'CANCELADO' && item.movimientoOriginalId).map((item) => item.movimientoOriginalId!) ?? []), [movimientos])
  const destinoCorreccion = activa?.liquidacion?.estado === 'ABIERTA' && activa.liquidacion.sucursal.id === sucursalId ? activa.liquidacion : liquidacion?.estado === 'ABIERTA' ? liquidacion : null
  const puedeRegistrarGasto = permisos.includes('CAJA.GASTOS.REGISTRAR') && liquidacion?.estado === 'ABIERTA'
  const puedeCerrar = permisos.includes('CAJA.LIQUIDACIONES.CERRAR') && liquidacion?.estado === 'ABIERTA'

  const columnas = useMemo<ColumnaTabla<MovimientoCajaChica>[]>(() => [
    { id: 'numero', titulo: 'Movimiento', obtenerValor: (item) => item.numero, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.numero}</strong><small>{item.tipo === 'GASTO' ? 'Gasto' : 'Corrección'}</small></span> },
    { id: 'fecha', titulo: 'Fecha', obtenerValor: (item) => item.fechaGasto, ordenable: true, celda: (item) => formatearFecha(item.fechaGasto) },
    { id: 'concepto', titulo: 'Concepto o motivo', obtenerValor: (item) => item.concepto, ordenable: true, celda: (item) => <span className={localStyles.detalleCorreccion}><strong>{item.concepto}</strong>{item.movimientoOriginalId && <small>Corrige: {item.movimientoOriginalNumero ?? item.movimientoOriginalId}</small>}{item.evidenciaReferencia && <small>Ref.: {item.evidenciaReferencia}</small>}</span> },
    { id: 'monto', titulo: 'Importe', obtenerValor: (item) => item.montoCentavos, ordenable: true, celda: (item) => <span className={item.naturaleza === 'RECUPERACION' ? styles.montoEntrada : styles.montoSalida}>{item.naturaleza === 'RECUPERACION' ? '− ' : ''}{formatearCentavos(item.montoCentavos)}</span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, celda: (item) => <span className={claseEstado(item.estado)}>{etiquetasEstadoMovimiento[item.estado]}</span> },
    { id: 'responsables', titulo: 'Responsables', obtenerValor: (item) => item.registradoPorNombre, celda: (item) => <span className={styles.identidad}><strong>{item.registradoPorNombre}</strong><small>{item.confirmadoPorNombre ? `Confirmó: ${item.confirmadoPorNombre}` : item.canceladoPorNombre ? `Canceló: ${item.canceladoPorNombre}` : 'Pendiente de resolución'}</small></span> },
    { id: 'comprobante', titulo: 'Comprobante', obtenerValor: (item) => item.comprobante?.nombreOriginal ?? '', celda: (item) => item.comprobante && permisos.includes('CAJA.GASTOS.VER_COMPROBANTE') ? <button className={styles.enlaceTexto} type="button" disabled={descargando === item.id} onClick={() => void ejecutarDescarga(item)}><img src={descargarIcono} alt="" width="20" height="20" /> {descargando === item.id ? 'Descargando…' : 'PDF'}</button> : <span className={styles.sinDato}>{item.tipo === 'CORRECCION' ? 'Referencia' : 'No disponible'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}>
      {item.estado === 'PENDIENTE' && permisos.includes(item.tipo === 'GASTO' ? 'CAJA.GASTOS.CONFIRMAR' : 'CAJA.CORRECCIONES.CONFIRMAR') && <button className={styles.accionTexto} type="button" onClick={() => abrirModal({ tipo: 'resolver', movimiento: item, accion: 'confirmacion', clave: crearClaveIdempotencia('confirmar-movimiento') })}>Confirmar</button>}
      {item.estado === 'PENDIENTE' && permisos.includes(item.tipo === 'GASTO' ? 'CAJA.GASTOS.CANCELAR' : 'CAJA.CORRECCIONES.CANCELAR') && <button className={`${styles.accionTexto} ${styles.accionPeligro}`} type="button" onClick={() => abrirModal({ tipo: 'resolver', movimiento: item, accion: 'cancelacion', clave: crearClaveIdempotencia('cancelar-movimiento') })}>Cancelar</button>}
      {item.tipo === 'GASTO' && item.estado === 'CONFIRMADO' && permisos.includes('CAJA.CORRECCIONES.REGISTRAR') && destinoCorreccion && !correccionActivaPorOriginal.has(item.id) && <button className={styles.accionTexto} type="button" onClick={() => abrirModal({ tipo: 'correccion', movimiento: item, liquidacionDestino: destinoCorreccion, clave: crearClaveIdempotencia('registrar-correccion') })}>Corregir</button>}
    </div> },
  ], [correccionActivaPorOriginal, descargando, destinoCorreccion, ejecutarDescarga, permisos])

  const grupos = useMemo(() => {
    const mapa = new Map<string, MovimientoCajaChica[]>()
    for (const movimiento of movimientos?.items ?? []) {
      const clave = movimiento.fechaGasto.slice(0, 7)
      mapa.set(clave, [...(mapa.get(clave) ?? []), movimiento])
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [movimientos])

  if (!liquidacion && cargando) return <section className={styles.pagina}><p role="status">Cargando liquidación…</p></section>
  if (!liquidacion) return <section className={styles.pagina}><CajaChicaBreadcrumb seccion="Liquidaciones" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'No se encontró la liquidación.'}</p><button type="button" onClick={() => onNavegar('/caja/liquidaciones')}>Volver</button></div></section>

  const t = liquidacion.totales
  const resumen = [
    ['Fondo autorizado', t.fondoAutorizadoCentavos, 'Fondo conservado al solicitar'],
    ['Reposiciones confirmadas', t.reposicionesConfirmadasCentavos, 'Efectivo recibido'],
    ['Ajustes por correcciones', t.ajustesCorreccionesCentavos, 'Diferencias negativas confirmadas'],
    ['Gastos pendientes', t.gastosPendientesCentavos, 'Efectivo reservado'],
    ['Efectivo disponible', t.efectivoDisponibleCentavos, 'Saldo menos reservas'],
    ['Saldo inicial trasladado', t.saldoInicialCentavos, 'Sobrante de la liquidación anterior'],
    ['Egresos acumulados', t.egresosAcumuladosCentavos, 'Gastos y correcciones positivas'],
    ['Gastos netos', t.gastosNetosCentavos, 'Egresos más ajustes'],
    [liquidacion.estado === 'CERRADA' ? 'Saldo final' : 'Saldo actual', liquidacion.estado === 'CERRADA' ? liquidacion.saldoFinalCentavos ?? t.saldoActualCentavos : t.saldoActualCentavos, 'Saldo calculado por el servidor'],
  ] as const
  const tituloModal = modal?.tipo === 'autorizar' ? 'Autorizar apertura y reposición' : modal?.tipo === 'recibir' ? 'Confirmar recepción de reposición' : modal?.tipo === 'gasto' ? 'Registrar gasto' : modal?.tipo === 'cierre' ? 'Cerrar liquidación' : modal?.tipo === 'correccion' ? 'Registrar corrección' : modal?.tipo === 'resolver' ? `${modal.accion === 'confirmacion' ? 'Confirmar' : 'Cancelar'} ${modal.movimiento.tipo === 'GASTO' ? 'gasto' : 'corrección'}` : ''
  const textoPrincipal = procesando ? 'Procesando…' : modal?.tipo === 'autorizar' ? 'Autorizar apertura' : modal?.tipo === 'recibir' ? 'Confirmar recepción' : modal?.tipo === 'gasto' ? 'Registrar gasto' : modal?.tipo === 'cierre' ? 'Cerrar liquidación' : modal?.tipo === 'correccion' ? 'Registrar corrección' : modal?.tipo === 'resolver' ? (modal.accion === 'confirmacion' ? 'Confirmar movimiento' : 'Cancelar movimiento') : 'Aceptar'

  return <section className={styles.pagina} aria-labelledby="titulo-liquidacion-detalle">
    <header className={styles.cabeceraDetalle}>
      <div><CajaChicaBreadcrumb seccion="Liquidaciones" actual={liquidacion.numero} onNavegar={onNavegar} /><p className={styles.sobretitulo}>{liquidacion.sucursal.nombre} · {nombreMes(liquidacion.mes, liquidacion.anio)}</p><h1 id="titulo-liquidacion-detalle">{liquidacion.numero}</h1><div className={styles.estadosDetalle}><span className={`${styles.estado} ${liquidacion.estado === 'ABIERTA' ? styles.estadoExito : liquidacion.estado === 'SOLICITADA' ? styles.estadoAdvertencia : styles.estadoNeutral}`}>{etiquetasEstadoLiquidacion[liquidacion.estado]}</span>{liquidacion.reposicion && <span className={`${styles.estado} ${liquidacion.reposicion.estado === 'RECIBIDA' ? styles.estadoExito : styles.estadoInfo}`}>Reposición {etiquetasEstadoReposicion[liquidacion.reposicion.estado].toLowerCase()}</span>}</div></div>
      <div className={styles.accionesCabecera}>{liquidacion.estado === 'SOLICITADA' && permisos.includes('CAJA.LIQUIDACIONES.AUTORIZAR') && <button className={styles.botonPrincipal} type="button" onClick={() => abrirModal({ tipo: 'autorizar', clave: crearClaveIdempotencia('autorizar-liquidacion') })}><IconoAccion nombre="estado" />Autorizar</button>}{liquidacion.estado === 'ABIERTA' && liquidacion.reposicion?.estado === 'AUTORIZADA' && permisos.includes('CAJA.LIQUIDACIONES.RECIBIR_REPOSICION') && <button className={styles.botonSecundario} type="button" onClick={() => abrirModal({ tipo: 'recibir', clave: crearClaveIdempotencia('recibir-reposicion') })}><IconoAccion nombre="guardar" />Recibir reposición</button>}</div>
    </header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <section className={localStyles.seccionDetalle} aria-labelledby="titulo-resumen"><div className={localStyles.cabeceraSeccion}><div><h2 id="titulo-resumen">Resumen</h2><p>Montos exactos calculados por el backend.</p></div><strong>Gasto mensual de la sucursal: {formatearCentavos(liquidacion.gastoMensualSucursalCentavos)}</strong></div><div className={localStyles.tarjetasResumen}>{resumen.map(([etiqueta, valor, ayuda], indice) => <article key={etiqueta} className={`${localStyles.tarjetaResumen} ${indice === 4 || indice === 8 ? localStyles.destacada : ''}`}><span>{etiqueta}</span><strong>{formatearCentavos(valor)}</strong><small>{ayuda}</small></article>)}</div></section>
    <section className={localStyles.seccionDetalle} aria-labelledby="titulo-movimientos"><div className={localStyles.cabeceraSeccion}><div><h2 id="titulo-movimientos">Movimientos</h2><p>Gastos, correcciones, comprobantes y responsables.</p></div><div className={localStyles.accionesSeccion}>{puedeRegistrarGasto && <button className={styles.botonPrincipal} type="button" onClick={() => abrirModal({ tipo: 'gasto', clave: crearClaveIdempotencia('registrar-gasto') })}><IconoAccion nombre="agregar" />Registrar gasto</button>}{puedeCerrar && <button className={styles.botonSecundario} type="button" onClick={() => abrirModal({ tipo: 'cierre', clave: crearClaveIdempotencia('cerrar-liquidacion') })}><IconoAccion nombre="estado" />Cerrar liquidación</button>}</div></div>
      {grupos.length ? grupos.map(([clave, items]) => { const [anioGrupo, mesGrupo] = clave.split('-').map(Number); const totalGrupo = items.filter((item) => item.estado === 'CONFIRMADO').reduce((total, item) => total + (item.naturaleza === 'RECUPERACION' ? -item.montoCentavos : item.montoCentavos), 0); return <article className={localStyles.grupoMes} key={clave}><header className={localStyles.cabeceraMes}><h3>{nombreMes(mesGrupo!, anioGrupo)}</h3><span>Total confirmado: {formatearCentavos(totalGrupo)}</span></header><TablaDatos descripcion={`Movimientos de ${nombreMes(mesGrupo!, anioGrupo)}`} datos={items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={() => undefined} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: false }]); setPagina(1) }} /></article> }) : !cargando ? <div className={styles.estadoVacio}><h2>Sin movimientos</h2><p>Los gastos y correcciones aparecerán aquí.</p></div> : null}
      {movimientos && movimientos.total > 0 && <div className={localStyles.paginacionMovimientos}><PaginacionTabla pagina={movimientos.pagina} tamanoPagina={movimientos.tamanoPagina} total={movimientos.total} totalPaginas={movimientos.totalPaginas} unidadSingular="movimiento" unidadPlural="movimientos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></div>}
    </section>
    <section className={localStyles.seccionDetalle} aria-labelledby="titulo-proceso"><div className={localStyles.cabeceraSeccion}><div><h2 id="titulo-proceso">Auditoría del proceso</h2><p>Responsables y fechas de las transiciones principales.</p></div></div><dl className={localStyles.trazabilidad}><div><dt>Solicitud</dt><dd>{liquidacion.auditoriaProceso.solicitadaPorNombre}</dd><small>{formatearFechaHora(liquidacion.auditoriaProceso.solicitadaEn)}</small></div><div><dt>Autorización</dt><dd>{liquidacion.auditoriaProceso.autorizadaPorNombre ?? 'Pendiente'}</dd><small>{formatearFechaHora(liquidacion.auditoriaProceso.autorizadaEn)}</small></div><div><dt>Recepción de reposición</dt><dd>{liquidacion.reposicion?.recibidaPorNombre ?? 'Pendiente'}</dd><small>{formatearFechaHora(liquidacion.reposicion?.recibidaEn ?? null)}</small></div><div><dt>Cierre</dt><dd>{liquidacion.auditoriaProceso.cerradaPorNombre ?? 'Pendiente'}</dd><small>{formatearFechaHora(liquidacion.auditoriaProceso.cerradaEn)}</small></div></dl></section>
    {permisos.includes('CAJA.LIQUIDACIONES.VER_AUDITORIA') && <PistaAuditoria claveEntidad={`liquidacion-caja-chica-${liquidacion.id}`} descripcion="Solicitud, autorización, reposición, gastos, correcciones y cierre de esta liquidación." etiquetasOperacion={{ SOLICITAR_APERTURA: 'Solicitud', AUTORIZAR_APERTURA: 'Autorización', CONFIRMAR_RECEPCION: 'Recepción de reposición', REGISTRAR: 'Registro de movimiento', CONFIRMAR: 'Confirmación de movimiento', CANCELAR: 'Cancelación de movimiento', CERRAR: 'Cierre' }} cargarEventos={cargarAuditoria} revision={revision} />}
    <ModalEstado ancho="amplio" abierto={Boolean(modal)} tipo={modal?.tipo === 'cierre' || (modal?.tipo === 'resolver' && modal.accion === 'cancelacion') ? 'advertencia' : 'informacion'} titulo={tituloModal} mensaje={<form className={localStyles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void ejecutarAccion() }} noValidate>
      {modal?.tipo === 'autorizar' && <><p className={localStyles.ayuda}>Se autorizará una reposición de {formatearCentavos(liquidacion.totales.fondoAutorizadoCentavos - liquidacion.totales.saldoInicialCentavos)}. El efectivo aumentará únicamente cuando se confirme su recepción.</p><CampoTexto id="motivo-autorizar" etiqueta="Motivo" valor={motivo} error={errores.motivo} multilinea onChange={setMotivo} /></>}
      {modal?.tipo === 'recibir' && <><p className={localStyles.ayuda}>Confirma que la sucursal recibió físicamente {formatearCentavos(liquidacion.reposicion?.montoCentavos)}. Esta operación solo puede registrarse una vez.</p><CampoTexto id="referencia-reposicion" etiqueta="Referencia de recepción" valor={referencia} error={errores.referencia} onChange={setReferencia} /></>}
      {modal?.tipo === 'gasto' && <><CampoTexto id="gasto-monto" etiqueta="Importe (Q)" valor={monto} error={errores.monto} onChange={setMonto} inputMode="decimal" /><CampoTexto id="gasto-fecha" etiqueta="Fecha del gasto" valor={fecha} error={errores.fecha} onChange={setFecha} tipo="date" min={fechaMinima(liquidacion)} max={[fechaActualGuatemala(), ultimoDiaMes(liquidacion.anio, liquidacion.mes)].sort()[0]} /><CampoTexto id="gasto-concepto" etiqueta="Concepto o motivo" valor={concepto} error={errores.concepto} multilinea onChange={setConcepto} /><label htmlFor="gasto-comprobante">Comprobante PDF *<input id="gasto-comprobante" type="file" accept="application/pdf,.pdf" aria-invalid={Boolean(errores.archivo)} onChange={(evento) => { setArchivo(evento.target.files?.[0] ?? null); setErrores((actual) => ({ ...actual, archivo: '' })) }} />{errores.archivo && <span className={localStyles.errorCampo}>{errores.archivo}</span>}</label>{archivo && <div className={localStyles.archivoSeleccionado}><span>{archivo.name}</span><small>{tamanoArchivo(archivo.size)}</small></div>}<p className={localStyles.ayuda}>PDF obligatorio, máximo 10 MB. El gasto iniciará pendiente y reservará efectivo.</p></>}
      {modal?.tipo === 'cierre' && <><p className={localStyles.ayuda}>Todos los movimientos deben estar confirmados o cancelados. El efectivo declarado debe cuadrar con {formatearCentavos(liquidacion.totales.saldoActualCentavos)}.</p><CampoTexto id="cierre-efectivo" etiqueta="Efectivo contado (Q)" valor={monto} error={errores.monto} onChange={setMonto} inputMode="decimal" /><CampoTexto id="cierre-motivo" etiqueta="Motivo del cierre" valor={motivo} error={errores.motivo} multilinea onChange={setMotivo} /></>}
      {modal?.tipo === 'resolver' && <><p className={localStyles.ayuda}>{modal.accion === 'confirmacion' ? 'La confirmación convertirá la reserva en egreso sin descontarla dos veces.' : 'La cancelación liberará la reserva y conservará el movimiento en el historial.'}</p><CampoTexto id="resolver-motivo" etiqueta="Motivo" valor={motivo} error={errores.motivo} multilinea onChange={setMotivo} /></>}
      {modal?.tipo === 'correccion' && <><p className={localStyles.ayuda}>Gasto original: {modal.movimiento.numero} por {formatearCentavos(modal.movimiento.montoCentavos)}. La corrección se registrará en {modal.liquidacionDestino.numero} y requerirá aprobación independiente.</p><label>Naturaleza *<select value={naturaleza} onChange={(evento) => setNaturaleza(evento.target.value as NaturalezaMovimientoCajaChica)}><option value="RECUPERACION">{etiquetasNaturaleza.RECUPERACION}</option><option value="EGRESO">{etiquetasNaturaleza.EGRESO}</option></select></label><CampoTexto id="correccion-monto" etiqueta="Importe (Q)" valor={monto} error={errores.monto} onChange={setMonto} inputMode="decimal" /><CampoTexto id="correccion-fecha" etiqueta="Fecha" valor={fecha} error={errores.fecha} onChange={setFecha} tipo="date" min={fechaMinima(modal.liquidacionDestino)} max={[fechaActualGuatemala(), ultimoDiaMes(modal.liquidacionDestino.anio, modal.liquidacionDestino.mes)].sort()[0]} /><CampoTexto id="correccion-motivo" etiqueta="Motivo" valor={motivo} error={errores.motivo} multilinea onChange={setMotivo} /><CampoTexto id="correccion-referencia" etiqueta="Evidencia o referencia" valor={referencia} error={errores.referencia} onChange={setReferencia} /></>}
      {errorAccion && <div className={styles.alertaError} role="alert"><p>{errorAccion}</p></div>}
    </form>} textoAccionPrincipal={textoPrincipal} iconoAccionPrincipal={<IconoAccion nombre={modal?.tipo === 'resolver' && modal.accion === 'cancelacion' ? 'cancelar' : 'guardar'} />} onAccionPrincipal={() => void ejecutarAccion()} textoAccionSecundaria="Volver" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={cerrarModal} onCerrar={cerrarModal} cargando={procesando} varianteAccionPrincipal={modal?.tipo === 'cierre' || (modal?.tipo === 'resolver' && modal.accion === 'cancelacion') ? 'peligro' : 'predeterminada'} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Operación completada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    <ModalEstado abierto={Boolean(errorAccion && !modal)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
  </section>
}

function CampoTexto({ id, etiqueta, valor, error, onChange, multilinea = false, tipo = 'text', inputMode, min, max }: { id: string; etiqueta: string; valor: string; error?: string; onChange: (valor: string) => void; multilinea?: boolean; tipo?: string; inputMode?: 'decimal'; min?: string; max?: string }) {
  return <label htmlFor={id}>{etiqueta} *{multilinea ? <textarea id={id} value={valor} maxLength={500} aria-invalid={Boolean(error)} onChange={(evento) => onChange(evento.target.value)} /> : <input id={id} type={tipo} inputMode={inputMode} min={min} max={max} value={valor} aria-invalid={Boolean(error)} onChange={(evento) => onChange(evento.target.value)} />}{error && <span className={localStyles.errorCampo}>{error}</span>}</label>
}
