import { useRef, type ChangeEvent } from 'react'
import { construirUrlApi } from '../../../shared/api/cliente-api'
import styles from './producto-imagen-campo.module.css'

type Props = {
  productoNombre: string
  imagenActualUrl: string | null
  version: number | null
  archivo: File | null
  vistaPrevia: string | null
  retirarActual: boolean
  error: string | null
  deshabilitado: boolean
  onArchivoChange: (archivo: File | null, vistaPrevia: string | null, error: string | null) => void
  onRetirarActualChange: (retirar: boolean) => void
}

const tiposPermitidos = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const maximoBytes = 5 * 1024 * 1024

export function ProductoImagenCampo({ productoNombre, imagenActualUrl, version, archivo, vistaPrevia, retirarActual, error, deshabilitado, onArchivoChange, onRetirarActualChange }: Props) {
  const entradaRef = useRef<HTMLInputElement>(null)
  const imagenActual = !retirarActual && imagenActualUrl
    ? `${construirUrlApi(imagenActualUrl)}?v=${version ?? 0}`
    : null
  const imagenMostrada = vistaPrevia ?? imagenActual

  const seleccionar = (evento: ChangeEvent<HTMLInputElement>) => {
    const siguiente = evento.target.files?.[0] ?? null
    if (!siguiente) return
    if (!tiposPermitidos.has(siguiente.type)) {
      evento.target.value = ''
      onArchivoChange(null, null, 'La imagen debe tener formato JPG, PNG o WebP.')
      return
    }
    if (siguiente.size > maximoBytes) {
      evento.target.value = ''
      onArchivoChange(null, null, 'La imagen no puede superar 5 MB.')
      return
    }
    onRetirarActualChange(false)
    onArchivoChange(siguiente, URL.createObjectURL(siguiente), null)
  }

  const descartarArchivo = () => {
    onArchivoChange(null, null, null)
    if (entradaRef.current) entradaRef.current.value = ''
  }

  return (
    <fieldset disabled={deshabilitado}>
      <legend>Imagen de referencia</legend>
      <div className={styles.selectorImagen}>
        <div className={styles.vistaPrevia}>
          {imagenMostrada
            ? <img src={imagenMostrada} alt={`Imagen de referencia de ${productoNombre || 'medicamento'}`} crossOrigin={vistaPrevia ? undefined : 'use-credentials'} />
            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 15l4-4 4 4 2-2 6 6M15.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>}
        </div>
        <div className={styles.controles}>
          <strong>Imagen del medicamento</strong>
          <p>Formato de imagen JPG, PNG o WebP, de hasta 5 MB.</p>
          <input ref={entradaRef} className={styles.entrada} id="imagen-producto" type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionar} />
          <div className={styles.acciones}>
            <label className={styles.seleccionar} htmlFor="imagen-producto">{imagenMostrada ? 'Cambiar imagen' : 'Seleccionar imagen'}</label>
            {archivo && <button type="button" onClick={descartarArchivo}>Descartar cambio</button>}
            {!archivo && imagenActualUrl && !retirarActual && <button type="button" onClick={() => onRetirarActualChange(true)}>Retirar imagen</button>}
            {retirarActual && <button type="button" onClick={() => onRetirarActualChange(false)}>Conservar imagen</button>}
          </div>
          {error && <small className={styles.error} role="alert">{error}</small>}
        </div>
      </div>
    </fieldset>
  )
}
