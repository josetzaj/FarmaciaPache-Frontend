import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import imagotipo from '../../../assets/marca/imagotipo.png'
import isotipo from '../../../assets/marca/isotipo.png'
import { construirUrlApi } from '../../../shared/api/cliente-api'
import { EVENTO_FOTO_EMPLEADO_ACTUALIZADA } from '../../../shared/eventos/eventos-aplicacion'
import type { SesionUsuario } from '../../autenticacion/autenticacion.types'
import { CampanaNotificaciones } from '../../notificaciones/components/campana-notificaciones'
import { DashboardInicio } from './dashboard-inicio'
import type { AccesoInicio } from './dashboard-inicio'
import { Icono } from './icono'
import styles from './dashboard-view.module.css'

type DashboardViewProps = {
  sesion: SesionUsuario
  cerrandoSesion: boolean
  errorCierre: string | null
  onCerrarSesion: () => void
  rutaActual: string
  onNavegar: (ruta: string) => void
  contenido?: ReactNode
}

type SeccionNavegacion = {
  id: string
  etiqueta: string
  icono: Parameters<typeof Icono>[0]['nombre']
  prefijosPermiso?: string[]
  proximamente?: boolean
  submodulos?: SubmoduloNavegacion[]
}

type SubmoduloNavegacion = {
  id: string
  etiqueta: string
  icono: Parameters<typeof Icono>[0]['nombre']
  rutaListado: string
  rutaCreacion: string
  permisoVer: string | readonly string[]
  permisoCrear: string | readonly string[]
  permisosRequeridos?: readonly string[]
}

function tieneAlgunPermiso(permisos: ReadonlySet<string>, requisito: string | readonly string[]): boolean {
  return typeof requisito === 'string' ? permisos.has(requisito) : requisito.some((permiso) => permisos.has(permiso))
}

type AccesoRapido = AccesoInicio

const obtenerSeccionPorRuta = (ruta: string) => {
  if (ruta === '/') return 'inicio'
  if (ruta.startsWith('/clientes') || ruta.startsWith('/comercial/') || ruta.startsWith('/ventas')) return 'ventas'
  if (ruta.startsWith('/inventario/')) return 'inventario'
  if (ruta.startsWith('/activos')) return 'activos'
  if (ruta.startsWith('/abastecimiento/')) return 'compras'
  if (ruta.startsWith('/caja/')) return 'caja'
  if (ruta.startsWith('/planillas')) return 'planillas'
  if (ruta.startsWith('/reportes')) return 'reportes'
  if (ruta.startsWith('/catalogos/')) return 'catalogos'
  if (ruta === '/empleados' || ruta.startsWith('/empleados/')) return 'organizacion'
  if (ruta.startsWith('/organizacion/')) return 'organizacion'
  if (ruta.startsWith('/seguridad/')) return 'seguridad'
  return null
}

