import { useEffect, useMemo, useState } from 'react'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { obtenerEmpleado } from '../empleado-api'
import type { AsignacionSucursalEmpleado, Empleado, EstadoEmpleado } from '../empleado.types'
import { EmpleadoAuditoria } from './empleado-auditoria'
import { EmpleadoEstadoModal } from './empleado-inactivar-modal'
import { EmpleadoBreadcrumb } from './empleado-breadcrumb'
import styles from './empleado-gestion.module.css'

type EmpleadoDetalleViewProps = {
  empleadoId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}

function nombreCompleto(empleado: Empleado): string {
  return [empleado.primerNombre, empleado.segundoNombre, empleado.tercerNombre, empleado.primerApellido, empleado.segundoApellido, empleado.apellidoCasada].filter(Boolean).join(' ')
}

const etiquetasEstado: Record<EstadoEmpleado, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  INACTIVO: 'Desactivado',
  RETIRADO: 'Retirado',
}

function fecha(valor: string | null): string {
  if (!valor) return '—'
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
}

function normalizarTexto(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

function valorColumnaHistorial(
  asignacion: AsignacionSucursalEmpleado,
  columnaId: string,
): string {
  if (columnaId === 'sucursal') return `${asignacion.sucursalNombre} ${asignacion.sucursalCodigo}`
  if (columnaId === 'inicio') return asignacion.fechaInicio
  if (columnaId === 'finalizacion') return asignacion.fechaFin ?? ''
  if (columnaId === 'estado') return asignacion.estado
  if (columnaId === 'motivo') return asignacion.motivoCambio ?? ''
  return ''
}

export function EmpleadoDetalleView({ empleadoId, permisos, onNavegar }: EmpleadoDetalleViewProps) {
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [gestionarEstado, setGestionarEstado] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [filtrosHistorial, setFiltrosHistorial] = useState<ColumnFiltersState>([])
  const [ordenamientoHistorial, setOrdenamientoHistorial] = useState<SortingState>([
    { id: 'inicio', desc: true },
  ])

  const puedeEditar = permisos.includes('ORGANIZACION.EMPLEADOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ORGANIZACION.EMPLEADOS.INACTIVAR')
  const puedeVerAuditoria = permisos.includes('ORGANIZACION.EMPLEADOS.VER_AUDITORIA')
  const estadosHistorial = useMemo(
    () => [...new Set(empleado?.historialSucursales.map((asignacion) => asignacion.estado) ?? [])].sort(),
    [empleado],
  )
  const columnasHistorial = useMemo<ColumnaTabla<AsignacionSucursalEmpleado>[]>(() => [
    {
      id: 'sucursal',
      titulo: 'Sucursal',
      obtenerValor: (asignacion) => valorColumnaHistorial(asignacion, 'sucursal'),
      ordenable: true,
      filtro: { tipo: 'texto', etiqueta: 'Filtrar sucursal', placeholder: 'Nombre o código' },
      celda: (asignacion) => <><strong>{asignacion.sucursalNombre}</strong><small>{asignacion.sucursalCodigo}</small></>,
    },
    {
      id: 'inicio',
      titulo: 'Inicio',
      obtenerValor: (asignacion) => asignacion.fechaInicio,
      ordenable: true,
      filtro: { tipo: 'texto', etiqueta: 'Filtrar fecha de inicio', placeholder: 'AAAA-MM-DD' },
      celda: (asignacion) => fecha(asignacion.fechaInicio),
    },
    {
      id: 'finalizacion',
      titulo: 'Finalización',
      obtenerValor: (asignacion) => asignacion.fechaFin ?? '',
      ordenable: true,
      filtro: { tipo: 'texto', etiqueta: 'Filtrar fecha de finalización', placeholder: 'AAAA-MM-DD' },
      celda: (asignacion) => fecha(asignacion.fechaFin),
    },
    {
      id: 'estado',
      titulo: 'Estado',
      obtenerValor: (asignacion) => asignacion.estado,
      ordenable: true,
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Seleccionar estados',
        buscable: false,
        opciones: estadosHistorial.map((estado) => ({ valor: estado, etiqueta: estado })),
      },
      celda: (asignacion) => asignacion.estado,
    },
    {
      id: 'motivo',
      titulo: 'Motivo',
      obtenerValor: (asignacion) => asignacion.motivoCambio ?? '',
      ordenable: true,
      filtro: { tipo: 'texto', etiqueta: 'Filtrar motivo', placeholder: 'Escribe un motivo' },
      celda: (asignacion) => asignacion.motivoCambio ?? '—',
    },
  ], [estadosHistorial])
  const historialFiltrado = useMemo(() => {
    const filtrado = (empleado?.historialSucursales ?? []).filter((asignacion) =>
      filtrosHistorial.every((filtro) => {
        const valorFila = valorColumnaHistorial(asignacion, filtro.id)
        if (Array.isArray(filtro.value)) {
          return filtro.value.length === 0 || filtro.value.includes(valorFila)
        }
        const termino = typeof filtro.value === 'string' ? normalizarTexto(filtro.value.trim()) : ''
        return !termino || normalizarTexto(valorFila).includes(termino)
      }),
    )
    const orden = ordenamientoHistorial[0]
    if (!orden) return filtrado
    return [...filtrado].sort((a, b) => {
      const comparacion = valorColumnaHistorial(a, orden.id).localeCompare(
        valorColumnaHistorial(b, orden.id),
        'es',
        { numeric: true },
      )
      return orden.desc ? -comparacion : comparacion
    })
  }, [empleado, filtrosHistorial, ordenamientoHistorial])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerEmpleado(empleadoId, controlador.signal)
      .then((respuesta) => {
        setEmpleado(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (controlador.signal.aborted) return
        setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el empleado.')
      })
    return () => controlador.abort()
  }, [empleadoId, revision])

  if (error) {
    return <section className={styles.errorPagina}><h1>No se pudo abrir el empleado</h1><p>{error}</p><div><button type="button" onClick={() => onNavegar('/empleados')}>Volver</button><button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button></div></section>
  }
  if (!empleado) return null

  const estadoTerminal = ['INACTIVO', 'RETIRADO'].includes(empleado.estado)

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-detalle-empleado">
        <EmpleadoBreadcrumb actual="Detalle del empleado" onNavegar={onNavegar} />
        <header className={styles.cabeceraDetalle}>
          <div className={styles.perfilEmpleado}>
            <span className={styles.fotoDetalle}>
              <span>{`${empleado.primerNombre[0] ?? ''}${empleado.primerApellido[0] ?? ''}`}</span>
              {empleado.fotoUrl && <img src={`${construirUrlApi(empleado.fotoUrl)}?v=${empleado.version}`} alt={`Fotografía de ${nombreCompleto(empleado)}`} crossOrigin="use-credentials" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
            </span>
            <div><p>Expediente {empleado.codigo}</p><h1 id="titulo-detalle-empleado">{nombreCompleto(empleado)}</h1><span className={`${styles.estado} ${styles[empleado.estado.toLowerCase()]}`}>{etiquetasEstado[empleado.estado]}</span></div>
          </div>
          <div className={styles.accionesCabecera}>
            {puedeEditar && !estadoTerminal && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/empleados/${empleado.id}/editar`)}><IconoAccion nombre="editar" /><span>Editar información</span></button>}
            {puedeInactivar && !estadoTerminal && <button className={styles.botonEstado} type="button" onClick={() => setGestionarEstado(true)}><IconoAccion nombre="estado" /><span>Cambiar estado</span></button>}
          </div>
        </header>

        <div className={styles.grillaDetalle}>
          <article className={styles.tarjetaDetalle}>
            <h2>Información personal</h2>
            <dl><div><dt>DPI</dt><dd>{empleado.dpi}</dd></div><div><dt>Fecha de nacimiento</dt><dd>{fecha(empleado.fechaNacimiento)}</dd></div><div><dt>Correo</dt><dd>{empleado.correo ?? 'No registrado'}</dd></div><div><dt>Teléfono</dt><dd>{empleado.telefono ?? 'No registrado'}</dd></div><div className={styles.datoCompleto}><dt>Dirección</dt><dd>{empleado.direccionCompleta ?? empleado.direccion ?? 'No registrada'}</dd></div></dl>
          </article>
          <article className={styles.tarjetaDetalle}>
            <h2>Información laboral</h2>
            <dl><div><dt>Puesto</dt><dd>{empleado.puesto?.nombre ?? 'Sin puesto'}</dd></div><div><dt>Departamento</dt><dd>{empleado.puesto?.departamentoOrganizacional.nombre ?? 'Sin departamento'}</dd></div><div><dt>Fecha de contratación</dt><dd>{fecha(empleado.fechaContratacion)}</dd></div><div><dt>Fecha de retiro</dt><dd>{fecha(empleado.fechaRetiro)}</dd></div><div className={styles.datoCompleto}><dt>Sucursal actual</dt><dd>{empleado.asignacionActual ? `${empleado.asignacionActual.sucursalCodigo} — ${empleado.asignacionActual.sucursalNombre}` : 'Sin asignación activa'}</dd></div>{empleado.estado !== 'ACTIVO' && <div className={styles.datoCompleto}><dt>Motivo del estado</dt><dd>{empleado.motivoEstado ?? 'Sin motivo registrado'}</dd></div>}</dl>
          </article>
        </div>

        <article className={styles.tarjetaDetalle}>
          <div className={styles.tituloHistorial}><div><h2>Historial de sucursales</h2><p>Filtra u ordena desde el encabezado de cada columna.</p></div><div className={styles.accionesResumen}><span>{filtrosHistorial.length ? `${historialFiltrado.length} de ${empleado.historialSucursales.length}` : empleado.historialSucursales.length} registros</span>{filtrosHistorial.length > 0 && <button type="button" onClick={() => setFiltrosHistorial([])}>Limpiar filtros</button>}</div></div>
          {empleado.historialSucursales.length ? (
            historialFiltrado.length ? <div className={styles.tablaTanstackHistorial}><TablaDatos descripcion="Historial de asignaciones de sucursal del empleado" datos={historialFiltrado} columnas={columnasHistorial} filtros={filtrosHistorial} ordenamiento={ordenamientoHistorial} obtenerIdFila={(asignacion) => asignacion.id} onFiltrosChange={setFiltrosHistorial} onOrdenamientoChange={setOrdenamientoHistorial} /></div> : <p className={styles.sinHistorial}>No hay asignaciones que coincidan con los filtros.</p>
          ) : <p className={styles.sinHistorial}>No hay asignaciones registradas.</p>}
        </article>

        {puedeVerAuditoria && <EmpleadoAuditoria empleadoId={empleado.id} revision={revision} />}
      </section>

      <EmpleadoEstadoModal empleado={empleado} abierto={gestionarEstado} onCerrar={() => setGestionarEstado(false)} onCambiado={(actualizado) => { setGestionarEstado(false); setMensajeExito(`El empleado ahora está ${etiquetasEstado[actualizado.estado].toLowerCase()}.`); setRevision((actual) => actual + 1) }} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Estado actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
    </>
  )
}
