import { useCallback, useEffect, useRef, useState } from 'react'
import loadingFarmaciaPache from './assets/marca/loading.svg'
import { cerrarSesion, obtenerSesionActual } from './modules/autenticacion/autenticacion-api'
import type { SesionUsuario } from './modules/autenticacion/autenticacion.types'
import { InicioSesionView } from './modules/autenticacion/components/inicio-sesion-view'
import { RestablecerContrasenaView } from './modules/autenticacion/components/restablecer-contrasena-view'
import { SolicitarRecuperacionView } from './modules/autenticacion/components/solicitar-recuperacion-view'
import type { MotivoEnlaceRecuperacionNoValido } from './modules/autenticacion/recuperacion.types'
import { DashboardView } from './modules/dashboard/components/dashboard-view'
import { DepartamentoOrganizacionalCrearView } from './modules/departamentos-organizacionales/components/departamento-organizacional-crear-view'
import { DepartamentoOrganizacionalDetalleView } from './modules/departamentos-organizacionales/components/departamento-organizacional-detalle-view'
import { DepartamentoOrganizacionalEditarView } from './modules/departamentos-organizacionales/components/departamento-organizacional-editar-view'
import { DepartamentoOrganizacionalListadoView } from './modules/departamentos-organizacionales/components/departamento-organizacional-listado-view'
import { GaleriaModalesView } from './modules/desarrollo/components/galeria-modales-view'
import { EstadoCatalogoCrearView } from './modules/estados-catalogo/components/estado-catalogo-crear-view'
import { EstadoCatalogoDetalleView } from './modules/estados-catalogo/components/estado-catalogo-detalle-view'
import { EstadoCatalogoEditarView } from './modules/estados-catalogo/components/estado-catalogo-editar-view'
import { EstadoCatalogoListadoView } from './modules/estados-catalogo/components/estado-catalogo-listado-view'
import { EmpleadoCrearView } from './modules/empleados/components/empleado-crear-view'
import { EmpleadoDetalleView } from './modules/empleados/components/empleado-detalle-view'
import { EmpleadoEditarView } from './modules/empleados/components/empleado-editar-view'
import { EmpleadoListadoView } from './modules/empleados/components/empleado-listado-view'
import { PuestoCrearView } from './modules/puestos/components/puesto-crear-view'
import { PuestoDetalleView } from './modules/puestos/components/puesto-detalle-view'
import { PuestoEditarView } from './modules/puestos/components/puesto-editar-view'
import { PuestoListadoView } from './modules/puestos/components/puesto-listado-view'
import { ProductoCrearView } from './modules/productos/components/producto-crear-view'
import { ProductoDetalleView } from './modules/productos/components/producto-detalle-view'
import { ProductoEditarView } from './modules/productos/components/producto-editar-view'
import { ProductoListadoView } from './modules/productos/components/producto-listado-view'
import { LaboratorioCrearView } from './modules/laboratorios/components/laboratorio-crear-view'
import { LaboratorioDetalleView } from './modules/laboratorios/components/laboratorio-detalle-view'
import { LaboratorioEditarView } from './modules/laboratorios/components/laboratorio-editar-view'
import { LaboratorioListadoView } from './modules/laboratorios/components/laboratorio-listado-view'
import { PresentacionCrearView } from './modules/presentaciones/components/presentacion-crear-view'
import { PresentacionDetalleView } from './modules/presentaciones/components/presentacion-detalle-view'
import { PresentacionEditarView } from './modules/presentaciones/components/presentacion-editar-view'
import { PresentacionListadoView } from './modules/presentaciones/components/presentacion-listado-view'
import { PrincipioActivoCrearView } from './modules/principios-activos/components/principio-activo-crear-view'
import { PrincipioActivoDetalleView } from './modules/principios-activos/components/principio-activo-detalle-view'
import { PrincipioActivoEditarView } from './modules/principios-activos/components/principio-activo-editar-view'
import { PrincipioActivoListadoView } from './modules/principios-activos/components/principio-activo-listado-view'
import { UnidadMedidaCrearView } from './modules/unidades-medida/components/unidad-medida-crear-view'
import { UnidadMedidaDetalleView } from './modules/unidades-medida/components/unidad-medida-detalle-view'
import { UnidadMedidaEditarView } from './modules/unidades-medida/components/unidad-medida-editar-view'
import { UnidadMedidaListadoView } from './modules/unidades-medida/components/unidad-medida-listado-view'
import { CategoriaTerapeuticaCrearView } from './modules/categorias-terapeuticas/components/categoria-terapeutica-crear-view'
import { CategoriaTerapeuticaDetalleView } from './modules/categorias-terapeuticas/components/categoria-terapeutica-detalle-view'
import { CategoriaTerapeuticaEditarView } from './modules/categorias-terapeuticas/components/categoria-terapeutica-editar-view'
import { CategoriaTerapeuticaListadoView } from './modules/categorias-terapeuticas/components/categoria-terapeutica-listado-view'
import { FormaFarmaceuticaCrearView } from './modules/formas-farmaceuticas/components/forma-farmaceutica-crear-view'
import { FormaFarmaceuticaDetalleView } from './modules/formas-farmaceuticas/components/forma-farmaceutica-detalle-view'
import { FormaFarmaceuticaEditarView } from './modules/formas-farmaceuticas/components/forma-farmaceutica-editar-view'
import { FormaFarmaceuticaListadoView } from './modules/formas-farmaceuticas/components/forma-farmaceutica-listado-view'
import { ViaAdministracionCrearView } from './modules/vias-administracion/components/via-administracion-crear-view'
import { ViaAdministracionDetalleView } from './modules/vias-administracion/components/via-administracion-detalle-view'
import { ViaAdministracionEditarView } from './modules/vias-administracion/components/via-administracion-editar-view'
import { ViaAdministracionListadoView } from './modules/vias-administracion/components/via-administracion-listado-view'
import { RolCrearView } from './modules/roles/components/rol-crear-view'
import { RolDetalleView } from './modules/roles/components/rol-detalle-view'
import { RolEditarView } from './modules/roles/components/rol-editar-view'
import { RolListadoView } from './modules/roles/components/rol-listado-view'
import { SucursalCrearView } from './modules/sucursales/components/sucursal-crear-view'
import { SucursalDetalleView } from './modules/sucursales/components/sucursal-detalle-view'
import { SucursalEditarView } from './modules/sucursales/components/sucursal-editar-view'
import { SucursalListadoView } from './modules/sucursales/components/sucursal-listado-view'
import { UsuarioCrearView } from './modules/usuarios/components/usuario-crear-view'
import { UsuarioDetalleView } from './modules/usuarios/components/usuario-detalle-view'
import { UsuarioEditarView } from './modules/usuarios/components/usuario-editar-view'
import { UsuarioListadoView } from './modules/usuarios/components/usuario-listado-view'
import { InventarioExistenciasView } from './modules/inventario/components/inventario-existencias-view'
import { InventarioExistenciaDetalleView } from './modules/inventario/components/inventario-existencia-detalle-view'
import { InventarioUbicacionCrearView } from './modules/inventario/components/inventario-ubicacion-crear-view'
import { InventarioUbicacionEditarView } from './modules/inventario/components/inventario-ubicacion-editar-view'
import { InventarioUbicacionesView } from './modules/inventario/components/inventario-ubicaciones-view'
import { InventarioKardexView } from './modules/inventario/components/inventario-kardex-view'
import { InventarioAperturaView } from './modules/inventario/components/inventario-apertura-view'
import { InventarioAjusteView } from './modules/inventario/components/inventario-ajuste-view'
import { InventarioOperacionesListadoView } from './modules/inventario/components/inventario-operaciones-listado-view'
import { InventarioOperacionDetalleView } from './modules/inventario/components/inventario-operacion-detalle-view'
import { InventarioPoliticaCrearView } from './modules/inventario/components/inventario-politica-crear-view'
import { InventarioPoliticasView } from './modules/inventario/components/inventario-politicas-view'
import { InventarioPoliticaMasivaCrearView } from './modules/inventario/components/inventario-politica-masiva-crear-view'
import { InventarioPoliticasMasivasView } from './modules/inventario/components/inventario-politicas-masivas-view'
import { InventarioVencimientosView } from './modules/inventario/components/inventario-vencimientos-view'
import { InventarioConteoCrearView } from './modules/inventario/components/inventario-conteo-crear-view'
import { InventarioConteosView } from './modules/inventario/components/inventario-conteos-view'
import { InventarioConteoDetalleView } from './modules/inventario/components/inventario-conteo-detalle-view'
import { AbastecimientoListadoView } from './modules/abastecimiento/components/abastecimiento-listado-view'
import { ProveedorCrearView } from './modules/abastecimiento/components/proveedor-crear-view'
import { ProveedorDetalleView } from './modules/abastecimiento/components/proveedor-detalle-view'
import { ProveedorEditarView } from './modules/abastecimiento/components/proveedor-editar-view'
import { ProveedorEvaluarView } from './modules/abastecimiento/components/proveedor-evaluar-view'
import { SolicitudAccionView } from './modules/abastecimiento/components/solicitud-accion-view'
import { SolicitudCrearView } from './modules/abastecimiento/components/solicitud-crear-view'
import { SolicitudDetalleView } from './modules/abastecimiento/components/solicitud-detalle-view'
import { CotizacionCrearView } from './modules/abastecimiento/components/cotizacion-crear-view'
import { CotizacionDetalleView } from './modules/abastecimiento/components/cotizacion-detalle-view'
import { CotizacionEvaluarView } from './modules/abastecimiento/components/cotizacion-evaluar-view'
import { OrdenAccionView } from './modules/abastecimiento/components/orden-accion-view'
import { OrdenCrearView } from './modules/abastecimiento/components/orden-crear-view'
import { OrdenDetalleView } from './modules/abastecimiento/components/orden-detalle-view'
import { RecepcionAccionView } from './modules/abastecimiento/components/recepcion-accion-view'
import { RecepcionCrearView } from './modules/abastecimiento/components/recepcion-crear-view'
import { RecepcionDetalleView } from './modules/abastecimiento/components/recepcion-detalle-view'
import { TrasladoAccionView } from './modules/abastecimiento/components/traslado-accion-view'
import { TrasladoCrearView } from './modules/abastecimiento/components/traslado-crear-view'
import { TrasladoDetalleView } from './modules/abastecimiento/components/traslado-detalle-view'
import { DevolucionAccionView } from './modules/abastecimiento/components/devolucion-accion-view'
import { DevolucionCrearView } from './modules/abastecimiento/components/devolucion-crear-view'
import { DevolucionDetalleView } from './modules/abastecimiento/components/devolucion-detalle-view'
import { ClienteDetalleView } from './modules/comercial/components/cliente-detalle-view'
import { ClienteFormularioView } from './modules/comercial/components/cliente-formulario-view'
import { ClienteListadoView } from './modules/comercial/components/cliente-listado-view'
import { PoliticaMargenDetalleView } from './modules/comercial/components/politica-margen-detalle-view'
import { PoliticaMargenFormularioView } from './modules/comercial/components/politica-margen-formulario-view'
import { PoliticaMargenListadoView } from './modules/comercial/components/politica-margen-listado-view'
import { PrecioDetalleView } from './modules/comercial/components/precio-detalle-view'
import { PrecioFormularioView } from './modules/comercial/components/precio-formulario-view'
import { PrecioListadoView } from './modules/comercial/components/precio-listado-view'
import { RecetaDetalleView } from './modules/comercial/components/receta-detalle-view'
import { RecetaListadoView } from './modules/comercial/components/receta-listado-view'
import { VentaDetalleView } from './modules/comercial/components/venta-detalle-view'
import { VentaFormularioView } from './modules/comercial/components/venta-formulario-view'
import { VentaListadoView } from './modules/comercial/components/venta-listado-view'
import { MovimientoListadoView, TurnoListadoView } from './modules/caja/components/caja-listado-view'
import { MovimientoDetalleView, TurnoDetalleView } from './modules/caja/components/caja-detalle-view'
import { MovimientoCrearView } from './modules/caja/components/movimiento-crear-view'
import { TurnoAperturaView } from './modules/caja/components/turno-apertura-view'
import { ArqueoListadoView, CierreListadoView } from './modules/caja/components/control-caja-listado-view'
import { ArqueoCrearView } from './modules/caja/components/arqueo-crear-view'
import { CierreCrearView } from './modules/caja/components/cierre-crear-view'
import { ArqueoDetalleView, CierreDetalleView } from './modules/caja/components/control-caja-detalle-view'
import { DepositoListadoView, TransferenciaListadoView } from './modules/caja/components/custodia-listado-view'
import { TransferenciaCrearView } from './modules/caja/components/transferencia-crear-view'
import { DepositoCrearView } from './modules/caja/components/deposito-crear-view'
import { DepositoDetalleView, TransferenciaDetalleView } from './modules/caja/components/custodia-detalle-view'
import { IncidenciaListadoView } from './modules/caja/components/incidencia-listado-view'
import { IncidenciaCrearView } from './modules/caja/components/incidencia-crear-view'
import { IncidenciaDetalleView } from './modules/caja/components/incidencia-detalle-view'
import { ConfiguracionCajaView } from './modules/caja/components/configuracion-caja-view'
import { DenominacionesCajaView } from './modules/caja/components/denominaciones-caja-view'
import { ConciliacionListadoView, ConsolidacionListadoView, RendicionListadoView } from './modules/caja/components/gestion-caja-listado-view'
import { ConciliacionDetalleView, ConsolidacionDetalleView, RendicionDetalleView } from './modules/caja/components/gestion-caja-detalle-view'
import { RendicionCrearView } from './modules/caja/components/rendicion-crear-view'
import { ConciliacionCrearView } from './modules/caja/components/conciliacion-crear-view'
import { ConsolidacionCrearView } from './modules/caja/components/consolidacion-crear-view'
import type { EntidadIncidenciaCaja } from './modules/caja/caja.types'
import { ModalEstado } from './shared/components/modal-estado'
import styles from './App.module.css'

