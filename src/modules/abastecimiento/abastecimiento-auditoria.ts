import type { CargarAuditoria } from '../../shared/auditoria'
import { listarAuditoriaAbastecimiento } from './abastecimiento-api'
import type { RecursoAbastecimiento } from './abastecimiento.types'

type ConfiguracionAuditoriaAbastecimiento = {
  permiso: string
  descripcion: string
  etiquetasOperacion: Readonly<Record<string, string>>
}

export const configuracionAuditoriaAbastecimiento: Record<
  RecursoAbastecimiento,
  ConfiguracionAuditoriaAbastecimiento
> = {
  proveedores: {
    permiso: 'ABASTECIMIENTO.PROVEEDORES.VER_AUDITORIA',
    descripcion: 'Consulta quién creó, modificó o evaluó este proveedor.',
    etiquetasOperacion: {
      CREAR: 'Creación',
      ACTUALIZAR: 'Actualización',
      EVALUAR: 'Evaluación',
    },
  },
  solicitudes: {
    permiso: 'ABASTECIMIENTO.SOLICITUDES.VER_AUDITORIA',
    descripcion: 'Consulta el registro, resolución y cancelación de esta solicitud.',
    etiquetasOperacion: {
      SOLICITAR: 'Solicitud registrada',
      APROBAR: 'Aprobación',
      RECHAZAR: 'Rechazo',
      CANCELAR: 'Cancelación',
    },
  },
  cotizaciones: {
    permiso: 'ABASTECIMIENTO.COTIZACIONES.VER_AUDITORIA',
    descripcion: 'Consulta el registro y evaluación de esta cotización.',
    etiquetasOperacion: {
      REGISTRAR: 'Registro',
      EVALUAR: 'Evaluación',
      ADJUDICAR: 'Adjudicación',
    },
  },
  ordenes: {
    permiso: 'ABASTECIMIENTO.ORDENES.VER_AUDITORIA',
    descripcion: 'Consulta la emisión y seguimiento de esta orden de compra.',
    etiquetasOperacion: {
      EMITIR: 'Emisión',
      CONFIRMAR_PROVEEDOR: 'Confirmación del proveedor',
      CERRAR: 'Cierre',
      CANCELAR: 'Cancelación',
    },
  },
  recepciones: {
    permiso: 'ABASTECIMIENTO.RECEPCIONES.VER_AUDITORIA',
    descripcion: 'Consulta las etapas documental, física y técnica de esta recepción.',
    etiquetasOperacion: {
      REGISTRAR: 'Registro',
      CONFIRMAR_DOCUMENTAL: 'Validación documental',
      CONFIRMAR_FISICA: 'Validación física',
      CONFIRMAR_TECNICA: 'Validación técnica',
      RECHAZAR: 'Rechazo',
      REGULARIZAR_DOCUMENTO: 'Regularización documental',
    },
  },
  traslados: {
    permiso: 'ABASTECIMIENTO.TRASLADOS.VER_AUDITORIA',
    descripcion: 'Consulta la solicitud, preparación, despacho y recepción de este traslado.',
    etiquetasOperacion: {
      SOLICITAR: 'Solicitud',
      APROBAR: 'Aprobación',
      RECHAZAR: 'Rechazo',
      PREPARAR: 'Preparación',
      DESPACHAR: 'Despacho',
      RECIBIR: 'Recepción',
      CANCELAR: 'Cancelación',
      CERRAR: 'Cierre',
    },
  },
  devoluciones: {
    permiso: 'ABASTECIMIENTO.DEVOLUCIONES.VER_AUDITORIA',
    descripcion: 'Consulta la autorización, despacho y compensación de esta devolución.',
    etiquetasOperacion: {
      SOLICITAR: 'Solicitud',
      AUTORIZAR: 'Autorización',
      RECHAZAR: 'Rechazo',
      SEGREGAR: 'Segregación',
      DESPACHAR: 'Despacho',
      CONFIRMAR_RECEPCION: 'Recepción del proveedor',
      COMPENSAR: 'Compensación',
      CANCELAR: 'Cancelación',
      CERRAR: 'Cierre',
    },
  },
}

export function crearCargadorAuditoriaAbastecimiento(
  recurso: RecursoAbastecimiento,
  entidadId: string,
): CargarAuditoria {
  return (consulta, signal) => listarAuditoriaAbastecimiento(recurso, entidadId, consulta, signal)
}
