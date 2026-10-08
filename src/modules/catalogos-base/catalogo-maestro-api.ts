import { solicitarApi } from '../../shared/api/cliente-api'
import { descargarArchivoApi } from '../../shared/api/descargar-archivo-api'
import type { AuditoriaCatalogo, CatalogosPaginados, CatalogoMaestroRegistro, DatosCatalogoMaestro, ParametrosCatalogo } from './catalogo-maestro.types'
type Respuesta<T> = { success: true; data: T }
export function crearCatalogoMaestroApi(ruta: string) {
  const consulta = (p: ParametrosCatalogo) => { const q = new URLSearchParams({ pagina: String(p.pagina), tamanoPagina: String(p.tamanoPagina) }); if (p.busqueda) q.set('busqueda', p.busqueda); if (p.estados?.length) q.set('estados', p.estados.join(',')); if (p.orden) q.set('orden', p.orden); if (p.direccion) q.set('direccion', p.direccion); return q }
  return {
    listar: async (p: ParametrosCatalogo, signal?: AbortSignal) => (await solicitarApi<Respuesta<CatalogosPaginados>>(`/${ruta}?${consulta(p)}`, { signal })).data,
    obtener: async (id: string, signal?: AbortSignal) => (await solicitarApi<Respuesta<CatalogoMaestroRegistro>>(`/${ruta}/${id}`, { signal })).data,
    crear: async (datos: DatosCatalogoMaestro) => (await solicitarApi<Respuesta<CatalogoMaestroRegistro>>(`/${ruta}`, { method: 'POST', datos })).data,
    actualizar: async (id: string, datos: DatosCatalogoMaestro & { version: number }) => (await solicitarApi<Respuesta<CatalogoMaestroRegistro>>(`/${ruta}/${id}`, { method: 'PUT', datos })).data,
    inactivar: async (id: string, version: number, motivo: string) => { await solicitarApi(`/${ruta}/${id}/inactivar`, { method: 'PATCH', datos: { version, motivo } }) },
    exportar: async (formato: 'xlsx' | 'pdf', p: Omit<ParametrosCatalogo, 'pagina' | 'tamanoPagina'>) => descargarArchivoApi(`/${ruta}/exportaciones`, { method: 'POST', datos: { ...p, formato }, nombreArchivoAlternativo: `${ruta}.${formato}` }),
    auditoria: async (id: string, signal?: AbortSignal) => (await solicitarApi<Respuesta<AuditoriaCatalogo>>(`/${ruta}/${id}/auditoria?pagina=1&tamanoPagina=50&orden=fecha&direccion=desc`, { signal })).data,
  }
}
