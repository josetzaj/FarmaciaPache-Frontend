import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { listarAuditoriaRol } from '../rol-api'
import type {
  AuditoriaRolPaginada,
  EventoAuditoriaRol,
  ListarAuditoriaRolParametros,
  OperacionAuditoriaRol,
  OrdenAuditoriaRol,
} from '../rol.types'
import styles from './rol-gestion.module.css'

type RolAuditoriaProps = { rolId: string; revision: number }

const etiquetasOperacion: Record<OperacionAuditoriaRol, string> = {
  CREAR: 'Creación',
  ACTUALIZAR: 'Actualización',
  ASIGNAR_PERMISOS: 'Permisos',
  INACTIVAR: 'Desactivación',
}

const opcionesOperacion = Object.entries(etiquetasOperacion).map(([valor, etiqueta]) => ({ valor, etiqueta }))

function valorFiltroTexto(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined
}

function fechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

function valorAuditoria(valor: string | null): string {
  if (valor === null || valor === '') return 'Sin valor'
  if (valor === 'true') return 'Sí'
  if (valor === 'false') return 'No'
  return valor
}

function DetalleCambios({ evento }: { evento: EventoAuditoriaRol }) {
  return (
    <div id={`detalle-auditoria-rol-${evento.id}`} className={styles.detalleAuditoria}>
      <h3>Cambios registrados</h3>
      <div className={styles.tablaCambiosContenedor}>
        <table>
          <thead><tr><th>Campo</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead>
          <tbody>{evento.detalles.map((detalle) => (
            <tr key={detalle.id}><th scope="row">{detalle.etiquetaPropiedad ?? detalle.nombrePropiedad}</th><td>{valorAuditoria(detalle.valorAnterior)}</td><td>{valorAuditoria(detalle.valorNuevo)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

export function RolAuditoria({ rolId, revision }: RolAuditoriaProps) {
  const [resultado, setResultado] = useState<AuditoriaRolPaginada | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState<string | null>(null)
  const [reintento, setReintento] = useState(0)

  const parametros = useMemo<ListarAuditoriaRolParametros>(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      fecha: valorFiltroTexto(filtros, 'fecha'),
      operaciones: valoresFiltro(filtros, 'operacion') as OperacionAuditoriaRol[] | undefined,
      usuario: valorFiltroTexto(filtros, 'usuario'),
      sucursal: valorFiltroTexto(filtros, 'sucursal'),
      resumen: valorFiltroTexto(filtros, 'resumen'),
      orden: (orden?.id ?? 'fecha') as OrdenAuditoriaRol,
      direccion: orden?.desc === false ? 'asc' : 'desc',
    }
  }, [filtros, ordenamiento, pagina, tamanoPagina])
  const clave = useMemo(() => JSON.stringify({ rolId, parametros, revision, reintento }), [parametros, reintento, revision, rolId])
  const cargando = solicitudFinalizada !== clave

  useEffect(() => {
    const controlador = new AbortController()
    void listarAuditoriaRol(rolId, parametros, controlador.signal)
      .then((respuesta) => { setResultado(respuesta); setExpandido(null); setError(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la pista de auditoría.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(clave) })
    return () => controlador.abort()
  }, [clave, parametros, rolId])

  const columnas = useMemo<ColumnaTabla<EventoAuditoriaRol>[]>(() => [
    { id: 'fecha', titulo: 'Fecha y hora', obtenerValor: (evento) => evento.ocurridoEn, ordenable: true, filtro: { tipo: 'fecha', etiqueta: 'Fecha del evento' }, celda: (evento) => fechaHora(evento.ocurridoEn) },
    { id: 'operacion', titulo: 'Acción', obtenerValor: (evento) => evento.tipoOperacion, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Seleccionar acciones', buscable: false, opciones: opcionesOperacion }, celda: (evento) => <span className={styles.accionAuditoria}>{etiquetasOperacion[evento.tipoOperacion] ?? evento.tipoOperacion}</span> },
    { id: 'usuario', titulo: 'Realizado por', obtenerValor: (evento) => evento.usuarioNombre ?? 'SISTEMA', ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar usuario', placeholder: 'Nombre de usuario' }, celda: (evento) => evento.usuarioNombre ?? 'SISTEMA' },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (evento) => evento.sucursal?.nombre ?? '', ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar sucursal', placeholder: 'Nombre o código' }, celda: (evento) => evento.sucursal ? <><strong>{evento.sucursal.nombre}</strong><small>{evento.sucursal.codigo}</small></> : 'Sin sucursal' },
    { id: 'resumen', titulo: 'Resumen', obtenerValor: (evento) => evento.resumen ?? '', ordenable: true, filtro: { tipo: 'texto', etiqueta: 'Filtrar resumen', placeholder: 'Descripción de la acción' }, celda: (evento) => evento.resumen ?? 'Sin resumen' },
    { id: 'cambios', titulo: 'Cambios', obtenerValor: (evento) => evento.detalles.length, celda: (evento) => evento.detalles.length ? <button className={styles.botonCambiosAuditoria} type="button" aria-expanded={expandido === evento.id} aria-controls={`detalle-auditoria-rol-${evento.id}`} onClick={() => setExpandido((actual) => actual === evento.id ? null : evento.id)}>{expandido === evento.id ? 'Ocultar' : `Ver (${evento.detalles.length})`}</button> : <span className={styles.sinDato}>Sin detalle</span> },
  ], [expandido])

  return (
    <article className={styles.tarjetaDetalle} aria-busy={cargando}>
      <div className={styles.tituloHistorial}>
        <div><h2>Pista de auditoría</h2><p>Consulta quién modificó el rol y cómo cambiaron sus permisos.</p></div>
        <div className={styles.accionesResumen}>{cargando && <span role="status">Actualizando…</span>}{resultado && <span>{resultado.total} {resultado.total === 1 ? 'evento' : 'eventos'}</span>}{filtros.length > 0 && <button type="button" onClick={() => { setFiltros([]); setPagina(1) }}>Limpiar filtros ({filtros.length})</button>}</div>
      </div>
      {error && <div className={styles.errorAuditoria} role="alert"><span>{error}</span><button type="button" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</button></div>}
      {!resultado && cargando ? <p className={styles.sinHistorial}>Cargando pista de auditoría…</p> : resultado?.items.length ? (
        <div className={styles.tablaTanstackAuditoria}>
          <TablaDatos descripcion="Pista de auditoría del rol" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(evento) => evento.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }]); setPagina(1) }} renderizarFilaExpandida={(evento) => evento.id === expandido ? <DetalleCambios evento={evento} /> : null} />
          <PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="evento" unidadPlural="eventos" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} />
        </div>
      ) : !error ? <p className={styles.sinHistorial}>{filtros.length ? 'No hay eventos que coincidan con los filtros.' : 'No hay eventos de auditoría registrados para este rol.'}</p> : null}
    </article>
  )
}
