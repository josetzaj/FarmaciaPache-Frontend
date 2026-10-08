import { useEffect, useRef, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { listarExistenciasInventario } from '../inventario-api'
import type { ExistenciaProducto } from '../inventario.types'
import styles from './inventario.module.css'

export function SelectorProductoInventario({
  id,
  valor,
  onChange,
  soloConExistencia,
  ubicacionId,
  soloActivos = true,
  deshabilitado = false,
  invalido = false,
}: {
  id: string
  valor: ExistenciaProducto | null
  onChange: (producto: ExistenciaProducto | null) => void
  soloConExistencia: boolean
  ubicacionId?: string
  soloActivos?: boolean
  deshabilitado?: boolean
  invalido?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [entrada, setEntrada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [opciones, setOpciones] = useState<ExistenciaProducto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)
  const busquedaRef = useRef<HTMLInputElement>(null)
  const claveSolicitud = `${abierto}|${busqueda}|${soloConExistencia}|${soloActivos}|${ubicacionId ?? ''}`
  const cargando = abierto && solicitudFinalizada !== claveSolicitud

  useEffect(() => {
    if (!abierto) return
    const temporizador = window.setTimeout(() => setBusqueda(entrada.trim()), 300)
    return () => window.clearTimeout(temporizador)
  }, [abierto, entrada])

  useEffect(() => {
    if (!abierto) return
    const controlador = new AbortController()
    void listarExistenciasInventario({
      pagina: 1,
      tamanoPagina: 50,
      busqueda: busqueda || undefined,
      ubicacionId,
      soloConExistencia,
      soloBajoMinimo: false,
      orden: 'producto',
      direccion: 'asc',
    }, controlador.signal)
      .then((respuesta) => { setOpciones(soloActivos ? respuesta.items.filter((item) => item.producto.activo) : respuesta.items); setError(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible buscar medicamentos.')
      })
      .finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveSolicitud) })
    return () => controlador.abort()
  }, [abierto, busqueda, claveSolicitud, soloActivos, soloConExistencia, ubicacionId])

  useEffect(() => {
    if (!abierto) return
    busquedaRef.current?.focus()
    const cerrar = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', cerrar)
    document.addEventListener('keydown', escapar)
    return () => {
      document.removeEventListener('pointerdown', cerrar)
      document.removeEventListener('keydown', escapar)
    }
  }, [abierto])

  return (
    <div ref={contenedorRef} className={styles.selectorProducto}>
      <button
        id={id}
        className={styles.selectorProductoActivador}
        type="button"
        disabled={deshabilitado}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-invalid={invalido}
        onClick={() => { setAbierto((actual) => !actual); setEntrada(''); setBusqueda('') }}
      >
        {valor ? <span className={styles.identidad}><strong>{valor.producto.nombre}</strong><small>{valor.producto.codigo}</small></span> : <span className={styles.sinDato}>Selecciona un medicamento</span>}
        <span aria-hidden="true">▾</span>
      </button>
      {abierto && (
        <div className={styles.selectorProductoPanel}>
          <label className={styles.selectorProductoBusqueda}>
            <span className={styles.soloLectores}>Buscar medicamento</span>
            <img src={iconoBusqueda} alt="" />
            <input ref={busquedaRef} type="search" value={entrada} maxLength={150} placeholder="Nombre o código" onChange={(evento) => setEntrada(evento.target.value)} />
          </label>
          <div className={styles.selectorProductoLista} role="listbox" aria-label="Medicamentos encontrados">
            {valor && <button type="button" role="option" aria-selected="false" onClick={() => { onChange(null); setAbierto(false) }}>Quitar selección</button>}
            {cargando ? <p role="status">Buscando…</p> : error ? <p role="alert">{error}</p> : opciones.length ? opciones.map((opcion) => (
              <button
                key={opcion.producto.id}
                className={valor?.producto.id === opcion.producto.id ? styles.selectorProductoSeleccionado : undefined}
                type="button"
                role="option"
                aria-selected={valor?.producto.id === opcion.producto.id}
                onClick={() => { onChange(opcion); setAbierto(false) }}
              >
                <span><strong>{opcion.producto.nombre}</strong><small>{opcion.producto.codigo}</small></span>
                {soloConExistencia && <small>{opcion.cantidadDisponible} disponibles</small>}
              </button>
            )) : <p>No hay medicamentos que coincidan.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
