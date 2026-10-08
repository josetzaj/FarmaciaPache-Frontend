import { useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { actualizarUbicacionInventario, exportarUbicacionesInventario, listarUbicacionesInventarioPaginadas } from '../inventario-api'
import type {
  ExportarUbicacionesInventarioRequest,
  ListarUbicacionesInventarioParametros,
  TipoUbicacionInventario,
  UbicacionInventario,
  UbicacionesInventarioPaginadas,
} from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const tipos: Array<{ valor: TipoUbicacionInventario; etiqueta: string }> = [
  { valor: 'VENTA', etiqueta: 'Área de venta' },
  { valor: 'BODEGA', etiqueta: 'Bodega' },
  { valor: 'RECEPCION', etiqueta: 'Recepción' },
  { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'DEVOLUCIONES', etiqueta: 'Devoluciones' },
  { valor: 'TRANSITO', etiqueta: 'Tránsito' },
  { valor: 'DESTRUCCION', etiqueta: 'Destrucción' },
]

function etiquetaTipo(tipo: TipoUbicacionInventario): string {
  return tipos.find((opcion) => opcion.valor === tipo)?.etiqueta ?? tipo
}

function valorTextoFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined
}

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
}

function validarBusqueda(valor: string): string | null {
  const termino = valor.trim()
  if (termino.length === 1) return 'Escribe al menos 2 caracteres para buscar.'
  if (termino.length > 150) return 'La búsqueda no puede superar 150 caracteres.'
  return null
}

