import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { crearSolicitudPoliticaMasiva, listarProductosPoliticaMasiva, listarSolicitudesPoliticaMasiva, listarUbicacionesInventario, obtenerOpcionesPoliticaMasiva, resolverSolicitudPoliticaMasiva } from '../inventario-api'
import type { EstadoPoliticaStockMasiva, ModoAplicacionPoliticaStock, OpcionesPoliticaMasiva, ProductosPoliticaMasivaPaginados, SolicitudPoliticaMasiva, SolicitudesPoliticaMasivaPaginadas, TipoSeleccionPoliticaStockMasiva, UbicacionInventario } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

type FormularioMasivo = {
  referencia: string
  ubicacionId: string
  categoriaTerapeuticaId: string
  principioActivoId: string
  busqueda: string
  modoAplicacion: ModoAplicacionPoliticaStock
  tipoSeleccion: TipoSeleccionPoliticaStockMasiva
  stockMinimo: string
  stockMaximo: string
  stockSeguridad: string
  puntoReposicion: string
  motivoSolicitud: string
}

const formularioInicial: FormularioMasivo = {
  referencia: '', ubicacionId: '', categoriaTerapeuticaId: '', principioActivoId: '', busqueda: '',
  modoAplicacion: 'SOLO_SIN_POLITICA', tipoSeleccion: 'TODOS_RESULTADOS', stockMinimo: '0', stockMaximo: '',
  stockSeguridad: '0', puntoReposicion: '', motivoSolicitud: '',
}
const etiquetasEstado: Record<EstadoPoliticaStockMasiva, string> = { PENDIENTE: 'Pendiente de aprobación', APLICADA: 'Aplicada', RECHAZADA: 'Rechazada' }
const ordenes: Record<string, 'referencia' | 'solicitado' | 'estado' | 'total'> = { referencia: 'referencia', solicitado: 'solicitado', estado: 'estado', total: 'total' }

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function numero(valor: number | null): string {
  return valor === null ? 'Sin límite' : new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function cantidadValida(valor: string): boolean {
  return /^\d+(?:\.\d{1,6})?$/.test(valor.trim()) && Number(valor) <= 999_999_999_999
}

function estadosFiltro(filtros: ColumnFiltersState): EstadoPoliticaStockMasiva[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === 'estado')?.value
  return Array.isArray(valor) ? valor.filter((item): item is EstadoPoliticaStockMasiva => item === 'PENDIENTE' || item === 'APLICADA' || item === 'RECHAZADA') : undefined
}

