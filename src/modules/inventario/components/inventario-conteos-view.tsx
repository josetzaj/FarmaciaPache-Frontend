import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { crearConteoInventario, listarConteosInventario, listarUbicacionesInventario } from '../inventario-api'
import type { ConteoInventarioResumen, ConteosInventarioPaginados, EstadoConteoInventario, ExistenciaProducto, TipoConteoInventario, UbicacionInventario } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

type FormularioConteo = { referencia: string; tipo: TipoConteoInventario; ubicacionId: string; motivo: string; productos: ExistenciaProducto[] }
const formularioVacio: FormularioConteo = { referencia: '', tipo: 'GENERAL', ubicacionId: '', motivo: '', productos: [] }
const ordenes: Record<string, 'referencia' | 'ubicacion' | 'iniciado' | 'estado'> = { referencia: 'referencia', ubicacion: 'ubicacion', iniciado: 'iniciado', estado: 'estado' }
const etiquetasTipo: Record<TipoConteoInventario, string> = { GENERAL: 'General', SELECTIVO: 'Selectivo', ROTATIVO: 'Rotativo' }
const etiquetasEstado: Record<EstadoConteoInventario, string> = { ABIERTO: 'Abierto', REGISTRADO: 'Pendiente de aprobación', APROBADO: 'Aprobado', CERRADO: 'Cerrado', ANULADO: 'Anulado' }

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function claseEstado(estado: EstadoConteoInventario): string {
  if (estado === 'CERRADO' || estado === 'APROBADO') return styles.estadoCorrecto
  if (estado === 'REGISTRADO') return styles.estadoAdvertencia
  if (estado === 'ABIERTO') return styles.estadoInformacion
  return styles.estadoNeutral
}

