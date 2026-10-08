import { useEffect, useMemo, useState, type FormEvent } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoEditar from '../../../assets/acciones/editar.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  PaginacionTabla,
  TablaDatos,
  type ColumnaTabla,
  type ColumnFiltersState,
  type SortingState,
} from '../../../shared/components/tabla-datos'
import { hayFiltrosAdicionales, useFiltrosListadoActivos } from '../../../shared/hooks/use-filtros-listado-activos'
import { exportarRoles, listarRoles, obtenerCatalogoPermisos } from '../rol-api'
import type {
  CatalogoPermisos,
  DireccionOrdenRol,
  EstadoRol,
  ListarRolesParametros,
  OrdenRol,
  Rol,
  RolesPaginados,
} from '../rol.types'
import { RolBreadcrumb } from './rol-breadcrumb'
import { RolInactivarModal } from './rol-inactivar-modal'
import styles from './rol-gestion.module.css'

type RolListadoViewProps = {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}

function valorFiltroTexto(filtros: ColumnFiltersState, id: string): string | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return typeof valor === 'string' && valor ? valor : undefined
}

function valoresFiltro(filtros: ColumnFiltersState, id: string): string[] | undefined {
  const valor = filtros.find((filtro) => filtro.id === id)?.value
  return Array.isArray(valor) && valor.length > 0 ? valor.filter((item): item is string => typeof item === 'string') : undefined
}

function validarBusqueda(valor: string): string | null {
  const limpio = valor.trim()
  if (limpio.length === 1) return 'Escribe al menos 2 caracteres para buscar.'
  if (limpio.length > 120) return 'La búsqueda no puede superar 120 caracteres.'
  return null
}

