import { useEffect, useId, useRef, useState } from 'react'
import iconoDescargar from '../../../assets/acciones/descargar.png'
import iconoExcel from '../../../assets/acciones/excel.png'
import iconoPdf from '../../../assets/acciones/pdf.png'
import styles from './boton-exportar.module.css'

export type FormatoExportacion = 'xlsx' | 'pdf'

type BotonExportarProps = {
  deshabilitado?: boolean
  onExportar: (formato: FormatoExportacion) => Promise<void>
}

export function BotonExportar({ deshabilitado = false, onExportar }: BotonExportarProps) {
  const [abierto, setAbierto] = useState(false)
  const [procesando, setProcesando] = useState<FormatoExportacion | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!abierto) return

    const cerrarAlHacerClickFuera = (event: PointerEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', cerrarAlHacerClickFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarAlHacerClickFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  const seleccionarFormato = async (formato: FormatoExportacion) => {
    setAbierto(false)
    setProcesando(formato)
    try {
      await onExportar(formato)
    } finally {
      setProcesando(null)
    }
  }

  const estaDeshabilitado = deshabilitado || procesando !== null

  return (
    <div className={styles.contenedor} ref={contenedorRef}>
      <button
        className={styles.activador}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={menuId}
        disabled={estaDeshabilitado}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <img className={styles.iconoDescarga} src={iconoDescargar} alt="" />
        {procesando ? `Generando ${procesando === 'xlsx' ? 'Excel' : 'PDF'}…` : 'Exportar'}
      </button>

      {abierto && (
        <div className={styles.menu} id={menuId} role="menu" aria-label="Formatos de exportación">
          <button type="button" role="menuitem" onClick={() => void seleccionarFormato('xlsx')}>
            <span className={styles.iconoExcel}><img src={iconoExcel} alt="" /></span>
            <span><strong>Excel</strong><small>Archivo .xlsx editable</small></span>
          </button>
          <button type="button" role="menuitem" onClick={() => void seleccionarFormato('pdf')}>
            <span className={styles.iconoPdf}><img src={iconoPdf} alt="" /></span>
            <span><strong>PDF</strong><small>Documento listo para imprimir</small></span>
          </button>
        </div>
      )}
    </div>
  )
}