const secciones: SeccionNavegacion[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio' },
  {
    id: 'ventas',
    etiqueta: 'Ventas y atención al cliente',
    icono: 'ventas',
    prefijosPermiso: ['COMERCIAL.'],
    submodulos: [
      {
        id: 'clientes-comercial',
        etiqueta: 'Clientes',
        icono: 'organizacion',
        rutaListado: '/clientes',
        rutaCreacion: '/clientes/nuevo',
        permisoVer: 'COMERCIAL.CLIENTES.VER',
        permisoCrear: 'COMERCIAL.CLIENTES.CREAR',
      },
      {
        id: 'margenes-comercial',
        etiqueta: 'Políticas de margen',
        icono: 'reportes',
        rutaListado: '/comercial/politicas-margen',
        rutaCreacion: '/comercial/politicas-margen/nueva',
        permisoVer: 'COMERCIAL.MARGENES.VER',
        permisoCrear: 'COMERCIAL.MARGENES.CREAR',
      },
      {
        id: 'precios-comercial',
        etiqueta: 'Precios',
        icono: 'reportes',
        rutaListado: '/comercial/precios',
        rutaCreacion: '/comercial/precios/nuevo',
        permisoVer: ['COMERCIAL.PRECIOS.VER_PUBLICO', 'COMERCIAL.PRECIOS.VER_COSTOS'],
        permisoCrear: 'COMERCIAL.PRECIOS.PROPONER',
      },
      {
        id: 'ventas-comercial',
        etiqueta: 'Ventas',
        icono: 'ventas',
        rutaListado: '/ventas',
        rutaCreacion: '/ventas/nueva',
        permisoVer: 'COMERCIAL.VENTAS.VER',
        permisoCrear: 'COMERCIAL.VENTAS.CREAR',
      },
      {
        id: 'ventas-realizadas-comercial',
        etiqueta: 'Ventas realizadas',
        icono: 'reportes',
        rutaListado: '/ventas/realizadas',
        rutaCreacion: '/ventas/realizadas',
        permisoVer: 'COMERCIAL.VENTAS.VER',
        permisoCrear: 'COMERCIAL.VENTAS.REALIZADAS.CREAR',
      },
      {
        id: 'recetas-comercial',
        etiqueta: 'Validación de recetas',
        icono: 'ventas',
        rutaListado: '/ventas/recetas',
        rutaCreacion: '/ventas/recetas',
        permisoVer: 'COMERCIAL.RECETAS.VER',
        permisoCrear: 'COMERCIAL.RECETAS.VALIDAR',
      },
    ],
  },
  {
    id: 'inventario',
    etiqueta: 'Inventario',
    icono: 'inventario',
    prefijosPermiso: ['INVENTARIO.'],
    submodulos: [
      {
        id: 'existencias-inventario',
        etiqueta: 'Existencias',
        icono: 'inventario',
        rutaListado: '/inventario/existencias',
        rutaCreacion: '/inventario/existencias',
        permisoVer: 'INVENTARIO.EXISTENCIAS.VER',
        permisoCrear: 'INVENTARIO.EXISTENCIAS.VER',
      },
      {
        id: 'ubicaciones-inventario',
        etiqueta: 'Ubicaciones',
        icono: 'sucursal',
        rutaListado: '/inventario/ubicaciones',
        rutaCreacion: '/inventario/ubicaciones/nueva',
        permisoVer: 'INVENTARIO.UBICACIONES.VER',
        permisoCrear: 'INVENTARIO.UBICACIONES.CREAR',
      },
      {
        id: 'kardex-inventario',
        etiqueta: 'Kardex',
        icono: 'reportes',
        rutaListado: '/inventario/kardex',
        rutaCreacion: '/inventario/kardex',
        permisoVer: 'INVENTARIO.KARDEX.VER',
        permisoCrear: 'INVENTARIO.KARDEX.VER',
      },
      {
        id: 'apertura-inventario',
        etiqueta: 'Apertura controlada',
        icono: 'inventario',
        rutaListado: '/inventario/apertura',
        rutaCreacion: '/inventario/apertura/nueva',
        permisoVer: 'INVENTARIO.APERTURA.VER',
        permisoCrear: 'INVENTARIO.APERTURA.REGISTRAR',
      },
      {
        id: 'ajustes-inventario',
        etiqueta: 'Ajustes de cantidad',
        icono: 'inventario',
        rutaListado: '/inventario/ajustes',
        rutaCreacion: '/inventario/ajustes/nuevo',
        permisoVer: 'INVENTARIO.AJUSTES.VER',
        permisoCrear: 'INVENTARIO.AJUSTES.REGISTRAR',
      },
      {
        id: 'costos-inventario',
        etiqueta: 'Regularización de costos',
        icono: 'reportes',
        rutaListado: '/inventario/costos',
        rutaCreacion: '/inventario/costos',
        permisoVer: 'INVENTARIO.COSTOS.VER',
        permisoCrear: 'INVENTARIO.COSTOS.REGULARIZAR',
      },
      {
        id: 'politicas-inventario',
        etiqueta: 'Políticas de stock',
        icono: 'reportes',
        rutaListado: '/inventario/politicas',
        rutaCreacion: '/inventario/politicas/nueva',
        permisoVer: ['INVENTARIO.POLITICAS.VER', 'INVENTARIO.POLITICAS.CONFIGURAR'],
        permisoCrear: 'INVENTARIO.POLITICAS.CONFIGURAR',
      },
      {
        id: 'politicas-masivas-inventario',
        etiqueta: 'Aplicación masiva de políticas',
        icono: 'reportes',
        rutaListado: '/inventario/politicas/masivas',
        rutaCreacion: '/inventario/politicas/masivas/nueva',
        permisoVer: ['INVENTARIO.POLITICAS.VER', 'INVENTARIO.POLITICAS.CONFIGURAR', 'INVENTARIO.POLITICAS.APROBAR_MASIVA', 'INVENTARIO.POLITICAS.VER_CORPORATIVO', 'INVENTARIO.POLITICAS.APROBAR_MASIVA_CORPORATIVA'],
        permisoCrear: 'INVENTARIO.POLITICAS.CREAR_MASIVA',
      },
      {
        id: 'vencimientos-inventario',
        etiqueta: 'Alertas de vencimiento',
        icono: 'reportes',
        rutaListado: '/inventario/vencimientos',
        rutaCreacion: '/inventario/vencimientos',
        permisoVer: 'INVENTARIO.VENCIMIENTOS.VER',
        permisoCrear: 'INVENTARIO.VENCIMIENTOS.VER',
      },
      {
        id: 'conteos-inventario',
        etiqueta: 'Conteos físicos',
        icono: 'inventario',
        rutaListado: '/inventario/conteos',
        rutaCreacion: '/inventario/conteos/nuevo',
        permisoVer: 'INVENTARIO.CONTEOS.VER',
        permisoCrear: 'INVENTARIO.CONTEOS.CREAR',
      },
    ],
  },
  {
    id: 'compras',
    etiqueta: 'Compras y abastecimiento',
    icono: 'compras',
    prefijosPermiso: ['ABASTECIMIENTO.'],
    submodulos: [
      {
        id: 'proveedores-abastecimiento',
        etiqueta: 'Proveedores',
        icono: 'organizacion',
        rutaListado: '/abastecimiento/proveedores',
        rutaCreacion: '/abastecimiento/proveedores/nuevo',
        permisoVer: 'ABASTECIMIENTO.PROVEEDORES.VER',
        permisoCrear: 'ABASTECIMIENTO.PROVEEDORES.CREAR',
      },
      {
        id: 'solicitudes-abastecimiento',
        etiqueta: 'Solicitudes de compra',
        icono: 'compras',
        rutaListado: '/abastecimiento/solicitudes',
        rutaCreacion: '/abastecimiento/solicitudes/nuevo',
        permisoVer: 'ABASTECIMIENTO.SOLICITUDES.VER',
        permisoCrear: 'ABASTECIMIENTO.SOLICITUDES.CREAR',
      },
      {
        id: 'cotizaciones-abastecimiento',
        etiqueta: 'Cotizaciones',
        icono: 'compras',
        rutaListado: '/abastecimiento/cotizaciones',
        rutaCreacion: '/abastecimiento/cotizaciones/nuevo',
        permisoVer: 'ABASTECIMIENTO.COTIZACIONES.VER',
        permisoCrear: 'ABASTECIMIENTO.COTIZACIONES.CREAR',
      },
      {
        id: 'ordenes-abastecimiento',
        etiqueta: 'Órdenes de compra',
        icono: 'compras',
        rutaListado: '/abastecimiento/ordenes',
        rutaCreacion: '/abastecimiento/ordenes/nuevo',
        permisoVer: 'ABASTECIMIENTO.ORDENES.VER',
        permisoCrear: 'ABASTECIMIENTO.ORDENES.EMITIR',
      },
      {
        id: 'recepciones-abastecimiento',
        etiqueta: 'Recepciones',
        icono: 'inventario',
        rutaListado: '/abastecimiento/recepciones',
        rutaCreacion: '/abastecimiento/recepciones/nuevo',
        permisoVer: 'ABASTECIMIENTO.RECEPCIONES.VER',
        permisoCrear: 'ABASTECIMIENTO.RECEPCIONES.REGISTRAR',
      },
      {
        id: 'traslados-abastecimiento',
        etiqueta: 'Solicitudes de traslado',
        icono: 'inventario',
        rutaListado: '/abastecimiento/traslados',
        rutaCreacion: '/abastecimiento/traslados/nuevo',
        permisoVer: 'ABASTECIMIENTO.TRASLADOS.VER',
        permisoCrear: 'ABASTECIMIENTO.TRASLADOS.CREAR',
      },
      {
        id: 'recepciones-traslado-abastecimiento',
        etiqueta: 'Recepción de traslados',
        icono: 'inventario',
        rutaListado: '/abastecimiento/traslados/recepciones',
        rutaCreacion: '/abastecimiento/traslados/recepciones',
        permisoVer: 'ABASTECIMIENTO.TRASLADOS.RECIBIR',
        permisoCrear: 'ABASTECIMIENTO.TRASLADOS.RECIBIR',
      },
      {
        id: 'devoluciones-internas-abastecimiento',
        etiqueta: 'Devoluciones internas',
        icono: 'inventario',
        rutaListado: '/abastecimiento/devoluciones-internas',
        rutaCreacion: '/abastecimiento/devoluciones-internas/nueva',
        permisoVer: 'ABASTECIMIENTO.TRASLADOS.VER',
        permisoCrear: 'ABASTECIMIENTO.TRASLADOS.CREAR',
      },
      {
        id: 'ubicaciones-traslado-abastecimiento',
        etiqueta: 'Productos pendientes de ubicación',
        icono: 'inventario',
        rutaListado: '/abastecimiento/traslados/ubicaciones',
        rutaCreacion: '/abastecimiento/traslados/ubicaciones',
        permisoVer: 'ABASTECIMIENTO.TRASLADOS.UBICAR',
        permisoCrear: 'ABASTECIMIENTO.TRASLADOS.UBICAR',
      },
      {
        id: 'devoluciones-abastecimiento',
        etiqueta: 'Devoluciones a proveedores',
        icono: 'inventario',
        rutaListado: '/abastecimiento/devoluciones',
        rutaCreacion: '/abastecimiento/devoluciones/nuevo',
        permisoVer: 'ABASTECIMIENTO.DEVOLUCIONES.VER',
        permisoCrear: 'ABASTECIMIENTO.DEVOLUCIONES.CREAR',
      },
    ],
  },
  {
    id: 'caja',
    etiqueta: 'Caja y efectivo',
    icono: 'ventas',
    prefijosPermiso: ['CAJA.'],
    submodulos: [
      {
        id: 'caja-chica',
        etiqueta: 'Caja Chica',
        icono: 'ventas',
        rutaListado: '/caja/chica',
        rutaCreacion: '/caja/chica',
        permisoVer: 'CAJA.CHICA.VER',
        permisoCrear: 'CAJA.CHICA.CREAR',
      },
      {
        id: 'liquidaciones-caja-chica',
        etiqueta: 'Liquidaciones',
        icono: 'reportes',
        rutaListado: '/caja/liquidaciones',
        rutaCreacion: '/caja/liquidaciones',
        permisoVer: 'CAJA.LIQUIDACIONES.VER',
        permisoCrear: 'CAJA.LIQUIDACIONES.SOLICITAR',
      },
      {
        id: 'ventas-pendientes-caja',
        etiqueta: 'Cobros pendientes',
        icono: 'ventas',
        rutaListado: '/caja/ventas-pendientes',
        rutaCreacion: '/caja/ventas-pendientes',
        permisoVer: 'CAJA.VENTAS.COBRAR',
        permisoCrear: 'CAJA.VENTAS.COBRAR',
      },
      {
        id: 'turnos-caja',
        etiqueta: 'Turnos de caja',
        icono: 'reloj',
        rutaListado: '/caja/turnos',
        rutaCreacion: '/caja/turnos/nuevo',
        permisoVer: 'CAJA.TURNOS.VER',
        permisoCrear: 'CAJA.TURNOS.ABRIR',
      },
      {
        id: 'movimientos-caja',
        etiqueta: 'Movimientos',
        icono: 'reportes',
        rutaListado: '/caja/movimientos',
        rutaCreacion: '/caja/movimientos/nuevo',
        permisoVer: 'CAJA.MOVIMIENTOS.VER',
        permisoCrear: 'CAJA.MOVIMIENTOS.REGISTRAR',
      },
      {
        id: 'arqueos-caja',
        etiqueta: 'Arqueos',
        icono: 'reportes',
        rutaListado: '/caja/arqueos',
        rutaCreacion: '/caja/arqueos/nuevo',
        permisoVer: 'CAJA.ARQUEOS.VER',
        permisoCrear: 'CAJA.ARQUEOS.REGISTRAR',
      },
      {
        id: 'cierres-caja',
        etiqueta: 'Cierres',
        icono: 'reloj',
        rutaListado: '/caja/cierres',
        rutaCreacion: '/caja/cierres/nuevo',
        permisoVer: 'CAJA.CIERRES.VER',
        permisoCrear: 'CAJA.TURNOS.CERRAR',
      },
      {
        id: 'custodia-caja',
        etiqueta: 'Custodia y transferencias',
        icono: 'inventario',
        rutaListado: '/caja/transferencias',
        rutaCreacion: '/caja/transferencias/nueva',
        permisoVer: 'CAJA.TRANSFERENCIAS.VER',
        permisoCrear: 'CAJA.TRANSFERENCIAS.CREAR',
      },
      {
        id: 'depositos-caja',
        etiqueta: 'Depósitos bancarios',
        icono: 'reportes',
        rutaListado: '/caja/depositos',
        rutaCreacion: '/caja/depositos/nuevo',
        permisoVer: 'CAJA.DEPOSITOS.VER',
        permisoCrear: 'CAJA.DEPOSITOS.PREPARAR',
      },
      {
        id: 'rendiciones-caja',
        etiqueta: 'Rendiciones de repartidores',
        icono: 'ventas',
        rutaListado: '/caja/rendiciones',
        rutaCreacion: '/caja/rendiciones/nueva',
        permisoVer: 'CAJA.RENDICIONES.VER',
        permisoCrear: 'CAJA.RENDICIONES.REGISTRAR',
      },
      {
        id: 'conciliaciones-caja',
        etiqueta: 'Conciliaciones',
        icono: 'reportes',
        rutaListado: '/caja/conciliaciones',
        rutaCreacion: '/caja/conciliaciones/nueva',
        permisoVer: 'CAJA.CONCILIACIONES.VER',
        permisoCrear: 'CAJA.CONCILIACIONES.CREAR',
      },
      {
        id: 'consolidaciones-caja',
        etiqueta: 'Consolidaciones',
        icono: 'reportes',
        rutaListado: '/caja/consolidaciones',
        rutaCreacion: '/caja/consolidaciones/nueva',
        permisoVer: 'CAJA.CONSOLIDACIONES.VER',
        permisoCrear: 'CAJA.CONSOLIDACIONES.GENERAR',
      },
      {
        id: 'incidencias-caja',
        etiqueta: 'Incidencias',
        icono: 'reportes',
        rutaListado: '/caja/incidencias',
        rutaCreacion: '/caja/incidencias/nueva',
        permisoVer: 'CAJA.INCIDENCIAS.VER',
        permisoCrear: 'CAJA.INCIDENCIAS.CREAR',
      },
      {
        id: 'configuracion-caja',
        etiqueta: 'Configuración',
        icono: 'estado',
        rutaListado: '/caja/configuracion',
        rutaCreacion: '/caja/configuracion',
        permisoVer: ['CAJA.CAJAS.VER', 'CAJA.POLITICAS.VER'],
        permisoCrear: 'CAJA.CAJAS.CREAR',
      },
      {
        id: 'denominaciones-caja',
        etiqueta: 'Denominaciones',
        icono: 'estado',
        rutaListado: '/caja/denominaciones',
        rutaCreacion: '/caja/denominaciones',
        permisoVer: 'CAJA.DENOMINACIONES.VER',
        permisoCrear: 'CAJA.DENOMINACIONES.CREAR',
      },
    ],
  },
  {
    id: 'planillas',
    etiqueta: 'Planillas',
    icono: 'reportes',
    prefijosPermiso: ['PLANILLAS.'],
    submodulos: [
      {
        id: 'periodos-planilla',
        etiqueta: 'Periodos de planilla',
        icono: 'reportes',
        rutaListado: '/planillas',
        rutaCreacion: '/planillas/nuevo',
        permisoVer: 'PLANILLAS.PERIODOS.VER',
        permisoCrear: 'PLANILLAS.PERIODOS.GENERAR',
      },
      {
        id: 'configuracion-salarial',
        etiqueta: 'Configuración salarial',
        icono: 'usuarios',
        rutaListado: '/planillas/configuracion-salarial',
        rutaCreacion: '/planillas/configuracion-salarial',
        permisoVer: 'PLANILLAS.CONFIGURACION_SALARIAL.VER',
        permisoCrear: 'PLANILLAS.CONFIGURACION_SALARIAL.ACTUALIZAR',
      },
    ],
  },
  {
    id: 'activos',
    etiqueta: 'Activos administrativos',
    icono: 'inventario',
    prefijosPermiso: ['ACTIVOS.'],
    submodulos: [
      { id: 'activos-registro', etiqueta: 'Activos', icono: 'inventario', rutaListado: '/activos', rutaCreacion: '/activos/nuevo', permisoVer: 'ACTIVOS.ACTIVOS.VER', permisoCrear: 'ACTIVOS.ACTIVOS.CREAR' },
      { id: 'activos-asignaciones', etiqueta: 'Asignaciones', icono: 'usuarios', rutaListado: '/activos/asignaciones', rutaCreacion: '/activos/asignaciones/nueva', permisoVer: 'ACTIVOS.ASIGNACIONES.VER', permisoCrear: 'ACTIVOS.ASIGNACIONES.CREAR' },
      { id: 'activos-devoluciones', etiqueta: 'Devoluciones', icono: 'estado', rutaListado: '/activos/devoluciones', rutaCreacion: '/activos/devoluciones', permisoVer: 'ACTIVOS.ASIGNACIONES.VER_DEVOLUCIONES', permisoCrear: 'ACTIVOS.ASIGNACIONES.VER_DEVOLUCIONES' },
      { id: 'activos-propios', etiqueta: 'Mis activos', icono: 'usuarios', rutaListado: '/activos/mis-asignaciones', rutaCreacion: '/activos/mis-asignaciones', permisoVer: 'ACTIVOS.ASIGNACIONES.VER_PROPIAS', permisoCrear: 'ACTIVOS.ASIGNACIONES.VER_PROPIAS' },
      { id: 'activos-devoluciones-propias', etiqueta: 'Mis devoluciones', icono: 'estado', rutaListado: '/activos/mis-devoluciones', rutaCreacion: '/activos/mis-devoluciones', permisoVer: 'ACTIVOS.ASIGNACIONES.VER_PROPIAS', permisoCrear: 'ACTIVOS.ASIGNACIONES.VER_PROPIAS' },
      { id: 'activos-tipos', etiqueta: 'Tipos de activo', icono: 'estado', rutaListado: '/activos/tipos', rutaCreacion: '/activos/tipos/nuevo', permisoVer: 'ACTIVOS.TIPOS.VER', permisoCrear: 'ACTIVOS.TIPOS.CREAR' },
    ],
  },
  {
    id: 'catalogos',
    etiqueta: 'Catálogos',
    icono: 'inventario',
    prefijosPermiso: ['CATALOGOS.'],
    submodulos: [
      { id: 'laboratorios', etiqueta: 'Laboratorios', icono: 'inventario', rutaListado: '/catalogos/laboratorios', rutaCreacion: '/catalogos/laboratorios/nuevo', permisoVer: 'CATALOGOS.LABORATORIOS.VER', permisoCrear: 'CATALOGOS.LABORATORIOS.CREAR' },
      { id: 'presentaciones', etiqueta: 'Presentaciones', icono: 'inventario', rutaListado: '/catalogos/presentaciones', rutaCreacion: '/catalogos/presentaciones/nuevo', permisoVer: 'CATALOGOS.PRESENTACIONES.VER', permisoCrear: 'CATALOGOS.PRESENTACIONES.CREAR' },
      { id: 'principios-activos', etiqueta: 'Principios activos', icono: 'inventario', rutaListado: '/catalogos/principios-activos', rutaCreacion: '/catalogos/principios-activos/nuevo', permisoVer: 'CATALOGOS.PRINCIPIOS_ACTIVOS.VER', permisoCrear: 'CATALOGOS.PRINCIPIOS_ACTIVOS.CREAR' },
      { id: 'unidades-medida', etiqueta: 'Unidades de medida', icono: 'inventario', rutaListado: '/catalogos/unidades-medida', rutaCreacion: '/catalogos/unidades-medida/nuevo', permisoVer: 'CATALOGOS.UNIDADES_MEDIDA.VER', permisoCrear: 'CATALOGOS.UNIDADES_MEDIDA.CREAR' },
      { id: 'categorias-terapeuticas', etiqueta: 'Categorías terapéuticas', icono: 'inventario', rutaListado: '/catalogos/categorias-terapeuticas', rutaCreacion: '/catalogos/categorias-terapeuticas/nuevo', permisoVer: 'CATALOGOS.CATEGORIAS_TERAPEUTICAS.VER', permisoCrear: 'CATALOGOS.CATEGORIAS_TERAPEUTICAS.CREAR' },
      { id: 'formas-farmaceuticas', etiqueta: 'Formas farmacéuticas', icono: 'inventario', rutaListado: '/catalogos/formas-farmaceuticas', rutaCreacion: '/catalogos/formas-farmaceuticas/nuevo', permisoVer: 'CATALOGOS.FORMAS_FARMACEUTICAS.VER', permisoCrear: 'CATALOGOS.FORMAS_FARMACEUTICAS.CREAR' },
      { id: 'vias-administracion', etiqueta: 'Vías de administración', icono: 'inventario', rutaListado: '/catalogos/vias-administracion', rutaCreacion: '/catalogos/vias-administracion/nuevo', permisoVer: 'CATALOGOS.VIAS_ADMINISTRACION.VER', permisoCrear: 'CATALOGOS.VIAS_ADMINISTRACION.CREAR' },
      {
        id: 'productos',
        etiqueta: 'Productos y medicamentos',
        icono: 'inventario',
        rutaListado: '/catalogos/productos',
        rutaCreacion: '/catalogos/productos/nuevo',
        permisoVer: 'CATALOGOS.PRODUCTOS.VER',
        permisoCrear: 'CATALOGOS.PRODUCTOS.CREAR',
      },
      {
        id: 'estados',
        etiqueta: 'Estados',
        icono: 'estado',
        rutaListado: '/catalogos/estados',
        rutaCreacion: '/catalogos/estados/nuevo',
        permisoVer: 'CATALOGOS.ESTADOS.VER',
        permisoCrear: 'CATALOGOS.ESTADOS.CREAR',
      },
    ],
  },
  {
    id: 'organizacion',
    etiqueta: 'Organización',
    icono: 'organizacion',
    prefijosPermiso: ['ORGANIZACION.'],
    submodulos: [
      {
        id: 'empleados',
        etiqueta: 'Empleados',
        icono: 'usuarios',
        rutaListado: '/empleados',
        rutaCreacion: '/empleados/nuevo',
        permisoVer: 'ORGANIZACION.EMPLEADOS.VER',
        permisoCrear: 'ORGANIZACION.EMPLEADOS.CREAR',
      },
      {
        id: 'departamentos',
        etiqueta: 'Departamentos',
        icono: 'departamento',
        rutaListado: '/organizacion/departamentos',
        rutaCreacion: '/organizacion/departamentos/nuevo',
        permisoVer: 'ORGANIZACION.DEPARTAMENTOS.VER',
        permisoCrear: 'ORGANIZACION.DEPARTAMENTOS.CREAR',
      },
      {
        id: 'puestos',
        etiqueta: 'Puestos',
        icono: 'puesto',
        rutaListado: '/organizacion/puestos',
        rutaCreacion: '/organizacion/puestos/nuevo',
        permisoVer: 'ORGANIZACION.PUESTOS.VER',
        permisoCrear: 'ORGANIZACION.PUESTOS.CREAR',
      },
      {
        id: 'sucursales',
        etiqueta: 'Sucursales',
        icono: 'sucursal',
        rutaListado: '/organizacion/sucursales',
        rutaCreacion: '/organizacion/sucursales/nuevo',
        permisoVer: 'ORGANIZACION.SUCURSALES.VER',
        permisoCrear: 'ORGANIZACION.SUCURSALES.CREAR',
      },
    ],
  },
  {
    id: 'seguridad',
    etiqueta: 'Seguridad',
    icono: 'seguridad',
    prefijosPermiso: ['SEGURIDAD.'],
    submodulos: [
      {
        id: 'roles',
        etiqueta: 'Roles y permisos',
        icono: 'llave',
        rutaListado: '/seguridad/roles',
        rutaCreacion: '/seguridad/roles/nuevo',
        permisoVer: 'SEGURIDAD.ROLES.VER',
        permisoCrear: 'SEGURIDAD.ROLES.CREAR',
      },
      {
        id: 'usuarios',
        etiqueta: 'Usuarios',
        icono: 'usuarios',
        rutaListado: '/seguridad/usuarios',
        rutaCreacion: '/seguridad/usuarios/nuevo',
        permisoVer: 'SEGURIDAD.USUARIOS.VER',
        permisoCrear: 'SEGURIDAD.USUARIOS.CREAR',
      },
    ],
  },
  {
    id: 'reportes',
    etiqueta: 'Reportes',
    icono: 'reportes',
    prefijosPermiso: ['REPORTES.'],
    submodulos: [
      {
        id: 'reportes-comerciales',
        etiqueta: 'Comercial',
        icono: 'reportes',
        rutaListado: '/reportes/comercial',
        rutaCreacion: '/reportes/comercial',
        permisoVer: ['REPORTES.RESUMEN.VER', 'REPORTES.VENTAS.VER', 'REPORTES.CLIENTES.VER'],
        permisoCrear: ['REPORTES.RESUMEN.VER', 'REPORTES.VENTAS.VER', 'REPORTES.CLIENTES.VER'],
      },
      {
        id: 'reportes-inventario-abastecimiento',
        etiqueta: 'Inventario y abastecimiento',
        icono: 'inventario',
        rutaListado: '/reportes/inventario-abastecimiento',
        rutaCreacion: '/reportes/inventario-abastecimiento',
        permisoVer: ['REPORTES.INVENTARIO.VER', 'REPORTES.PROVEEDORES.VER', 'REPORTES.COSTOS.VER'],
        permisoCrear: ['REPORTES.INVENTARIO.VER', 'REPORTES.PROVEEDORES.VER', 'REPORTES.COSTOS.VER'],
      },
      {
        id: 'reportes-finanzas-sucursales',
        etiqueta: 'Finanzas y sucursales',
        icono: 'reportes',
        rutaListado: '/reportes/finanzas-sucursales',
        rutaCreacion: '/reportes/finanzas-sucursales',
        permisoVer: 'REPORTES.RESUMEN.VER',
        permisoCrear: 'REPORTES.RESUMEN.VER',
        permisosRequeridos: ['REPORTES.ALCANCE_GLOBAL'],
      },
    ],
  },
]

