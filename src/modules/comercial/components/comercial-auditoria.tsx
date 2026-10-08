import { useMemo } from 'react'
import { PistaAuditoria } from '../../../shared/auditoria'
import { listarAuditoriaComercial } from '../comercial-api'

export function ComercialAuditoria({ recurso, entidadId, revision = 0 }: { recurso: 'clientes' | 'politicas-margen' | 'precios' | 'ventas' | 'recetas'; entidadId: string; revision?: number }) {
  const cargarEventos = useMemo(
    () => (consulta: Parameters<typeof listarAuditoriaComercial>[2], signal?: AbortSignal) => listarAuditoriaComercial(recurso, entidadId, consulta, signal),
    [entidadId, recurso],
  )
  const configuracion: { descripcion: string; etiquetas: Readonly<Record<string, string>> } = recurso === 'clientes'
    ? { descripcion: 'Consulta quién creó o modificó este cliente.', etiquetas: { CREAR: 'Creación', ACTUALIZAR: 'Actualización' } }
    : recurso === 'politicas-margen'
      ? { descripcion: 'Consulta quién creó o modificó esta política de margen.', etiquetas: { CREAR_POLITICA_MARGEN: 'Creación', ACTUALIZAR_POLITICA_MARGEN: 'Actualización' } }
      : recurso === 'precios'
        ? { descripcion: 'Consulta el cálculo, aprobación y sustitución de este precio.', etiquetas: { CALCULAR_PRECIO: 'Cálculo', APROBAR_PRECIO: 'Aprobación', REEMPLAZAR_PRECIO: 'Sustitución' } }
        : recurso === 'recetas'
          ? { descripcion: 'Consulta la validación de esta receta dentro del historial de la venta.', etiquetas: { CREAR_BORRADOR: 'Creación de venta', ACTUALIZAR_BORRADOR: 'Actualización de venta', VALIDAR_RECETA: 'Validación de receta', PREPARAR_COBRO: 'Preparación para cobro', ANULAR: 'Anulación', CONFIRMAR_DESDE_CAJA: 'Confirmación desde Caja' } }
          : { descripcion: 'Consulta el ciclo completo y las decisiones aplicadas a esta venta.', etiquetas: { CREAR_BORRADOR: 'Creación', ACTUALIZAR_BORRADOR: 'Actualización', VALIDAR_RECETA: 'Validación de receta', PREPARAR_COBRO: 'Preparación para cobro', ANULAR: 'Anulación', CONFIRMAR_DESDE_CAJA: 'Confirmación desde Caja' } }
  return (
    <PistaAuditoria
      claveEntidad={`${recurso}:${entidadId}`}
      descripcion={configuracion.descripcion}
      etiquetasOperacion={configuracion.etiquetas}
      cargarEventos={cargarEventos}
      revision={revision}
    />
  )
}
