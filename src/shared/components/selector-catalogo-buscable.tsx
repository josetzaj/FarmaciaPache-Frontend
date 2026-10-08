import { useEffect, useMemo, useRef, useState } from 'react'
import iconoBusqueda from '../../assets/acciones/busqueda.png'
import styles from './selector-catalogo-buscable.module.css'

export type OpcionSelectorCatalogo = {
  valor: string
  etiqueta: string
}

type PropiedadesBase = {
  id: string
  opciones: readonly OpcionSelectorCatalogo[]
  placeholder: string
  deshabilitado?: boolean
  invalido?: boolean
}

type PropiedadesSeleccionUnica = PropiedadesBase & {
  multiple?: false
  valor: string
  onChange: (valor: string) => void
}

type PropiedadesSeleccionMultiple = PropiedadesBase & {
  multiple: true
  valor: readonly string[]
  onChange: (valor: string[]) => void
}

type SelectorCatalogoBuscableProps = PropiedadesSeleccionUnica | PropiedadesSeleccionMultiple

const LIMITE_SELECTOR_SIMPLE = 7

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-GT')
}

export function SelectorCatalogoBuscable(props: SelectorCatalogoBuscableProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)
  const busquedaRef = useRef<HTMLInputElement>(null)
  const seleccionados = props.multiple ? props.valor : props.valor ? [props.valor] : []
  const usarBusqueda = props.opciones.length > LIMITE_SELECTOR_SIMPLE

  const opcionesFiltradas = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return termino
      ? props.opciones.filter((opcion) => normalizar(opcion.etiqueta).includes(termino))
      : props.opciones
  }, [busqueda, props.opciones])

  const resumen = (() => {
    if (!seleccionados.length) return props.placeholder
    const etiquetas = props.opciones
      .filter((opcion) => seleccionados.includes(opcion.valor))
      .map((opcion) => opcion.etiqueta)
    if (!props.multiple) return etiquetas[0] ?? props.placeholder
    return etiquetas.length <= 2 ? etiquetas.join(', ') : `${etiquetas.length} opciones seleccionadas`
  })()

  useEffect(() => {
    if (!abierto) return
    busquedaRef.current?.focus()

    const cerrarAlPulsarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('pointerdown', cerrarAlPulsarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarAlPulsarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  if (!usarBusqueda) {
    if (props.multiple) {
      return (
        <select
          id={props.id}
          multiple
          size={4}
          value={[...props.valor]}
          disabled={props.deshabilitado}
          aria-invalid={props.invalido}
          onChange={(evento) => props.onChange(Array.from(evento.currentTarget.selectedOptions, (opcion) => opcion.value))}
        >
          {props.opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
        </select>
      )
    }

    return (
      <select
        id={props.id}
        value={props.valor}
        disabled={props.deshabilitado}
        aria-invalid={props.invalido}
        onChange={(evento) => props.onChange(evento.target.value)}
      >
        <option value="">{props.placeholder}</option>
        {props.opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </select>
    )
  }

  const seleccionar = (valor: string) => {
    if (props.multiple) {
      props.onChange(props.valor.includes(valor)
        ? props.valor.filter((seleccionado) => seleccionado !== valor)
        : [...props.valor, valor])
      return
    }
    props.onChange(valor)
    setAbierto(false)
    setBusqueda('')
  }

  return (
    <div ref={contenedorRef} className={styles.contenedor}>
      <button
        id={props.id}
        className={styles.activador}
        type="button"
        disabled={props.deshabilitado}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-invalid={props.invalido}
        onClick={() => {
          setAbierto((actual) => !actual)
          setBusqueda('')
        }}
      >
        <span className={seleccionados.length ? undefined : styles.placeholder}>{resumen}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>

      {abierto && (
        <div className={styles.tarjeta}>
          <label className={styles.busqueda}>
            <span className={styles.soloLectores}>Buscar una opción</span>
            <img src={iconoBusqueda} alt="" />
            <input
              ref={busquedaRef}
              type="search"
              value={busqueda}
              placeholder="Escribe para buscar"
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </label>
          <div className={styles.lista} role="listbox" aria-multiselectable={props.multiple || undefined}>
            {opcionesFiltradas.map((opcion) => {
              const seleccionada = seleccionados.includes(opcion.valor)
              return (
                <button
                  className={seleccionada ? styles.opcionSeleccionada : styles.opcion}
                  type="button"
                  role="option"
                  aria-selected={seleccionada}
                  key={opcion.valor}
                  onClick={() => seleccionar(opcion.valor)}
                >
                  <span>{opcion.etiqueta}</span>
                  {seleccionada && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
                </button>
              )
            })}
            {!opcionesFiltradas.length && <p className={styles.sinResultados}>No hay coincidencias.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
