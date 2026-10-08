import { useMemo } from 'react'
import { PistaAuditoria } from '../../../shared/auditoria'
import {
  configuracionAuditoriaAbastecimiento,
  crearCargadorAuditoriaAbastecimiento,
} from '../abastecimiento-auditoria'
import type { RecursoAbastecimiento } from '../abastecimiento.types'

type AbastecimientoAuditoriaProps = {
  recurso: RecursoAbastecimiento
  entidadId: string
  revision?: string | number
}

export function AbastecimientoAuditoria({
  recurso,
  entidadId,
  revision = 0,
}: AbastecimientoAuditoriaProps) {
  const configuracion = configuracionAuditoriaAbastecimiento[recurso]
  const cargarEventos = useMemo(
    () => crearCargadorAuditoriaAbastecimiento(recurso, entidadId),
    [entidadId, recurso],
  )

  return (
    <PistaAuditoria
      claveEntidad={`${recurso}:${entidadId}`}
      descripcion={configuracion.descripcion}
      etiquetasOperacion={configuracion.etiquetasOperacion}
      cargarEventos={cargarEventos}
      revision={revision}
    />
  )
}