const accesos: AccesoRapido[] = [
  {
    id: 'activos',
    titulo: 'Activos administrativos',
    descripcion: 'Registra bienes, custodios y devoluciones de la sucursal.',
    permiso: 'ACTIVOS.',
    icono: 'inventario' as const,
  },
  {
    id: 'inventario',
    titulo: 'Existencias de inventario',
    descripcion: 'Consulta cantidades, ubicaciones, lotes y estados operativos.',
    permiso: 'INVENTARIO.EXISTENCIAS.',
    permisoExacto: 'INVENTARIO.EXISTENCIAS.VER',
    icono: 'inventario' as const,
  },
  {
    id: 'productos',
    titulo: 'Productos y medicamentos',
    descripcion: 'Administra el catálogo farmacéutico y su composición.',
    permiso: 'CATALOGOS.PRODUCTOS.',
    icono: 'inventario' as const,
  },
  {
    id: 'estados',
    titulo: 'Estados',
    descripcion: 'Administra el catálogo general de estados.',
    permiso: 'CATALOGOS.ESTADOS.',
    icono: 'inventario' as const,
  },
  {
    id: 'empleados',
    titulo: 'Empleados',
    descripcion: 'Consulta y administra el personal registrado.',
    permiso: 'ORGANIZACION.EMPLEADOS.',
    icono: 'usuarios' as const,
  },
  {
    id: 'departamentos',
    titulo: 'Departamentos organizacionales',
    descripcion: 'Administra las áreas que estructuran la organización.',
    permiso: 'ORGANIZACION.DEPARTAMENTOS.',
    icono: 'organizacion' as const,
  },
  {
    id: 'puestos',
    titulo: 'Puestos organizacionales',
    descripcion: 'Administra los cargos definidos en cada departamento.',
    permiso: 'ORGANIZACION.PUESTOS.',
    icono: 'organizacion' as const,
  },
  {
    id: 'sucursales',
    titulo: 'Sucursales',
    descripcion: 'Consulta la estructura operativa de la farmacia.',
    permiso: 'ORGANIZACION.SUCURSALES.',
    icono: 'sucursal' as const,
  },
  {
    id: 'usuarios',
    titulo: 'Usuarios',
    descripcion: 'Gestiona accesos y estado de las cuentas.',
    permiso: 'SEGURIDAD.USUARIOS.',
    icono: 'seguridad' as const,
  },
  {
    id: 'roles',
    titulo: 'Roles y permisos',
    descripcion: 'Configura responsabilidades y autorizaciones.',
    permiso: 'SEGURIDAD.ROLES.',
    icono: 'llave' as const,
  },
]

function obtenerIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

function AvatarSesion({ sesion }: { sesion: SesionUsuario }) {
  const [revisionFoto, setRevisionFoto] = useState(0)
  const [mostrarFoto, setMostrarFoto] = useState(true)

  useEffect(() => {
    const actualizarFoto = (event: Event) => {
      const detalle = (event as CustomEvent<{ empleadoId?: string }>).detail
      if (detalle?.empleadoId !== sesion.empleadoId) return

      setMostrarFoto(true)
      setRevisionFoto(Date.now())
    }

    window.addEventListener(EVENTO_FOTO_EMPLEADO_ACTUALIZADA, actualizarFoto)
    return () => window.removeEventListener(EVENTO_FOTO_EMPLEADO_ACTUALIZADA, actualizarFoto)
  }, [sesion.empleadoId])

  return (
    <span className={styles.avatar} aria-hidden="true">
      <span>{obtenerIniciales(sesion.empleadoNombre)}</span>
      {mostrarFoto && (
        <img
          src={`${construirUrlApi('/autenticacion/mi-foto')}?v=${revisionFoto}`}
          alt=""
          crossOrigin="use-credentials"
          onError={() => setMostrarFoto(false)}
        />
      )}
    </span>
  )
}

export function DashboardView({
  sesion,
  cerrandoSesion,
  errorCierre,
  onCerrarSesion,
  rutaActual,
  onNavegar,
  contenido,
}: DashboardViewProps) {
  const [esPantallaMovil, setEsPantallaMovil] = useState(
    () => window.matchMedia('(max-width: 58rem)').matches,
  )
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [sidebarOculto, setSidebarOculto] = useState(false)
  const [despliegueManual, setDespliegueManual] = useState<Record<string, boolean>>({})
  const [seleccionManual, setSeleccionManual] = useState<{
    ruta: string
    seccionId: string | null
  } | null>(null)
  const [perfilAbierto, setPerfilAbierto] = useState(false)
  const [avisoModulo, setAvisoModulo] = useState<string | null>(null)
  const perfilRef = useRef<HTMLDivElement>(null)

  const permisos = useMemo(() => new Set(sesion.permisos), [sesion.permisos])
  const tienePrefijo = (prefijo: string) =>
    [...permisos].some((permiso) => permiso.startsWith(prefijo))
  const puedeCrearRoles = permisos.has('SEGURIDAD.ROLES.CREAR')
    && permisos.has('SEGURIDAD.PERMISOS.VER')
    && permisos.has('SEGURIDAD.PERMISOS.ASIGNAR')

  const navegacionVisible = secciones.filter(
    (seccion) =>
      !seccion.prefijosPermiso ||
      seccion.prefijosPermiso.some((prefijo) => tienePrefijo(prefijo)),
  )

  const accesosVisibles = accesos.filter((acceso) => {
    if (acceso.id === 'empleados' || acceso.id === 'departamentos' || acceso.id === 'puestos' || acceso.id === 'sucursales') {
      const recurso = acceso.id === 'empleados'
        ? 'EMPLEADOS'
        : acceso.id === 'departamentos'
          ? 'DEPARTAMENTOS'
          : acceso.id === 'puestos'
            ? 'PUESTOS'
            : 'SUCURSALES'
      return permisos.has(`ORGANIZACION.${recurso}.VER`) || permisos.has(`ORGANIZACION.${recurso}.CREAR`)
    }
    if (acceso.id === 'roles') {
      return permisos.has('SEGURIDAD.ROLES.VER') || puedeCrearRoles
    }
    if (acceso.id === 'usuarios') {
      return permisos.has('SEGURIDAD.USUARIOS.VER') || permisos.has('SEGURIDAD.USUARIOS.CREAR')
    }
    return acceso.permisoExacto
      ? permisos.has(acceso.permisoExacto)
      : tienePrefijo(acceso.permiso)
  })
  const esVistaEmpleados = rutaActual.startsWith('/empleados')
  const esVistaDepartamentos = rutaActual.startsWith('/organizacion/departamentos')
  const esVistaPuestos = rutaActual.startsWith('/organizacion/puestos')
  const esVistaSucursales = rutaActual.startsWith('/organizacion/sucursales')
  const esVistaRoles = rutaActual.startsWith('/seguridad/roles')
  const esVistaUsuarios = rutaActual.startsWith('/seguridad/usuarios')
  const esVistaEstados = rutaActual.startsWith('/catalogos/estados')
  const esVistaProductos = rutaActual.startsWith('/catalogos/productos')
  const tituloPagina = rutaActual === '/notificaciones'
    ? 'Notificaciones'
    : rutaActual.startsWith('/reportes/inventario-abastecimiento')
      ? 'Reportes de inventario y abastecimiento'
    : rutaActual.startsWith('/reportes/finanzas-sucursales')
      ? 'Reportes de finanzas y sucursales'
    : rutaActual.startsWith('/reportes')
      ? 'Reportes comerciales'
    : rutaActual.startsWith('/planillas/configuracion-salarial')
      ? 'Configuración salarial'
    : rutaActual.startsWith('/planillas')
      ? 'Planillas'
    : rutaActual.startsWith('/activos/mis-asignaciones')
      ? 'Mis activos asignados'
    : rutaActual.startsWith('/activos/mis-devoluciones')
      ? 'Mis devoluciones de activos'
    : rutaActual.startsWith('/activos/devoluciones')
      ? 'Devoluciones de activos'
    : rutaActual.startsWith('/activos/asignaciones')
      ? 'Asignaciones de activos'
    : rutaActual.startsWith('/activos/tipos')
      ? 'Tipos de activo'
    : rutaActual.startsWith('/activos')
      ? 'Activos administrativos'
    : rutaActual.startsWith('/clientes')
      ? 'Clientes'
    : rutaActual.startsWith('/comercial/politicas-margen')
      ? 'Políticas de margen'
      : rutaActual.startsWith('/comercial/precios')
        ? 'Precios'
      : rutaActual.startsWith('/ventas/recetas')
        ? 'Validación de recetas'
      : rutaActual.startsWith('/ventas/realizadas')
        ? 'Ventas realizadas'
      : rutaActual.startsWith('/ventas')
        ? 'Ventas'
      : rutaActual.startsWith('/caja/chica')
        ? 'Caja Chica'
      : rutaActual.startsWith('/caja/liquidaciones')
        ? 'Liquidaciones de Caja Chica'
      : rutaActual.startsWith('/caja/ventas-pendientes')
        ? 'Cobros pendientes'
      : rutaActual.startsWith('/abastecimiento/proveedores')
        ? 'Proveedores'
    : rutaActual.startsWith('/abastecimiento/solicitudes')
      ? 'Solicitudes de compra'
      : rutaActual.startsWith('/abastecimiento/cotizaciones')
        ? 'Cotizaciones'
      : rutaActual.startsWith('/abastecimiento/ordenes')
        ? 'Órdenes de compra'
      : rutaActual.startsWith('/abastecimiento/recepciones')
        ? 'Recepciones'
      : rutaActual.startsWith('/abastecimiento/devoluciones-internas')
        ? 'Devoluciones internas'
      : rutaActual.startsWith('/abastecimiento/traslados/recepciones')
        ? 'Recepción de traslados'
      : rutaActual.startsWith('/abastecimiento/traslados/ubicaciones')
        ? 'Productos pendientes de ubicación'
      : rutaActual.startsWith('/abastecimiento/traslados')
        ? 'Solicitudes de traslado'
      : rutaActual.startsWith('/abastecimiento/devoluciones')
        ? 'Devoluciones a proveedores'
        : rutaActual === '/inventario/existencias'
    ? 'Existencias de inventario'
    : rutaActual.startsWith('/inventario/existencias/')
      ? 'Detalle de existencia'
    : rutaActual === '/inventario/ubicaciones/nueva'
      ? 'Nueva ubicación de inventario'
      : rutaActual === '/inventario/ubicaciones'
        ? 'Ubicaciones de inventario'
      : rutaActual === '/inventario/kardex'
        ? 'Kardex de inventario'
        : rutaActual === '/inventario/apertura/nueva'
          ? 'Nueva apertura controlada'
          : rutaActual === '/inventario/apertura'
            ? 'Aperturas controladas'
            : rutaActual.startsWith('/inventario/apertura/')
              ? 'Detalle de apertura controlada'
            : rutaActual === '/inventario/ajustes/nuevo'
              ? 'Nuevo ajuste de cantidad'
              : rutaActual === '/inventario/ajustes'
                ? 'Ajustes de cantidad'
                : rutaActual.startsWith('/inventario/ajustes/')
                  ? 'Detalle de ajuste de cantidad'
                  : rutaActual === '/inventario/costos/regularizar'
                    ? 'Regularizar costo unitario'
                    : rutaActual === '/inventario/costos'
                      ? 'Regularización de costos'
            : rutaActual === '/inventario/politicas/masivas/nueva'
              ? 'Nueva aplicación masiva de políticas'
              : rutaActual === '/inventario/politicas/masivas'
                ? 'Aplicación masiva de políticas'
                : rutaActual === '/inventario/politicas/nueva'
                  ? 'Nueva política de stock'
                  : rutaActual === '/inventario/politicas'
                    ? 'Políticas de stock'
              : rutaActual === '/inventario/vencimientos'
                ? 'Alertas de vencimiento'
                : rutaActual === '/inventario/conteos/nuevo'
                  ? 'Nuevo conteo físico'
                  : rutaActual.startsWith('/inventario/conteos')
                    ? 'Conteos físicos'
      : rutaActual.startsWith('/catalogos/laboratorios')
    ? 'Laboratorios'
    : rutaActual.startsWith('/catalogos/presentaciones')
      ? 'Presentaciones'
      : rutaActual.startsWith('/catalogos/principios-activos')
        ? 'Principios activos'
        : rutaActual.startsWith('/catalogos/unidades-medida')
          ? 'Unidades de medida'
          : rutaActual.startsWith('/catalogos/categorias-terapeuticas')
            ? 'Categorías terapéuticas'
            : rutaActual.startsWith('/catalogos/formas-farmaceuticas')
              ? 'Formas farmacéuticas'
              : rutaActual.startsWith('/catalogos/vias-administracion')
                ? 'Vías de administración'
          : rutaActual === '/catalogos/productos'
    ? 'Productos y medicamentos'
    : rutaActual === '/catalogos/productos/nuevo'
      ? 'Registrar medicamento'
      : rutaActual.endsWith('/editar') && esVistaProductos
        ? 'Editar medicamento'
        : esVistaProductos
          ? 'Detalle del medicamento'
          : rutaActual === '/empleados'
    ? 'Empleados'
    : rutaActual === '/empleados/nuevo'
      ? 'Registrar empleado'
      : rutaActual.endsWith('/editar') && esVistaEmpleados
        ? 'Editar empleado'
        : esVistaEmpleados
          ? 'Detalle del empleado'
          : rutaActual === '/organizacion/departamentos'
            ? 'Departamentos organizacionales'
            : rutaActual === '/organizacion/departamentos/nuevo'
              ? 'Crear departamento'
              : rutaActual.endsWith('/editar') && esVistaDepartamentos
                ? 'Editar departamento'
                : esVistaDepartamentos
                  ? 'Detalle del departamento'
                  : rutaActual === '/organizacion/puestos'
                    ? 'Puestos organizacionales'
                    : rutaActual === '/organizacion/puestos/nuevo'
                      ? 'Crear puesto'
                      : rutaActual.endsWith('/editar') && esVistaPuestos
                        ? 'Editar puesto'
                        : esVistaPuestos
                          ? 'Detalle del puesto'
                          : rutaActual === '/organizacion/sucursales'
                            ? 'Sucursales'
                            : rutaActual === '/organizacion/sucursales/nuevo'
                              ? 'Crear sucursal'
                              : rutaActual.endsWith('/editar') && esVistaSucursales
                                ? 'Editar sucursal'
                                : esVistaSucursales
                                  ? 'Detalle de la sucursal'
                          : rutaActual === '/seguridad/usuarios'
                            ? 'Usuarios'
                            : rutaActual === '/seguridad/usuarios/nuevo'
                              ? 'Crear usuario'
                              : rutaActual.endsWith('/editar') && esVistaUsuarios
                                ? 'Editar usuario'
                                : esVistaUsuarios
                                  ? 'Detalle del usuario'
                          : rutaActual === '/seguridad/roles'
            ? 'Roles y permisos'
            : rutaActual === '/seguridad/roles/nuevo'
              ? 'Crear rol'
              : rutaActual.endsWith('/editar') && esVistaRoles
                ? 'Editar rol'
                : esVistaRoles
                  ? 'Detalle del rol'
                  : rutaActual === '/catalogos/estados'
                    ? 'Catálogo de estados'
                    : rutaActual === '/catalogos/estados/nuevo'
                      ? 'Crear estado'
                      : rutaActual.endsWith('/editar') && esVistaEstados
                        ? 'Editar estado'
                        : esVistaEstados
                          ? 'Detalle del estado'
                          : 'Panel principal'
  const sidebarVisible = esPantallaMovil ? menuMovilAbierto : !sidebarOculto
  const seccionSeleccionadaId = seleccionManual?.ruta === rutaActual
    ? seleccionManual.seccionId
    : obtenerSeccionPorRuta(rutaActual)

  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 58rem)')
    const actualizarPantalla = (event: MediaQueryListEvent) => {
      setEsPantallaMovil(event.matches)
      if (!event.matches) setMenuMovilAbierto(false)
    }

    consulta.addEventListener('change', actualizarPantalla)
    return () => consulta.removeEventListener('change', actualizarPantalla)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [rutaActual])

  useEffect(() => {
    const manejarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuMovilAbierto(false)
        setPerfilAbierto(false)
      }
    }

    const manejarClickExterior = (event: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(event.target as Node)) {
        setPerfilAbierto(false)
      }
    }

    document.addEventListener('keydown', manejarEscape)
    document.addEventListener('mousedown', manejarClickExterior)
    return () => {
      document.removeEventListener('keydown', manejarEscape)
      document.removeEventListener('mousedown', manejarClickExterior)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = esPantallaMovil && menuMovilAbierto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [esPantallaMovil, menuMovilAbierto])

  const abrirSidebar = () => {
    if (esPantallaMovil) setMenuMovilAbierto(true)
    else setSidebarOculto(false)
  }

  const ocultarSidebar = () => {
    if (esPantallaMovil) setMenuMovilAbierto(false)
    else setSidebarOculto(true)
  }

  const anunciarModulo = (nombre: string) => {
    setAvisoModulo(`${nombre} se integrará en la siguiente etapa del frontend.`)
    setMenuMovilAbierto(false)
  }

  const establecerSeccionExpandida = (seccionId: string | null) => {
    setDespliegueManual(Object.fromEntries(
      navegacionVisible.map((seccion) => [seccion.id, seccion.id === seccionId]),
    ))
  }

  const seccionExpandida = (seccion: SeccionNavegacion) =>
    seleccionManual?.ruta === rutaActual
      ? (despliegueManual[seccion.id] ?? seccionActiva(seccion))
      : seccionActiva(seccion)

  const manejarSeccion = (seccion: SeccionNavegacion) => {
    if (submodulosVisibles(seccion).length > 0) {
      const expandida = seccionExpandida(seccion)
      setSeleccionManual({
        ruta: rutaActual,
        seccionId: expandida ? null : seccion.id,
      })
      establecerSeccionExpandida(expandida ? null : seccion.id)
      return
    }

    setSeleccionManual({ ruta: rutaActual, seccionId: seccion.id })
    establecerSeccionExpandida(null)
    setMenuMovilAbierto(false)
    if (seccion.id === 'inicio') {
      onNavegar('/')
      return
    }
    anunciarModulo(seccion.etiqueta)
  }

  const submodulosVisibles = (seccion: SeccionNavegacion) =>
    (seccion.submodulos ?? []).filter(
      (submodulo) => {
        const permitido = tieneAlgunPermiso(permisos, submodulo.permisoVer) || tieneAlgunPermiso(permisos, submodulo.permisoCrear)
        const cumpleAdicionales = (submodulo.permisosRequeridos ?? []).every((permiso) => permisos.has(permiso))
        const requiereConsultaInventario = seccion.id === 'inventario' && !['existencias-inventario', 'costos-inventario', 'politicas-inventario', 'politicas-masivas-inventario'].includes(submodulo.id)
        return permitido && cumpleAdicionales && (!requiereConsultaInventario || permisos.has('INVENTARIO.EXISTENCIAS.VER'))
      },
    )

  const manejarSubmodulo = (seccionId: string, submodulo: SubmoduloNavegacion) => {
    setSeleccionManual({ ruta: rutaActual, seccionId })
    establecerSeccionExpandida(seccionId)
    setMenuMovilAbierto(false)
    onNavegar(
      tieneAlgunPermiso(permisos, submodulo.permisoVer)
        ? submodulo.rutaListado
        : submodulo.rutaCreacion,
    )
  }

  const abrirAccesoRapido = (acceso: AccesoRapido) => {
    if (acceso.id === 'inventario') onNavegar('/inventario/existencias')
    else if (acceso.id === 'activos') onNavegar(permisos.has('ACTIVOS.ACTIVOS.VER') ? '/activos' : permisos.has('ACTIVOS.ASIGNACIONES.VER') ? '/activos/asignaciones' : permisos.has('ACTIVOS.ASIGNACIONES.VER_DEVOLUCIONES') ? '/activos/devoluciones' : permisos.has('ACTIVOS.ASIGNACIONES.VER_PROPIAS') ? '/activos/mis-asignaciones' : '/activos/tipos')
    else if (acceso.id === 'productos') onNavegar(permisos.has('CATALOGOS.PRODUCTOS.VER') ? '/catalogos/productos' : '/catalogos/productos/nuevo')
    else if (acceso.id === 'empleados') onNavegar(permisos.has('ORGANIZACION.EMPLEADOS.VER') ? '/empleados' : '/empleados/nuevo')
    else if (acceso.id === 'departamentos') onNavegar(permisos.has('ORGANIZACION.DEPARTAMENTOS.VER') ? '/organizacion/departamentos' : '/organizacion/departamentos/nuevo')
    else if (acceso.id === 'puestos') onNavegar(permisos.has('ORGANIZACION.PUESTOS.VER') ? '/organizacion/puestos' : '/organizacion/puestos/nuevo')
    else if (acceso.id === 'sucursales') onNavegar(permisos.has('ORGANIZACION.SUCURSALES.VER') ? '/organizacion/sucursales' : '/organizacion/sucursales/nuevo')
    else if (acceso.id === 'estados') onNavegar(permisos.has('CATALOGOS.ESTADOS.VER') ? '/catalogos/estados' : '/catalogos/estados/nuevo')
    else if (acceso.id === 'roles') onNavegar(permisos.has('SEGURIDAD.ROLES.VER') ? '/seguridad/roles' : '/seguridad/roles/nuevo')
    else if (acceso.id === 'usuarios') onNavegar(permisos.has('SEGURIDAD.USUARIOS.VER') ? '/seguridad/usuarios' : '/seguridad/usuarios/nuevo')
    else anunciarModulo(acceso.titulo)
  }

  const submoduloActivo = (submodulo: SubmoduloNavegacion) => {
    const coincide = (ruta: string) => rutaActual === ruta || rutaActual.startsWith(`${ruta}/`)
    if (!coincide(submodulo.rutaListado)) return false

    const rutaMasEspecifica = secciones
      .flatMap((seccion) => seccion.submodulos ?? [])
      .filter((candidato) => coincide(candidato.rutaListado))
      .reduce((mayor, candidato) => candidato.rutaListado.length > mayor.length ? candidato.rutaListado : mayor, '')

    return submodulo.rutaListado === rutaMasEspecifica
  }

  const seccionActiva = (seccion: SeccionNavegacion) =>
    (seccion.id === 'inicio' && rutaActual === '/') ||
    (seccion.id === 'ventas' && (rutaActual.startsWith('/clientes') || rutaActual.startsWith('/comercial/') || rutaActual.startsWith('/ventas'))) ||
    (seccion.id === 'compras' && rutaActual.startsWith('/abastecimiento/')) ||
    (seccion.id === 'inventario' && rutaActual.startsWith('/inventario/')) ||
    (seccion.id === 'activos' && rutaActual.startsWith('/activos')) ||
    (seccion.id === 'caja' && rutaActual.startsWith('/caja/')) ||
    (seccion.id === 'planillas' && rutaActual.startsWith('/planillas')) ||
    (seccion.id === 'reportes' && rutaActual.startsWith('/reportes')) ||
    (seccion.id === 'catalogos' && rutaActual.startsWith('/catalogos/')) ||
    (seccion.id === 'organizacion' && (esVistaEmpleados || esVistaDepartamentos || esVistaPuestos || esVistaSucursales)) ||
    (seccion.id === 'seguridad' && (esVistaRoles || esVistaUsuarios))

  return (
    <div className={styles.aplicacion}>
      <a className={styles.saltarContenido} href="#contenido-principal">
        Saltar al contenido principal
      </a>

      <aside
        id="navegacion-principal"
        className={`${styles.sidebar} ${sidebarVisible ? styles.sidebarAbierto : styles.sidebarOculto}`}
        aria-label="Navegación principal"
        aria-hidden={!sidebarVisible}
        inert={!sidebarVisible ? true : undefined}
      >
        <div className={styles.marcaSidebar}>
          <div className={styles.contextoSucursal}>
            <span className={styles.iconoSucursal}><Icono nombre="sucursal" /></span>
            <span>
              <small>FarmaciaPache</small>
              <strong>{sesion.sucursal.nombre}</strong>
            </span>
          </div>
          <button
            className={styles.cerrarMenu}
            type="button"
            onClick={ocultarSidebar}
            aria-label="Ocultar menú lateral"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <nav className={styles.navegacion} aria-label="Módulos del sistema">
          <p className={styles.etiquetaNavegacion}>Menú principal</p>
          <ul>
            {navegacionVisible.map((seccion) => {
              const submodulos = submodulosVisibles(seccion)
              const tieneSubmodulos = submodulos.length > 0
              const expandida = tieneSubmodulos && seccionExpandida(seccion)
              const idSubmodulos = `submodulos-${seccion.id}`
              return (
              <li key={seccion.id}>
                <button
                  className={seccionSeleccionadaId === seccion.id
                    ? styles.enlaceActivo
                    : styles.enlaceNavegacion}
                  type="button"
                  aria-current={!tieneSubmodulos && seccionActiva(seccion) ? 'page' : undefined}
                  aria-expanded={tieneSubmodulos ? expandida : undefined}
                  aria-controls={tieneSubmodulos ? idSubmodulos : undefined}
                  onClick={() => manejarSeccion(seccion)}
                >
                  <Icono nombre={seccion.icono} />
                  <span>{seccion.etiqueta}</span>
                  {seccion.proximamente && <small>Próximamente</small>}
                  {tieneSubmodulos && (
                    <Icono
                      nombre="chevron"
                      className={`${styles.indicadorDespliegue} ${expandida ? styles.indicadorDespliegueAbierto : ''}`}
                    />
                  )}
                </button>
                {expandida && (
                  <ul
                    id={idSubmodulos}
                    className={styles.listaSubmodulos}
                    aria-label={`Submódulos de ${seccion.etiqueta}`}
                  >
                    {submodulos.map((submodulo) => (
                      <li key={submodulo.id}>
                        <button
                          className={submoduloActivo(submodulo)
                            ? `${styles.enlaceSubmodulo} ${styles.enlaceSubmoduloActivo}`
                            : styles.enlaceSubmodulo}
                          type="button"
                          aria-current={submoduloActivo(submodulo) ? 'page' : undefined}
                          onClick={() => manejarSubmodulo(seccion.id, submodulo)}
                        >
                          <Icono nombre={submodulo.icono} />
                          <span>{submodulo.etiqueta}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              )
            })}
          </ul>
        </nav>

      </aside>

      {esPantallaMovil && menuMovilAbierto && (
        <button
          className={styles.fondoMenu}
          type="button"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuMovilAbierto(false)}
        />
      )}

      <div className={`${styles.areaPrincipal} ${!sidebarVisible ? styles.areaPrincipalExpandida : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerInicio}>
            {!sidebarVisible && (
              <button
                className={styles.botonIcono}
                type="button"
                onClick={abrirSidebar}
                aria-label="Mostrar menú lateral"
                aria-controls="navegacion-principal"
                aria-expanded={false}
              >
                <Icono nombre="menu" />
              </button>
            )}
            <button
              className={styles.botonLogoHeader}
              type="button"
              onClick={() => onNavegar('/')}
              aria-label="Ir al dashboard"
              title="Ir al dashboard"
            >
              <img className={styles.logoHeader} src={imagotipo} alt="" />
              <img className={styles.isotipoHeader} src={isotipo} alt="" />
            </button>
            <div className={styles.tituloHeader}>
              <strong>{tituloPagina}</strong>
            </div>
          </div>

          <div className={styles.accionesHeader}>
            <CampanaNotificaciones onNavegar={onNavegar} />

            <div className={styles.perfil} ref={perfilRef}>
              <button
                className={styles.botonPerfil}
                type="button"
                onClick={() => setPerfilAbierto((abierto) => !abierto)}
                aria-expanded={perfilAbierto}
                aria-controls="menu-perfil"
              >
                <AvatarSesion sesion={sesion} />
                <span className={styles.identidadHeader}>
                  <strong>{sesion.empleadoNombre}</strong>
                  <small>{sesion.roles[0]?.nombre ?? 'Usuario del sistema'}</small>
                </span>
                <Icono nombre="chevron" />
              </button>

              {perfilAbierto && (
                <div id="menu-perfil" className={styles.menuPerfil}>
                  <div>
                    <strong>{sesion.empleadoNombre}</strong>
                    <span>{sesion.nombreUsuario}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onCerrarSesion}
                    disabled={cerrandoSesion}
                  >
                    {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="contenido-principal" className={styles.contenido}>
          {avisoModulo && (
            <div className={styles.avisoInformativo} role="status">
              <span aria-hidden="true">i</span>
              <p>{avisoModulo}</p>
              <button type="button" onClick={() => setAvisoModulo(null)} aria-label="Cerrar aviso">
                <Icono nombre="cerrar" />
              </button>
            </div>
          )}

          {errorCierre && (
            <div className={styles.avisoError} role="alert">
              <strong>No se pudo cerrar la sesión.</strong>
              <span>{errorCierre}</span>
            </div>
          )}

          {sesion.debeCambiarContrasena && (
            <section className={styles.avisoContrasena} aria-labelledby="titulo-aviso-contrasena">
              <span className={styles.avisoContrasenaIcono}><Icono nombre="escudo" /></span>
              <div>
                <strong id="titulo-aviso-contrasena">Actualiza tu contraseña</strong>
                <p>Tu cuenta requiere un cambio de contraseña antes de operar módulos protegidos.</p>
              </div>
              <button type="button" onClick={() => anunciarModulo('Cambio de contraseña')}>
                Actualizar ahora
              </button>
            </section>
          )}

          {contenido ?? (
            <DashboardInicio
              sesion={sesion}
              permisos={permisos}
              accesos={accesosVisibles}
              onAbrirAcceso={abrirAccesoRapido}
            />
          )}
        </main>

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Farmacia Pache</p>
          <span>Sistema de gestión farmacéutica</span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  )
}