export function InventarioPoliticasMasivasView({ permisos, sucursalActualId, onNavegar }: { permisos: readonly string[]; sucursalActualId: string; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<SolicitudesPoliticaMasivaPaginadas | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'solicitado', desc: true }])
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opciones, setOpciones] = useState<OpcionesPoliticaMasiva>({ categorias: [], principiosActivos: [] })
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [creando, setCreando] = useState(false)
  const [formulario, setFormulario] = useState<FormularioMasivo>(formularioInicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [productos, setProductos] = useState<ProductosPoliticaMasivaPaginados | null>(null)
  const [paginaProductos, setPaginaProductos] = useState(1)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState<SolicitudPoliticaMasiva | null>(null)
  const [resolucion, setResolucion] = useState<'aprobar' | 'rechazar' | null>(null)
  const [motivoResolucion, setMotivoResolucion] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const puedeCrear = permisos.includes('INVENTARIO.POLITICAS.CREAR_MASIVA')
  const puedeAprobarLocal = permisos.includes('INVENTARIO.POLITICAS.APROBAR_MASIVA')
  const puedeAprobarCorporativo = permisos.includes('INVENTARIO.POLITICAS.APROBAR_MASIVA_CORPORATIVA')
  const puedeVerPoliticasIndividuales = permisos.includes('INVENTARIO.POLITICAS.VER') || permisos.includes('INVENTARIO.POLITICAS.CONFIGURAR')
  const puedeVerAuditoria = permisos.includes('INVENTARIO.POLITICAS.VER_AUDITORIA')
  const puedeResolverDetalle = detalle !== null && (puedeAprobarCorporativo || (puedeAprobarLocal && detalle.sucursal.id === sucursalActualId))

  useEffect(() => { const tiempo = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400); return () => window.clearTimeout(tiempo) }, [entrada])
  useEffect(() => {
    if (!puedeCrear) return
    const controlador = new AbortController()
    void Promise.all([obtenerOpcionesPoliticaMasiva(controlador.signal), listarUbicacionesInventario(false, controlador.signal)])
      .then(([catalogos, ubicacionesActivas]) => { setOpciones(catalogos); setUbicaciones(ubicacionesActivas) })
      .catch(() => undefined)
    return () => controlador.abort()
  }, [puedeCrear])

  const parametros = useMemo(() => {
    const orden = ordenamiento[0]
    return { pagina, tamanoPagina, busqueda: busqueda || undefined, estados: estadosFiltro(filtros), orden: ordenes[orden?.id ?? 'solicitado'] ?? 'solicitado', direccion: orden?.desc ? 'desc' as const : 'asc' as const }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const claveListado = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveListado

  useEffect(() => {
    const controlador = new AbortController()
    void listarSolicitudesPoliticaMasiva(parametros, controlador.signal)
      .then((datos) => { setResultado(datos); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las solicitudes masivas.') })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveListado) })
    return () => controlador.abort()
  }, [claveListado, parametros])

  useEffect(() => {
    if (!creando) return
    const controlador = new AbortController()
    const tiempo = window.setTimeout(() => {
      void listarProductosPoliticaMasiva({
        pagina: paginaProductos, tamanoPagina: 50, busqueda: formulario.busqueda.trim() || undefined,
        categoriaTerapeuticaId: formulario.categoriaTerapeuticaId || undefined,
        principioActivoId: formulario.principioActivoId || undefined,
        ubicacionId: formulario.ubicacionId || undefined, modoAplicacion: formulario.modoAplicacion,
      }, controlador.signal).then(setProductos).catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible obtener la vista previa de medicamentos.' })
      })
    }, 350)
    return () => { window.clearTimeout(tiempo); controlador.abort() }
  }, [creando, formulario.busqueda, formulario.categoriaTerapeuticaId, formulario.principioActivoId, formulario.ubicacionId, formulario.modoAplicacion, paginaProductos])

  const cambiarFiltro = <K extends keyof FormularioMasivo>(campo: K, valor: FormularioMasivo[K]) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor })); setPaginaProductos(1); setSeleccionados(new Set())
  }
  const alternarProducto = (id: string) => setSeleccionados((actual) => { const siguiente = new Set(actual); if (siguiente.has(id)) siguiente.delete(id); else if (siguiente.size < 500) siguiente.add(id); return siguiente })

  const validar = () => {
    const siguientes: Record<string, string> = {}
    if (formulario.referencia.trim().length < 3) siguientes.referencia = 'Ingresa una referencia de al menos 3 caracteres.'
    if (!cantidadValida(formulario.stockMinimo)) siguientes.stockMinimo = 'Ingresa una cantidad válida.'
    if (!cantidadValida(formulario.stockSeguridad)) siguientes.stockSeguridad = 'Ingresa una cantidad válida.'
    if (formulario.stockMaximo && !cantidadValida(formulario.stockMaximo)) siguientes.stockMaximo = 'Ingresa una cantidad válida o déjalo vacío.'
    if (formulario.puntoReposicion && !cantidadValida(formulario.puntoReposicion)) siguientes.puntoReposicion = 'Ingresa una cantidad válida o déjalo vacío.'
    if (!siguientes.stockMaximo && formulario.stockMaximo && Number(formulario.stockMaximo) < Number(formulario.stockMinimo)) siguientes.stockMaximo = 'Debe ser igual o superior al mínimo.'
    if (!siguientes.puntoReposicion && formulario.puntoReposicion && Number(formulario.puntoReposicion) < Number(formulario.stockSeguridad)) siguientes.puntoReposicion = 'Debe ser igual o superior al stock de seguridad.'
    if (formulario.motivoSolicitud.trim().length < 10) siguientes.motivoSolicitud = 'Explica el motivo con al menos 10 caracteres.'
    if (formulario.tipoSeleccion === 'SELECCION_MANUAL' && !seleccionados.size) siguientes.productos = 'Selecciona al menos un medicamento.'
    if (!productos?.total) siguientes.productos = 'El alcance actual no contiene medicamentos.'
    setErrores(siguientes)
    return Object.keys(siguientes).length === 0
  }

  const crear = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const solicitud = await crearSolicitudPoliticaMasiva({
        referencia: formulario.referencia.trim(), ubicacionId: formulario.ubicacionId || undefined,
        categoriaTerapeuticaId: formulario.categoriaTerapeuticaId || undefined, principioActivoId: formulario.principioActivoId || undefined,
        busqueda: formulario.busqueda.trim() || undefined, modoAplicacion: formulario.modoAplicacion, tipoSeleccion: formulario.tipoSeleccion,
        productoIds: formulario.tipoSeleccion === 'SELECCION_MANUAL' ? [...seleccionados] : [], stockMinimo: Number(formulario.stockMinimo),
        stockMaximo: formulario.stockMaximo ? Number(formulario.stockMaximo) : null, stockSeguridad: Number(formulario.stockSeguridad),
        puntoReposicion: formulario.puntoReposicion ? Number(formulario.puntoReposicion) : null, motivoSolicitud: formulario.motivoSolicitud.trim(),
      })
      setCreando(false); setDetalle(solicitud); setRevision((valor) => valor + 1); setMensaje({ tipo: 'exito', texto: 'La solicitud quedó pendiente de aprobación. Ninguna política fue modificada todavía.' })
    } catch (errorActual) { setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible crear la solicitud masiva.' }) }
    finally { setGuardando(false) }
  }

  const resolver = async () => {
    if (!detalle || !resolucion) return
    if (motivoResolucion.trim().length < 10) { setMensaje({ tipo: 'error', texto: 'El motivo de la resolución debe contener al menos 10 caracteres.' }); return }
    setGuardando(true)
    try {
      const resuelta = await resolverSolicitudPoliticaMasiva(detalle.id, resolucion, { version: detalle.version, motivo: motivoResolucion.trim() })
      setDetalle(resuelta); setResolucion(null); setMotivoResolucion(''); setRevision((valor) => valor + 1)
      setMensaje({ tipo: 'exito', texto: resolucion === 'aprobar' ? `La política fue aplicada a ${resuelta.totalAplicado} medicamentos.` : 'La solicitud fue rechazada sin modificar políticas.' })
    } catch (errorActual) { setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible resolver la solicitud.' }) }
    finally { setGuardando(false) }
  }

  const columnas = useMemo<ColumnaTabla<SolicitudPoliticaMasiva>[]>(() => [
    { id: 'referencia', titulo: 'Referencia', obtenerValor: (item) => item.referencia, ordenable: true, celda: (item) => <strong>{item.referencia}</strong> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => `${item.sucursal.nombre} ${item.sucursal.codigo}`, celda: (item) => <span className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></span> },
    { id: 'alcance', titulo: 'Alcance', obtenerValor: (item) => item.categoria?.nombre ?? item.principioActivo?.nombre ?? 'Todos', celda: (item) => <span className={styles.identidad}><strong>{item.categoria?.nombre ?? item.principioActivo?.nombre ?? 'Todos los medicamentos'}</strong><small>{item.ubicacion?.nombre ?? 'Toda la sucursal'}</small></span> },
    { id: 'total', titulo: 'Medicamentos', obtenerValor: (item) => item.totalObjetivo, ordenable: true, celda: (item) => `${item.totalAplicado} / ${item.totalObjetivo}` },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.estado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estado', opciones: Object.entries(etiquetasEstado).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (item) => <span className={`${styles.estado} ${item.estado === 'APLICADA' ? styles.estadoCorrecto : item.estado === 'RECHAZADA' ? styles.estadoPeligro : styles.estadoAdvertencia}`}>{etiquetasEstado[item.estado]}</span> },
    { id: 'solicitado', titulo: 'Solicitud', obtenerValor: (item) => item.solicitadoEn, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.solicitadoPorNombre}</strong><small>{fechaHora(item.solicitadoEn)}</small></span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver solicitud" aria-label={`Ver solicitud ${item.referencia}`} onClick={() => setDetalle(item)}><img src={iconoVer} alt="" /></button></div> },
  ], [])

  return <section className={styles.pagina} aria-labelledby="titulo-politicas-masivas">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Aplicación masiva de políticas" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-politicas-masivas">Aplicación masiva de políticas</h1>{puedeVerPoliticasIndividuales && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/inventario/politicas')}>Políticas individuales</button>}{puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/inventario/politicas/masivas/nueva')}><img src={iconoAgregar} alt="" />Nueva solicitud</button>}<div className={styles.busquedaGeneral}><label className={styles.soloLectores} htmlFor="buscar-solicitud-masiva">Buscar solicitudes</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-solicitud-masiva" type="search" value={entrada} maxLength={150} placeholder="Referencia, sucursal, motivo o solicitante" onChange={(evento) => setEntrada(evento.target.value)} /></div></div></div></header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Solicitudes con aprobación obligatoria</strong><small>Las políticas cambian únicamente cuando una solicitud pendiente es aprobada.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} solicitudes</span>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Solicitudes masivas de políticas de stock" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'solicitado', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="solicitud" unidadPlural="solicitudes" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>Sin solicitudes masivas</h2><p>{puedeCrear ? 'Crea una solicitud para configurar varios medicamentos bajo una aprobación controlada.' : 'No hay solicitudes dentro de tu alcance autorizado.'}</p></div> : null}</article>
    {detalle && puedeVerAuditoria && <InventarioAuditoria tipo="politicaMasiva" entidadId={detalle.id} titulo={`Solicitud ${detalle.referencia}.`} revision={revision} />}

    <ModalEstado ancho="amplio" abierto={creando} tipo="informacion" titulo="Nueva solicitud masiva" mensaje={<form className={styles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void crear() }} noValidate><div className={styles.grillaFormulario}>
      <div className={styles.campo}><label htmlFor="masiva-referencia">Referencia *</label><input id="masiva-referencia" value={formulario.referencia} maxLength={100} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setFormulario((actual) => ({ ...actual, referencia: evento.target.value }))} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div>
      <div className={styles.campo}><label htmlFor="masiva-ubicacion">Alcance físico</label><select id="masiva-ubicacion" value={formulario.ubicacionId} onChange={(evento) => cambiarFiltro('ubicacionId', evento.target.value)}><option value="">Toda la sucursal</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select></div>
      <div className={styles.campo}><label htmlFor="masiva-categoria">Categoría terapéutica</label><select id="masiva-categoria" value={formulario.categoriaTerapeuticaId} onChange={(evento) => cambiarFiltro('categoriaTerapeuticaId', evento.target.value)}><option value="">Todas</option>{opciones.categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div>
      <div className={styles.campo}><label htmlFor="masiva-principio">Principio activo</label><select id="masiva-principio" value={formulario.principioActivoId} onChange={(evento) => cambiarFiltro('principioActivoId', evento.target.value)}><option value="">Todos</option>{opciones.principiosActivos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div>
      <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="masiva-busqueda">Buscar medicamento dentro del alcance</label><input id="masiva-busqueda" type="search" value={formulario.busqueda} maxLength={150} placeholder="Código o nombre" onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)} /></div>
      <div className={styles.campo}><label htmlFor="masiva-modo">Tratamiento de políticas existentes</label><select id="masiva-modo" value={formulario.modoAplicacion} onChange={(evento) => cambiarFiltro('modoAplicacion', evento.target.value as ModoAplicacionPoliticaStock)}><option value="SOLO_SIN_POLITICA">Solo sin política</option><option value="SOBRESCRIBIR">Crear y sobrescribir existentes</option></select></div>
      <div className={styles.campo}><label htmlFor="masiva-seleccion">Selección</label><select id="masiva-seleccion" value={formulario.tipoSeleccion} onChange={(evento) => setFormulario((actual) => ({ ...actual, tipoSeleccion: evento.target.value as TipoSeleccionPoliticaStockMasiva }))}><option value="TODOS_RESULTADOS">Todos los resultados ({productos?.total ?? 0})</option><option value="SELECCION_MANUAL">Selección manual (máximo 500)</option></select></div>
      {([['stockMinimo', 'Stock mínimo *'], ['stockSeguridad', 'Stock de seguridad *'], ['puntoReposicion', 'Punto de reposición'], ['stockMaximo', 'Stock máximo']] as const).map(([campo, etiqueta]) => <div className={styles.campo} key={campo}><label htmlFor={`masiva-${campo}`}>{etiqueta}</label><input id={`masiva-${campo}`} type="number" min="0" step="0.000001" value={formulario[campo]} aria-invalid={Boolean(errores[campo])} onChange={(evento) => setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }))} />{errores[campo] && <span className={styles.campoError}>{errores[campo]}</span>}</div>)}
      <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="masiva-motivo">Motivo de la solicitud *</label><textarea id="masiva-motivo" value={formulario.motivoSolicitud} maxLength={500} aria-invalid={Boolean(errores.motivoSolicitud)} onChange={(evento) => setFormulario((actual) => ({ ...actual, motivoSolicitud: evento.target.value }))} />{errores.motivoSolicitud && <span className={styles.campoError}>{errores.motivoSolicitud}</span>}</div>
      <div className={`${styles.campo} ${styles.campoCompleto}`}><span className={styles.etiquetaCampo}>Vista previa: {productos?.total ?? 0} medicamentos {formulario.tipoSeleccion === 'SELECCION_MANUAL' ? `· ${seleccionados.size} seleccionados` : ''}</span>{errores.productos && <span className={styles.campoError}>{errores.productos}</span>}<div className={styles.previsualizacionMasiva}>{productos?.items.map((producto) => <label key={producto.id} className={styles.productoMasivo}><input type="checkbox" disabled={formulario.tipoSeleccion !== 'SELECCION_MANUAL'} checked={formulario.tipoSeleccion === 'TODOS_RESULTADOS' || seleccionados.has(producto.id)} onChange={() => alternarProducto(producto.id)} /><span><strong>{producto.nombre}</strong><small>{producto.codigo}{producto.tienePolitica ? ' · Con política actual' : ''}</small></span></label>)}</div>{productos && productos.totalPaginas > 1 && <div className={styles.accionesResumen}><button type="button" disabled={productos.pagina <= 1} onClick={() => setPaginaProductos((valor) => Math.max(1, valor - 1))}>Anterior</button><span>Página {productos.pagina} de {productos.totalPaginas}</span><button type="button" disabled={productos.pagina >= productos.totalPaginas} onClick={() => setPaginaProductos((valor) => valor + 1)}>Siguiente</button></div>}</div>
    </div></form>} textoAccionPrincipal={guardando ? 'Creando…' : 'Crear solicitud'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void crear()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setCreando(false)} onCerrar={() => setCreando(false)} cargando={guardando} />

    <ModalEstado ancho="amplio" abierto={Boolean(detalle) && !resolucion} tipo={detalle?.estado === 'RECHAZADA' ? 'error' : detalle?.estado === 'APLICADA' ? 'exito' : 'informacion'} titulo={detalle ? `Solicitud ${detalle.referencia}` : 'Solicitud'} mensaje={detalle && <div className={styles.detalleMasivo}><dl><div><dt>Estado</dt><dd>{etiquetasEstado[detalle.estado]}</dd></div><div><dt>Sucursal</dt><dd>{detalle.sucursal.nombre} ({detalle.sucursal.codigo})</dd></div><div><dt>Alcance</dt><dd>{detalle.categoria?.nombre ?? detalle.principioActivo?.nombre ?? 'Todos los medicamentos'}</dd></div><div><dt>Ubicación</dt><dd>{detalle.ubicacion?.nombre ?? 'Toda la sucursal'}</dd></div><div><dt>Modo</dt><dd>{detalle.modoAplicacion === 'SOBRESCRIBIR' ? 'Crear y sobrescribir' : 'Solo sin política'}</dd></div><div><dt>Objetivo</dt><dd>{detalle.totalObjetivo} medicamentos</dd></div><div><dt>Parámetros</dt><dd>Mín. {numero(detalle.stockMinimo)} · Seg. {numero(detalle.stockSeguridad)} · Reposición {numero(detalle.puntoReposicion)} · Máx. {numero(detalle.stockMaximo)}</dd></div><div><dt>Solicitado por</dt><dd>{detalle.solicitadoPorNombre} · {fechaHora(detalle.solicitadoEn)}</dd></div><div><dt>Motivo</dt><dd>{detalle.motivoSolicitud}</dd></div>{detalle.motivoResolucion && <div><dt>Resolución</dt><dd>{detalle.motivoResolucion}</dd></div>}</dl>{detalle.estado === 'PENDIENTE' && puedeResolverDetalle && <div className={styles.accionesFormulario}><button className={styles.botonSecundario} type="button" onClick={() => setResolucion('aprobar')}>Aprobar y aplicar</button><button className={styles.botonNeutral} type="button" onClick={() => setResolucion('rechazar')}>Rechazar</button></div>}</div>} textoAccionPrincipal="Cerrar" onAccionPrincipal={() => setDetalle(null)} onCerrar={() => setDetalle(null)} />

    <ModalEstado abierto={Boolean(resolucion)} tipo="advertencia" titulo={resolucion === 'aprobar' ? 'Aprobar y aplicar políticas' : 'Rechazar solicitud'} mensaje={<div className={styles.campo}><label htmlFor="motivo-resolucion">Motivo de la resolución *</label><textarea id="motivo-resolucion" value={motivoResolucion} maxLength={500} onChange={(evento) => setMotivoResolucion(evento.target.value)} /><small>{resolucion === 'aprobar' ? 'La aprobación modificará las políticas del alcance en una sola transacción.' : 'El rechazo no modificará ninguna política.'}</small></div>} textoAccionPrincipal={resolucion === 'aprobar' ? 'Aprobar y aplicar' : 'Confirmar rechazo'} varianteAccionPrincipal={resolucion === 'rechazar' ? 'peligro' : 'predeterminada'} onAccionPrincipal={() => void resolver()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setResolucion(null)} onCerrar={() => setResolucion(null)} cargando={guardando} />
    <ModalEstado abierto={Boolean(mensaje)} tipo={mensaje?.tipo ?? 'informacion'} titulo={mensaje?.tipo === 'exito' ? 'Operación completada' : 'No se pudo completar'} mensaje={mensaje?.texto ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />
  </section>
}