export function InventarioConteosView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<ConteosInventarioPaginados | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'iniciado', desc: true }])
  const [creando, setCreando] = useState(false)
  const [formulario, setFormulario] = useState<FormularioConteo>(formularioVacio)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const puedeGestionar = permisos.includes('INVENTARIO.CONTEOS.CREAR')

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(true, controlador.signal).then(setUbicaciones).catch(() => undefined)
    return () => controlador.abort()
  }, [revision])

  const parametros = useMemo(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || undefined,
      ubicacionId: arregloFiltro(filtros, 'ubicacion')[0],
      tipos: arregloFiltro(filtros, 'tipo') as TipoConteoInventario[],
      estados: arregloFiltro(filtros, 'estado') as EstadoConteoInventario[],
      orden: ordenes[orden?.id ?? 'iniciado'] ?? 'iniciado',
      direccion: orden?.desc ? 'desc' as const : 'asc' as const,
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarConteosInventario(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }
        setResultado(respuesta); setError(null)
      })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los conteos de inventario.') })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, pagina, parametros])

  const validar = () => {
    const siguientes: Record<string, string> = {}
    if (formulario.referencia.trim().length < 3) siguientes.referencia = 'Ingresa una referencia de al menos 3 caracteres.'
    if (!formulario.ubicacionId) siguientes.ubicacionId = 'Selecciona una ubicación.'
    if (formulario.motivo.trim().length < 10) siguientes.motivo = 'Explica el motivo con al menos 10 caracteres.'
    if (formulario.tipo !== 'GENERAL' && !formulario.productos.length) siguientes.productos = 'Agrega al menos un medicamento.'
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) window.requestAnimationFrame(() => document.getElementById(`conteo-${primero}`)?.focus())
    return !primero
  }

  const crear = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const conteo = await crearConteoInventario({
        referencia: formulario.referencia.trim().toUpperCase(),
        tipo: formulario.tipo,
        ubicacionId: formulario.ubicacionId,
        motivo: formulario.motivo.trim(),
        productoIds: formulario.tipo === 'GENERAL' ? [] : formulario.productos.map((item) => item.producto.id),
      })
      setCreando(false); setRevision((valor) => valor + 1); onNavegar(`/inventario/conteos/${conteo.id}`)
    } catch (errorActual) {
      setErrorGuardado(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible iniciar el conteo.')
    } finally { setGuardando(false) }
  }

  const columnas = useMemo<ColumnaTabla<ConteoInventarioResumen>[]>(() => [
    { id: 'referencia', titulo: 'Referencia', obtenerValor: (item) => item.referencia, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.referencia}</strong><small>{item.motivo}</small></span> },
    { id: 'tipo', titulo: 'Tipo', obtenerValor: (item) => item.tipo, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipo', opciones: Object.entries(etiquetasTipo).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (item) => etiquetasTipo[item.tipo] },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacion.nombre, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar ubicación', multiple: false, opciones: ubicaciones.map((item) => ({ valor: item.id, etiqueta: `${item.nombre} (${item.codigo})` })) }, celda: (item) => <span className={styles.identidad}><strong>{item.ubicacion.nombre}</strong><small>{item.ubicacion.codigo}</small></span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estado', opciones: Object.entries(etiquetasEstado).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (item) => <span className={`${styles.estado} ${claseEstado(item.estado)}`}>{etiquetasEstado[item.estado]}</span> },
    { id: 'posiciones', titulo: 'Posiciones', obtenerValor: (item) => item.totalPosiciones, celda: (item) => <span className={styles.cantidad}>{item.totalPosiciones}</span> },
    { id: 'diferencias', titulo: 'Diferencias', obtenerValor: (item) => item.posicionesConDiferencia, celda: (item) => <span className={styles.cantidad}>{item.posicionesConDiferencia}</span> },
    { id: 'iniciado', titulo: 'Iniciado', obtenerValor: (item) => item.iniciadoEn, ordenable: true, celda: (item) => fechaHora(item.iniciadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver conteo" aria-label={`Ver conteo ${item.referencia}`} onClick={() => onNavegar(`/inventario/conteos/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, ubicaciones])

  const ubicacionesDisponibles = ubicaciones.filter((item) => item.activa && !item.bloqueadaPorConteoId)
  const hayFiltros = Boolean(busqueda || filtros.length)
  return <section className={styles.pagina} aria-labelledby="titulo-conteos-inventario">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Conteos físicos" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-conteos-inventario">Conteos físicos</h1>{puedeGestionar && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/inventario/conteos/nuevo')}><img src={iconoAgregar} alt="" />Nuevo conteo</button>}<form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}><label className={styles.soloLectores} htmlFor="buscar-conteos">Buscar conteos</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-conteos" type="search" value={entrada} maxLength={150} placeholder="Referencia, ubicación o motivo" onChange={(evento) => setEntrada(evento.target.value)} />{entrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setEntrada('')}>×</button>}</div><small>Busca por referencia, ubicación o motivo.</small></form></div></header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Control de existencias físicas</strong><small>La ubicación permanece bloqueada desde la apertura hasta la aprobación del conteo.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} conteos</span>}{hayFiltros && <button type="button" onClick={() => { setEntrada(''); setBusqueda(''); setFiltros([]); setPagina(1) }}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Conteos físicos con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'iniciado', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="conteo" unidadPlural="conteos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'Sin conteos registrados'}</h2><p>{hayFiltros ? 'Ajusta los filtros aplicados.' : 'Inicia un conteo para comparar la existencia física con el sistema.'}</p></div> : null}</article>
    <ModalEstado ancho="amplio" abierto={creando} tipo="informacion" titulo="Nuevo conteo físico" mensaje={<form className={styles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void crear() }} noValidate><div className={styles.grillaFormulario}><div className={styles.campo}><label htmlFor="conteo-referencia">Referencia *</label><input id="conteo-referencia" value={formulario.referencia} maxLength={50} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setFormulario((actual) => ({ ...actual, referencia: evento.target.value }))} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div><div className={styles.campo}><label htmlFor="conteo-tipo">Tipo *</label><select id="conteo-tipo" value={formulario.tipo} onChange={(evento) => { const tipo = evento.target.value as TipoConteoInventario; setFormulario((actual) => ({ ...actual, tipo, productos: tipo === 'GENERAL' ? [] : actual.productos })) }}><option value="GENERAL">General</option><option value="SELECTIVO">Selectivo</option><option value="ROTATIVO">Rotativo</option></select></div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-ubicacionId">Ubicación *</label><select id="conteo-ubicacionId" value={formulario.ubicacionId} aria-invalid={Boolean(errores.ubicacionId)} onChange={(evento) => setFormulario((actual) => ({ ...actual, ubicacionId: evento.target.value, productos: [] }))}><option value="">Selecciona una ubicación disponible</option>{ubicacionesDisponibles.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select>{errores.ubicacionId && <span className={styles.campoError}>{errores.ubicacionId}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-motivo">Motivo *</label><textarea id="conteo-motivo" value={formulario.motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setFormulario((actual) => ({ ...actual, motivo: evento.target.value }))} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}</div>{formulario.tipo !== 'GENERAL' && <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-productos">Medicamentos incluidos *</label><SelectorProductoInventario id="conteo-productos" valor={null} soloConExistencia ubicacionId={formulario.ubicacionId || undefined} deshabilitado={!formulario.ubicacionId} onChange={(producto) => { if (!producto || formulario.productos.some((item) => item.producto.id === producto.producto.id)) return; setFormulario((actual) => ({ ...actual, productos: [...actual.productos, producto] })); setErrores((actual) => ({ ...actual, productos: '' })) }} invalido={Boolean(errores.productos)} />{errores.productos && <span className={styles.campoError}>{errores.productos}</span>}{formulario.productos.length > 0 && <ul className={styles.listaSeleccion}><>{formulario.productos.map((item) => <li key={item.producto.id}><span><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span><button type="button" aria-label={`Quitar ${item.producto.nombre}`} onClick={() => setFormulario((actual) => ({ ...actual, productos: actual.productos.filter((producto) => producto.producto.id !== item.producto.id) }))}><img src={iconoEliminar} alt="" /></button></li>)}</></ul>}</div>}</div></form>} textoAccionPrincipal={guardando ? 'Iniciando…' : 'Iniciar conteo'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void crear()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setCreando(false)} onCerrar={() => setCreando(false)} cargando={guardando} />
    <ModalEstado abierto={Boolean(errorGuardado)} tipo="error" titulo="No se pudo iniciar el conteo" mensaje={errorGuardado ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorGuardado(null)} onCerrar={() => setErrorGuardado(null)} />
  </section>
}
