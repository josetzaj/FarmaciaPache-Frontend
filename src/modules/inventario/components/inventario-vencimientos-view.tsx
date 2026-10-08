import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla } from '../../../shared/components/tabla-datos'
import { listarAlertasVencimientoInventario, listarUbicacionesInventario, procesarVencimientosInventario } from '../inventario-api'
import type { AlertaVencimientoInventario, AlertasVencimientoPaginadas, OperacionInventario, UbicacionInventario } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const etiquetasNivel = { VENCIDO: 'Vencido', CRITICO: 'Crítico: hasta 30 días', PREVENTIVO: 'Preventivo: 31–60 días', INFORMATIVO: 'Informativo: 61–90 días' } as const

function numero(valor: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function fecha(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

export function InventarioVencimientosView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<AlertasVencimientoPaginadas | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [dias, setDias] = useState<30 | 60 | 90>(90)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [resultadoProceso, setResultadoProceso] = useState<OperacionInventario | null | undefined>(undefined)
  const [errorProceso, setErrorProceso] = useState<string | null>(null)
  const puedeProcesar = permisos.includes('INVENTARIO.VENCIMIENTOS.PROCESAR')
  const puedeVerAuditoriaOperacion = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA') && permisos.includes('INVENTARIO.KARDEX.VER')

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(true, controlador.signal).then(setUbicaciones).catch(() => undefined)
    return () => controlador.abort()
  }, [revision])

  const parametros = useMemo(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, ubicacionId: ubicacionId || undefined, dias }), [busqueda, dias, pagina, tamanoPagina, ubicacionId])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarAlertasVencimientoInventario(parametros, controlador.signal)
      .then((respuesta) => { if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }; setResultado(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las alertas de vencimiento.') })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, pagina, parametros])

  const procesar = async () => {
    setProcesando(true)
    try {
      const operacion = await procesarVencimientosInventario()
      setResultadoProceso(operacion); setConfirmando(false); setRevision((valor) => valor + 1)
    } catch (errorActual) {
      setConfirmando(false); setErrorProceso(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible procesar los vencimientos.')
    } finally { setProcesando(false) }
  }

  const columnas = useMemo<ColumnaTabla<AlertaVencimientoInventario>[]>(() => [
    { id: 'producto', titulo: 'Medicamento', obtenerValor: (item) => `${item.productoNombre} ${item.productoCodigo}`, celda: (item) => <span className={styles.identidad}><strong>{item.productoNombre}</strong><small>{item.productoCodigo}</small></span> },
    { id: 'lote', titulo: 'Lote', obtenerValor: (item) => item.numeroLote, celda: (item) => item.numeroLote },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacionNombre, celda: (item) => item.ubicacionNombre },
    { id: 'vencimiento', titulo: 'Vencimiento', obtenerValor: (item) => item.fechaVencimiento, celda: (item) => fecha(item.fechaVencimiento) },
    { id: 'dias', titulo: 'Días restantes', obtenerValor: (item) => item.diasRestantes, celda: (item) => <span className={styles.cantidad}>{item.diasRestantes < 0 ? `${Math.abs(item.diasRestantes)} vencido(s)` : item.diasRestantes}</span> },
    { id: 'cantidad', titulo: 'Cantidad', obtenerValor: (item) => item.cantidad, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidad)}</span> },
    { id: 'nivel', titulo: 'Nivel', obtenerValor: (item) => item.nivel, celda: (item) => <span className={`${styles.estado} ${item.nivel === 'VENCIDO' ? styles.estadoPeligro : item.nivel === 'CRITICO' ? styles.estadoAdvertencia : styles.estadoInformacion}`}>{etiquetasNivel[item.nivel]}</span> },
  ], [])

  const hayCriterios = Boolean(busqueda || ubicacionId || dias !== 90)
  return <section className={styles.pagina} aria-labelledby="titulo-vencimientos-inventario">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Alertas de vencimiento" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-vencimientos-inventario">Alertas de vencimiento</h1>{puedeProcesar && <button className={styles.botonPrincipal} type="button" onClick={() => setConfirmando(true)}>Procesar vencidos</button>}<form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}><label className={styles.soloLectores} htmlFor="buscar-vencimientos">Buscar alertas</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-vencimientos" type="search" value={entrada} maxLength={150} placeholder="Medicamento, código o lote" onChange={(evento) => setEntrada(evento.target.value)} />{entrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setEntrada('')}>×</button>}</div><small>Busca por medicamento, código o número de lote.</small></form></div></header>
    <fieldset className={styles.panelFiltros}><legend>Periodo de alerta</legend><div className={styles.campo}><label htmlFor="vencimientos-dias">Próximos días</label><select id="vencimientos-dias" value={dias} onChange={(evento) => { setDias(Number(evento.target.value) as 30 | 60 | 90); setPagina(1) }}><option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option></select></div><div className={styles.campo}><label htmlFor="vencimientos-ubicacion">Ubicación</label><select id="vencimientos-ubicacion" value={ubicacionId} onChange={(evento) => { setUbicacionId(evento.target.value); setPagina(1) }}><option value="">Todas las ubicaciones</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select></div>{hayCriterios && <button className={styles.botonNeutral} type="button" onClick={() => { setEntrada(''); setBusqueda(''); setUbicacionId(''); setDias(90); setPagina(1) }}>Restablecer</button>}</fieldset>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Lotes por vencer o vencidos</strong><small>Seguimiento preventivo según la fecha registrada en cada lote.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} alertas</span>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Alertas de vencimiento" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={[]} obtenerIdFila={(item) => `${item.ubicacionId}-${item.loteId}`} onFiltrosChange={() => undefined} onOrdenamientoChange={() => undefined} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="alerta" unidadPlural="alertas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayCriterios ? 'Sin coincidencias' : 'Sin alertas de vencimiento'}</h2><p>No existen lotes dentro del periodo seleccionado.</p></div> : null}</article>
    {resultadoProceso && puedeVerAuditoriaOperacion && <InventarioAuditoria tipo="operacion" entidadId={resultadoProceso.id} titulo={`Proceso ${resultadoProceso.referencia}.`} revision={revision} />}
    <ModalEstado abierto={confirmando} tipo="advertencia" titulo="Procesar productos vencidos" mensaje="Se trasladará a estado Vencido toda existencia cuya fecha de vencimiento ya haya finalizado. Los lotes próximos a vencer no serán modificados." textoAccionPrincipal={procesando ? 'Procesando…' : 'Procesar vencidos'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void procesar()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={procesando} />
    <ModalEstado abierto={resultadoProceso !== undefined} tipo="exito" titulo={resultadoProceso ? 'Vencimientos procesados' : 'Sin vencimientos pendientes'} mensaje={resultadoProceso ? `${resultadoProceso.movimientos.length / 2} posiciones fueron trasladadas al estado Vencido.` : 'No existen posiciones vencidas pendientes de procesar.'} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setResultadoProceso(undefined)} onCerrar={() => setResultadoProceso(undefined)} />
    <ModalEstado abierto={Boolean(errorProceso)} tipo="error" titulo="No se pudieron procesar los vencimientos" mensaje={errorProceso ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorProceso(null)} onCerrar={() => setErrorProceso(null)} />
  </section>
}
