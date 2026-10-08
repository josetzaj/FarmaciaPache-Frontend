import { useEffect, useMemo, useState } from 'react'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { aprobarConteoInventario, obtenerConteoInventario, registrarResultadosConteoInventario } from '../inventario-api'
import type { ConteoInventario, DetalleConteoInventario, EstadoConteoInventario, TipoConteoInventario } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

type CapturaResultado = { cantidad: string; observacion: string }
const etiquetasTipo: Record<TipoConteoInventario, string> = { GENERAL: 'General', SELECTIVO: 'Selectivo', ROTATIVO: 'Rotativo' }
const etiquetasEstado: Record<EstadoConteoInventario, string> = { ABIERTO: 'Abierto', REGISTRADO: 'Pendiente de aprobación', APROBADO: 'Aprobado', CERRADO: 'Cerrado', ANULADO: 'Anulado' }

function numero(valor: number | null): string {
  return valor === null ? 'Pendiente' : new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function fechaHora(valor: string | null): string {
  return valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) : 'Pendiente'
}

function cantidadValida(valor: string): boolean {
  return /^\d+(?:\.\d{1,6})?$/.test(valor.trim()) && Number(valor) <= 999_999_999_999
}

function textoFiltro(filtros: ColumnFiltersState, id: string): string {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' ? valor : ''
}

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
}

function claseEstado(estado: EstadoConteoInventario): string {
  if (estado === 'CERRADO' || estado === 'APROBADO') return styles.estadoCorrecto
  if (estado === 'REGISTRADO') return styles.estadoAdvertencia
  if (estado === 'ABIERTO') return styles.estadoInformacion
  return styles.estadoNeutral
}

