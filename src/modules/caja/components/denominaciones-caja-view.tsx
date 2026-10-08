import { useCallback, useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { PistaAuditoria, type ConsultaAuditoria } from '../../../shared/auditoria'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { actualizarDenominacionCaja, crearDenominacionCaja, exportarCaja, listarAuditoriaCaja, listarCaja } from '../caja-api'
import { convertirQuetzalesACentavos, formatearCentavos } from '../caja-formatos'
import type { DenominacionCaja, ResultadoPaginado } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void }
type DenominacionEdicion = { id?: string; nombre: string; valor: string; orden: string; activa: boolean; motivo: string; version?: number }
type AuditoriaSeleccion = { id: string; clave: string; descripcion: string } | null

const denominacionVacia: DenominacionEdicion = { nombre: '', valor: '', orden: '', activa: true, motivo: '' }

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length ? valores : undefined
}

export function DenominacionesCajaView({ permisos, onNavegar }: Props) {
  const puedeCrear = permisos.includes('CAJA.DENOMINACIONES.CREAR')
  const puedeActualizar = permisos.includes('CAJA.DENOMINACIONES.ACTUALIZAR')
  const puedeExportar = permisos.includes('CAJA.DENOMINACIONES.EXPORTAR')
  const puedeVerAuditoria = permisos.includes('CAJA.DENOMINACIONES.VER_AUDITORIA')
  const [resultado, setResultado] = useState<ResultadoPaginado<DenominacionCaja> | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'orden', desc: false }])
  const [edicion, setEdicion] = useState<DenominacionEdicion | null>(null)
  const [auditoria, setAuditoria] = useState<AuditoriaSeleccion>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' '))
      setPagina(1)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [busquedaEntrada])

  const parametros = useMemo(() => ({
    pagina,
    tamanoPagina,
    busqueda: busqueda || undefined,
    estados: valoresFiltro(filtros, 'estado'),
    orden: ordenamiento[0]?.id ?? 'orden',
    direccion: ordenamiento[0]?.desc ? 'desc' as const : 'asc' as const,
  }), [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void listarCaja<DenominacionCaja>('denominaciones', parametros, controlador.signal)
      .then((dato) => {
        if (dato.totalPaginas > 0 && pagina > dato.totalPaginas) { setPagina(dato.totalPaginas); return }
        setResultado(dato)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las denominaciones.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [claveSolicitud, pagina, parametros])

  const columnas = useMemo<ColumnaTabla<DenominacionCaja>[]>(() => [
    { id: 'nombre', titulo: 'Denominación', obtenerValor: (item) => item.nombre, ordenable: true, celda: (item) => <strong>{item.nombre}</strong> },
    { id: 'valor', titulo: 'Valor', obtenerValor: (item) => item.valorCentavos, ordenable: true, celda: (item) => formatearCentavos(item.valorCentavos) },
    { id: 'orden', titulo: 'Orden', obtenerValor: (item) => item.orden, ordenable: true, celda: (item) => item.orden },
    { id: 'estado', titulo: 'Estado', obtenerValor: (item) => item.activa ? 'ACTIVA' : 'INACTIVA', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar estados', multiple: true, opciones: [{ valor: 'ACTIVA', etiqueta: 'Activa' }, { valor: 'INACTIVA', etiqueta: 'Inactiva' }] }, celda: (item) => <span className={`${styles.estado} ${item.activa ? styles.estadoExito : styles.estadoPeligro}`}>{item.activa ? 'Activa' : 'Inactiva'}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}>{puedeVerAuditoria && <button type="button" title="Ver auditoría" aria-label={`Ver auditoría de ${item.nombre}`} onClick={() => setAuditoria({ id: item.id, clave: `denominacion-${item.id}`, descripcion: `Cambios del catálogo para ${item.nombre}.` })}><img src={iconoVer} alt="" /></button>}{puedeActualizar && <button type="button" title="Editar denominación" aria-label={`Editar denominación ${item.nombre}`} onClick={() => { setEdicion({ id: item.id, nombre: item.nombre, valor: (item.valorCentavos / 100).toFixed(2), orden: String(item.orden), activa: item.activa, motivo: '', version: item.version }); setErrorModal(null) }}><img src={iconoEditar} alt="" /></button>}</div> },
  ], [puedeActualizar, puedeVerAuditoria])

  const guardar = async () => {
    if (!edicion) return
    const valorCentavos = convertirQuetzalesACentavos(edicion.valor)
    const orden = Number(edicion.orden)
    if (!edicion.nombre.trim() || !valorCentavos || valorCentavos <= 0 || !Number.isInteger(orden) || orden < 0) { setErrorModal('Ingresa nombre, valor mayor que cero y un orden entero válido.'); return }
    if (edicion.id && edicion.motivo.trim().length < 5) { setErrorModal('El motivo debe contener al menos 5 caracteres.'); return }
    setProcesando(true)
    try {
      if (edicion.id) await actualizarDenominacionCaja(edicion.id, { nombre: edicion.nombre.trim(), valorCentavos, orden, activa: edicion.activa, motivo: edicion.motivo.trim(), version: edicion.version! })
      else await crearDenominacionCaja({ nombre: edicion.nombre.trim(), valorCentavos, orden })
      setEdicion(null)
      setMensajeExito(edicion.id ? 'La denominación quedó actualizada.' : 'La denominación quedó registrada.')
      setRevision((valor) => valor + 1)
    } catch (errorActual: unknown) {
      setErrorModal(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible guardar la denominación.')
    } finally { setProcesando(false) }
  }
  const exportar = async (formato: FormatoExportacion) => {
    const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...filtrosExportacion } = parametros
    try { await exportarCaja('denominaciones', formato, filtrosExportacion) }
    catch (errorActual: unknown) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar las denominaciones.') }
  }
  const cargarAuditoria = useCallback((consulta: ConsultaAuditoria, signal?: AbortSignal) => auditoria
    ? listarAuditoriaCaja('DENOMINACION_CAJA', auditoria.id, consulta, signal)
    : Promise.reject(new Error('No hay una denominación seleccionada.')), [auditoria])

  return <section className={styles.pagina} aria-labelledby="titulo-denominaciones-caja">
    <header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Denominaciones" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Catálogo global</p><h1 id="titulo-denominaciones-caja">Denominaciones</h1><p>Valores GTQ compartidos por todas las sucursales para fondos iniciales y arqueos.</p></div></header>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => { setError(null); setRevision((valor) => valor + 1) }}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}><div className={styles.resumenTabla}><div><strong>Denominaciones GTQ</strong><small>Catálogo único para todo el sistema.</small></div><div className={`${styles.accionesResumen} ${styles.accionesResumenEnFila}`}>{puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => { setEdicion({ ...denominacionVacia }); setErrorModal(null) }}><IconoAccion nombre="agregar" />Nueva denominación</button>}{puedeExportar && <BotonExportar deshabilitado={cargando} onExportar={exportar} />}<label className={styles.busquedaCompacta}><span className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input type="search" value={busquedaEntrada} placeholder="Buscar denominación" aria-label="Buscar denominación" onChange={(evento) => setBusquedaEntrada(evento.target.value)} /></span></label></div></div>
      {resultado?.items.length ? <><TablaDatos descripcion="Denominaciones de efectivo con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={(valor) => { setOrdenamiento(valor.length ? valor : [{ id: 'orden', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="denominación" unidadPlural="denominaciones" onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando ? <div className={styles.estadoVacio}><h2>{busqueda ? 'Sin coincidencias' : 'No hay denominaciones registradas'}</h2><p>{busqueda ? 'Ajusta la búsqueda o los filtros.' : 'Registra las denominaciones que utilizarán los conteos de efectivo.'}</p></div> : null}
    </article>
    {auditoria && puedeVerAuditoria && <PistaAuditoria claveEntidad={auditoria.clave} descripcion={auditoria.descripcion} etiquetasOperacion={{ CREAR_DENOMINACION: 'Creación', ACTUALIZAR_DENOMINACION: 'Actualización' }} cargarEventos={cargarAuditoria} revision={revision} />}
    <ModalEstado abierto={Boolean(edicion)} tipo="informacion" titulo={edicion?.id ? 'Editar denominación' : 'Registrar denominación'} mensaje={edicion && <div className={styles.contenidoModal}><label htmlFor="nombre-denominacion">Nombre <span aria-hidden="true">*</span></label><input id="nombre-denominacion" maxLength={80} value={edicion.nombre} onChange={(evento) => { setEdicion({ ...edicion, nombre: evento.target.value }); setErrorModal(null) }} /><label htmlFor="valor-denominacion">Valor (Q) <span aria-hidden="true">*</span></label><input id="valor-denominacion" type="number" min="0.01" step="0.01" value={edicion.valor} onChange={(evento) => { setEdicion({ ...edicion, valor: evento.target.value }); setErrorModal(null) }} /><label htmlFor="orden-denominacion">Orden <span aria-hidden="true">*</span></label><input id="orden-denominacion" type="number" min="0" step="1" value={edicion.orden} onChange={(evento) => { setEdicion({ ...edicion, orden: evento.target.value }); setErrorModal(null) }} />{edicion.id && <><label className={styles.controlCasilla}><input type="checkbox" checked={edicion.activa} onChange={(evento) => setEdicion({ ...edicion, activa: evento.target.checked })} />Denominación activa</label><label htmlFor="motivo-denominacion">Motivo <span aria-hidden="true">*</span></label><textarea id="motivo-denominacion" rows={3} maxLength={500} value={edicion.motivo} onChange={(evento) => { setEdicion({ ...edicion, motivo: evento.target.value }); setErrorModal(null) }} /></>}{errorModal && <small role="alert">{errorModal}</small>}</div>} textoAccionPrincipal={edicion?.id ? 'Guardar cambios' : 'Registrar denominación'} onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Cancelar" onAccionSecundaria={() => setEdicion(null)} onCerrar={() => setEdicion(null)} cargando={procesando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Denominación guardada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </section>
}
