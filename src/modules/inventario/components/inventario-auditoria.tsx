import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { listarAuditoriaInventario } from '../inventario-api'
import type {
  AuditoriaInventarioPaginada,
  EventoAuditoriaInventario,
  ListarAuditoriaInventarioParametros,
  OrdenAuditoriaInventario,
  TipoEntidadAuditoriaInventario,
} from '../inventario.types'
import styles from './inventario.module.css'

const etiquetasOperacion: Record<string, string> = {
  CREAR: 'Creación',
  ACTUALIZAR: 'Actualización',
  INACTIVAR: 'Inactivación',
  REACTIVAR: 'Reactivación',
  BLOQUEAR_POR_CONTEO: 'Bloqueo por conteo',
  DESBLOQUEAR_POR_CONTEO: 'Desbloqueo por conteo',
  CREAR_MASIVA: 'Creación por política masiva',
  ACTUALIZAR_MASIVA: 'Actualización por política masiva',
  REGISTRAR_RESULTADOS: 'Registro de resultados',
  APROBAR_CERRAR: 'Aprobación y cierre',
  APERTURA: 'Apertura',
  AJUSTE_POSITIVO: 'Ajuste positivo',
  AJUSTE_NEGATIVO: 'Ajuste negativo',
  COMPRA_RECEPCION: 'Recepción de compra',
  TRASLADO_DESPACHO: 'Despacho de traslado',
  TRASLADO_RECEPCION: 'Recepción de traslado',
  VENTA: 'Venta',
  DEVOLUCION_CLIENTE: 'Devolución de cliente',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
  VENCIMIENTO: 'Vencimiento',
  DESTRUCCION: 'Destrucción',
  CONTEO: 'Ajuste por conteo',
  COMPENSACION: 'Compensación',
  SOLICITAR: 'Solicitud',
  APROBAR_APLICAR: 'Aprobación y aplicación',
  RECHAZAR: 'Rechazo',
}

const opcionesOperacion = Object.entries(etiquetasOperacion).map(([valor, etiqueta]) => ({ valor, etiqueta }))

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

function textoFiltro(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}

function arregloFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === 'string')
    : undefined
}

function mostrarValor(valor: string | null): string {
  return valor === null || valor === '' ? 'Sin valor' : valor
}

