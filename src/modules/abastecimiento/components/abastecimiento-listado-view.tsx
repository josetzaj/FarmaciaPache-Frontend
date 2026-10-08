import { useCallback, useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import iconoDescargar from '../../../assets/acciones/descargar.png'
import iconoPdf from '../../../assets/acciones/pdf.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { abrirPdfCotizacionCompra, abrirPdfOrdenCompra, abrirPdfSolicitudCompra, abrirPdfSolicitudCotizacion, exportarAbastecimiento, listarRegistrosAbastecimiento, obtenerOpcionesAbastecimiento } from '../abastecimiento-api'
import { configuracionesAbastecimiento, etiquetaCodigo, obtenerEstado, obtenerFecha, obtenerModalidad, obtenerNombrePrincipal, obtenerNumero, obtenerProveedorId, obtenerSucursalId } from '../abastecimiento-config'
import type { ConsultaAbastecimiento, CotizacionCompra, DevolucionProveedor, OpcionesFiltrosAbastecimiento, OrdenAbastecimiento, OrdenCompra, ProveedorAbastecimiento, RecepcionCompra, RecursoAbastecimiento, RegistroAbastecimiento, SolicitudCompra, TrasladoInterno } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import { ProveedorInactivarModal } from './proveedor-inactivar-modal'
import styles from './abastecimiento.module.css'

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) && valor.length ? valor.filter((item): item is string => typeof item === 'string') : undefined
}

function filtroUnico(filtros: ColumnFiltersState, id: string): string | undefined {
  return arregloFiltro(filtros, id)?.[0]
}

function fechaHora(valor: string): string {
  if (!valor) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
}

function tonoEstado(estado: string): string {
  if (['APROBADA', 'SELECCIONADA', 'CERRADA', 'CERRADO', 'TECNICA_CONFORME', 'COMPENSADA', 'ACTIVO'].includes(estado)) return styles.estadoExito
  if (['RECHAZADA', 'DESCARTADA', 'CANCELADA', 'CANCELADO', 'INACTIVO'].includes(estado)) return styles.estadoPeligro
  if (['SOLICITADA', 'EN_COTIZACION', 'REGISTRADA', 'EMITIDA', 'SOLICITADO', 'APROBACION_INTERNA'].includes(estado)) return styles.estadoAdvertencia
  return styles.estadoInfo
}

function ordenPredeterminado(recurso: RecursoAbastecimiento): SortingState[number] {
  return recurso === 'proveedores' ? { id: 'descripcion', desc: false } : { id: 'fecha', desc: true }
}

function FiltroFecha({ etiqueta, valor, minimo, maximo, onChange }: { etiqueta: string; valor: string; minimo?: string; maximo?: string; onChange: (valor: string) => void }) {
  return (
    <label className={`${styles.filtroFecha} ${valor ? styles.filtroFechaConValor : ''}`}>
      <span className={styles.etiquetaFecha}>{etiqueta}</span>
      <input
        type="date"
        value={valor}
        min={minimo}
        max={maximo}
        data-vacio={valor ? undefined : 'true'}
        aria-label={`Fecha ${etiqueta.toLocaleLowerCase('es-GT')}`}
        onChange={(evento) => onChange(evento.target.value)}
      />
    </label>
  )
}

