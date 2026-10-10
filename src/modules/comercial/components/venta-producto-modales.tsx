import { useId, useState } from 'react'
import { ModalEstado } from '../../../shared/components/modal-estado'
import type { ProductoComercialCatalogo, RecetaVentaRequest } from '../comercial.types'
import styles from './comercial.module.css'

const camposReceta: readonly {
  campo: keyof RecetaVentaRequest
  etiqueta: string
  tipo?: 'date'
  obligatorio?: boolean
}[] = [
  { campo: 'referencia', etiqueta: 'Referencia', obligatorio: true },
  { campo: 'fechaEmision', etiqueta: 'Fecha de emisión', tipo: 'date', obligatorio: true },
  { campo: 'pacienteIdentificacion', etiqueta: 'Identificación del paciente', obligatorio: true },
  { campo: 'pacienteNombre', etiqueta: 'Nombre del paciente', obligatorio: true },
  { campo: 'prescriptorNombre', etiqueta: 'Nombre del prescriptor', obligatorio: true },
  { campo: 'prescriptorColegiado', etiqueta: 'Colegiado', obligatorio: true },
  { campo: 'detalleMedicacion', etiqueta: 'Medicamento indicado', obligatorio: true },
  { campo: 'dosis', etiqueta: 'Dosis', obligatorio: true },
  { campo: 'frecuencia', etiqueta: 'Frecuencia', obligatorio: true },
  { campo: 'via', etiqueta: 'Vía', obligatorio: true },
  { campo: 'duracion', etiqueta: 'Duración', obligatorio: true },
  { campo: 'instrucciones', etiqueta: 'Instrucciones' },
]

export function VentaCantidadModal({ producto, cantidadInicial, onCerrar, onConfirmar }: {
  producto: ProductoComercialCatalogo
  cantidadInicial: string
  onCerrar: () => void
  onConfirmar: (cantidad: number) => void
}) {
  const campoId = useId()
  const [cantidad, setCantidad] = useState(cantidadInicial)
  const [error, setError] = useState<string | null>(null)

  const confirmar = () => {
    const valor = Number(cantidad)
    if (!Number.isInteger(valor) || valor <= 0) {
      setError('Ingresa una cantidad entera mayor que cero.')
      return
    }
    if (valor > (producto?.cantidadDisponible ?? 0)) {
      setError(`La cantidad no puede superar la existencia disponible (${producto?.cantidadDisponible ?? 0}).`)
      return
    }
    onConfirmar(valor)
  }

  return <ModalEstado
    abierto
    tipo="informacion"
    titulo="Cantidad del medicamento"
    mensaje={<div className={styles.contenidoConfirmacion}>
      <p>Indica cuántas unidades de <strong>{producto?.nombre}</strong> deseas agregar al carrito.</p>
      <div className={styles.campoModal}>
        <label htmlFor={campoId}>Cantidad <span aria-hidden="true">*</span></label>
        <input
          id={campoId}
          type="number"
          min="1"
          max={producto?.cantidadDisponible ?? undefined}
          step="1"
          inputMode="numeric"
          value={cantidad}
          aria-invalid={Boolean(error)}
          onChange={(evento) => { setCantidad(evento.target.value); setError(null) }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              confirmar()
            }
          }}
        />
        <small className={styles.ayudaCampo}>Disponible: {producto?.cantidadDisponible ?? 0}</small>
      </div>
      {error && <p className={styles.errorCampo} role="alert">{error}</p>}
    </div>}
    textoAccionPrincipal="Agregar al carrito"
    onAccionPrincipal={confirmar}
    textoAccionSecundaria="Cancelar"
    onAccionSecundaria={onCerrar}
    onCerrar={onCerrar}
  />
}

export function VentaRecetaModal({ recetaInicial, onCerrar, onGuardar }: {
  recetaInicial: RecetaVentaRequest
  onCerrar: () => void
  onGuardar: (receta: RecetaVentaRequest) => void
}) {
  const prefijoId = useId()
  const [receta, setReceta] = useState(recetaInicial)
  const [error, setError] = useState<string | null>(null)

  const guardar = () => {
    const incompleto = camposReceta.some(({ campo, obligatorio }) => obligatorio && !String(receta[campo] ?? '').trim())
    if (incompleto) {
      setError('Completa todos los campos obligatorios de la receta.')
      return
    }
    onGuardar({
      ...receta,
      referencia: receta.referencia.trim(),
      pacienteIdentificacion: receta.pacienteIdentificacion.trim(),
      pacienteNombre: receta.pacienteNombre.trim(),
      prescriptorNombre: receta.prescriptorNombre.trim(),
      prescriptorColegiado: receta.prescriptorColegiado.trim(),
      detalleMedicacion: receta.detalleMedicacion.trim(),
      dosis: receta.dosis.trim(),
      frecuencia: receta.frecuencia.trim(),
      via: receta.via.trim(),
      duracion: receta.duracion.trim(),
      instrucciones: receta.instrucciones?.trim() || null,
    })
  }

  return <ModalEstado
    abierto
    tipo="informacion"
    ancho="amplio"
    titulo="Información de la receta"
    mensaje={<div className={styles.formularioRecetaModal}>
      <p>Este medicamento requiere receta. Registra la información para enviarla a autorización.</p>
      <div className={styles.grillaRecetaModal}>
        {camposReceta.map(({ campo, etiqueta, tipo, obligatorio }) => <div className={styles.campoModal} key={campo}>
          <label htmlFor={`${prefijoId}-${campo}`}>{etiqueta}{obligatorio && <span aria-hidden="true"> *</span>}</label>
          <input
            id={`${prefijoId}-${campo}`}
            type={tipo ?? 'text'}
            value={receta[campo] ?? ''}
            aria-invalid={Boolean(error && obligatorio && !String(receta[campo] ?? '').trim())}
            onChange={(evento) => {
              setReceta((actual) => ({ ...actual, [campo]: evento.target.value }))
              setError(null)
            }}
          />
        </div>)}
      </div>
      {error && <p className={styles.errorCampo} role="alert">{error}</p>}
    </div>}
    textoAccionPrincipal="Guardar información"
    onAccionPrincipal={guardar}
    textoAccionSecundaria="Cancelar"
    onAccionSecundaria={onCerrar}
    onCerrar={onCerrar}
  />
}