export function InventarioConteoDetalleView({ conteoId, permisos, onNavegar, onCambiosPendientes }: { conteoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [conteo, setConteo] = useState<ConteoInventario | null>(null)
  const [captura, setCaptura] = useState<Record<string, CapturaResultado>>({})
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [confirmarRegistro, setConfirmarRegistro] = useState(false)
  const [modalAprobacion, setModalAprobacion] = useState(false)
  const [evidencia, setEvidencia] = useState('')
  const [motivoAprobacion, setMotivoAprobacion] = useState('')
  const [erroresAprobacion, setErroresAprobacion] = useState<Record<string, string>>({})
  const [revision, setRevision] = useState(0)
  const [sucio, setSucio] = useState(false)
  const puedeGestionar = permisos.includes('INVENTARIO.CONTEOS.REGISTRAR_RESULTADOS')
  const puedeAprobar = permisos.includes('INVENTARIO.CONTEOS.APROBAR')
  const puedeVerAuditoria = permisos.includes('INVENTARIO.CONTEOS.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerConteoInventario(conteoId, controlador.signal)
      .then((respuesta) => {
        setConteo(respuesta)
        setCaptura(Object.fromEntries(respuesta.detalles.map((detalle) => [detalle.id, { cantidad: detalle.cantidadContada === null ? '' : String(detalle.cantidadContada), observacion: detalle.observacion ?? '' }])))
        setError(null); setSucio(false)
      })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el conteo.') })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [conteoId, revision])

  useEffect(() => { onCambiosPendientes(sucio && conteo?.estado === 'ABIERTO') }, [conteo?.estado, onCambiosPendientes, sucio])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const detallesVisibles = useMemo(() => {
    if (!conteo) return []
    const termino = textoFiltro(filtros, 'producto').trim().toLocaleLowerCase('es-GT')
    const estados = arregloFiltro(filtros, 'estado')
    const diferencias = arregloFiltro(filtros, 'resultado')
    let items = conteo.detalles.filter((detalle) => {
      const coincideTexto = !termino || `${detalle.productoNombre} ${detalle.productoCodigo} ${detalle.numeroLote ?? ''}`.toLocaleLowerCase('es-GT').includes(termino)
      const coincideEstado = !estados.length || estados.includes(detalle.estado)
      const categoria = detalle.diferencia === null ? 'PENDIENTE' : detalle.diferencia === 0 ? 'SIN_DIFERENCIA' : 'CON_DIFERENCIA'
      return coincideTexto && coincideEstado && (!diferencias.length || diferencias.includes(categoria))
    })
    const orden = ordenamiento[0]
    if (orden) items = [...items].sort((a, b) => {
      const valorA = orden.id === 'esperada' ? a.cantidadEsperada : orden.id === 'diferencia' ? (a.diferencia ?? 0) : `${a.productoNombre} ${a.productoCodigo}`
      const valorB = orden.id === 'esperada' ? b.cantidadEsperada : orden.id === 'diferencia' ? (b.diferencia ?? 0) : `${b.productoNombre} ${b.productoCodigo}`
      const comparacion = typeof valorA === 'number' && typeof valorB === 'number' ? valorA - valorB : String(valorA).localeCompare(String(valorB), 'es-GT')
      return orden.desc ? -comparacion : comparacion
    })
    return items
  }, [conteo, filtros, ordenamiento])

  const actualizarCaptura = (detalleId: string, cambios: Partial<CapturaResultado>) => {
    setCaptura((actual) => ({ ...actual, [detalleId]: { ...actual[detalleId], ...cambios } as CapturaResultado }))
    setSucio(true)
  }

  const prepararRegistro = () => {
    if (!conteo) return
    const invalido = conteo.detalles.find((detalle) => !cantidadValida(captura[detalle.id]?.cantidad ?? ''))
    if (invalido) {
      setErrorAccion(`Ingresa una cantidad física válida para ${invalido.productoNombre}${invalido.numeroLote ? `, lote ${invalido.numeroLote}` : ''}.`)
      window.requestAnimationFrame(() => document.getElementById(`cantidad-${invalido.id}`)?.focus())
      return
    }
    setConfirmarRegistro(true)
  }

  const registrarResultados = async () => {
    if (!conteo) return
    setGuardando(true)
    try {
      const actualizado = await registrarResultadosConteoInventario(conteo.id, { resultados: conteo.detalles.map((detalle) => ({ detalleId: detalle.id, cantidadContada: Number(captura[detalle.id].cantidad), observacion: captura[detalle.id].observacion.trim() || null })) })
      setConteo(actualizado); setSucio(false); onCambiosPendientes(false); setConfirmarRegistro(false); setMensajeExito('Los resultados fueron registrados y el conteo quedó pendiente de aprobación.'); setRevision((valor) => valor + 1)
    } catch (errorActual) {
      setConfirmarRegistro(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar los resultados.')
    } finally { setGuardando(false) }
  }

  const aprobar = async () => {
    const siguientes: Record<string, string> = {}
    if (evidencia.trim().length < 3) siguientes.evidencia = 'Ingresa la referencia de la evidencia.'
    if (motivoAprobacion.trim().length < 10) siguientes.motivo = 'Explica la aprobación con al menos 10 caracteres.'
    setErroresAprobacion(siguientes)
    if (Object.keys(siguientes).length) return
    setAprobando(true)
    try {
      const actualizado = await aprobarConteoInventario(conteoId, { evidenciaReferencia: evidencia.trim(), motivoAprobacion: motivoAprobacion.trim() })
      setConteo(actualizado); setModalAprobacion(false); setMensajeExito(actualizado.detalles.some((detalle) => detalle.diferencia !== 0) ? 'El conteo fue aprobado, sus diferencias fueron ajustadas y la ubicación quedó liberada.' : 'El conteo fue aprobado sin diferencias y la ubicación quedó liberada.'); setRevision((valor) => valor + 1)
    } catch (errorActual) {
      setModalAprobacion(false); setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible aprobar el conteo.')
    } finally { setAprobando(false) }
  }

  const columnas = useMemo<ColumnaTabla<DetalleConteoInventario>[]>(() => [
    { id: 'producto', titulo: 'Medicamento / lote', obtenerValor: (item) => `${item.productoNombre} ${item.productoCodigo} ${item.numeroLote ?? ''}`, ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Buscar medicamento o lote', placeholder: 'Nombre, código o lote' }, celda: (item) => <span className={styles.identidad}><strong>{item.productoNombre}</strong><small>{item.productoCodigo}{item.numeroLote ? ` · Lote ${item.numeroLote}` : ' · Sin lote'}</small></span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estado', opciones: [...new Set((conteo?.detalles ?? []).map((item) => item.estado))].map((valor) => ({ valor, etiqueta: valor.replaceAll('_', ' ') })) }, celda: (item) => item.estado.replaceAll('_', ' ') },
    { id: 'esperada', titulo: 'Cantidad esperada', obtenerValor: (item) => item.cantidadEsperada, ordenable: true, celda: (item) => <span className={styles.cantidad}>{numero(item.cantidadEsperada)}</span> },
    { id: 'contada', titulo: 'Cantidad física', obtenerValor: (item) => item.cantidadContada, celda: (item) => conteo?.estado === 'ABIERTO' && puedeGestionar ? <label className={styles.capturaCantidad}><span className={styles.soloLectores}>Cantidad física de {item.productoNombre}</span><input id={`cantidad-${item.id}`} type="number" min="0" step="0.000001" value={captura[item.id]?.cantidad ?? ''} aria-invalid={!cantidadValida(captura[item.id]?.cantidad ?? '') && Boolean(captura[item.id]?.cantidad)} onChange={(evento) => actualizarCaptura(item.id, { cantidad: evento.target.value })} /></label> : <span className={styles.cantidad}>{numero(item.cantidadContada)}</span> },
    { id: 'diferencia', titulo: 'Diferencia', obtenerValor: (item) => item.diferencia, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar resultado', opciones: [{ valor: 'PENDIENTE', etiqueta: 'Pendiente' }, { valor: 'SIN_DIFERENCIA', etiqueta: 'Sin diferencia' }, { valor: 'CON_DIFERENCIA', etiqueta: 'Con diferencia' }] }, celda: (item) => <span className={`${styles.cantidad} ${item.diferencia && item.diferencia !== 0 ? styles.diferenciaConteo : ''}`}>{numero(item.diferencia)}</span> },
    { id: 'observacion', titulo: 'Observación', obtenerValor: (item) => item.observacion ?? '', celda: (item) => conteo?.estado === 'ABIERTO' && puedeGestionar ? <label className={styles.capturaObservacion}><span className={styles.soloLectores}>Observación de {item.productoNombre}</span><input value={captura[item.id]?.observacion ?? ''} maxLength={500} placeholder="Opcional" onChange={(evento) => actualizarCaptura(item.id, { observacion: evento.target.value })} /></label> : item.observacion || <span className={styles.sinDato}>Sin observación</span> },
    { id: 'ajuste', titulo: 'Ajuste', obtenerValor: (item) => item.operacionAjusteId ?? '', celda: (item) => item.operacionAjusteId ? <span title={item.operacionAjusteId}>Generado</span> : <span className={styles.sinDato}>No aplica</span> },
  ], [captura, conteo, puedeGestionar])

  if (cargando) return <section className={styles.pagina} aria-busy="true"><p role="status">Cargando conteo…</p></section>
  if (error || !conteo) return <section className={styles.pagina}><InventarioBreadcrumb actual="Detalle de conteo" onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{error ?? 'El conteo solicitado no existe.'}</p><button type="button" onClick={() => { setCargando(true); setRevision((valor) => valor + 1) }}>Reintentar</button></div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/conteos')}>Volver a conteos</button></section>

  const conDiferencias = conteo.detalles.filter((detalle) => detalle.diferencia !== null && detalle.diferencia !== 0).length
  return <section className={styles.pagina} aria-labelledby="titulo-detalle-conteo">
    <header className={styles.cabecera}><InventarioBreadcrumb actual={`Conteo ${conteo.referencia}`} onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-detalle-conteo">Conteo {conteo.referencia}</h1><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/conteos')}><img src={iconoVer} alt="" />Ver todos</button>{conteo.estado === 'ABIERTO' && puedeGestionar && <button className={styles.botonPrincipal} type="button" onClick={prepararRegistro}><IconoAccion nombre="guardar" />Registrar resultados</button>}{conteo.estado === 'REGISTRADO' && puedeAprobar && <button className={styles.botonPrincipal} type="button" onClick={() => { setEvidencia(''); setMotivoAprobacion(''); setErroresAprobacion({}); setModalAprobacion(true) }}><IconoAccion nombre="estado" />Aprobar y cerrar</button>}</div></header>
    <article className={styles.resumenConteo}><div><span>Estado</span><strong className={`${styles.estado} ${claseEstado(conteo.estado)}`}>{etiquetasEstado[conteo.estado]}</strong></div><div><span>Tipo</span><strong>{etiquetasTipo[conteo.tipo]}</strong></div><div><span>Ubicación</span><strong>{conteo.ubicacion.nombre}</strong><small>{conteo.ubicacion.codigo}</small></div><div><span>Posiciones</span><strong>{conteo.detalles.length}</strong></div><div><span>Diferencias</span><strong>{conteo.estado === 'ABIERTO' ? 'Pendiente' : conDiferencias}</strong></div><div><span>Iniciado</span><strong>{fechaHora(conteo.iniciadoEn)}</strong></div><div><span>Registrado</span><strong>{fechaHora(conteo.registradoEn)}</strong></div><div><span>Cerrado</span><strong>{fechaHora(conteo.cerradoEn)}</strong></div><div className={styles.resumenConteoMotivo}><span>Motivo</span><strong>{conteo.motivo}</strong></div></article>
    {conteo.estado === 'ABIERTO' && <div className={styles.alertaAdvertencia}><p>Cuenta físicamente todas las posiciones. Al registrar los resultados ya no podrán editarse y quedarán pendientes de aprobación.</p></div>}
    <article className={styles.panelTabla}><div className={styles.resumenTabla}><div><strong>Posiciones incluidas</strong><small>{conteo.estado === 'ABIERTO' ? 'Captura la cantidad física observada en cada medicamento, lote y estado.' : 'Comparación entre la existencia esperada y el conteo físico.'}</small></div><div className={styles.accionesResumen}><span>{detallesVisibles.length} de {conteo.detalles.length} posiciones</span>{filtros.length > 0 && <button type="button" onClick={() => setFiltros([])}>Limpiar filtros</button>}</div></div><TablaDatos descripcion={`Detalle del conteo ${conteo.referencia}`} datos={detallesVisibles} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={setFiltros} onOrdenamientoChange={setOrdenamiento} /></article>
    {puedeVerAuditoria && <InventarioAuditoria tipo="conteo" entidadId={conteo.id} titulo={`Trazabilidad del conteo ${conteo.referencia}.`} revision={revision} />}
    <ModalEstado abierto={confirmarRegistro} tipo="advertencia" titulo="Registrar resultados del conteo" mensaje="Confirma que terminaste el conteo físico. Después de registrar todas las cantidades ya no podrán modificarse y el conteo pasará a aprobación." textoAccionPrincipal={guardando ? 'Registrando…' : 'Registrar resultados'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void registrarResultados()} textoAccionSecundaria="Seguir revisando" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmarRegistro(false)} onCerrar={() => setConfirmarRegistro(false)} cargando={guardando} />
    <ModalEstado ancho="amplio" abierto={modalAprobacion} tipo="advertencia" titulo="Aprobar y cerrar conteo" mensaje={<form className={styles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void aprobar() }} noValidate><p>Se generarán movimientos de ajuste por cada diferencia y se liberará la ubicación.</p><div className={styles.campo}><label htmlFor="aprobacion-evidencia">Referencia de evidencia *</label><input id="aprobacion-evidencia" value={evidencia} maxLength={500} aria-invalid={Boolean(erroresAprobacion.evidencia)} onChange={(evento) => setEvidencia(evento.target.value)} />{erroresAprobacion.evidencia && <span className={styles.campoError}>{erroresAprobacion.evidencia}</span>}</div><div className={styles.campo}><label htmlFor="aprobacion-motivo">Motivo de aprobación *</label><textarea id="aprobacion-motivo" value={motivoAprobacion} maxLength={500} aria-invalid={Boolean(erroresAprobacion.motivo)} onChange={(evento) => setMotivoAprobacion(evento.target.value)} />{erroresAprobacion.motivo && <span className={styles.campoError}>{erroresAprobacion.motivo}</span>}</div></form>} textoAccionPrincipal={aprobando ? 'Aprobando…' : 'Aprobar y cerrar'} iconoAccionPrincipal={<IconoAccion nombre="estado" />} onAccionPrincipal={() => void aprobar()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setModalAprobacion(false)} onCerrar={() => setModalAprobacion(false)} cargando={aprobando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Conteo actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    <ModalEstado abierto={Boolean(errorAccion)} tipo="error" titulo="No se pudo completar la acción" mensaje={errorAccion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorAccion(null)} onCerrar={() => setErrorAccion(null)} />
  </section>
}