export function AbastecimientoListadoView({ recurso, permisos, sucursalActualId, onNavegar }: { recurso: RecursoAbastecimiento; permisos: readonly string[]; sucursalActualId?: string; onNavegar: (ruta: string) => void }) {
  const configuracion = configuracionesAbastecimiento[recurso]
  const [resultado, setResultado] = useState<{ items: RegistroAbastecimiento[]; pagina: number; tamanoPagina: number; total: number; totalPaginas: number } | null>(null)
  const [opciones, setOpciones] = useState<OpcionesFiltrosAbastecimiento | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>(() => [ordenPredeterminado(recurso)])
  const [errorListado, setErrorListado] = useState<string | null>(null)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(0)
  const [proveedorAInactivar, setProveedorAInactivar] = useState<ProveedorAbastecimiento | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [solicitudCotizacion, setSolicitudCotizacion] = useState<SolicitudCompra | null>(null)
  const [proveedorCotizacionId, setProveedorCotizacionId] = useState('')
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null)
  const puedeCrear = Boolean(configuracion.permisoCrear && permisos.includes(configuracion.permisoCrear))
  const puedeExportar = Boolean(configuracion.permisoExportar && permisos.includes(configuracion.permisoExportar))
  const puedeActualizarProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.ACTUALIZAR')
  const puedeInactivarProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.INACTIVAR')
  const puedeResolverSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.APROBAR')
  const puedeCancelarSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.CANCELAR')
  const puedeAdjudicarCotizaciones = permisos.includes('ABASTECIMIENTO.COTIZACIONES.ADJUDICAR')
  const puedeConfirmarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CONFIRMAR')
  const puedeCerrarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CERRAR')
  const puedeCancelarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CANCELAR')
  const puedeValidarRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.VALIDAR')
  const puedeRegularizarRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.REGULARIZAR')
  const puedeAprobarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.APROBAR')
  const puedePrepararTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.PREPARAR')
  const puedeDespacharTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.DESPACHAR')
  const puedeRecibirTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.RECIBIR')
  const puedeCerrarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.CERRAR')
  const puedeCancelarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.CANCELAR')
  const puedeAutorizarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.AUTORIZAR')
  const puedeSegregarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.SEGREGAR')
  const puedeDespacharDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.DESPACHAR')
  const puedeRecibirDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.RECIBIR_PROVEEDOR')
  const puedeCompensarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.COMPENSAR')
  const puedeCerrarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.CERRAR')
  const puedeCancelarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.CANCELAR')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesAbastecimiento(controlador.signal)
      .then((respuesta) => { setOpciones(respuesta); setErrorOpciones(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorOpciones(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los filtros de abastecimiento.')
      })
    return () => controlador.abort()
  }, [revision])

  const verDocumentoPdf = useCallback(async (item: RegistroAbastecimiento) => {
    setGenerandoPdf(true)
    setErrorDocumento(null)
    try {
      if (recurso === 'solicitudes') await abrirPdfSolicitudCompra(item.id)
      else if (recurso === 'cotizaciones') await abrirPdfCotizacionCompra(item.id)
      else if (recurso === 'ordenes') await abrirPdfOrdenCompra(item.id)
    } catch (errorActual) {
      setErrorDocumento(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar el documento PDF.')
    } finally {
      setGenerandoPdf(false)
    }
  }, [recurso])

  const generarSolicitudCotizacion = useCallback(async () => {
    if (!solicitudCotizacion) return
    if (!proveedorCotizacionId) {
      setErrorDocumento('Selecciona el proveedor al que estará dirigida la solicitud de cotización.')
      return
    }
    setGenerandoPdf(true)
    setErrorDocumento(null)
    try {
      await abrirPdfSolicitudCotizacion(solicitudCotizacion.id, proveedorCotizacionId)
      setSolicitudCotizacion(null)
      setProveedorCotizacionId('')
    } catch (errorActual) {
      setErrorDocumento(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la solicitud de cotización.')
    } finally {
      setGenerandoPdf(false)
    }
  }, [proveedorCotizacionId, solicitudCotizacion])

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entrada.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entrada])

  const parametros = useMemo<ConsultaAbastecimiento>(() => {
    const ordenActual = ordenamiento[0] ?? ordenPredeterminado(recurso)
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || undefined,
      estados: arregloFiltro(filtros, 'estado'),
      sucursalId: filtroUnico(filtros, 'sucursal'),
      proveedorId: filtroUnico(filtros, 'proveedor'),
      modalidad: filtroUnico(filtros, 'modalidad') as ConsultaAbastecimiento['modalidad'],
      fechaDesde: filtroUnico(filtros, 'fechaDesde'),
      fechaHasta: filtroUnico(filtros, 'fechaHasta'),
      orden: ordenActual.id as OrdenAbastecimiento,
      direccion: ordenActual.desc ? 'desc' : 'asc',
    }
  }, [busqueda, filtros, ordenamiento, pagina, recurso, tamanoPagina])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.resolve().then(() => {
      if (!controlador.signal.aborted) setCargando(true)
    })
    void listarRegistrosAbastecimiento(recurso, parametros, controlador.signal)
      .then((respuesta) => { setResultado(respuesta); setErrorListado(null) })
      .catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorListado(errorActual instanceof ErrorApi ? errorActual.message : `No fue posible cargar ${configuracion.plural.toLowerCase()}.`) })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [configuracion.plural, parametros, recurso, revision])

  const columnas = useMemo<ColumnaTabla<RegistroAbastecimiento>[]>(() => {
    const estados = recurso === 'proveedores' ? ['ACTIVO', 'INACTIVO'] : opciones?.estados[configuracion.claveEstados ?? ''] ?? []
    const descripcionListado = (item: RegistroAbastecimiento) => recurso === 'cotizaciones'
      ? (item as CotizacionCompra).solicitud?.numero ?? 'Solicitud relacionada'
      : recurso === 'ordenes'
        ? (item as OrdenCompra).referenciaDestino ?? (item as OrdenCompra).sucursalDestino?.nombre ?? 'Destino relacionado'
        : recurso === 'recepciones'
          ? (item as RecepcionCompra).orden?.numero ?? 'Orden relacionada'
          : obtenerNombrePrincipal(item)
    const tituloDescripcion = recurso === 'proveedores' ? 'Proveedor' : recurso === 'cotizaciones' ? 'Solicitud' : recurso === 'ordenes' ? 'Destino' : recurso === 'recepciones' ? 'Orden' : 'Descripción'
    const base: ColumnaTabla<RegistroAbastecimiento>[] = [
      { id: 'numero', titulo: recurso === 'proveedores' ? 'Código' : 'Número', obtenerValor: obtenerNumero, ordenable: true, celda: (item) => <strong>{obtenerNumero(item)}</strong> },
      { id: 'descripcion', titulo: tituloDescripcion, obtenerValor: descripcionListado, ordenable: true, celda: (item) => <span className={styles.textoRecortado}>{descripcionListado(item)}</span> },
    ]
    if (recurso === 'proveedores') {
      base.push(
        { id: 'nit', titulo: 'NIT', obtenerValor: (item) => 'nit' in item ? item.nit : '', ordenable: true, celda: (item) => 'nit' in item ? item.nit : '—' },
        { id: 'autorizado', titulo: 'Autorización', obtenerValor: (item) => 'autorizado' in item && item.autorizado ? 'AUTORIZADO' : 'NO_AUTORIZADO', ordenable: true, celda: (item) => { const autorizado = 'autorizado' in item && item.autorizado; return <span className={`${styles.estado} ${autorizado ? styles.estadoExito : styles.estadoAdvertencia}`}>{autorizado ? 'Autorizado' : 'No autorizado'}</span> } },
        { id: 'calificacion', titulo: 'Calificación', obtenerValor: (item) => 'calificacion' in item ? item.calificacion ?? -1 : -1, ordenable: true, celda: (item) => 'calificacion' in item && item.calificacion !== null ? item.calificacion.toFixed(2) : 'Sin evaluación' },
      )
    }
    if (recurso === 'cotizaciones') {
      base.push({ id: 'total', titulo: 'Total', obtenerValor: (item) => 'total' in item ? Number(item.total) : 0, ordenable: true, celda: (item) => {
        const cotizacion = item as CotizacionCompra
        return <strong>{new Intl.NumberFormat('es-GT', { style: 'currency', currency: cotizacion.moneda, maximumFractionDigits: 2 }).format(cotizacion.total)}</strong>
      } })
    }
    base.push({ id: 'estado', titulo: 'Estado', obtenerValor: obtenerEstado, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Filtrar por estado', opciones: estados.map((valor) => ({ valor, etiqueta: etiquetaCodigo(valor) })) }, celda: (item) => { const estado = obtenerEstado(item); return <span className={`${styles.estado} ${tonoEstado(estado)}`}>{etiquetaCodigo(estado)}</span> } })
    if (configuracion.permiteProveedor) base.push({ id: 'proveedor', titulo: 'Proveedor', obtenerValor: (item) => obtenerProveedorId(item) ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Filtrar por proveedor', multiple: false, opciones: (opciones?.proveedores ?? []).map((item) => ({ valor: item.id, etiqueta: item.nombre })) }, celda: (item) => opciones?.proveedores.find((opcion) => opcion.id === obtenerProveedorId(item))?.nombre ?? ('proveedor' in item && item.proveedor?.nombre) ?? 'Sin proveedor' })
    if (configuracion.permiteModalidad) base.push({ id: 'modalidad', titulo: 'Modalidad', obtenerValor: (item) => obtenerModalidad(item) ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Filtrar por modalidad', multiple: false, opciones: (opciones?.modalidades ?? []).map((valor) => ({ valor, etiqueta: etiquetaCodigo(valor) })) }, celda: (item) => etiquetaCodigo(obtenerModalidad(item)) })
    if (configuracion.permiteSucursal && opciones?.alcanceGlobal) base.push({ id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => obtenerSucursalId(item) ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Filtrar por sucursal', multiple: false, opciones: opciones.sucursales.map((item) => ({ valor: item.id, etiqueta: item.nombre })) }, celda: (item) => opciones.sucursales.find((opcion) => opcion.id === obtenerSucursalId(item))?.nombre ?? 'Sucursal relacionada' })
    base.push(
      { id: 'fecha', titulo: recurso === 'solicitudes' ? 'Registrada' : 'Fecha', obtenerValor: obtenerFecha, ordenable: true, celda: (item) => fechaHora(obtenerFecha(item)) },
      { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: (item) => item.id, celda: (item) => <div className={styles.accionesFila}>
        <button type="button" title={`Ver ${configuracion.singular}`} aria-label={`Ver ${configuracion.singular} ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}`)}><img src={iconoVer} alt="" /></button>
        {puedeExportar && recurso === 'solicitudes' && ['APROBADA', 'EN_COTIZACION', 'ADJUDICADA'].includes((item as SolicitudCompra).estado) && <button type="button" title="Ver PDF oficial" aria-label={`Ver PDF oficial de la solicitud ${obtenerNumero(item)}`} disabled={generandoPdf} onClick={() => void verDocumentoPdf(item)}><img src={iconoPdf} alt="" /></button>}
        {puedeExportar && recurso === 'solicitudes' && ['APROBADA', 'EN_COTIZACION', 'ADJUDICADA'].includes((item as SolicitudCompra).estado) && <button type="button" title="Generar solicitud de cotización" aria-label={`Generar solicitud de cotización para ${obtenerNumero(item)}`} disabled={generandoPdf} onClick={() => { setSolicitudCotizacion(item as SolicitudCompra); setProveedorCotizacionId(''); setErrorDocumento(null) }}><img src={iconoDescargar} alt="" /></button>}
        {puedeExportar && recurso === 'cotizaciones' && <button type="button" title="Ver PDF de cotización" aria-label={`Ver PDF de la cotización ${obtenerNumero(item)}`} disabled={generandoPdf} onClick={() => void verDocumentoPdf(item)}><img src={iconoPdf} alt="" /></button>}
        {puedeExportar && recurso === 'ordenes' && <button type="button" title="Ver PDF de orden de compra" aria-label={`Ver PDF de la orden ${obtenerNumero(item)}`} disabled={generandoPdf} onClick={() => void verDocumentoPdf(item)}><img src={iconoPdf} alt="" /></button>}
        {recurso === 'proveedores' && puedeActualizarProveedores && <button type="button" title="Editar proveedor" aria-label={`Editar proveedor ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/editar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'proveedores' && puedeInactivarProveedores && (item as ProveedorAbastecimiento).activo && <button className={styles.accionPeligro} type="button" title="Desactivar proveedor" aria-label={`Desactivar proveedor ${obtenerNumero(item)}`} onClick={() => setProveedorAInactivar(item as ProveedorAbastecimiento)}><img src={iconoEliminar} alt="" /></button>}
        {recurso === 'solicitudes' && puedeResolverSolicitudes && (item as SolicitudCompra).estado === 'SOLICITADA' && <button type="button" title="Resolver solicitud" aria-label={`Resolver solicitud ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/resolver`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'solicitudes' && puedeCancelarSolicitudes && ['SOLICITADA', 'APROBADA', 'EN_COTIZACION'].includes((item as SolicitudCompra).estado) && <button className={styles.accionPeligro} type="button" title="Cancelar solicitud" aria-label={`Cancelar solicitud ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cancelar`)}><img src={iconoEliminar} alt="" /></button>}
        {recurso === 'cotizaciones' && puedeAdjudicarCotizaciones && (item as CotizacionCompra).estado === 'REGISTRADA' && <button type="button" title="Evaluar cotización" aria-label={`Evaluar cotización ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/evaluar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'ordenes' && puedeConfirmarOrdenes && (item as OrdenCompra).estado === 'EMITIDA' && <button type="button" title="Confirmar proveedor" aria-label={`Confirmar proveedor para la orden ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/confirmar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'ordenes' && puedeCerrarOrdenes && (item as OrdenCompra).estado === 'RECIBIDA' && <button type="button" title="Cerrar orden" aria-label={`Cerrar orden ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cerrar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'ordenes' && puedeCancelarOrdenes && ['EMITIDA', 'CONFIRMADA_PROVEEDOR', 'RECEPCION_PARCIAL'].includes((item as OrdenCompra).estado) && <button className={styles.accionPeligro} type="button" title="Cancelar orden" aria-label={`Cancelar orden ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cancelar`)}><img src={iconoEliminar} alt="" /></button>}
        {recurso === 'recepciones' && puedeRegularizarRecepciones && (item as RecepcionCompra).documentoPendiente && <button type="button" title="Regularizar documento" aria-label={`Regularizar documento de la recepción ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/regularizar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'recepciones' && puedeValidarRecepciones && (item as RecepcionCompra).estado === 'REGISTRADA' && <button type="button" title="Validar etapa documental" aria-label={`Validar etapa documental de la recepción ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/validar/documental`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'recepciones' && puedeValidarRecepciones && (item as RecepcionCompra).estado === 'DOCUMENTAL_CONFORME' && <button type="button" title="Validar etapa física" aria-label={`Validar etapa física de la recepción ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/validar/fisica`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'recepciones' && puedeValidarRecepciones && (item as RecepcionCompra).estado === 'FISICA_CONFORME' && <button type="button" title="Validar etapa técnica" aria-label={`Validar etapa técnica de la recepción ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/validar/tecnica`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedeAprobarTraslados && (item as TrasladoInterno).sucursalOrigenId === sucursalActualId && (item as TrasladoInterno).estado === 'SOLICITADO' && <button type="button" title="Resolver traslado" aria-label={`Resolver traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/aprobar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedePrepararTraslados && (item as TrasladoInterno).sucursalOrigenId === sucursalActualId && ['APROBADO', 'RECIBIDO'].includes((item as TrasladoInterno).estado) && <button type="button" title="Preparar traslado" aria-label={`Preparar traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/preparar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedeDespacharTraslados && (item as TrasladoInterno).sucursalOrigenId === sucursalActualId && (item as TrasladoInterno).estado === 'PREPARADO' && <button type="button" title="Despachar traslado" aria-label={`Despachar traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/despachar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedeRecibirTraslados && (item as TrasladoInterno).sucursalDestinoId === sucursalActualId && (item as TrasladoInterno).estado === 'EN_TRANSITO' && <button type="button" title="Recibir traslado" aria-label={`Recibir traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/recibir`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedeCerrarTraslados && (item as TrasladoInterno).sucursalDestinoId === sucursalActualId && (item as TrasladoInterno).estado === 'RECIBIDO' && (item as TrasladoInterno).detalles.every((detalle) => Number(detalle.cantidadAprobada ?? 0) === Number(detalle.cantidadRecibida ?? 0) + Number(detalle.cantidadRechazada ?? 0)) && <button type="button" title="Cerrar traslado" aria-label={`Cerrar traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cerrar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'traslados' && puedeCancelarTraslados && ['SOLICITADO', 'APROBADO', 'PREPARADO'].includes((item as TrasladoInterno).estado) && <button className={styles.accionPeligro} type="button" title="Cancelar traslado" aria-label={`Cancelar traslado ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cancelar`)}><img src={iconoEliminar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeAutorizarDevoluciones && ['SOLICITADA', 'APROBACION_INTERNA'].includes((item as DevolucionProveedor).estado) && <button type="button" title="Autorizar devolución" aria-label={`Autorizar devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/autorizar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeSegregarDevoluciones && (item as DevolucionProveedor).estado === 'AUTORIZADA_PROVEEDOR' && <button type="button" title="Segregar devolución" aria-label={`Segregar devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/segregar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeDespacharDevoluciones && (item as DevolucionProveedor).estado === 'SEGREGADA' && <button type="button" title="Despachar devolución" aria-label={`Despachar devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/despachar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeRecibirDevoluciones && (item as DevolucionProveedor).estado === 'DESPACHADA' && <button type="button" title="Registrar recepción del proveedor" aria-label={`Registrar recepción de devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/recibir`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeCompensarDevoluciones && (item as DevolucionProveedor).estado === 'RECIBIDA_PROVEEDOR' && <button type="button" title="Registrar compensación" aria-label={`Registrar compensación de devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/compensar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeCerrarDevoluciones && (item as DevolucionProveedor).estado === 'COMPENSADA' && (item as DevolucionProveedor).detalles.every((detalle) => Number(detalle.cantidadRechazadaProveedor ?? 0) === 0) && <button type="button" title="Cerrar devolución" aria-label={`Cerrar devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cerrar`)}><img src={iconoEditar} alt="" /></button>}
        {recurso === 'devoluciones' && puedeCancelarDevoluciones && ['SOLICITADA', 'APROBACION_INTERNA', 'AUTORIZADA_PROVEEDOR', 'SEGREGADA'].includes((item as DevolucionProveedor).estado) && <button className={styles.accionPeligro} type="button" title="Cancelar devolución" aria-label={`Cancelar devolución ${obtenerNumero(item)}`} onClick={() => onNavegar(`${configuracion.ruta}/${item.id}/cancelar`)}><img src={iconoEliminar} alt="" /></button>}
      </div> },
    )
    return base
  }, [configuracion, generandoPdf, onNavegar, opciones, puedeAdjudicarCotizaciones, puedeAprobarTraslados, puedeActualizarProveedores, puedeAutorizarDevoluciones, puedeCancelarDevoluciones, puedeCancelarOrdenes, puedeCancelarSolicitudes, puedeCancelarTraslados, puedeCerrarDevoluciones, puedeCerrarOrdenes, puedeCerrarTraslados, puedeCompensarDevoluciones, puedeConfirmarOrdenes, puedeDespacharDevoluciones, puedeDespacharTraslados, puedeExportar, puedeInactivarProveedores, puedePrepararTraslados, puedeRecibirDevoluciones, puedeRecibirTraslados, puedeRegularizarRecepciones, puedeResolverSolicitudes, puedeSegregarDevoluciones, puedeValidarRecepciones, recurso, sucursalActualId, verDocumentoPdf])

  const exportar = async (formato: FormatoExportacion) => {
    try {
      const { pagina: _pagina, tamanoPagina: _tamanoPagina, ...criterios } = parametros
      await exportarAbastecimiento(recurso, formato, criterios)
    } catch (errorActual) {
      setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible generar la exportación.')
    }
  }

  const hayCriterios = Boolean(busqueda || filtros.length)
  const fechaDesde = filtroUnico(filtros, 'fechaDesde') ?? ''
  const fechaHasta = filtroUnico(filtros, 'fechaHasta') ?? ''
  const actualizarFecha = (id: 'fechaDesde' | 'fechaHasta', valor: string) => {
    setFiltros((actuales) => [...actuales.filter((filtro) => filtro.id !== id), ...(valor ? [{ id, value: [valor] }] : [])])
    setPagina(1)
  }
  const actualizarOrdenamiento = (siguiente: SortingState) => {
    setOrdenamiento(siguiente.length ? siguiente : [ordenPredeterminado(recurso)])
    setPagina(1)
  }
  return (
    <section className={styles.pagina} aria-labelledby={`titulo-${recurso}`}>
      <header className={styles.cabecera}>
        <AbastecimientoBreadcrumb recurso={recurso} onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <h1 id={`titulo-${recurso}`}>{configuracion.plural}</h1>
          {puedeCrear && <button className={styles.botonNuevo} type="button" onClick={() => onNavegar(`${configuracion.ruta}/nuevo`)}><img src={iconoAgregar} alt="" />Nuevo {configuracion.singular}</button>}
          {puedeExportar && <BotonExportar deshabilitado={!resultado?.total || cargando} onExportar={exportar} />}
          <div className={styles.filtrosFecha} aria-label="Periodo de consulta">
            <FiltroFecha etiqueta="Desde" valor={fechaDesde} maximo={fechaHasta || undefined} onChange={(valor) => actualizarFecha('fechaDesde', valor)} />
            <FiltroFecha etiqueta="Hasta" valor={fechaHasta} minimo={fechaDesde || undefined} onChange={(valor) => actualizarFecha('fechaHasta', valor)} />
          </div>
          <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => { evento.preventDefault(); setBusqueda(entrada.trim()); setPagina(1) }}>
            <label className={styles.soloLectores} htmlFor={`buscar-${recurso}`}>Buscar en {configuracion.plural.toLowerCase()}</label>
            <div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id={`buscar-${recurso}`} type="search" value={entrada} maxLength={150} placeholder="Buscar número, nombre o referencia" onChange={(evento) => setEntrada(evento.target.value)} />{entrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setEntrada('')}>×</button>}</div>
          </form>
        </div>
      </header>
      {errorListado && <div className={styles.alertaError} role="alert"><p>{errorListado}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      {errorOpciones && <div className={styles.alertaAdvertencia} role="status"><p>{errorOpciones} El listado continúa disponible sin esos filtros.</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar filtros</button></div>}
      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}><div><strong>{configuracion.plural}</strong><small>Consulta, filtros, seguimiento y trazabilidad del proceso.</small></div><div>{cargando && <span role="status">Actualizando…</span>}{filtros.length > 0 && <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>Limpiar filtros ({filtros.length})</button>}</div></div>
        {resultado?.items.length ? <><TablaDatos descripcion={`Listado de ${configuracion.plural.toLowerCase()}`} datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(valor) => { setFiltros(valor); setPagina(1) }} onOrdenamientoChange={actualizarOrdenamiento} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular={configuracion.singular} unidadPlural={configuracion.plural.toLowerCase()} onPaginaChange={setPagina} onTamanoPaginaChange={(valor) => { setTamanoPagina(valor); setPagina(1) }} /></> : !cargando && !errorListado ? <div className={styles.estadoVacio}><h2>{hayCriterios ? 'Sin coincidencias' : `Sin ${configuracion.plural.toLowerCase()}`}</h2><p>{hayCriterios ? 'Ajusta o restablece los filtros para continuar.' : 'Aún no existen registros dentro del alcance de tu sesión.'}</p></div> : null}
      </article>
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
      <ModalEstado
        abierto={Boolean(solicitudCotizacion)}
        tipo="informacion"
        titulo="Generar solicitud de cotización"
        ancho="amplio"
        mensaje={<div className={styles.campo}><label htmlFor="proveedor-solicitud-cotizacion">Proveedor destinatario <span aria-hidden="true">*</span></label><select id="proveedor-solicitud-cotizacion" value={proveedorCotizacionId} onChange={(evento) => { setProveedorCotizacionId(evento.target.value); setErrorDocumento(null) }}><option value="">Selecciona un proveedor autorizado</option>{(opciones?.proveedores ?? []).filter((proveedor) => proveedor.autorizado).map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.codigo} — {proveedor.nombre}</option>)}</select><small className={styles.ayudaCampo}>El PDF quedará dirigido a este proveedor. El envío se realizará manualmente fuera del sistema.</small></div>}
        textoAccionPrincipal="Generar PDF"
        onAccionPrincipal={() => void generarSolicitudCotizacion()}
        textoAccionSecundaria="Cancelar"
        onAccionSecundaria={() => { setSolicitudCotizacion(null); setProveedorCotizacionId(''); setErrorDocumento(null) }}
        onCerrar={() => { setSolicitudCotizacion(null); setProveedorCotizacionId(''); setErrorDocumento(null) }}
        cargando={generandoPdf}
      />
      <ModalEstado abierto={Boolean(errorDocumento)} tipo="error" titulo="No se pudo generar el PDF" mensaje={errorDocumento ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorDocumento(null)} onCerrar={() => setErrorDocumento(null)} />
      <ProveedorInactivarModal proveedor={proveedorAInactivar} onCerrar={() => setProveedorAInactivar(null)} onInactivado={(proveedor) => { setProveedorAInactivar(null); setMensajeExito(`${proveedor.nombre} fue desactivado correctamente.`); setRevision((valor) => valor + 1) }} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Proveedor desactivado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    </section>
  )
}