const entidadesIncidenciaCaja: readonly EntidadIncidenciaCaja[] = ['TURNO_CAJA', 'MOVIMIENTO_CAJA', 'ARQUEO_CAJA', 'TRANSFERENCIA_EFECTIVO', 'DEPOSITO_EFECTIVO', 'RENDICION_REPARTIDOR', 'CONCILIACION_CAJA', 'CONSOLIDACION_DIARIA_CAJA']
const esEntidadIncidenciaCaja = (valor: string | null): valor is EntidadIncidenciaCaja => valor !== null && entidadesIncidenciaCaja.includes(valor as EntidadIncidenciaCaja)

type EstadoAplicacion =
  | { tipo: 'comprobando' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'con-sesion'; sesion: SesionUsuario }

type NotificacionInicio = {
  titulo: string
  mensaje: string
}

type DestinoPendiente =
  | { tipo: 'ruta'; ruta: string }
  | { tipo: 'cerrar-sesion' }

function obtenerNotificacionEnlace(
  motivo: MotivoEnlaceRecuperacionNoValido,
  modo: 'activacion' | 'recuperacion',
): NotificacionInicio {
  const esActivacion = modo === 'activacion'
  if (motivo === 'utilizado') {
    return {
      titulo: 'Este enlace ya fue utilizado',
      mensaje: esActivacion
        ? 'La cuenta ya fue activada con este enlace. Inicia sesión con tu contraseña.'
        : 'La contraseña ya fue cambiada con este enlace. Inicia sesión con tu nueva contraseña.',
    }
  }

  if (motivo === 'expirado') {
    return {
      titulo: 'Este enlace ya caducó',
      mensaje: esActivacion
        ? 'Solicita al administrador que reenvíe un nuevo enlace de activación.'
        : 'Solicita un nuevo enlace de recuperación para cambiar tu contraseña.',
    }
  }

  if (motivo === 'reemplazado') {
    return {
      titulo: 'Existe un enlace más reciente',
      mensaje: 'Este enlace dejó de ser válido porque se generó uno nuevo. Revisa el correo más reciente.',
    }
  }

  return {
    titulo: 'El enlace no es válido',
    mensaje: esActivacion
      ? 'Solicita al administrador que reenvíe un nuevo enlace de activación.'
      : 'Solicita un nuevo enlace de recuperación e inténtalo nuevamente.',
  }
}