export function RolListadoView({ permisos, onNavegar }: RolListadoViewProps) {
  const puedeCrear = permisos.includes('SEGURIDAD.ROLES.CREAR')
    && permisos.includes('SEGURIDAD.PERMISOS.VER')
    && permisos.includes('SEGURIDAD.PERMISOS.ASIGNAR')
  const puedeEditar = permisos.includes('SEGURIDAD.ROLES.ACTUALIZAR')
  const puedeInactivar = permisos.includes('SEGURIDAD.ROLES.INACTIVAR')
  const puedeVerCatalogo = permisos.includes('SEGURIDAD.PERMISOS.VER')
  const [resultado, setResultado] = useState<RolesPaginados | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoPermisos | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros } = useFiltrosListadoActivos()
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'rol', desc: false }])
  const [error, setError] = useState<string | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState<string | null>(null)
  const [rolAInactivar, setRolAInactivar] = useState<Rol | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  useEffect(() => {
    if (!puedeVerCatalogo) return
    const controlador = new AbortController()
    void obtenerCatalogoPermisos(controlador.signal)
      .then(setCatalogo)
      .catch(() => {
        if (!controlador.signal.aborted) setCatalogo(null)
      })
    return () => controlador.abort()
  }, [puedeVerCatalogo])

  const parametros = useMemo<ListarRolesParametros>(() => {
    const orden = ordenamiento[0]
    return {
      pagina,
      tamanoPagina,
      busqueda: busqueda || undefined,
      rol: valorFiltroTexto(filtros, 'rol'),
      permisoIds: valoresFiltro(filtros, 'permisos'),
      estados: valoresFiltro(filtros, 'estado') as EstadoRol[] | undefined,
      orden: (orden?.id ?? 'rol') as OrdenRol,
      direccion: (orden?.desc ? 'desc' : 'asc') as DireccionOrdenRol,
    }
  }, [busqueda, filtros, ordenamiento, pagina, tamanoPagina])
  const claveSolicitud = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    const controlador = new AbortController()
    void listarRoles(parametros, controlador.signal)
      .then((respuesta) => {
        setResultado(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) {
          setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los roles.')
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud)
      })
    return () => controlador.abort()
  }, [claveSolicitud, parametros])

  const opcionesPermisos = useMemo(() => catalogo?.modulos.flatMap((modulo) => [
    ...modulo.permisosDirectos.map((permiso) => ({
      valor: permiso.id,
      etiqueta: permiso.nombre,
      descripcion: permiso.codigo,
    })),
    ...modulo.submodulos.flatMap((submodulo) => submodulo.permisos.map((permiso) => ({
      valor: permiso.id,
      etiqueta: permiso.nombre,
      descripcion: `${modulo.nombre} · ${submodulo.nombre}`,
    }))),
  ]) ?? [], [catalogo])

  const columnas = useMemo<ColumnaTabla<Rol>[]>(() => [
    {
      id: 'rol',
      titulo: 'Rol',
      obtenerValor: (rol) => `${rol.nombre} ${rol.codigo}`,
      ordenable: true,
      filtro: { tipo: 'texto', etiqueta: 'Filtrar rol', placeholder: 'Nombre o código' },
      celda: (rol) => <div className={styles.identidadRol}><strong>{rol.nombre}</strong><small>{rol.codigo}</small></div>,
    },
    {
      id: 'descripcion',
      titulo: 'Descripción',
      obtenerValor: (rol) => rol.descripcion ?? '',
      celda: (rol) => rol.descripcion ?? <span className={styles.sinDato}>Sin descripción</span>,
    },
    {
      id: 'permisos',
      titulo: 'Permisos',
      obtenerValor: (rol) => rol.permisos.map((permiso) => permiso.nombre).join(', '),
      filtro: opcionesPermisos.length > 0 ? {
        tipo: 'opciones',
        etiqueta: 'Seleccionar permisos',
        opciones: opcionesPermisos,
      } : undefined,
      celda: (rol) => (
        <div className={styles.resumenPermisos}>
          <strong>{rol.permisos.length}</strong>
          <small>{rol.permisos.length === 1 ? 'permiso asignado' : 'permisos asignados'}</small>
        </div>
      ),
    },
    {
      id: 'estado',
      titulo: 'Estado',
      obtenerValor: (rol) => rol.activo ? 'ACTIVO' : 'INACTIVO',
      ordenable: true,
      filtro: {
        tipo: 'opciones',
        etiqueta: 'Seleccionar estados',
        buscable: false,
        opciones: [
          { valor: 'ACTIVO', etiqueta: 'Activo' },
          { valor: 'INACTIVO', etiqueta: 'Inactivo' },
        ],
      },
      celda: (rol) => <span className={`${styles.estado} ${rol.activo ? styles.activo : styles.inactivo}`}>{rol.activo ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      id: 'acciones',
      titulo: 'Acciones',
      tituloSoloLectores: true,
      obtenerValor: (rol) => rol.id,
      celda: (rol) => (
        <div className={styles.accionesFila}>
          <button type="button" title="Ver rol" aria-label={`Ver rol ${rol.nombre}`} onClick={() => onNavegar(`/seguridad/roles/${rol.id}`)}><img src={iconoVer} alt="" /></button>
          {puedeEditar && <button type="button" title="Editar rol" aria-label={`Editar rol ${rol.nombre}`} onClick={() => onNavegar(`/seguridad/roles/${rol.id}/editar`)}><img src={iconoEditar} alt="" /></button>}
          {puedeInactivar && rol.activo && rol.codigo !== 'SUPERADMIN' && <button className={styles.accionPeligro} type="button" title="Desactivar rol" aria-label={`Desactivar rol ${rol.nombre}`} onClick={() => setRolAInactivar(rol)}><img src={iconoEliminar} alt="" /></button>}
        </div>
      ),
    },
  ], [onNavegar, opcionesPermisos, puedeEditar, puedeInactivar])

  const aplicarBusqueda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errorActual = validarBusqueda(busquedaEntrada)
    setErrorBusqueda(errorActual)
    if (errorActual) return
    const termino = busquedaEntrada.trim()
    ajustarPorBusqueda(termino)
    setBusqueda(termino)
    setPagina(1)
  }

  const limpiarTodo = () => {
    setBusquedaEntrada('')
    setBusqueda('')
    restablecerFiltros()
    setOrdenamiento([{ id: 'rol', desc: false }])
    setPagina(1)
    setErrorBusqueda(null)
  }

  const exportar = async (formato: FormatoExportacion) => {
    try {
      await exportarRoles({
        formato,
        busqueda: parametros.busqueda,
        rol: parametros.rol,
        permisoIds: parametros.permisoIds,
        estados: parametros.estados,
        orden: parametros.orden,
        direccion: parametros.direccion,
      })
    } catch (errorActual: unknown) {
      setErrorExportacion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible exportar los roles.')
    }
  }

  const hayFiltros = Boolean(busqueda) || hayFiltrosAdicionales(filtros)

  return (
    <section className={styles.pagina}>
      <div className={styles.cabeceraPagina}>
        <RolBreadcrumb onNavegar={onNavegar} />
        <div className={styles.filaCabecera}>
          <h1>Roles y permisos</h1>
          {puedeCrear && <button className={styles.botonPrimario} type="button" onClick={() => onNavegar('/seguridad/roles/nuevo')}><img src={iconoAgregar} alt="" /><span>Nuevo rol</span></button>}
          <BotonExportar deshabilitado={cargando} onExportar={exportar} />
          <form className={styles.busquedaGeneral} onSubmit={aplicarBusqueda}>
            <div className={styles.controlBusquedaGeneral}>
              <img className={styles.iconoBusquedaGeneral} src={iconoBusqueda} alt="" />
              <input type="search" value={busquedaEntrada} maxLength={120} placeholder="Buscar roles" aria-label="Buscar roles" onChange={(event) => { setBusquedaEntrada(event.target.value); setErrorBusqueda(null) }} />
              {(busquedaEntrada || busqueda) && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusquedaEntrada(''); setBusqueda(''); ajustarPorBusqueda(''); setPagina(1); setErrorBusqueda(null) }}>×</button>}
            </div>
            <small className={errorBusqueda ? styles.ayudaBusquedaInvalida : undefined}>{errorBusqueda ?? 'Busca por nombre, código o descripción.'}</small>
          </form>
        </div>
      </div>

      {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}

      <article className={styles.panelTabla} aria-busy={cargando}>
        <div className={styles.resumenTabla}>
          <div><strong>Roles registrados</strong><small>{cargando ? 'Actualizando información…' : 'Gestiona responsabilidades y permisos del sistema.'}</small></div>
          <div className={styles.accionesResumen}>
            {resultado && <span>{resultado.total} {resultado.total === 1 ? 'rol' : 'roles'}</span>}
            {hayFiltros && <button type="button" onClick={limpiarTodo}>Limpiar filtros</button>}
          </div>
        </div>

        {resultado?.items.length ? (
          <>
            <TablaDatos descripcion="Listado de roles con filtros por columna" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(rol) => rol.id} onFiltrosChange={(siguientes) => { cambiarFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'rol', desc: false }]); setPagina(1) }} />
            <PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="rol" unidadPlural="roles" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} />
          </>
        ) : !cargando && !error ? (
          <div className={styles.estadoVacio}><span aria-hidden="true">⌁</span><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay roles activos registrados'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros aplicados.' : 'Crea el primer rol para comenzar a asignar permisos.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={() => onNavegar('/seguridad/roles/nuevo')}>Crear rol</button>}</div>
        ) : null}
      </article>

      <RolInactivarModal rol={rolAInactivar} onCerrar={() => setRolAInactivar(null)} onInactivado={(rol) => { setRolAInactivar(null); setMensajeExito(`El rol ${rol.nombre} fue desactivado correctamente.`); setRevision((valor) => valor + 1) }} />
      <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Rol desactivado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
    </section>
  )
}