export function InventarioAuditoria({
  tipo,
  entidadId,
  titulo,
  revision = 0,
}: {
  tipo: TipoEntidadAuditoriaInventario
  entidadId: string
  titulo: string
  revision?: number
}) {
  const [resultado, setResultado] = useState<AuditoriaInventarioPaginada | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reintento, setReintento] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')

  const parametros = useMemo<ListarAuditoriaInventarioParametros>(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      fecha: textoFiltro(filtros, 'fecha'),
      operaciones: arregloFiltro(filtros, 'operacion'),
      usuario: textoFiltro(filtros, 'usuario'),
      sucursal: textoFiltro(filtros, 'sucursal'),
      resumen: textoFiltro(filtros, 'resumen'),
      orden: (orden?.id ?? 'fecha') as OrdenAuditoriaInventario,
      direccion: orden?.desc === false ? 'asc' : 'desc',
    }
  }, [filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(
    () => JSON.stringify({ tipo, entidadId, parametros, reintento, revision }),
    [entidadId, parametros, reintento, revision, tipo],
  )
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarAuditoriaInventario(tipo, entidadId, parametros, controlador.signal)
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setResultado(respuesta)
        setExpandido(null)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (controlador.signal.aborted) return
        setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la pista de auditoría.')
      })
      .finally(() => {
        if (!controlador.signal.aborted) setSolicitudFinalizada(clave)
      })
    return () => controlador.abort()
  }, [clave, entidadId, pagina, parametros, tipo])

  const columnas = useMemo<ColumnaTabla<EventoAuditoriaInventario>[]>(() => [
    {
      id: 'fecha', titulo: 'Fecha y hora', obtenerValor: (evento) => evento.ocurridoEn,
      ordenable: true, filtro: { tipo: 'fecha', etiqueta: 'Fecha del evento' },
      celda: (evento) => fechaHora(evento.ocurridoEn),
    },
    {
      id: 'operacion', titulo: 'Acción', obtenerValor: (evento) => evento.tipoOperacion,
      ordenable: true,
      filtro: { tipo: 'opciones', etiqueta: 'Seleccionar acciones', buscable: false, opciones: opcionesOperacion },
      celda: (evento) => <span className={`${styles.estado} ${styles.estadoInformacion}`}>{etiquetasOperacion[evento.tipoOperacion] ?? evento.tipoOperacion}</span>,
    },
    {
      id: 'usuario', titulo: 'Realizado por', obtenerValor: (evento) => evento.usuarioNombre ?? 'SISTEMA',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar usuario', placeholder: 'Nombre de usuario' },
      celda: (evento) => evento.usuarioNombre ?? 'SISTEMA',
    },
    {
      id: 'sucursal', titulo: 'Sucursal', obtenerValor: (evento) => evento.sucursal?.nombre ?? '',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar sucursal', placeholder: 'Nombre o código' },
      celda: (evento) => evento.sucursal
        ? <span className={styles.identidad}><strong>{evento.sucursal.nombre}</strong><small>{evento.sucursal.codigo}</small></span>
        : <span className={styles.sinDato}>Sin sucursal</span>,
    },
    {
      id: 'resumen', titulo: 'Resumen', obtenerValor: (evento) => evento.resumen ?? '',
      ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar resumen', placeholder: 'Descripción' },
      celda: (evento) => evento.resumen ?? 'Sin resumen',
    },
    {
      id: 'cambios', titulo: 'Cambios', tituloSoloLectores: true,
      obtenerValor: (evento) => evento.detalles.length,
      celda: (evento) => evento.detalles.length ? (
        <button
          className={styles.botonSecundario}
          type="button"
          aria-expanded={expandido === evento.id}
          onClick={() => setExpandido((actual) => actual === evento.id ? null : evento.id)}
        >
          {expandido === evento.id ? 'Ocultar' : `Ver (${evento.detalles.length})`}
        </button>
      ) : <span className={styles.sinDato}>Sin detalle</span>,
    },
  ], [expandido])

  return (
    <article className={styles.panelAuditoria} aria-busy={cargando}>
      <div className={styles.tituloAuditoria}>
        <div><h2>Pista de auditoría</h2><p>{titulo}</p></div>
        <div className={styles.accionesResumen}>
          {cargando && <span role="status">Actualizando…</span>}
          {resultado && <span>{resultado.total} {resultado.total === 1 ? 'evento' : 'eventos'}</span>}
          {filtros.length > 0 && <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>Limpiar filtros ({filtros.length})</button>}
        </div>
      </div>
      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</button></div>}
      {resultado?.items.length ? (
        <>
          <TablaDatos
            descripcion="Pista de auditoría de inventario con filtros por columna"
            datos={resultado.items}
            columnas={columnas}
            filtros={filtros}
            ordenamiento={ordenamiento}
            obtenerIdFila={(evento) => evento.id}
            onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }}
            onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }]); setPagina(1) }}
            renderizarFilaExpandida={(evento) => evento.id === expandido ? (
              <div className={styles.detalleAuditoria} id={`detalle-auditoria-${evento.id}`}>
                <h3>Cambios registrados</h3>
                <div className={styles.tablaDetalle}><table><thead><tr><th>Campo</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead><tbody>
                  {evento.detalles.map((detalle) => <tr key={detalle.id}><th scope="row">{detalle.etiquetaPropiedad ?? detalle.nombrePropiedad}</th><td>{mostrarValor(detalle.valorAnterior)}</td><td>{mostrarValor(detalle.valorNuevo)}</td></tr>)}
                </tbody></table></div>
              </div>
            ) : null}
          />
          <PaginacionTabla
            pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total}
            totalPaginas={resultado.totalPaginas} unidadSingular="evento" unidadPlural="eventos"
            onPaginaChange={setPagina}
            onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }}
          />
        </>
      ) : !cargando && !error ? (
        <div className={styles.estadoVacio}><h2>{filtros.length ? 'Sin coincidencias' : 'Sin eventos de auditoría'}</h2><p>{filtros.length ? 'Ajusta o limpia los filtros aplicados.' : 'Todavía no hay acciones registradas para este elemento.'}</p></div>
      ) : null}
    </article>
  )
}