function App() {
  const [ubicacion, setUbicacion] = useState(
    () => `${window.location.pathname}${window.location.search}`,
  )
  const [estado, setEstado] = useState<EstadoAplicacion>({ tipo: 'comprobando' })
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [errorCierre, setErrorCierre] = useState<string | null>(null)
  const [notificacionInicio, setNotificacionInicio] = useState<NotificacionInicio | null>(null)
  const [destinoPendiente, setDestinoPendiente] = useState<DestinoPendiente | null>(null)
  const ubicacionRef = useRef(ubicacion)
  const cambiosPendientesRef = useRef(false)

  const urlActual = new URL(ubicacion, window.location.origin)
  const entidadTipoConsulta = urlActual.searchParams.get('entidadTipo')
  const entidadTipoIncidencia = esEntidadIncidenciaCaja(entidadTipoConsulta) ? entidadTipoConsulta : undefined
  const esVistaRecuperacion = [
    '/recuperar-contrasena',
    '/restablecer-contrasena',
    '/activar-cuenta',
  ].includes(urlActual.pathname)
  const esGaleriaModales = import.meta.env.DEV
    && urlActual.pathname === '/componentes/modales'

  const navegarSinBloqueo = useCallback((ruta: string) => {
    window.history.pushState(null, '', ruta)
    ubicacionRef.current = ruta
    setUbicacion(ruta)
  }, [])

  const navegar = useCallback((ruta: string) => {
    if (ruta === ubicacionRef.current) return
    if (cambiosPendientesRef.current) {
      setDestinoPendiente({ tipo: 'ruta', ruta })
      return
    }
    navegarSinBloqueo(ruta)
  }, [navegarSinBloqueo])

  const actualizarCambiosPendientes = useCallback((pendientes: boolean) => {
    cambiosPendientesRef.current = pendientes
  }, [])

  const manejarEnlaceNoValido = useCallback((
    motivo: MotivoEnlaceRecuperacionNoValido,
    modo: 'activacion' | 'recuperacion',
  ) => {
    window.history.replaceState(null, '', '/')
    ubicacionRef.current = '/'
    setUbicacion('/')
    setNotificacionInicio(obtenerNotificacionEnlace(motivo, modo))
  }, [])

  useEffect(() => {
    const manejarNavegacion = () => {
      const destino = `${window.location.pathname}${window.location.search}`
      if (cambiosPendientesRef.current) {
        window.history.pushState(null, '', ubicacionRef.current)
        setDestinoPendiente({ tipo: 'ruta', ruta: destino })
        return
      }
      ubicacionRef.current = destino
      setUbicacion(destino)
    }

    window.addEventListener('popstate', manejarNavegacion)
    return () => window.removeEventListener('popstate', manejarNavegacion)
  }, [])

  useEffect(() => {
    const advertirAntesDeCerrar = (event: BeforeUnloadEvent) => {
      if (!cambiosPendientesRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', advertirAntesDeCerrar)
    return () => window.removeEventListener('beforeunload', advertirAntesDeCerrar)
  }, [])

  useEffect(() => {
    if (esVistaRecuperacion || esGaleriaModales) {
      return
    }

    const controlador = new AbortController()

    void obtenerSesionActual(controlador.signal)
      .then((sesion) => setEstado({ tipo: 'con-sesion', sesion }))
      .catch(() => {
        if (!controlador.signal.aborted) {
          setEstado({ tipo: 'sin-sesion' })
        }
      })

    return () => controlador.abort()
  }, [esGaleriaModales, esVistaRecuperacion])

  const manejarCierreSesion = async () => {
    setCerrandoSesion(true)
    setErrorCierre(null)

    try {
      await cerrarSesion()
      cambiosPendientesRef.current = false
      setEstado({ tipo: 'sin-sesion' })
    } catch {
      setErrorCierre('No fue posible cerrar la sesión. Inténtalo nuevamente.')
    } finally {
      setCerrandoSesion(false)
    }
  }

  const solicitarCierreSesion = () => {
    if (cambiosPendientesRef.current) {
      setDestinoPendiente({ tipo: 'cerrar-sesion' })
      return
    }
    void manejarCierreSesion()
  }

  const continuarSinGuardar = () => {
    const destino = destinoPendiente
    cambiosPendientesRef.current = false
    setDestinoPendiente(null)
    if (destino?.tipo === 'ruta') navegarSinBloqueo(destino.ruta)
    else if (destino?.tipo === 'cerrar-sesion') void manejarCierreSesion()
  }

  if (esGaleriaModales) {
    return <GaleriaModalesView onVolver={() => navegar('/')} />
  }

  if (urlActual.pathname === '/recuperar-contrasena') {
    return <SolicitarRecuperacionView onVolver={() => navegar('/')} />
  }

  if (urlActual.pathname === '/restablecer-contrasena') {
    return (
      <RestablecerContrasenaView
        key={urlActual.searchParams.get('token') ?? 'sin-token'}
        token={urlActual.searchParams.get('token')}
        modo="recuperacion"
        onVolver={() => navegar('/')}
        onEnlaceNoValido={manejarEnlaceNoValido}
      />
    )
  }

  if (urlActual.pathname === '/activar-cuenta') {
    return (
      <RestablecerContrasenaView
        key={urlActual.searchParams.get('token') ?? 'sin-token'}
        token={urlActual.searchParams.get('token')}
        modo="activacion"
        onVolver={() => navegar('/')}
        onEnlaceNoValido={manejarEnlaceNoValido}
      />
    )
  }

  if (estado.tipo === 'comprobando') {
    return (
      <main className={styles.comprobandoSesion} aria-busy="true">
        <img
          className={styles.comprobandoSimbolo}
          src={loadingFarmaciaPache}
          alt=""
          aria-hidden="true"
        />
        <p>Comprobando sesión…</p>
      </main>
    )
  }

  if (estado.tipo === 'sin-sesion') {
    return (
      <>
        <InicioSesionView
          onSesionIniciada={(sesion) => setEstado({ tipo: 'con-sesion', sesion })}
          onRecuperarContrasena={() => {
            setNotificacionInicio(null)
            navegar('/recuperar-contrasena')
          }}
        />
        <ModalEstado
          abierto={Boolean(notificacionInicio)}
          tipo="informacion"
          titulo={notificacionInicio?.titulo ?? ''}
          mensaje={notificacionInicio?.mensaje ?? ''}
          textoAccionPrincipal="Entendido"
          onAccionPrincipal={() => setNotificacionInicio(null)}
          onCerrar={() => setNotificacionInicio(null)}
        />
      </>
    )
  }

  const permisos = estado.sesion.permisos
  const puedeVerEmpleados = permisos.includes('ORGANIZACION.EMPLEADOS.VER')
  const puedeCrearEmpleados = permisos.includes('ORGANIZACION.EMPLEADOS.CREAR')
  const puedeActualizarEmpleados = permisos.includes('ORGANIZACION.EMPLEADOS.ACTUALIZAR')
  const puedeVerRoles = permisos.includes('SEGURIDAD.ROLES.VER')
  const puedeCrearRoles = permisos.includes('SEGURIDAD.ROLES.CREAR')
    && permisos.includes('SEGURIDAD.PERMISOS.VER')
    && permisos.includes('SEGURIDAD.PERMISOS.ASIGNAR')
  const puedeActualizarRoles = permisos.includes('SEGURIDAD.ROLES.ACTUALIZAR')
  const puedeGestionarPermisosRol = permisos.includes('SEGURIDAD.PERMISOS.VER')
    && permisos.includes('SEGURIDAD.PERMISOS.ASIGNAR')
  const puedeVerUsuarios = permisos.includes('SEGURIDAD.USUARIOS.VER')
  const puedeCrearUsuarios = permisos.includes('SEGURIDAD.USUARIOS.CREAR')
  const puedeActualizarUsuarios = permisos.includes('SEGURIDAD.USUARIOS.ACTUALIZAR')
  const puedeVerEstados = permisos.includes('CATALOGOS.ESTADOS.VER')
  const puedeCrearEstados = permisos.includes('CATALOGOS.ESTADOS.CREAR')
  const puedeActualizarEstados = permisos.includes('CATALOGOS.ESTADOS.ACTUALIZAR')
  const puedeVerProductos = permisos.includes('CATALOGOS.PRODUCTOS.VER')
  const puedeCrearProductos = permisos.includes('CATALOGOS.PRODUCTOS.CREAR')
  const puedeActualizarProductos = permisos.includes('CATALOGOS.PRODUCTOS.ACTUALIZAR')
  const puedeVerDepartamentos = permisos.includes('ORGANIZACION.DEPARTAMENTOS.VER')
  const puedeCrearDepartamentos = permisos.includes('ORGANIZACION.DEPARTAMENTOS.CREAR')
  const puedeActualizarDepartamentos = permisos.includes('ORGANIZACION.DEPARTAMENTOS.ACTUALIZAR')
  const puedeVerPuestos = permisos.includes('ORGANIZACION.PUESTOS.VER')
  const puedeCrearPuestos = permisos.includes('ORGANIZACION.PUESTOS.CREAR')
  const puedeActualizarPuestos = permisos.includes('ORGANIZACION.PUESTOS.ACTUALIZAR')
  const puedeVerSucursales = permisos.includes('ORGANIZACION.SUCURSALES.VER')
  const puedeCrearSucursales = permisos.includes('ORGANIZACION.SUCURSALES.CREAR')
  const puedeActualizarSucursales = permisos.includes('ORGANIZACION.SUCURSALES.ACTUALIZAR')
  const puedeVerInventario = permisos.includes('INVENTARIO.EXISTENCIAS.VER')
  const puedeVerKardex = permisos.includes('INVENTARIO.KARDEX.VER')
  const puedeVerAperturas = permisos.includes('INVENTARIO.APERTURA.VER')
  const puedeRegistrarApertura = permisos.includes('INVENTARIO.APERTURA.REGISTRAR')
  const puedeVerAjustes = permisos.includes('INVENTARIO.AJUSTES.VER')
  const puedeRegistrarAjustes = permisos.includes('INVENTARIO.AJUSTES.REGISTRAR')
  const puedeVerUbicaciones = permisos.includes('INVENTARIO.UBICACIONES.VER')
  const puedeCrearUbicaciones = permisos.includes('INVENTARIO.UBICACIONES.CREAR')
  const puedeActualizarUbicaciones = permisos.includes('INVENTARIO.UBICACIONES.ACTUALIZAR')
  const puedeGestionarPoliticas = permisos.includes('INVENTARIO.POLITICAS.CONFIGURAR')
  const puedeVerPoliticas = permisos.includes('INVENTARIO.POLITICAS.VER') || puedeGestionarPoliticas
  const puedeCrearPoliticasMasivas = permisos.includes('INVENTARIO.POLITICAS.CREAR_MASIVA')
  const puedeVerPoliticasMasivas = puedeVerPoliticas || puedeCrearPoliticasMasivas || permisos.some((permiso) => ['INVENTARIO.POLITICAS.APROBAR_MASIVA', 'INVENTARIO.POLITICAS.VER_CORPORATIVO', 'INVENTARIO.POLITICAS.APROBAR_MASIVA_CORPORATIVA'].includes(permiso))
  const puedeVerConteos = permisos.includes('INVENTARIO.CONTEOS.VER')
  const puedeCrearConteos = permisos.includes('INVENTARIO.CONTEOS.CREAR')
  const puedeVerVencimientos = permisos.includes('INVENTARIO.VENCIMIENTOS.VER')
  const puedeVerProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.VER')
  const puedeCrearProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.CREAR')
  const puedeActualizarProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.ACTUALIZAR')
  const puedeEvaluarProveedores = permisos.includes('ABASTECIMIENTO.PROVEEDORES.EVALUAR')
  const puedeVerSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.VER')
  const puedeCrearSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.CREAR')
  const puedeResolverSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.APROBAR')
  const puedeCancelarSolicitudes = permisos.includes('ABASTECIMIENTO.SOLICITUDES.CANCELAR')
  const puedeVerCotizaciones = permisos.includes('ABASTECIMIENTO.COTIZACIONES.VER')
  const puedeCrearCotizaciones = permisos.includes('ABASTECIMIENTO.COTIZACIONES.CREAR')
  const puedeAdjudicarCotizaciones = permisos.includes('ABASTECIMIENTO.COTIZACIONES.ADJUDICAR')
  const puedeVerOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.VER')
  const puedeEmitirOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.EMITIR')
  const puedeConfirmarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CONFIRMAR')
  const puedeCerrarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CERRAR')
  const puedeCancelarOrdenes = permisos.includes('ABASTECIMIENTO.ORDENES.CANCELAR')
  const puedeVerRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.VER')
  const puedeRegistrarRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.REGISTRAR')
  const puedeValidarRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.VALIDAR')
  const puedeRegularizarRecepciones = permisos.includes('ABASTECIMIENTO.RECEPCIONES.REGULARIZAR')
  const puedeVerTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.VER')
  const puedeCrearTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.CREAR')
  const puedeAprobarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.APROBAR')
  const puedePrepararTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.PREPARAR')
  const puedeDespacharTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.DESPACHAR')
  const puedeRecibirTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.RECIBIR')
  const puedeCerrarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.CERRAR')
  const puedeCancelarTraslados = permisos.includes('ABASTECIMIENTO.TRASLADOS.CANCELAR')
  const puedeVerDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.VER')
  const puedeCrearDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.CREAR')
  const puedeAutorizarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.AUTORIZAR')
  const puedeSegregarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.SEGREGAR')
  const puedeDespacharDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.DESPACHAR')
  const puedeRecibirDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.RECIBIR_PROVEEDOR')
  const puedeCompensarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.COMPENSAR')
  const puedeCerrarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.CERRAR')
  const puedeCancelarDevoluciones = permisos.includes('ABASTECIMIENTO.DEVOLUCIONES.CANCELAR')
  const puedeVerClientes = permisos.includes('COMERCIAL.CLIENTES.VER')
  const puedeCrearClientes = permisos.includes('COMERCIAL.CLIENTES.CREAR')
  const puedeActualizarClientes = permisos.includes('COMERCIAL.CLIENTES.ACTUALIZAR')
  const puedeVerPoliticasMargen = permisos.includes('COMERCIAL.MARGENES.VER')
  const puedeCrearMargenes = permisos.includes('COMERCIAL.MARGENES.CREAR')
  const puedeActualizarMargenes = permisos.includes('COMERCIAL.MARGENES.ACTUALIZAR')
  const puedeVerPrecios = permisos.includes('COMERCIAL.PRECIOS.VER')
  const puedeProponerPrecios = permisos.includes('COMERCIAL.PRECIOS.PROPONER')
  const puedeVerVentas = permisos.includes('COMERCIAL.VENTAS.VER')
  const puedeCrearVentas = permisos.includes('COMERCIAL.VENTAS.CREAR')
  const puedeActualizarVentas = permisos.includes('COMERCIAL.VENTAS.ACTUALIZAR')
  const puedeVerRecetas = permisos.includes('COMERCIAL.RECETAS.VER')
  const puedeVerTurnosCaja = permisos.includes('CAJA.TURNOS.VER')
  const puedeVerMovimientosCaja = permisos.includes('CAJA.MOVIMIENTOS.VER')
  const puedeVerArqueosCaja = permisos.includes('CAJA.ARQUEOS.VER')
  const puedeVerCierresCaja = permisos.includes('CAJA.CIERRES.VER')
  const puedeVerTransferenciasCaja = permisos.includes('CAJA.TRANSFERENCIAS.VER')
  const puedeVerDepositosCaja = permisos.includes('CAJA.DEPOSITOS.VER')
  const puedeVerRendicionesCaja = permisos.includes('CAJA.RENDICIONES.VER')
  const puedeVerConciliacionesCaja = permisos.includes('CAJA.CONCILIACIONES.VER')
  const puedeVerConsolidacionesCaja = permisos.includes('CAJA.CONSOLIDACIONES.VER')
  const puedeVerIncidenciasCaja = permisos.includes('CAJA.INCIDENCIAS.VER')
  const puedeVerCajas = permisos.includes('CAJA.CAJAS.VER')
  const puedeVerPoliticasCaja = permisos.includes('CAJA.POLITICAS.VER')
  const puedeAbrirTurnosCaja = permisos.includes('CAJA.TURNOS.ABRIR')
  const puedeRegistrarMovimientosCaja = permisos.includes('CAJA.MOVIMIENTOS.REGISTRAR')
  const puedeRegistrarArqueosCaja = permisos.includes('CAJA.ARQUEOS.REGISTRAR')
  const puedeAprobarArqueosCaja = permisos.includes('CAJA.ARQUEOS.APROBAR')
  const puedeCerrarTurnosCaja = permisos.includes('CAJA.TURNOS.CERRAR')
  const puedeCrearTransferenciasCaja = permisos.includes('CAJA.TRANSFERENCIAS.CREAR')
  const puedePrepararDepositosCaja = permisos.includes('CAJA.DEPOSITOS.PREPARAR')
  const puedeCrearIncidenciasCaja = permisos.includes('CAJA.INCIDENCIAS.CREAR')
  const puedeGestionarConfiguracionCaja = puedeVerCajas || puedeVerPoliticasCaja
  const puedeVerDenominacionesCaja = permisos.includes('CAJA.DENOMINACIONES.VER')
  const puedeRegistrarRendicionesCaja = permisos.includes('CAJA.RENDICIONES.REGISTRAR')
  const puedeCrearConciliacionesCaja = permisos.includes('CAJA.CONCILIACIONES.CREAR')
  const puedeGenerarConsolidacionesCaja = permisos.includes('CAJA.CONSOLIDACIONES.GENERAR')
  const coincidenciaTurnoCaja = urlActual.pathname.match(/^\/caja\/turnos\/([^/]+)$/)
  const coincidenciaMovimientoCaja = urlActual.pathname.match(/^\/caja\/movimientos\/([^/]+)$/)
  const coincidenciaArqueoCaja = urlActual.pathname.match(/^\/caja\/arqueos\/([^/]+)$/)
  const coincidenciaCierreCaja = urlActual.pathname.match(/^\/caja\/cierres\/([^/]+)$/)
  const coincidenciaTransferenciaCaja = urlActual.pathname.match(/^\/caja\/transferencias\/([^/]+)$/)
  const coincidenciaDepositoCaja = urlActual.pathname.match(/^\/caja\/depositos\/([^/]+)$/)
  const coincidenciaIncidenciaCaja = urlActual.pathname.match(/^\/caja\/incidencias\/([^/]+)$/)
  const coincidenciaRendicionCaja = urlActual.pathname.match(/^\/caja\/rendiciones\/([^/]+)$/)
  const coincidenciaConciliacionCaja = urlActual.pathname.match(/^\/caja\/conciliaciones\/([^/]+)$/)
  const coincidenciaConsolidacionCaja = urlActual.pathname.match(/^\/caja\/consolidaciones\/([^/]+)$/)
  const coincidenciaCliente = urlActual.pathname.match(/^\/clientes\/([^/]+?)(\/editar)?$/)
  const coincidenciaPoliticaMargen = urlActual.pathname.match(/^\/comercial\/politicas-margen\/([^/]+?)(\/editar)?$/)
  const coincidenciaPrecio = urlActual.pathname.match(/^\/comercial\/precios\/([^/]+)$/)
  const coincidenciaVenta = urlActual.pathname.match(/^\/ventas\/([^/]+?)(\/editar)?$/)
  const coincidenciaReceta = urlActual.pathname.match(/^\/ventas\/recetas\/([^/]+)$/)
  const coincidenciaEmpleado = urlActual.pathname.match(/^\/empleados\/([^/]+?)(\/editar)?$/)
  const coincidenciaRol = urlActual.pathname.match(/^\/seguridad\/roles\/([^/]+?)(\/editar)?$/)
  const coincidenciaUsuario = urlActual.pathname.match(/^\/seguridad\/usuarios\/([^/]+?)(\/editar)?$/)
  const coincidenciaEstado = urlActual.pathname.match(/^\/catalogos\/estados\/([^/]+?)(\/editar)?$/)
  const coincidenciaProducto = urlActual.pathname.match(/^\/catalogos\/productos\/([^/]+?)(\/editar)?$/)
  const coincidenciaLaboratorio = urlActual.pathname.match(/^\/catalogos\/laboratorios\/([^/]+?)(\/editar)?$/)
  const coincidenciaPresentacion = urlActual.pathname.match(/^\/catalogos\/presentaciones\/([^/]+?)(\/editar)?$/)
  const coincidenciaPrincipioActivo = urlActual.pathname.match(/^\/catalogos\/principios-activos\/([^/]+?)(\/editar)?$/)
  const coincidenciaUnidadMedida = urlActual.pathname.match(/^\/catalogos\/unidades-medida\/([^/]+?)(\/editar)?$/)
  const coincidenciaCategoriaTerapeutica = urlActual.pathname.match(/^\/catalogos\/categorias-terapeuticas\/([^/]+?)(\/editar)?$/)
  const coincidenciaFormaFarmaceutica = urlActual.pathname.match(/^\/catalogos\/formas-farmaceuticas\/([^/]+?)(\/editar)?$/)
  const coincidenciaViaAdministracion = urlActual.pathname.match(/^\/catalogos\/vias-administracion\/([^/]+?)(\/editar)?$/)
  const coincidenciaDepartamento = urlActual.pathname.match(/^\/organizacion\/departamentos\/([^/]+?)(\/editar)?$/)
  const coincidenciaPuesto = urlActual.pathname.match(/^\/organizacion\/puestos\/([^/]+?)(\/editar)?$/)
  const coincidenciaSucursal = urlActual.pathname.match(/^\/organizacion\/sucursales\/([^/]+?)(\/editar)?$/)
  const coincidenciaConteoInventario = urlActual.pathname.match(/^\/inventario\/conteos\/([^/]+)$/)
  const coincidenciaExistenciaInventario = urlActual.pathname.match(/^\/inventario\/existencias\/([^/]+)$/)
  const coincidenciaUbicacionInventario = urlActual.pathname.match(/^\/inventario\/ubicaciones\/([^/]+)\/editar$/)
  const coincidenciaAperturaInventario = urlActual.pathname.match(/^\/inventario\/apertura\/([^/]+)$/)
  const coincidenciaAjusteInventario = urlActual.pathname.match(/^\/inventario\/ajustes\/([^/]+)$/)
  const coincidenciaProveedor = urlActual.pathname.match(/^\/abastecimiento\/proveedores\/([^/]+?)(\/(?:editar|evaluar))?$/)
  const coincidenciaSolicitud = urlActual.pathname.match(/^\/abastecimiento\/solicitudes\/([^/]+?)(\/(?:resolver|cancelar))?$/)
  const coincidenciaCotizacion = urlActual.pathname.match(/^\/abastecimiento\/cotizaciones\/([^/]+?)(\/evaluar)?$/)
  const coincidenciaOrden = urlActual.pathname.match(/^\/abastecimiento\/ordenes\/([^/]+?)(\/(?:confirmar|cerrar|cancelar))?$/)
  const coincidenciaRecepcion = urlActual.pathname.match(/^\/abastecimiento\/recepciones\/([^/]+?)(\/regularizar|\/validar\/(?:documental|fisica|tecnica))?$/)
  const coincidenciaTraslado = urlActual.pathname.match(/^\/abastecimiento\/traslados\/([^/]+?)(\/(?:aprobar|preparar|despachar|recibir|cerrar|cancelar))?$/)
  const coincidenciaDevolucion = urlActual.pathname.match(/^\/abastecimiento\/devoluciones\/([^/]+?)(\/(?:autorizar|segregar|despachar|recibir|compensar|cerrar|cancelar))?$/)
  const sinPermiso = (mensaje: string) => (
    <section className={styles.sinPermiso} aria-labelledby="titulo-sin-permiso">
      <span aria-hidden="true">!</span>
      <h1 id="titulo-sin-permiso">Acceso no autorizado</h1>
      <p>{mensaje}</p>
      <button type="button" onClick={() => navegar('/')}>Volver al inicio</button>
    </section>
  )

  let contenido
  if (urlActual.pathname === '/caja/turnos') {
    contenido = puedeVerTurnosCaja
      ? <TurnoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar turnos de caja.')
  } else if (urlActual.pathname === '/caja/turnos/nuevo') {
    contenido = puedeAbrirTurnosCaja
      ? <TurnoAperturaView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para abrir turnos de caja.')
  } else if (coincidenciaTurnoCaja) {
    contenido = puedeVerTurnosCaja
      ? <TurnoDetalleView key={coincidenciaTurnoCaja[1]!} turnoId={coincidenciaTurnoCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar turnos de caja.')
  } else if (urlActual.pathname === '/caja/movimientos') {
    contenido = puedeVerMovimientosCaja
      ? <MovimientoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar movimientos de caja.')
  } else if (urlActual.pathname === '/caja/movimientos/nuevo') {
    contenido = puedeRegistrarMovimientosCaja
      ? <MovimientoCrearView turnoInicialId={urlActual.searchParams.get('turnoId') ?? undefined} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar movimientos de caja.')
  } else if (coincidenciaMovimientoCaja) {
    contenido = puedeVerMovimientosCaja
      ? <MovimientoDetalleView key={coincidenciaMovimientoCaja[1]!} movimientoId={coincidenciaMovimientoCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar movimientos de caja.')
  } else if (urlActual.pathname === '/caja/arqueos') {
    contenido = puedeVerArqueosCaja
      ? <ArqueoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar arqueos de caja.')
  } else if (urlActual.pathname === '/caja/arqueos/nuevo') {
    contenido = puedeRegistrarArqueosCaja
      ? <ArqueoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar arqueos de caja.')
  } else if (coincidenciaArqueoCaja) {
    contenido = puedeVerArqueosCaja || puedeAprobarArqueosCaja
      ? <ArqueoDetalleView key={coincidenciaArqueoCaja[1]!} arqueoId={coincidenciaArqueoCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar arqueos de caja.')
  } else if (urlActual.pathname === '/caja/cierres') {
    contenido = puedeVerCierresCaja
      ? <CierreListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar cierres de caja.')
  } else if (urlActual.pathname === '/caja/cierres/nuevo') {
    contenido = puedeCerrarTurnosCaja
      ? <CierreCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para cerrar turnos de caja.')
  } else if (coincidenciaCierreCaja) {
    contenido = puedeVerCierresCaja
      ? <CierreDetalleView key={coincidenciaCierreCaja[1]!} cierreId={coincidenciaCierreCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar cierres de caja.')
  } else if (urlActual.pathname === '/caja/transferencias') {
    contenido = puedeVerTransferenciasCaja
      ? <TransferenciaListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar transferencias de efectivo.')
  } else if (urlActual.pathname === '/caja/transferencias/nueva') {
    contenido = puedeCrearTransferenciasCaja
      ? <TransferenciaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar transferencias de efectivo.')
  } else if (coincidenciaTransferenciaCaja) {
    contenido = puedeVerTransferenciasCaja
      ? <TransferenciaDetalleView key={coincidenciaTransferenciaCaja[1]!} transferenciaId={coincidenciaTransferenciaCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar transferencias de efectivo.')
  } else if (urlActual.pathname === '/caja/depositos') {
    contenido = puedeVerDepositosCaja
      ? <DepositoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar depósitos bancarios.')
  } else if (urlActual.pathname === '/caja/depositos/nuevo') {
    contenido = puedePrepararDepositosCaja
      ? <DepositoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para preparar depósitos bancarios.')
  } else if (coincidenciaDepositoCaja) {
    contenido = puedeVerDepositosCaja
      ? <DepositoDetalleView key={coincidenciaDepositoCaja[1]!} depositoId={coincidenciaDepositoCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar depósitos bancarios.')
  } else if (urlActual.pathname === '/caja/rendiciones') {
    contenido = puedeVerRendicionesCaja
      ? <RendicionListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar rendiciones de repartidores.')
  } else if (urlActual.pathname === '/caja/rendiciones/nueva') {
    contenido = puedeRegistrarRendicionesCaja
      ? <RendicionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar rendiciones de repartidores.')
  } else if (coincidenciaRendicionCaja) {
    contenido = puedeVerRendicionesCaja
      ? <RendicionDetalleView key={coincidenciaRendicionCaja[1]!} rendicionId={coincidenciaRendicionCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar rendiciones de repartidores.')
  } else if (urlActual.pathname === '/caja/conciliaciones') {
    contenido = puedeVerConciliacionesCaja
      ? <ConciliacionListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar conciliaciones de caja.')
  } else if (urlActual.pathname === '/caja/conciliaciones/nueva') {
    contenido = puedeCrearConciliacionesCaja
      ? <ConciliacionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear conciliaciones de caja.')
  } else if (coincidenciaConciliacionCaja) {
    contenido = puedeVerConciliacionesCaja
      ? <ConciliacionDetalleView key={coincidenciaConciliacionCaja[1]!} conciliacionId={coincidenciaConciliacionCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar conciliaciones de caja.')
  } else if (urlActual.pathname === '/caja/consolidaciones') {
    contenido = puedeVerConsolidacionesCaja
      ? <ConsolidacionListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar consolidaciones de caja.')
  } else if (urlActual.pathname === '/caja/consolidaciones/nueva') {
    contenido = puedeGenerarConsolidacionesCaja
      ? <ConsolidacionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para generar consolidaciones de caja.')
  } else if (coincidenciaConsolidacionCaja) {
    contenido = puedeVerConsolidacionesCaja
      ? <ConsolidacionDetalleView key={coincidenciaConsolidacionCaja[1]!} consolidacionId={coincidenciaConsolidacionCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar consolidaciones de caja.')
  } else if (urlActual.pathname === '/caja/incidencias') {
    contenido = puedeVerIncidenciasCaja
      ? <IncidenciaListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar incidencias de caja.')
  } else if (urlActual.pathname === '/caja/incidencias/nueva') {
    contenido = puedeCrearIncidenciasCaja
      ? <IncidenciaCrearView entidadTipoInicial={entidadTipoIncidencia} entidadIdInicial={urlActual.searchParams.get('entidadId') ?? undefined} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar incidencias de caja.')
  } else if (coincidenciaIncidenciaCaja) {
    contenido = puedeVerIncidenciasCaja
      ? <IncidenciaDetalleView key={coincidenciaIncidenciaCaja[1]!} incidenciaId={coincidenciaIncidenciaCaja[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar incidencias de caja.')
  } else if (urlActual.pathname === '/caja/configuracion') {
    contenido = puedeGestionarConfiguracionCaja
      ? <ConfiguracionCajaView permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para consultar la configuración de caja.')
  } else if (urlActual.pathname === '/caja/denominaciones') {
    contenido = puedeVerDenominacionesCaja
      ? <DenominacionesCajaView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar denominaciones.')
  } else if (urlActual.pathname === '/clientes') {
    contenido = puedeVerClientes
      ? <ClienteListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar clientes.')
  } else if (urlActual.pathname === '/clientes/nuevo') {
    contenido = puedeCrearClientes
      ? <ClienteFormularioView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar clientes.')
  } else if (coincidenciaCliente?.[2] === '/editar') {
    contenido = puedeActualizarClientes
      ? <ClienteFormularioView key={coincidenciaCliente[1]!} clienteId={coincidenciaCliente[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar clientes.')
  } else if (coincidenciaCliente) {
    contenido = puedeVerClientes
      ? <ClienteDetalleView key={coincidenciaCliente[1]!} clienteId={coincidenciaCliente[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar clientes.')
  } else if (urlActual.pathname === '/comercial/politicas-margen') {
    contenido = puedeVerPoliticasMargen
      ? <PoliticaMargenListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar políticas de margen.')
  } else if (urlActual.pathname === '/comercial/politicas-margen/nueva') {
    contenido = puedeCrearMargenes
      ? <PoliticaMargenFormularioView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar políticas de margen.')
  } else if (coincidenciaPoliticaMargen?.[2] === '/editar') {
    contenido = puedeActualizarMargenes
      ? <PoliticaMargenFormularioView key={coincidenciaPoliticaMargen[1]!} politicaId={coincidenciaPoliticaMargen[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar políticas de margen.')
  } else if (coincidenciaPoliticaMargen) {
    contenido = puedeVerPoliticasMargen
      ? <PoliticaMargenDetalleView key={coincidenciaPoliticaMargen[1]!} politicaId={coincidenciaPoliticaMargen[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar políticas de margen.')
  } else if (urlActual.pathname === '/comercial/precios') {
    contenido = puedeVerPrecios
      ? <PrecioListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar precios.')
  } else if (urlActual.pathname === '/comercial/precios/nuevo') {
    contenido = puedeProponerPrecios
      ? <PrecioFormularioView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para proponer precios.')
  } else if (coincidenciaPrecio) {
    contenido = puedeVerPrecios
      ? <PrecioDetalleView key={coincidenciaPrecio[1]!} precioId={coincidenciaPrecio[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar precios.')
  } else if (urlActual.pathname === '/ventas/recetas') {
    contenido = puedeVerRecetas
      ? <RecetaListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para validar recetas.')
  } else if (coincidenciaReceta) {
    contenido = puedeVerRecetas
      ? <RecetaDetalleView key={coincidenciaReceta[1]!} recetaId={coincidenciaReceta[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para validar recetas.')
  } else if (urlActual.pathname === '/ventas') {
    contenido = puedeVerVentas
      ? <VentaListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar ventas.')
  } else if (urlActual.pathname === '/ventas/nueva') {
    contenido = puedeActualizarVentas
      ? <VentaFormularioView permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar ventas.')
  } else if (coincidenciaVenta?.[2] === '/editar') {
    contenido = puedeCrearVentas
      ? <VentaFormularioView key={coincidenciaVenta[1]!} ventaId={coincidenciaVenta[1]!} permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para editar ventas.')
  } else if (coincidenciaVenta) {
    contenido = puedeVerVentas
      ? <VentaDetalleView key={coincidenciaVenta[1]!} ventaId={coincidenciaVenta[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar ventas.')
  } else if (urlActual.pathname === '/abastecimiento/proveedores') {
    contenido = puedeVerProveedores
      ? <AbastecimientoListadoView key="listado-proveedores" recurso="proveedores" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar proveedores de abastecimiento.')
  } else if (urlActual.pathname === '/abastecimiento/proveedores/nuevo') {
    contenido = puedeVerProveedores && puedeCrearProveedores
      ? <ProveedorCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y gestionar proveedores.')
  } else if (coincidenciaProveedor?.[2] === '/editar') {
    contenido = puedeVerProveedores && puedeActualizarProveedores
      ? <ProveedorEditarView key={coincidenciaProveedor[1]!} proveedorId={coincidenciaProveedor[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y gestionar proveedores.')
  } else if (coincidenciaProveedor?.[2] === '/evaluar') {
    contenido = puedeVerProveedores && puedeEvaluarProveedores
      ? <ProveedorEvaluarView key={coincidenciaProveedor[1]!} proveedorId={coincidenciaProveedor[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y evaluar proveedores.')
  } else if (coincidenciaProveedor) {
    contenido = puedeVerProveedores
      ? <ProveedorDetalleView key={coincidenciaProveedor[1]!} proveedorId={coincidenciaProveedor[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar proveedores de abastecimiento.')
  } else if (urlActual.pathname === '/abastecimiento/solicitudes') {
    contenido = puedeVerSolicitudes
      ? <AbastecimientoListadoView key="listado-solicitudes" recurso="solicitudes" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar solicitudes de compra.')
  } else if (urlActual.pathname === '/abastecimiento/solicitudes/nuevo') {
    contenido = puedeVerSolicitudes && puedeCrearSolicitudes
      ? <SolicitudCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y crear solicitudes de compra.')
  } else if (coincidenciaSolicitud?.[2] === '/resolver') {
    contenido = puedeVerSolicitudes && puedeResolverSolicitudes
      ? <SolicitudAccionView key={`${coincidenciaSolicitud[1]!}-resolver`} solicitudId={coincidenciaSolicitud[1]!} modo="resolver" onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y resolver solicitudes de compra.')
  } else if (coincidenciaSolicitud?.[2] === '/cancelar') {
    contenido = puedeVerSolicitudes && puedeCancelarSolicitudes
      ? <SolicitudAccionView key={`${coincidenciaSolicitud[1]!}-cancelar`} solicitudId={coincidenciaSolicitud[1]!} modo="cancelar" onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y cancelar solicitudes de compra.')
  } else if (coincidenciaSolicitud) {
    contenido = puedeVerSolicitudes
      ? <SolicitudDetalleView key={coincidenciaSolicitud[1]!} solicitudId={coincidenciaSolicitud[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar solicitudes de compra.')
  } else if (urlActual.pathname === '/abastecimiento/cotizaciones') {
    contenido = puedeVerCotizaciones
      ? <AbastecimientoListadoView key="listado-cotizaciones" recurso="cotizaciones" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar cotizaciones.')
  } else if (urlActual.pathname === '/abastecimiento/cotizaciones/nuevo') {
    contenido = puedeVerCotizaciones && puedeCrearCotizaciones
      ? <CotizacionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y gestionar cotizaciones.')
  } else if (coincidenciaCotizacion?.[2] === '/evaluar') {
    contenido = puedeVerCotizaciones && puedeAdjudicarCotizaciones
      ? <CotizacionEvaluarView key={coincidenciaCotizacion[1]!} cotizacionId={coincidenciaCotizacion[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y adjudicar cotizaciones.')
  } else if (coincidenciaCotizacion) {
    contenido = puedeVerCotizaciones
      ? <CotizacionDetalleView key={coincidenciaCotizacion[1]!} cotizacionId={coincidenciaCotizacion[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar cotizaciones.')
  } else if (urlActual.pathname === '/abastecimiento/ordenes') {
    contenido = puedeVerOrdenes
      ? <AbastecimientoListadoView key="listado-ordenes" recurso="ordenes" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar órdenes de compra.')
  } else if (urlActual.pathname === '/abastecimiento/ordenes/nuevo') {
    contenido = puedeVerOrdenes && puedeEmitirOrdenes
      ? <OrdenCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y emitir órdenes de compra.')
  } else if (coincidenciaOrden?.[2] === '/confirmar' || coincidenciaOrden?.[2] === '/cerrar' || coincidenciaOrden?.[2] === '/cancelar') {
    const autorizado = coincidenciaOrden[2] === '/confirmar' ? puedeConfirmarOrdenes : coincidenciaOrden[2] === '/cerrar' ? puedeCerrarOrdenes : puedeCancelarOrdenes
    contenido = puedeVerOrdenes && autorizado
      ? <OrdenAccionView key={`${coincidenciaOrden[1]!}${coincidenciaOrden[2]}`} ordenId={coincidenciaOrden[1]!} modo={coincidenciaOrden[2].slice(1) as 'confirmar' | 'cerrar' | 'cancelar'} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y gestionar órdenes de compra.')
  } else if (coincidenciaOrden) {
    contenido = puedeVerOrdenes
      ? <OrdenDetalleView key={coincidenciaOrden[1]!} ordenId={coincidenciaOrden[1]!} sucursalActualId={estado.sesion.sucursal.id} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar órdenes de compra.')
  } else if (urlActual.pathname === '/abastecimiento/recepciones') {
    contenido = puedeVerRecepciones
      ? <AbastecimientoListadoView key="listado-recepciones" recurso="recepciones" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar recepciones.')
  } else if (urlActual.pathname === '/abastecimiento/recepciones/nuevo') {
    contenido = puedeVerRecepciones && puedeRegistrarRecepciones
      ? <RecepcionCrearView sucursalActualId={estado.sesion.sucursal.id} ordenInicialId={urlActual.searchParams.get('ordenId') ?? undefined} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y registrar recepciones.')
  } else if (coincidenciaRecepcion?.[2] === '/regularizar') {
    contenido = puedeVerRecepciones && puedeRegularizarRecepciones
      ? <RecepcionAccionView key={`${coincidenciaRecepcion[1]!}-regularizar`} recepcionId={coincidenciaRecepcion[1]!} modo="regularizar" onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y regularizar recepciones.')
  } else if (coincidenciaRecepcion?.[2]?.startsWith('/validar/')) {
    contenido = puedeVerRecepciones && puedeValidarRecepciones
      ? <RecepcionAccionView key={`${coincidenciaRecepcion[1]!}${coincidenciaRecepcion[2]}`} recepcionId={coincidenciaRecepcion[1]!} modo={coincidenciaRecepcion[2].split('/').at(-1) as 'documental' | 'fisica' | 'tecnica'} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y validar recepciones.')
  } else if (coincidenciaRecepcion) {
    contenido = puedeVerRecepciones
      ? <RecepcionDetalleView key={coincidenciaRecepcion[1]!} recepcionId={coincidenciaRecepcion[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar recepciones.')
  } else if (urlActual.pathname === '/abastecimiento/traslados') {
    contenido = puedeVerTraslados
      ? <AbastecimientoListadoView key="listado-traslados" recurso="traslados" permisos={permisos} sucursalActualId={estado.sesion.sucursal.id} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar traslados internos.')
  } else if (urlActual.pathname === '/abastecimiento/traslados/nuevo') {
    contenido = puedeVerTraslados && puedeCrearTraslados
      ? <TrasladoCrearView sucursalActualId={estado.sesion.sucursal.id} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y crear traslados internos.')
  } else if (coincidenciaTraslado?.[2]) {
    const modo = coincidenciaTraslado[2].slice(1) as 'aprobar' | 'preparar' | 'despachar' | 'recibir' | 'cerrar' | 'cancelar'
    const autorizado = modo === 'aprobar' ? puedeAprobarTraslados : modo === 'preparar' ? puedePrepararTraslados : modo === 'despachar' ? puedeDespacharTraslados : modo === 'recibir' ? puedeRecibirTraslados : modo === 'cerrar' ? puedeCerrarTraslados : puedeCancelarTraslados
    contenido = puedeVerTraslados && autorizado
      ? <TrasladoAccionView key={`${coincidenciaTraslado[1]}-${modo}`} trasladoId={coincidenciaTraslado[1]!} modo={modo} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene el permiso requerido para esta etapa del traslado.')
  } else if (coincidenciaTraslado) {
    contenido = puedeVerTraslados
      ? <TrasladoDetalleView key={coincidenciaTraslado[1]!} trasladoId={coincidenciaTraslado[1]!} sucursalActualId={estado.sesion.sucursal.id} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar traslados internos.')
  } else if (urlActual.pathname === '/abastecimiento/devoluciones') {
    contenido = puedeVerDevoluciones
      ? <AbastecimientoListadoView key="listado-devoluciones" recurso="devoluciones" permisos={permisos} sucursalActualId={estado.sesion.sucursal.id} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar devoluciones a proveedores.')
  } else if (urlActual.pathname === '/abastecimiento/devoluciones/nuevo') {
    contenido = puedeVerDevoluciones && puedeCrearDevoluciones
      ? <DevolucionCrearView sucursalActualId={estado.sesion.sucursal.id} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para consultar y crear devoluciones a proveedores.')
  } else if (coincidenciaDevolucion?.[2]) {
    const modo = coincidenciaDevolucion[2].slice(1) as 'autorizar' | 'segregar' | 'despachar' | 'recibir' | 'compensar' | 'cerrar' | 'cancelar'
    const autorizado = modo === 'autorizar' ? puedeAutorizarDevoluciones : modo === 'segregar' ? puedeSegregarDevoluciones : modo === 'despachar' ? puedeDespacharDevoluciones : modo === 'recibir' ? puedeRecibirDevoluciones : modo === 'compensar' ? puedeCompensarDevoluciones : modo === 'cerrar' ? puedeCerrarDevoluciones : puedeCancelarDevoluciones
    contenido = puedeVerDevoluciones && autorizado
      ? <DevolucionAccionView key={`${coincidenciaDevolucion[1]}-${modo}`} devolucionId={coincidenciaDevolucion[1]!} modo={modo} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene el permiso requerido para esta etapa de la devolución.')
  } else if (coincidenciaDevolucion) {
    contenido = puedeVerDevoluciones
      ? <DevolucionDetalleView key={coincidenciaDevolucion[1]!} devolucionId={coincidenciaDevolucion[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar devoluciones a proveedores.')
  } else if (urlActual.pathname === '/inventario/existencias') {
    contenido = puedeVerInventario
      ? <InventarioExistenciasView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar las existencias de inventario.')
  } else if (coincidenciaExistenciaInventario) {
    contenido = puedeVerInventario
      ? <InventarioExistenciaDetalleView productoId={coincidenciaExistenciaInventario[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar el detalle de existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/ubicaciones') {
    contenido = puedeVerUbicaciones
      ? <InventarioUbicacionesView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar las ubicaciones de inventario.')
  } else if (urlActual.pathname === '/inventario/ubicaciones/nueva') {
    contenido = puedeCrearUbicaciones
      ? <InventarioUbicacionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para gestionar ubicaciones y consultar existencias de inventario.')
  } else if (coincidenciaUbicacionInventario) {
    contenido = puedeActualizarUbicaciones
      ? <InventarioUbicacionEditarView key={coincidenciaUbicacionInventario[1]!} ubicacionId={coincidenciaUbicacionInventario[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para gestionar ubicaciones y consultar existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/kardex') {
    contenido = puedeVerKardex && puedeVerInventario
      ? <InventarioKardexView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para consultar Kardex y existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/apertura') {
    contenido = puedeVerAperturas
      ? <InventarioOperacionesListadoView clase="APERTURA" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para registrar aperturas y consultar existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/apertura/nueva') {
    contenido = puedeRegistrarApertura
      ? <InventarioAperturaView permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para registrar aperturas y consultar existencias de inventario.')
  } else if (coincidenciaAperturaInventario) {
    contenido = puedeVerAperturas
      ? <InventarioOperacionDetalleView clase="APERTURA" operacionId={coincidenciaAperturaInventario[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para consultar aperturas y existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/ajustes') {
    contenido = puedeVerAjustes
      ? <InventarioOperacionesListadoView clase="AJUSTE" permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para registrar ajustes y consultar existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/ajustes/nuevo') {
    contenido = puedeRegistrarAjustes
      ? <InventarioAjusteView permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para registrar ajustes y consultar existencias de inventario.')
  } else if (coincidenciaAjusteInventario) {
    contenido = puedeVerAjustes
      ? <InventarioOperacionDetalleView clase="AJUSTE" operacionId={coincidenciaAjusteInventario[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para consultar ajustes y existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/politicas') {
    contenido = puedeVerPoliticas
      ? <InventarioPoliticasView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar políticas de stock.')
  } else if (urlActual.pathname === '/inventario/politicas/nueva') {
    contenido = puedeGestionarPoliticas
      ? <InventarioPoliticaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para configurar políticas individuales.')
  } else if (urlActual.pathname === '/inventario/politicas/masivas') {
    contenido = puedeVerPoliticasMasivas
      ? <InventarioPoliticasMasivasView permisos={permisos} sucursalActualId={estado.sesion.sucursal.id} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar solicitudes masivas de políticas.')
  } else if (urlActual.pathname === '/inventario/politicas/masivas/nueva') {
    contenido = puedeCrearPoliticasMasivas
      ? <InventarioPoliticaMasivaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear solicitudes masivas de políticas.')
  } else if (urlActual.pathname === '/inventario/vencimientos') {
    contenido = puedeVerVencimientos
      ? <InventarioVencimientosView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar alertas de vencimiento.')
  } else if (urlActual.pathname === '/inventario/conteos') {
    contenido = puedeVerConteos
      ? <InventarioConteosView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario necesita permisos para gestionar conteos y consultar existencias de inventario.')
  } else if (urlActual.pathname === '/inventario/conteos/nuevo') {
    contenido = puedeCrearConteos
      ? <InventarioConteoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para gestionar conteos y consultar existencias de inventario.')
  } else if (coincidenciaConteoInventario) {
    contenido = puedeVerConteos
      ? <InventarioConteoDetalleView conteoId={coincidenciaConteoInventario[1]!} permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario necesita permisos para gestionar conteos y consultar existencias de inventario.')
  } else if (urlActual.pathname === '/catalogos/laboratorios') {
    contenido = permisos.includes('CATALOGOS.LABORATORIOS.VER') ? <LaboratorioListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar laboratorios.')
  } else if (urlActual.pathname === '/catalogos/laboratorios/nuevo') {
    contenido = permisos.includes('CATALOGOS.LABORATORIOS.CREAR') ? <LaboratorioCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear laboratorios.')
  } else if (coincidenciaLaboratorio?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.LABORATORIOS.ACTUALIZAR') ? <LaboratorioEditarView laboratorioId={coincidenciaLaboratorio[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar laboratorios.')
  } else if (coincidenciaLaboratorio) {
    contenido = permisos.includes('CATALOGOS.LABORATORIOS.VER') ? <LaboratorioDetalleView laboratorioId={coincidenciaLaboratorio[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar laboratorios.')
  } else if (urlActual.pathname === '/catalogos/presentaciones') {
    contenido = permisos.includes('CATALOGOS.PRESENTACIONES.VER') ? <PresentacionListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar presentaciones.')
  } else if (urlActual.pathname === '/catalogos/presentaciones/nuevo') {
    contenido = permisos.includes('CATALOGOS.PRESENTACIONES.CREAR') ? <PresentacionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear presentaciones.')
  } else if (coincidenciaPresentacion?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.PRESENTACIONES.ACTUALIZAR') ? <PresentacionEditarView presentacionId={coincidenciaPresentacion[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar presentaciones.')
  } else if (coincidenciaPresentacion) {
    contenido = permisos.includes('CATALOGOS.PRESENTACIONES.VER') ? <PresentacionDetalleView presentacionId={coincidenciaPresentacion[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar presentaciones.')
  } else if (urlActual.pathname === '/catalogos/principios-activos') {
    contenido = permisos.includes('CATALOGOS.PRINCIPIOS_ACTIVOS.VER') ? <PrincipioActivoListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar principios activos.')
  } else if (urlActual.pathname === '/catalogos/principios-activos/nuevo') {
    contenido = permisos.includes('CATALOGOS.PRINCIPIOS_ACTIVOS.CREAR') ? <PrincipioActivoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear principios activos.')
  } else if (coincidenciaPrincipioActivo?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.PRINCIPIOS_ACTIVOS.ACTUALIZAR') ? <PrincipioActivoEditarView principioActivoId={coincidenciaPrincipioActivo[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar principios activos.')
  } else if (coincidenciaPrincipioActivo) {
    contenido = permisos.includes('CATALOGOS.PRINCIPIOS_ACTIVOS.VER') ? <PrincipioActivoDetalleView principioActivoId={coincidenciaPrincipioActivo[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar principios activos.')
  } else if (urlActual.pathname === '/catalogos/unidades-medida') {
    contenido = permisos.includes('CATALOGOS.UNIDADES_MEDIDA.VER') ? <UnidadMedidaListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar unidades de medida.')
  } else if (urlActual.pathname === '/catalogos/unidades-medida/nuevo') {
    contenido = permisos.includes('CATALOGOS.UNIDADES_MEDIDA.CREAR') ? <UnidadMedidaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear unidades de medida.')
  } else if (coincidenciaUnidadMedida?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.UNIDADES_MEDIDA.ACTUALIZAR') ? <UnidadMedidaEditarView unidadMedidaId={coincidenciaUnidadMedida[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar unidades de medida.')
  } else if (coincidenciaUnidadMedida) {
    contenido = permisos.includes('CATALOGOS.UNIDADES_MEDIDA.VER') ? <UnidadMedidaDetalleView unidadMedidaId={coincidenciaUnidadMedida[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar unidades de medida.')
  } else if (urlActual.pathname === '/catalogos/categorias-terapeuticas') {
    contenido = permisos.includes('CATALOGOS.CATEGORIAS_TERAPEUTICAS.VER') ? <CategoriaTerapeuticaListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar categorías terapéuticas.')
  } else if (urlActual.pathname === '/catalogos/categorias-terapeuticas/nuevo') {
    contenido = permisos.includes('CATALOGOS.CATEGORIAS_TERAPEUTICAS.CREAR') ? <CategoriaTerapeuticaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear categorías terapéuticas.')
  } else if (coincidenciaCategoriaTerapeutica?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.CATEGORIAS_TERAPEUTICAS.ACTUALIZAR') ? <CategoriaTerapeuticaEditarView categoriaTerapeuticaId={coincidenciaCategoriaTerapeutica[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar categorías terapéuticas.')
  } else if (coincidenciaCategoriaTerapeutica) {
    contenido = permisos.includes('CATALOGOS.CATEGORIAS_TERAPEUTICAS.VER') ? <CategoriaTerapeuticaDetalleView categoriaTerapeuticaId={coincidenciaCategoriaTerapeutica[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar categorías terapéuticas.')
  } else if (urlActual.pathname === '/catalogos/formas-farmaceuticas') {
    contenido = permisos.includes('CATALOGOS.FORMAS_FARMACEUTICAS.VER') ? <FormaFarmaceuticaListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar formas farmacéuticas.')
  } else if (urlActual.pathname === '/catalogos/formas-farmaceuticas/nuevo') {
    contenido = permisos.includes('CATALOGOS.FORMAS_FARMACEUTICAS.CREAR') ? <FormaFarmaceuticaCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear formas farmacéuticas.')
  } else if (coincidenciaFormaFarmaceutica?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.FORMAS_FARMACEUTICAS.ACTUALIZAR') ? <FormaFarmaceuticaEditarView formaFarmaceuticaId={coincidenciaFormaFarmaceutica[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar formas farmacéuticas.')
  } else if (coincidenciaFormaFarmaceutica) {
    contenido = permisos.includes('CATALOGOS.FORMAS_FARMACEUTICAS.VER') ? <FormaFarmaceuticaDetalleView formaFarmaceuticaId={coincidenciaFormaFarmaceutica[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar formas farmacéuticas.')
  } else if (urlActual.pathname === '/catalogos/vias-administracion') {
    contenido = permisos.includes('CATALOGOS.VIAS_ADMINISTRACION.VER') ? <ViaAdministracionListadoView permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar vías de administración.')
  } else if (urlActual.pathname === '/catalogos/vias-administracion/nuevo') {
    contenido = permisos.includes('CATALOGOS.VIAS_ADMINISTRACION.CREAR') ? <ViaAdministracionCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para crear vías de administración.')
  } else if (coincidenciaViaAdministracion?.[2] === '/editar') {
    contenido = permisos.includes('CATALOGOS.VIAS_ADMINISTRACION.ACTUALIZAR') ? <ViaAdministracionEditarView viaAdministracionId={coincidenciaViaAdministracion[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} /> : sinPermiso('No tienes permiso para editar vías de administración.')
  } else if (coincidenciaViaAdministracion) {
    contenido = permisos.includes('CATALOGOS.VIAS_ADMINISTRACION.VER') ? <ViaAdministracionDetalleView viaAdministracionId={coincidenciaViaAdministracion[1]!} permisos={permisos} onNavegar={navegar} /> : sinPermiso('No tienes permiso para consultar vías de administración.')
  } else if (urlActual.pathname === '/empleados') {
    contenido = puedeVerEmpleados
      ? <EmpleadoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar empleados.')
  } else if (urlActual.pathname === '/empleados/nuevo') {
    contenido = puedeCrearEmpleados
      ? <EmpleadoCrearView
          sucursalActualId={estado.sesion.sucursal.id}
          onNavegar={navegar}
          onCambiosPendientes={actualizarCambiosPendientes}
        />
      : sinPermiso('Tu usuario no tiene permiso para registrar empleados.')
  } else if (coincidenciaEmpleado?.[2] === '/editar') {
    contenido = puedeActualizarEmpleados
      ? <EmpleadoEditarView key={coincidenciaEmpleado[1]!} empleadoId={coincidenciaEmpleado[1]!} permisos={permisos} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar empleados.')
  } else if (coincidenciaEmpleado) {
    contenido = puedeVerEmpleados
      ? <EmpleadoDetalleView key={coincidenciaEmpleado[1]!} empleadoId={coincidenciaEmpleado[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar empleados.')
  } else if (urlActual.pathname === '/seguridad/roles') {
    contenido = puedeVerRoles
      ? <RolListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar roles.')
  } else if (urlActual.pathname === '/seguridad/roles/nuevo') {
    contenido = puedeCrearRoles
      ? <RolCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene los permisos necesarios para crear roles y asignar permisos.')
  } else if (coincidenciaRol?.[2] === '/editar') {
    contenido = puedeActualizarRoles
      ? <RolEditarView key={coincidenciaRol[1]!} rolId={coincidenciaRol[1]!} puedeGestionarPermisos={puedeGestionarPermisosRol} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar roles.')
  } else if (coincidenciaRol) {
    contenido = puedeVerRoles
      ? <RolDetalleView key={coincidenciaRol[1]!} rolId={coincidenciaRol[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar roles.')
  } else if (urlActual.pathname === '/seguridad/usuarios') {
    contenido = puedeVerUsuarios
      ? <UsuarioListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar usuarios.')
  } else if (urlActual.pathname === '/seguridad/usuarios/nuevo') {
    contenido = puedeCrearUsuarios
      ? <UsuarioCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear usuarios.')
  } else if (coincidenciaUsuario?.[2] === '/editar') {
    contenido = puedeActualizarUsuarios
      ? <UsuarioEditarView key={coincidenciaUsuario[1]!} usuarioId={coincidenciaUsuario[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar usuarios.')
  } else if (coincidenciaUsuario) {
    contenido = puedeVerUsuarios
      ? <UsuarioDetalleView key={coincidenciaUsuario[1]!} usuarioId={coincidenciaUsuario[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar usuarios.')
  } else if (urlActual.pathname === '/catalogos/productos') {
    contenido = puedeVerProductos
      ? <ProductoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar productos y medicamentos.')
  } else if (urlActual.pathname === '/catalogos/productos/nuevo') {
    contenido = puedeCrearProductos
      ? <ProductoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para registrar medicamentos.')
  } else if (coincidenciaProducto?.[2] === '/editar') {
    contenido = puedeActualizarProductos
      ? <ProductoEditarView key={coincidenciaProducto[1]!} productoId={coincidenciaProducto[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar medicamentos.')
  } else if (coincidenciaProducto) {
    contenido = puedeVerProductos
      ? <ProductoDetalleView key={coincidenciaProducto[1]!} productoId={coincidenciaProducto[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar medicamentos.')
  } else if (urlActual.pathname === '/catalogos/estados') {
    contenido = puedeVerEstados
      ? <EstadoCatalogoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar el catálogo de estados.')
  } else if (urlActual.pathname === '/catalogos/estados/nuevo') {
    contenido = puedeCrearEstados
      ? <EstadoCatalogoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear estados.')
  } else if (coincidenciaEstado?.[2] === '/editar') {
    contenido = puedeActualizarEstados
      ? <EstadoCatalogoEditarView key={coincidenciaEstado[1]!} estadoId={coincidenciaEstado[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar estados.')
  } else if (coincidenciaEstado) {
    contenido = puedeVerEstados
      ? <EstadoCatalogoDetalleView key={coincidenciaEstado[1]!} estadoId={coincidenciaEstado[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar estados.')
  } else if (urlActual.pathname === '/organizacion/departamentos') {
    contenido = puedeVerDepartamentos
      ? <DepartamentoOrganizacionalListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar departamentos organizacionales.')
  } else if (urlActual.pathname === '/organizacion/departamentos/nuevo') {
    contenido = puedeCrearDepartamentos
      ? <DepartamentoOrganizacionalCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear departamentos organizacionales.')
  } else if (coincidenciaDepartamento?.[2] === '/editar') {
    contenido = puedeActualizarDepartamentos
      ? <DepartamentoOrganizacionalEditarView key={coincidenciaDepartamento[1]!} departamentoId={coincidenciaDepartamento[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar departamentos organizacionales.')
  } else if (coincidenciaDepartamento) {
    contenido = puedeVerDepartamentos
      ? <DepartamentoOrganizacionalDetalleView key={coincidenciaDepartamento[1]!} departamentoId={coincidenciaDepartamento[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar departamentos organizacionales.')
  } else if (urlActual.pathname === '/organizacion/puestos') {
    contenido = puedeVerPuestos
      ? <PuestoListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar puestos organizacionales.')
  } else if (urlActual.pathname === '/organizacion/puestos/nuevo') {
    contenido = puedeCrearPuestos
      ? <PuestoCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear puestos organizacionales.')
  } else if (coincidenciaPuesto?.[2] === '/editar') {
    contenido = puedeActualizarPuestos
      ? <PuestoEditarView key={coincidenciaPuesto[1]!} puestoId={coincidenciaPuesto[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar puestos organizacionales.')
  } else if (coincidenciaPuesto) {
    contenido = puedeVerPuestos
      ? <PuestoDetalleView key={coincidenciaPuesto[1]!} puestoId={coincidenciaPuesto[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar puestos organizacionales.')
  } else if (urlActual.pathname === '/organizacion/sucursales') {
    contenido = puedeVerSucursales
      ? <SucursalListadoView permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar sucursales.')
  } else if (urlActual.pathname === '/organizacion/sucursales/nuevo') {
    contenido = puedeCrearSucursales
      ? <SucursalCrearView onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para crear sucursales.')
  } else if (coincidenciaSucursal?.[2] === '/editar') {
    contenido = puedeActualizarSucursales
      ? <SucursalEditarView key={coincidenciaSucursal[1]!} sucursalId={coincidenciaSucursal[1]!} onNavegar={navegar} onCambiosPendientes={actualizarCambiosPendientes} />
      : sinPermiso('Tu usuario no tiene permiso para actualizar sucursales.')
  } else if (coincidenciaSucursal) {
    contenido = puedeVerSucursales
      ? <SucursalDetalleView key={coincidenciaSucursal[1]!} sucursalId={coincidenciaSucursal[1]!} permisos={permisos} onNavegar={navegar} />
      : sinPermiso('Tu usuario no tiene permiso para consultar sucursales.')
  }

  return (
    <>
      <DashboardView
        sesion={estado.sesion}
        cerrandoSesion={cerrandoSesion}
        errorCierre={errorCierre}
        onCerrarSesion={solicitarCierreSesion}
        rutaActual={urlActual.pathname}
        onNavegar={navegar}
        contenido={contenido}
      />
      <ModalEstado
        abierto={Boolean(destinoPendiente)}
        tipo="advertencia"
        titulo="Cambios sin guardar"
        mensaje="Hay cambios en el formulario que todavía no se han guardado. Si continúas, se perderán."
        textoAccionPrincipal="Seguir editando"
        onAccionPrincipal={() => setDestinoPendiente(null)}
        textoAccionSecundaria="Salir sin guardar"
        onAccionSecundaria={continuarSinGuardar}
        onCerrar={() => setDestinoPendiente(null)}
      />
    </>
  )
}

export default App
