import { useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import {
  BotonExportar,
  type FormatoExportacion,
} from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { IconoAccion } from '../../../shared/components/icono-accion'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import {
  exportarEmpleados,
  listarEmpleados,
  obtenerOpcionesFiltrosEmpleado,
} from '../empleado-api'
import type {
  Empleado,
  EmpleadosPaginados,
  EstadoEmpleado,
  OpcionesFiltrosEmpleado,
  OrdenEmpleado,
  ListarEmpleadosParametros,
} from '../empleado.types'
import { EmpleadoBreadcrumb } from './empleado-breadcrumb'
import { EmpleadoEstadoModal } from './empleado-inactivar-modal'
import styles from './empleado-gestion.module.css'

type EmpleadoListadoViewProps = {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}

const opcionesIniciales: OpcionesFiltrosEmpleado = {
  puestos: [],
  sucursales: [],
}

const opcionesEstado = [
  { valor: 'ACTIVO', etiqueta: 'Activo' },
  { valor: 'SUSPENDIDO', etiqueta: 'Suspendido' },
  { valor: 'INACTIVO', etiqueta: 'Desactivado' },
  { valor: 'RETIRADO', etiqueta: 'Retirado' },
] as const

const ordenesEmpleado: Record<string, OrdenEmpleado> = {
  empleado: 'empleado',
  puesto: 'puesto',
  contacto: 'contacto',
  estado: 'estado',
}

const demoraBusquedaMs = 400

function normalizarBusqueda(valor: string): string {
  const termino = valor.trim().replace(/\s+/g, ' ')
  return /^(?=.*\d)[\d\s-]+$/.test(termino)
    ? termino.replace(/[\s-]/g, '')
    : termino
}

function validarBusquedaGeneral(valor: string): { aplicable: boolean; mensaje: string } {
  const termino = normalizarBusqueda(valor)
  if (!termino) {
    return {
      aplicable: true,
      mensaje: 'Escribe un nombre o los primeros dígitos del DPI.',
    }
  }
  if (/^\d+$/.test(termino)) {
    if (termino.length < 4) {
      return { aplicable: false, mensaje: 'Escribe al menos 4 dígitos del DPI.' }
    }
    if (termino.length > 13) {
      return { aplicable: false, mensaje: 'El DPI puede contener como máximo 13 dígitos.' }
    }
    return {
      aplicable: true,
      mensaje: termino.length === 13
        ? 'DPI completo. La búsqueda utilizará coincidencia exacta.'
        : 'La búsqueda se ejecuta automáticamente después de una pausa breve.',
    }
  }
  if (termino.length < 3) {
    return { aplicable: false, mensaje: 'Escribe al menos 3 caracteres del nombre.' }
  }
  return {
    aplicable: true,
    mensaje: 'La búsqueda se ejecuta automáticamente después de una pausa breve.',
  }
}

function nombreCompleto(empleado: Empleado): string {
  return [
    empleado.primerNombre,
    empleado.segundoNombre,
    empleado.tercerNombre,
    empleado.primerApellido,
    empleado.segundoApellido,
    empleado.apellidoCasada,
  ].filter(Boolean).join(' ')
}

function iniciales(empleado: Empleado): string {
  return `${empleado.primerNombre[0] ?? ''}${empleado.primerApellido[0] ?? ''}`.toUpperCase()
}

function etiquetaEstado(estado: EstadoEmpleado): string {
  return {
    ACTIVO: 'Activo',
    SUSPENDIDO: 'Suspendido',
    INACTIVO: 'Desactivado',
    RETIRADO: 'Retirado',
  }[estado]
}

function valorFiltroTexto(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  if (!Array.isArray(valor)) return undefined
  const valores = valor.filter((item): item is string => typeof item === 'string')
  return valores.length > 0 ? valores : undefined
}

export function EmpleadoListadoView({ permisos, onNavegar }: EmpleadoListadoViewProps) {
  const [resultado, setResultado] = useState<EmpleadosPaginados | null>(null)
  const [opcionesFiltros, setOpcionesFiltros] = useState<OpcionesFiltrosEmpleado>(opcionesIniciales)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busquedaGeneral, setBusquedaGeneral] = useState('')
  const { filtros, cambiarFiltros: actualizarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([
    { id: 'empleado', desc: false },
  ])
  const [error, setError] = useState<string | null>(null)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [revisionOpciones, setRevisionOpciones] = useState(0)
  const [empleadoAGestionar, setEmpleadoAGestionar] = useState<Empleado | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  const puedeCrear = permisos.includes('ORGANIZACION.EMPLEADOS.CREAR')
  const puedeEditar = permisos.includes('ORGANIZACION.EMPLEADOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ORGANIZACION.EMPLEADOS.INACTIVAR')

  const parametrosListado = useMemo<ListarEmpleadosParametros>(() => {
    const ordenActual = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      busqueda: busquedaGeneral || undefined,
      empleado: valorFiltroTexto(filtros, 'empleado'),
      contacto: valorFiltroTexto(filtros, 'contacto'),
      puestoIds: valoresFiltro(filtros, 'puesto'),
      sucursalIds: valoresFiltro(filtros, 'sucursal'),
      estados: valoresFiltro(filtros, 'estado') as EstadoEmpleado[] | undefined,
      orden: ordenActual ? ordenesEmpleado[ordenActual.id] ?? 'empleado' : 'empleado',
      direccion: ordenActual?.desc ? 'desc' : 'asc',
    }
  }, [busquedaGeneral, filtros, ordenamiento, pagina, tamanoPagina])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesFiltrosEmpleado(controlador.signal)
      .then((opciones) => {
        setOpcionesFiltros(opciones)
        setErrorOpciones(null)
      })
      .catch((errorActual: unknown) => {
        if (controlador.signal.aborted) return
        setErrorOpciones(
          errorActual instanceof ErrorApi
            ? errorActual.message
            : 'No fue posible cargar las opciones de puesto y sucursal.',
        )
      })
    return () => controlador.abort()
  }, [revisionOpciones])

  useEffect(() => {
    const termino = normalizarBusqueda(busquedaEntrada)
    const validacion = validarBusquedaGeneral(termino)
    const temporizador = window.setTimeout(() => {
      const busquedaAplicada = validacion.aplicable ? termino : ''
      ajustarPorBusqueda(busquedaAplicada)
      setBusquedaGeneral(busquedaAplicada)
      setPagina(1)
    }, demoraBusquedaMs)
    return () => window.clearTimeout(temporizador)
  }, [ajustarPorBusqueda, busquedaEntrada])

  useEffect(() => {
    const controlador = new AbortController()
    void listarEmpleados(
      parametrosListado,
      controlador.signal,
    )
      .then((respuesta) => {
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setResultado(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (controlador.signal.aborted) return
        setError(
          errorActual instanceof ErrorApi
            ? errorActual.message
            : 'No fue posible cargar el listado de empleados.',
        )
      })

    return () => controlador.abort()
  }, [pagina, parametrosListado, revision])

  const columnas = useMemo<ColumnaTabla<Empleado>[]>(() => [
    {
      id: 'empleado',
      titulo: 'Empleado',
      obtenerValor: nombreCompleto,
      ordenable: true,
      filtro: {
        tipo: 'texto',
        etiqueta: 'Buscar empleado',
        placeholder: 'Nombre, código o DPI',
      },
      celda: (empleado) => (
        <div className={styles.identidadEmpleado}>
          <span className={styles.avatarEmpleado}>
            <span>{iniciales(empleado)}</span>
            {empleado.fotoUrl && (
              <img
                src={`${construirUrlApi(empleado.fotoUrl)}?v=${empleado.version}`}
                alt=""
                crossOrigin="use-credentials"
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            )}
          </span>
          <span>
            <strong>{nombreCompleto(empleado)}</strong>
            <small>{empleado.codigo} · DPI {empleado.dpi}</small>
          </span>
        </div>
      ),
    },
    {
      id: 'puesto',
      titulo: 'Puesto',
      obtenerValor: (empleado) => empleado.puesto?.nombre ?? '',
      ordenable: true,
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Seleccionar puestos',
        buscable: true,
        opciones: opcionesFiltros.puestos.map((puesto) => ({
          valor: puesto.id,
          etiqueta: puesto.activo ? puesto.nombre : `${puesto.nombre} (inactivo)`,
          descripcion: `${puesto.codigo} · ${puesto.departamentoOrganizacionalNombre}`,
        })),
      },
      celda: (empleado) => (
        <>
          <strong>{empleado.puesto?.nombre ?? 'Sin puesto'}</strong>
          <small>{empleado.puesto?.departamentoOrganizacional.nombre ?? 'Sin departamento'}</small>
        </>
      ),
    },
    {
      id: 'sucursal',
      titulo: 'Sucursal',
      obtenerValor: (empleado) => empleado.asignacionActual?.sucursalNombre ?? '',
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Seleccionar sucursales',
        buscable: true,
        opciones: opcionesFiltros.sucursales.map((sucursal) => ({
          valor: sucursal.id,
          etiqueta: sucursal.activo ? sucursal.nombre : `${sucursal.nombre} (inactiva)`,
          descripcion: sucursal.codigo,
        })),
      },
      celda: (empleado) => empleado.asignacionActual ? (
        <>
          <strong>{empleado.asignacionActual.sucursalNombre}</strong>
          <small>{empleado.asignacionActual.sucursalCodigo}</small>
        </>
      ) : <span className={styles.sinDato}>Sin asignación activa</span>,
    },
    {
      id: 'contacto',
      titulo: 'Contacto',
      obtenerValor: (empleado) => `${empleado.correo ?? ''} ${empleado.telefono ?? ''}`,
      ordenable: true,
      filtro: {
        tipo: 'texto',
        etiqueta: 'Buscar contacto',
        placeholder: 'Correo o teléfono',
      },
      celda: (empleado) => (
        <>
          <span>{empleado.correo ?? 'Sin correo'}</span>
          <small>{empleado.telefono ?? 'Sin teléfono'}</small>
        </>
      ),
    },
    {
      id: 'estado',
      titulo: 'Estado',
      obtenerValor: (empleado) => empleado.estado,
      ordenable: true,
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Seleccionar estados',
        buscable: false,
        opciones: opcionesEstado,
      },
      celda: (empleado) => (
        <span className={`${styles.estado} ${styles[empleado.estado.toLowerCase()]}`}>
          {etiquetaEstado(empleado.estado)}
        </span>
      ),
    },
    {
      id: 'acciones',
      titulo: 'Acciones',
      tituloSoloLectores: true,
      obtenerValor: () => '',
      celda: (empleado) => (
        <div className={styles.accionesFila}>
          <button
            type="button"
            aria-label={`Ver a ${nombreCompleto(empleado)}`}
            title="Ver empleado"
            onClick={() => onNavegar(`/empleados/${empleado.id}`)}
          >
            <img src={iconoVer} alt="" />
          </button>
          {puedeEditar && !['INACTIVO', 'RETIRADO'].includes(empleado.estado) && (
            <button
              type="button"
              aria-label={`Editar a ${nombreCompleto(empleado)}`}
              title="Editar empleado"
              onClick={() => onNavegar(`/empleados/${empleado.id}/editar`)}
            >
              <img src={iconoEditar} alt="" />
            </button>
          )}
          {puedeInactivar && !['INACTIVO', 'RETIRADO'].includes(empleado.estado) && (
            <button
              className={styles.accionEstado}
              type="button"
              aria-label={`Cambiar estado de ${nombreCompleto(empleado)}`}
              title="Cambiar estado"
              onClick={() => setEmpleadoAGestionar(empleado)}
            >
              <IconoAccion nombre="estado" />
            </button>
          )}
        </div>
      ),
    },
  ], [onNavegar, opcionesFiltros, puedeEditar, puedeInactivar])

  const rango = useMemo(() => {
    if (!resultado || resultado.total === 0) return '0 empleados'
    const inicio = (resultado.pagina - 1) * resultado.tamanoPagina + 1
    const fin = Math.min(resultado.pagina * resultado.tamanoPagina, resultado.total)
    return `${inicio}–${fin} de ${resultado.total} empleados`
  }, [resultado])

  const cambiarFiltros = (siguientesFiltros: ColumnFiltersState) => {
    actualizarFiltros(siguientesFiltros)
    setPagina(1)
  }

  const cambiarOrdenamiento = (siguienteOrdenamiento: SortingState) => {
    setOrdenamiento(
      siguienteOrdenamiento.length > 0
        ? siguienteOrdenamiento
        : [{ id: 'empleado', desc: false }],
    )
    setPagina(1)
  }

  const limpiarFiltros = () => {
    restablecerFiltros()
    setPagina(1)
  }

  const limpiarBusqueda = () => {
    setBusquedaEntrada('')
    setBusquedaGeneral('')
    ajustarPorBusqueda('')
    setPagina(1)
  }

  const limpiarCriterios = () => {
    setBusquedaEntrada('')
    setBusquedaGeneral('')
    restablecerFiltros()
    setPagina(1)
  }

  const ejecutarBusquedaInmediata = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const termino = normalizarBusqueda(busquedaEntrada)
    const validacion = validarBusquedaGeneral(termino)
    const busquedaAplicada = validacion.aplicable ? termino : ''
    ajustarPorBusqueda(busquedaAplicada)
    setBusquedaGeneral(busquedaAplicada)
    setPagina(1)
  }

  const confirmarCambioEstado = (actualizado: Empleado) => {
    const nombre = empleadoAGestionar ? nombreCompleto(empleadoAGestionar) : 'El empleado'
    setEmpleadoAGestionar(null)
    setMensajeExito(`${nombre} ahora está ${etiquetaEstado(actualizado.estado).toLowerCase()}.`)
    if (resultado?.items.length === 1 && pagina > 1) setPagina((actual) => actual - 1)
    else setRevision((actual) => actual + 1)
  }

  const exportarListado = async (formato: FormatoExportacion) => {
    const {
      pagina: _pagina,
      tamanoPagina: _tamanoPagina,
      ...criterios
    } = parametrosListado
    setErrorExportacion(null)
    try {
      await exportarEmpleados({ ...criterios, formato })
    } catch (errorActual) {
      setErrorExportacion(
        errorActual instanceof ErrorApi
          ? errorActual.message
          : 'No fue posible generar el archivo. Inténtalo nuevamente.',
      )
    }
  }

  const validacionBusqueda = validarBusquedaGeneral(busquedaEntrada)
  const terminoEntrada = normalizarBusqueda(busquedaEntrada)
  const busquedaPendiente = validacionBusqueda.aplicable
    && terminoEntrada.length > 0
    && terminoEntrada !== busquedaGeneral
  const mensajeBusqueda = busquedaPendiente
    ? 'Esperando una pausa para buscar automáticamente…'
    : busquedaGeneral
      ? `Mostrando coincidencias para “${busquedaGeneral}”.`
      : validacionBusqueda.mensaje
  const hayCriterios = hayFiltrosAdicionales(filtros) || Boolean(busquedaGeneral)

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-empleados">
        <header className={styles.cabeceraPagina}>
          <EmpleadoBreadcrumb actual="Empleados" onNavegar={onNavegar} />
          <div className={styles.filaCabeceraEmpleados}>
            <h1 id="titulo-empleados">Empleados</h1>
            {puedeCrear && (
              <button className={styles.botonPrimario} type="button" onClick={() => onNavegar('/empleados/nuevo')}>
                <img src={iconoAgregar} alt="" />
                Nuevo empleado
              </button>
            )}
            <BotonExportar
              deshabilitado={!resultado || resultado.total === 0}
              onExportar={exportarListado}
            />
            <form className={styles.busquedaGeneral} role="search" onSubmit={ejecutarBusquedaInmediata}>
              <label className={styles.soloLectores} htmlFor="busqueda-general-empleados">
                Buscar por DPI o nombre
              </label>
              <div className={styles.controlBusquedaGeneral}>
                <img className={styles.iconoBusquedaGeneral} src={iconoBusqueda} alt="" />
                <input
                  id="busqueda-general-empleados"
                  type="search"
                  value={busquedaEntrada}
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Buscar por DPI o nombre"
                  aria-describedby="ayuda-busqueda-general-empleados"
                  onChange={(event) => setBusquedaEntrada(event.target.value)}
                />
                {busquedaEntrada && (
                  <button type="button" aria-label="Limpiar búsqueda" onClick={limpiarBusqueda}>×</button>
                )}
              </div>
              <small
                id="ayuda-busqueda-general-empleados"
                className={!validacionBusqueda.aplicable ? styles.ayudaBusquedaInvalida : undefined}
                aria-live="polite"
              >
                {mensajeBusqueda}
              </small>
              <button className={styles.soloLectores} type="submit">Buscar ahora</button>
            </form>
          </div>
        </header>

        {errorOpciones && (
          <div className={styles.alertaAdvertencia} role="status">
            <p>{errorOpciones} Los filtros de puesto y sucursal no están disponibles temporalmente.</p>
            <button type="button" onClick={() => setRevisionOpciones((actual) => actual + 1)}>Reintentar</button>
          </div>
        )}

        {error && (
          <div className={styles.alertaError} role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>
          </div>
        )}

        {errorExportacion && (
          <div className={styles.alertaError} role="alert">
            <p>{errorExportacion}</p>
            <button type="button" onClick={() => setErrorExportacion(null)}>Cerrar</button>
          </div>
        )}

        {!error && resultado && resultado.items.length === 0 ? (
          <div className={styles.estadoVacio}>
            <span aria-hidden="true">⌕</span>
            <h2>No se encontraron empleados</h2>
            <p>{hayCriterios ? 'Prueba con otros criterios de búsqueda.' : 'Registra el primer empleado para comenzar.'}</p>
            {hayCriterios ? (
              <button type="button" onClick={limpiarCriterios}>Quitar búsqueda y filtros</button>
            ) : puedeCrear && (
              <button type="button" onClick={() => onNavegar('/empleados/nuevo')}>Registrar empleado</button>
            )}
          </div>
        ) : !error && resultado ? (
          <div className={styles.panelTabla}>
            <div className={styles.resumenTabla}>
              <div className={styles.resumenContenido}>
                <strong>Personal registrado</strong>
                <small>Usa el botón de cada encabezado para filtrar u ordenar.</small>
              </div>
              <div className={styles.accionesResumen}>
                <span>{rango}</span>
                {filtros.length > 0 && (
                  <button type="button" onClick={limpiarFiltros}>
                    Limpiar filtros ({filtros.length})
                  </button>
                )}
              </div>
            </div>

            <TablaDatos
              descripcion="Listado de empleados con filtros por columna"
              datos={resultado.items}
              columnas={columnas}
              filtros={filtros}
              ordenamiento={ordenamiento}
              obtenerIdFila={(empleado) => empleado.id}
              onFiltrosChange={cambiarFiltros}
              onOrdenamientoChange={cambiarOrdenamiento}
            />

            <PaginacionTabla
              pagina={pagina}
              tamanoPagina={tamanoPagina}
              total={resultado.total}
              totalPaginas={resultado.totalPaginas}
              unidadSingular="empleado"
              unidadPlural="empleados"
              onPaginaChange={setPagina}
              onTamanoPaginaChange={(tamano) => {
                setTamanoPagina(tamano)
                setPagina(1)
              }}
            />
          </div>
        ) : null}
      </section>

      <EmpleadoEstadoModal
        empleado={empleadoAGestionar}
        abierto={Boolean(empleadoAGestionar)}
        onCerrar={() => setEmpleadoAGestionar(null)}
        onCambiado={confirmarCambioEstado}
      />
      <ModalEstado
        abierto={Boolean(mensajeExito)}
        tipo="exito"
        titulo="Estado actualizado"
        mensaje={mensajeExito ?? ''}
        textoAccionPrincipal="Entendido"
        onAccionPrincipal={() => setMensajeExito(null)}
        onCerrar={() => setMensajeExito(null)}
      />
    </>
  )
}
