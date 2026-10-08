import { useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { inactivarProveedor } from '../abastecimiento-api'
import type { ProveedorAbastecimiento } from '../abastecimiento.types'

type ProveedorInactivarModalProps = {
  proveedor: ProveedorAbastecimiento | null
  onCerrar: () => void
  onInactivado: (proveedor: ProveedorAbastecimiento) => void
}

export function ProveedorInactivarModal({ proveedor, onCerrar, onInactivado }: ProveedorInactivarModalProps) {
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    if (procesando) return
    setError(null)
    onCerrar()
  }

  const confirmar = async () => {
    if (!proveedor) return
    setProcesando(true)
    setError(null)
    try {
      const actualizado = await inactivarProveedor(proveedor.id, proveedor.version)
      onInactivado(actualizado)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible desactivar el proveedor.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <ModalEstado
      abierto={Boolean(proveedor)}
      tipo="advertencia"
      titulo="Desactivar proveedor"
      mensaje={proveedor ? <><p>Desactivarás a <strong>{proveedor.nombre}</strong>.</p><p>Se conservarán sus compras, evaluaciones y auditoría, pero dejará de estar disponible para nuevas operaciones.</p>{error && <span role="alert">{error}</span>}</> : ''}
      textoAccionPrincipal="Desactivar proveedor"
      iconoAccionPrincipal={<IconoAccion nombre="desactivar" />}
      varianteAccionPrincipal="peligro"
      onAccionPrincipal={() => void confirmar()}
      textoAccionSecundaria="Cancelar"
      iconoAccionSecundaria={<IconoAccion nombre="cancelar" />}
      onAccionSecundaria={cerrar}
      onCerrar={cerrar}
      cargando={procesando}
    />
  )
}
