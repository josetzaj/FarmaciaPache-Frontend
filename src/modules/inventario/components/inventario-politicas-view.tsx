import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { configurarPoliticaStockInventario, listarPoliticasStockInventario, listarUbicacionesInventario } from '../inventario-api'
import type { ExistenciaProducto, PoliticaStockInventario, PoliticasStockPaginadas, UbicacionInventario } from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

type FormularioPolitica = {
  producto: ExistenciaProducto | null
  ubicacionId: string
  stockMinimo: string
  stockMaximo: string
  stockSeguridad: string
  puntoReposicion: string
}

const formularioVacio: FormularioPolitica = { producto: null, ubicacionId: '', stockMinimo: '0', stockMaximo: '', stockSeguridad: '0', puntoReposicion: '' }
const ordenes: Record<string, 'producto' | 'ubicacion' | 'actualizado'> = { producto: 'producto', ubicacion: 'ubicacion', actualizado: 'actualizado' }

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
}

function numero(valor: number | null): string {
  return valor === null ? 'Sin límite' : new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function cantidadNoNegativa(valor: string): boolean {
  return /^\d+(?:\.\d{1,6})?$/.test(valor.trim()) && Number(valor) <= 999_999_999_999
}

export function InventarioPoliticasView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<PoliticasStockPaginadas | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'producto', desc: false }])
  const [editando, setEditando] = useState<PoliticaStockInventario | null | undefined>(undefined)
  const [formulario, setFormulario] = useState<FormularioPolitica>(formularioVacio)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [auditoria, setAuditoria] = useState<PoliticaStockInventario | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const puedeConfigurar = permisos.includes('INVENTARIO.POLITICAS.CONFIGURAR')
  const puedeVerSolicitudesMasivas = permisos.some((permiso) => ['INVENTARIO.POLITICAS.VER', 'INVENTARIO.POLITICAS.CREAR_MASIVA', 'INVENTARIO.POLITICAS.APROBAR_MASIVA', 'INVENTARIO.POLITICAS.VER_CORPORATIVO', 'INVENTARIO.POLITICAS.APROBAR_MASIVA_CORPORATIVA'].includes(permiso))
  const puedeVerAuditoria = permisos.includes('INVENTARIO.POLITICAS.VER_AUDITORIA')

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
    const ubicacion = arregloFiltro(filtros, 'ubicacion')[0]
    const nivel = arregloFiltro(filtros, 'nivel')[0] as 'SUCURSAL' | 'UBICACION' | undefined
    return { pagina, tamanoPagina, busqueda: busqueda || undefined, ubicacionId: ubicacion, nivel, orden: ordenes[orden?.id ?? 'producto'] ?? 'producto', direccion: orden?.desc ? 'desc' as const : 'asc' as const }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarPoliticasStockInventario(parametros, controlador.signal)
      .then((respuesta) => { if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) { setPagina(respuesta.totalPaginas); return }; setResultado(respuesta); setError(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las políticas de stock.') })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, pagina, parametros])

  const abrir = (politica: PoliticaStockInventario | null) => {
    setEditando(politica)
    setFormulario(politica ? { producto: null, ubicacionId: politica.ubicacion?.id ?? '', stockMinimo: String(politica.stockMinimo), stockMaximo: politica.stockMaximo === null ? '' : String(politica.stockMaximo), stockSeguridad: String(politica.stockSeguridad), puntoReposicion: politica.puntoReposicion === null ? '' : String(politica.puntoReposicion) } : formularioVacio)
    setErrores({})
  }

  const validar = () => {
    const siguientes: Record<string, string> = {}
    if (!editando && !formulario.producto) siguientes.producto = 'Selecciona un medicamento.'
    if (!cantidadNoNegativa(formulario.stockMinimo)) siguientes.stockMinimo = 'Ingresa una cantidad válida, con máximo seis decimales.'
    if (!cantidadNoNegativa(formulario.stockSeguridad)) siguientes.stockSeguridad = 'Ingresa una cantidad válida, con máximo seis decimales.'
    if (formulario.stockMaximo && !cantidadNoNegativa(formulario.stockMaximo)) siguientes.stockMaximo = 'Ingresa una cantidad válida o deja el campo vacío.'
    if (formulario.puntoReposicion && !cantidadNoNegativa(formulario.puntoReposicion)) siguientes.puntoReposicion = 'Ingresa una cantidad válida o deja el campo vacío.'
    if (!siguientes.stockMaximo && formulario.stockMaximo && Number(formulario.stockMaximo) < Number(formulario.stockMinimo)) siguientes.stockMaximo = 'Debe ser igual o superior al stock mínimo.'
    if (!siguientes.puntoReposicion && formulario.puntoReposicion && Number(formulario.puntoReposicion) < Number(formulario.stockSeguridad)) siguientes.puntoReposicion = 'Debe ser igual o superior al stock de seguridad.'
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) window.requestAnimationFrame(() => document.getElementById(`politica-${primero}`)?.focus())
    return !primero
  }

  const guardar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const guardada = await configurarPoliticaStockInventario({
        productoId: editando?.producto.id ?? formulario.producto!.producto.id,
        ubicacionId: formulario.ubicacionId || null,
        stockMinimo: Number(formulario.stockMinimo),
        stockMaximo: formulario.stockMaximo ? Number(formulario.stockMaximo) : null,
        stockSeguridad: Number(formulario.stockSeguridad),
        puntoReposicion: formulario.puntoReposicion ? Number(formulario.puntoReposicion) : null,
        version: editando?.version ?? null,
      })
      setEditando(undefined); setMensajeExito(`La política de ${guardada.producto.nombre} fue guardada correctamente.`); setRevision((valor) => valor + 1)
      if (auditoria?.id === guardada.id) setAuditoria(guardada)
    } catch (errorActual) {
      setErrorGuardado(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible guardar la política de stock.')
    } finally { setGuardando(false) }
  }

  const columnas = useMemo<ColumnaTabla<PoliticaStockInventario>[]>(() => [
    { id: 'producto', titulo: 'Medicamento', obtenerValor: (item) => `${item.producto.nombre} ${item.producto.codigo}`, ordenable: true, celda: (item) => <span className={styles.identidad}><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span> },
    { id: 'nivel', titulo: 'Nivel', obtenerValor: (item) => item.ubicacion ? 'UBICACION' : 'SUCURSAL', filtro: { tipo: 'opciones', etiqueta: 'Seleccionar nivel', buscable: false, opciones: [{ valor: 'SUCURSAL', etiqueta: 'Toda la sucursal' }, { valor: 'UBICACION', etiqueta: 'Ubicación específica' }] }, celda: (item) => item.ubicacion ? 'Ubicación' : 'Toda la sucursal' },
    { id: 'origen', titulo: 'Origen', obtenerValor: (item) => item.solicitudMasivaId ? 'MASIVA' : 'INDIVIDUAL', celda: (item) => <span className={`${styles.estado} ${item.solicitudMasivaId ? styles.estadoInformacion : styles.estadoNeutral}`}>{item.solicitudMasivaId ? 'Aplicación masiva' : 'Edición individual'}</span> },
    { id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => item.ubicacion?.nombre ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar ubicación', multiple: false, opciones: ubicaciones.map((item) => ({ valor: item.id, etiqueta: `${item.nombre} (${item.codigo})` })) }, celda: (item) => item.ubicacion ? <span className={styles.identidad}><strong>{item.ubicacion.nombre}</strong><small>{item.ubicacion.codigo}</small></span> : <span className={styles.sinDato}>Todas</span> },
    { id: 'minimo', titulo: 'Mínimo', obtenerValor: (item) => item.stockMinimo, celda: (item) => <span className={styles.cantidad}>{numero(item.stockMinimo)}</span> },
    { id: 'seguridad', titulo: 'Seguridad', obtenerValor: (item) => item.stockSeguridad, celda: (item) => <span className={styles.cantidad}>{numero(item.stockSeguridad)}</span> },
    { id: 'reposicion', titulo: 'Reposición', obtenerValor: (item) => item.puntoReposicion, celda: (item) => <span className={styles.cantidad}>{numero(item.puntoReposicion)}</span> },
    { id: 'maximo', titulo: 'Máximo', obtenerValor: (item) => item.stockMaximo, celda: (item) => <span className={styles.cantidad}>{numero(item.stockMaximo)}</span> },
    { id: 'actualizado', titulo: 'Actualización', obtenerValor: (item) => item.actualizadoEn, ordenable: true, celda: (item) => fechaHora(item.actualizadoEn) },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}>{puedeVerAuditoria && <button type="button" title="Ver auditoría" aria-label={`Ver auditoría de ${item.producto.nombre}`} onClick={() => setAuditoria(item)}><img src={iconoVer} alt="" /></button>}{puedeConfigurar && <button type="button" title="Editar política" aria-label={`Editar política de ${item.producto.nombre}`} onClick={() => abrir(item)}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [puedeConfigurar, puedeVerAuditoria, ubicaciones])

  return <section className={styles.pagina} aria-labelledby="titulo-politicas-inventario">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Políticas de stock" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-politicas-inventario">Políticas de stock</h1>{puedeVerSolicitudesMasivas && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/inventario/politicas/masivas')}>Aplicación masiva</button>}{puedeConfigurar && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/inventario/politicas/nueva')}><img src={iconoAgregar} alt="" />Nueva política</button>}<form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}><label className={styles.soloLectores} htmlFor="buscar-politicas">Buscar políticas</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-politicas" type="search" value={entrada} maxLength={150} placeholder="Medicamento o ubicación" onChange={(evento) => setEntrada(evento.target.value)} />{entrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setEntrada('')}>×</button>}</div><small>Busca por nombre, código o ubicación.</small></form></div></header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Parámetros de reposición</strong><small>Configuración por sucursal o por ubicación física.</small></div><div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} políticas</span>}{Boolean(busqueda || filtros.length) && <button type="button" onClick={() => { setEntrada(''); setBusqueda(''); setFiltros([]); setPagina(1) }}>Limpiar filtros</button>}</div></div>{resultado?.items.length ? <><TablaDatos descripcion="Políticas de stock con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'producto', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="política" unidadPlural="políticas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{busqueda || filtros.length ? 'Sin coincidencias' : 'Sin políticas configuradas'}</h2><p>{busqueda || filtros.length ? 'Ajusta los filtros aplicados.' : 'Configura mínimos y puntos de reposición para activar el control de stock.'}</p></div> : null}</article>
    {auditoria && puedeVerAuditoria && <InventarioAuditoria tipo="politica" entidadId={auditoria.id} titulo={`Política de ${auditoria.producto.nombre}.`} revision={revision} />}
    <ModalEstado ancho="amplio" abierto={editando !== undefined} tipo="informacion" titulo={editando ? 'Editar política de stock' : 'Nueva política de stock'} mensaje={<form className={styles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void guardar() }} noValidate><div className={styles.grillaFormulario}>{editando ? <div className={`${styles.campo} ${styles.campoCompleto}`}><span className={styles.etiquetaCampo}>Medicamento</span><span className={styles.identidad}><strong>{editando.producto.nombre}</strong><small>{editando.producto.codigo}</small></span></div> : <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="politica-producto">Medicamento *</label><SelectorProductoInventario id="politica-producto" valor={formulario.producto} soloConExistencia={false} invalido={Boolean(errores.producto)} onChange={(producto) => setFormulario((actual) => ({ ...actual, producto }))} />{errores.producto && <span className={styles.campoError}>{errores.producto}</span>}</div>}<div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="politica-ubicacionId">Alcance</label><select id="politica-ubicacionId" value={formulario.ubicacionId} onChange={(evento) => setFormulario((actual) => ({ ...actual, ubicacionId: evento.target.value }))}><option value="">Toda la sucursal</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo}){!item.activa ? ' · Inactiva' : ''}</option>)}</select></div>{([['stockMinimo', 'Stock mínimo *'], ['stockSeguridad', 'Stock de seguridad *'], ['puntoReposicion', 'Punto de reposición'], ['stockMaximo', 'Stock máximo']] as const).map(([campo, etiqueta]) => <div className={styles.campo} key={campo}><label htmlFor={`politica-${campo}`}>{etiqueta}</label><input id={`politica-${campo}`} type="number" min="0" step="0.000001" value={formulario[campo]} aria-invalid={Boolean(errores[campo])} onChange={(evento) => setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }))} />{errores[campo] && <span className={styles.campoError}>{errores[campo]}</span>}</div>)}</div></form>} textoAccionPrincipal={guardando ? 'Guardando…' : 'Guardar política'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setEditando(undefined)} onCerrar={() => setEditando(undefined)} cargando={guardando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Política guardada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    <ModalEstado abierto={Boolean(errorGuardado)} tipo="error" titulo="No se pudo guardar" mensaje={errorGuardado ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorGuardado(null)} onCerrar={() => setErrorGuardado(null)} />
  </section>
}