export function InventarioUbicacionesView({
  permisos,
  onNavegar,
}: {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}) {
  const [resultado, setResultado] = useState<UbicacionesInventarioPaginadas | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([{ id: 'estado', value: ['ACTIVA'] }])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'ubicacion', desc: false }])
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [porInactivar, setPorInactivar] = useState<UbicacionInventario | null>(null)
  const [auditoria, setAuditoria] = useState<UbicacionInventario | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const puedeCrear = permisos.includes('INVENTARIO.UBICACIONES.CREAR')
  const puedeActualizar = permisos.includes('INVENTARIO.UBICACIONES.ACTUALIZAR')
  const puedeVerAuditoria = permisos.includes('INVENTARIO.UBICACIONES.VER_AUDITORIA')
  const puedeExportar = permisos.includes('INVENTARIO.UBICACIONES.EXPORTAR')

  const parametros = useMemo<ListarUbicacionesInventarioParametros>(() => {
    const orden = ordenamiento[0]
    const tiposSeleccionados = arregloFiltro(filtros, 'tipo') as TipoUbicacionInventario[]
    const estadosSeleccionados = arregloFiltro(filtros, 'estado') as ('ACTIVA' | 'INACTIVA')[]
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || undefined,
      ubicacion: valorTextoFiltro(filtros, 'ubicacion'),
      tipos: tiposSeleccionados.length ? tiposSeleccionados : undefined,
      estados: estadosSeleccionados.length ? estadosSeleccionados : undefined,
      orden: (orden?.id ?? 'ubicacion') as ListarUbicacionesInventarioParametros['orden'],
      direccion: orden?.desc ? 'desc' : 'asc',
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventarioPaginadas(parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setResultado(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las ubicaciones.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, pagina, parametros])

  const aplicarBusqueda = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const errorActual = validarBusqueda(busquedaEntrada)
    setErrorBusqueda(errorActual)
    if (errorActual) return
    setBusqueda(busquedaEntrada.trim())
    setPagina(1)
  }

  const limpiarBusqueda = () => {
    setBusquedaEntrada('')
    setBusqueda('')
    setErrorBusqueda(null)
    setPagina(1)
  }

  const limpiarFiltros = () => {
    limpiarBusqueda()
    setFiltros([])
    setOrdenamiento([{ id: 'ubicacion', desc: false }])
    setPagina(1)
  }

  const exportar = async (formato: FormatoExportacion) => {
    const datos: ExportarUbicacionesInventarioRequest = {
      formato,
      busqueda: parametros.busqueda,
      ubicacion: parametros.ubicacion,
      tipos: parametros.tipos,
      estados: parametros.estados,
      orden: parametros.orden,
      direccion: parametros.direccion,
    }
    try {
      await exportarUbicacionesInventario(datos)
    } catch (errorActual) {
      setMensajeError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar las ubicaciones.')
    }
  }

  const inactivar = async () => {
    if (!porInactivar) return
    setGuardando(true)
    try {
      await actualizarUbicacionInventario(porInactivar.id, {
        codigo: porInactivar.codigo,
        nombre: porInactivar.nombre,
        tipo: porInactivar.tipo,
        descripcion: porInactivar.descripcion,
        version: porInactivar.version,
        activa: false,
      })
      setMensajeExito(`La ubicación ${porInactivar.nombre} fue desactivada correctamente.`)
      setPorInactivar(null)
      setAuditoria(null)
      setRevision((valor) => valor + 1)
    } catch (errorActual) {
      setMensajeError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar la ubicación.')
    } finally {
      setGuardando(false)
    }
  }

  const columnas = useMemo<ColumnaTabla<UbicacionInventario>[]>(() => [
    {
      id: 'ubicacion', titulo: 'Ubicación', obtenerValor: (item) => `${item.nombre} ${item.codigo}`,
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar ubicación', placeholder: 'Nombre, código o descripción' },
      celda: (item) => <div className={styles.identidad}><strong>{item.nombre}</strong><small>{item.codigo}</small></div>,
    },
    {
      id: 'tipo', titulo: 'Tipo', obtenerValor: (item) => item.tipo,
      ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar tipos', opciones: tipos },
      celda: (item) => etiquetaTipo(item.tipo),
    },
    {
      id: 'descripcion', titulo: 'Descripción', obtenerValor: (item) => item.descripcion ?? '',
      celda: (item) => item.descripcion ?? <span className={styles.sinDato}>Sin descripción</span>,
    },
    {
      id: 'estado', titulo: 'Situación', obtenerValor: (item) => item.activa ? 'ACTIVA' : 'INACTIVA',
      ordenable: true,
      filtro: { tipo: 'opciones', etiqueta: 'Seleccionar situación', buscable: false, opciones: [{ valor: 'ACTIVA', etiqueta: 'Activa' }, { valor: 'INACTIVA', etiqueta: 'Inactiva' }] },
      celda: (item) => item.bloqueadaPorConteoId
        ? <span className={`${styles.estado} ${styles.estadoAdvertencia}`}>Bloqueada por conteo</span>
        : <span className={`${styles.estado} ${item.activa ? styles.estadoCorrecto : styles.estadoNeutral}`}>{item.activa ? 'Activa' : 'Inactiva'}</span>,
    },
    {
      id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id,
      celda: (item) => <div className={styles.accionesFila}>
        {puedeVerAuditoria && <button type="button" title="Ver auditoría" aria-label={`Ver auditoría de ${item.nombre}`} onClick={() => setAuditoria(item)}><img src={iconoVer} alt="" /></button>}
        {puedeActualizar && <button type="button" title="Editar" aria-label={`Editar ${item.nombre}`} onClick={() => onNavegar(`/inventario/ubicaciones/${item.id}/editar`)}><img src={iconoEditar} alt="" /></button>}
        {puedeActualizar && item.activa && <button className={styles.accionPeligro} type="button" title="Desactivar" aria-label={`Desactivar ${item.nombre}`} disabled={Boolean(item.bloqueadaPorConteoId)} onClick={() => setPorInactivar(item)}><img src={iconoEliminar} alt="" /></button>}
      </div>,
    },
  ], [onNavegar, puedeActualizar, puedeVerAuditoria])

  const hayFiltros = Boolean(busqueda) || filtros.length > 0

  return (
    <section className={styles.pagina} aria-labelledby="titulo-ubicaciones-inventario">
      <header className={styles.cabecera}>
        <InventarioBreadcrumb actual="Ubicaciones" onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <h1 id="titulo-ubicaciones-inventario">Ubicaciones de inventario</h1>
          {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar('/inventario/ubicaciones/nueva')}><img src={iconoAgregar} alt="" />Nueva ubicación</button>}
          {puedeExportar && <BotonExportar deshabilitado={cargando || Boolean(error)} onExportar={exportar} />}
          <form className={styles.busquedaGeneral} onSubmit={aplicarBusqueda}>
            <div className={styles.controlBusqueda}>
              <img src={iconoBusqueda} alt="" />
              <input type="search" value={busquedaEntrada} maxLength={150} placeholder="Buscar ubicaciones" aria-label="Buscar ubicaciones" aria-invalid={Boolean(errorBusqueda)} onChange={(evento) => { setBusquedaEntrada(evento.target.value); setErrorBusqueda(null) }} />
              {(busquedaEntrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={limpiarBusqueda}>×</button>}
            </div>
            <small className={errorBusqueda ? styles.campoError : undefined}>{errorBusqueda ?? 'Busca por nombre, código o descripción.'}</small>
          </form>
        </div>
      </header>
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}><div><strong>Espacios físicos de la sucursal</strong><small>{cargando ? 'Actualizando información…' : 'Bodegas, áreas de venta, cuarentena y demás ubicaciones operativas.'}</small></div><div className={styles.accionesResumen}><button type="button" onClick={() => onNavegar('/inventario/existencias')}>Ver existencias</button>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'ubicación' : 'ubicaciones'}</span>}{hayFiltros && <button type="button" onClick={limpiarFiltros}>Limpiar filtros</button>}</div></div>
        {resultado?.items.length ? <><TablaDatos descripcion="Ubicaciones de inventario con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(orden) => { setOrdenamiento(orden.length ? orden : [{ id: 'ubicacion', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="ubicación" unidadPlural="ubicaciones" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'Sin ubicaciones registradas'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros.' : 'Crea la primera ubicación física para comenzar a operar inventario.'}</p></div> : null}
      </article>
      {auditoria && puedeVerAuditoria && <InventarioAuditoria tipo="ubicacion" entidadId={auditoria.id} titulo={`Historial de ${auditoria.nombre} (${auditoria.codigo}).`} revision={revision} />}

      <ModalEstado abierto={Boolean(porInactivar)} tipo="advertencia" titulo="Desactivar ubicación" mensaje={porInactivar ? `La ubicación ${porInactivar.nombre} dejará de estar disponible para nuevas operaciones. Esta acción solo será permitida si no conserva existencias.` : ''} textoAccionPrincipal={guardando ? 'Desactivando…' : 'Desactivar'} varianteAccionPrincipal="peligro" iconoAccionPrincipal={<IconoAccion nombre="desactivar" />} onAccionPrincipal={() => void inactivar()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setPorInactivar(null)} onCerrar={() => setPorInactivar(null)} cargando={guardando} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Operación completada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
      <ModalEstado abierto={Boolean(mensajeError)} tipo="error" titulo="No se pudo completar" mensaje={mensajeError ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeError(null)} onCerrar={() => setMensajeError(null)} />
    </section>
  )
}
