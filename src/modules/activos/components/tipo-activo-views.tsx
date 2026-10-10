import { CatalogoDetalleView } from '../../catalogos-base/components/catalogo-detalle-view'
import { CatalogoFormularioView } from '../../catalogos-base/components/catalogo-formulario-view'
import { CatalogoListadoView } from '../../catalogos-base/components/catalogo-listado-view'
import { tipoActivoApi, tipoActivoConfig } from '../tipo-activo'

const permisosCatalogo = (permisos: readonly string[]) => permisos.map((permiso) => permiso.startsWith('ACTIVOS.TIPOS.') ? permiso.replace('ACTIVOS.TIPOS.', 'CATALOGOS.ACTIVOS_TIPOS.') : permiso)

export function TipoActivoListadoView(props: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  return <CatalogoListadoView config={tipoActivoConfig} api={tipoActivoApi} {...props} permisos={permisosCatalogo(props.permisos)} />
}

export function TipoActivoCrearView(props: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  return <CatalogoFormularioView config={tipoActivoConfig} api={tipoActivoApi} {...props} />
}

export function TipoActivoEditarView({ tipoActivoId, ...props }: { tipoActivoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  return <CatalogoFormularioView config={tipoActivoConfig} api={tipoActivoApi} itemId={tipoActivoId} {...props} />
}

export function TipoActivoDetalleView({ tipoActivoId, permisos, ...props }: { tipoActivoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  return <CatalogoDetalleView config={tipoActivoConfig} api={tipoActivoApi} itemId={tipoActivoId} permisos={permisosCatalogo(permisos)} {...props} />
}

