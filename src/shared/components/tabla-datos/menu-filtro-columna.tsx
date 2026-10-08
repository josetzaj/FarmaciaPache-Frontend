import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import styles from './tabla-datos.module.css'

export type OpcionFiltroTabla = {
  valor: string
  etiqueta: string
  descripcion?: string
}

export type ConfiguracionFiltroTabla =
  | {
      tipo: 'texto'
      etiqueta: string
      placeholder?: string
    }
  | {
      tipo: 'fecha'
      etiqueta: string
      minimo?: string
      maximo?: string
    }
  | {
      tipo: 'opciones'
      etiqueta: string
      opciones: readonly OpcionFiltroTabla[]
      buscable?: boolean
      multiple?: boolean
    }

type DireccionOrden = 'asc' | 'desc' | false

type MenuFiltroColumnaProps = {
  titulo: string
  filtro?: ConfiguracionFiltroTabla
  valorFiltro: unknown
  ordenable: boolean
  direccionOrden: DireccionOrden
  onCambiarFiltro: (valor: unknown) => void
  onOrdenar: (direccion: 'asc' | 'desc' | false) => void
}

type PosicionMenu = {
  top: number
  left: number
}

function valoresSeleccionados(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((item): item is string => typeof item === 'string')
}

export function MenuFiltroColumna({
  titulo,
  filtro,
  valorFiltro,
  ordenable,
  direccionOrden,
  onCambiarFiltro,
  onOrdenar,
}: MenuFiltroColumnaProps) {
  const menuId = useId()
  const botonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState<PosicionMenu>({ top: 0, left: 0 })
  const [texto, setTexto] = useState('')
  const [busquedaOpciones, setBusquedaOpciones] = useState('')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())

  const opcionesVisibles = useMemo(() => {
    if (filtro?.tipo !== 'opciones') return []
    const termino = busquedaOpciones.trim().toLocaleLowerCase('es-GT')
    if (!termino) return filtro.opciones
    return filtro.opciones.filter((opcion) =>
      `${opcion.etiqueta} ${opcion.descripcion ?? ''}`
        .toLocaleLowerCase('es-GT')
        .includes(termino),
    )
  }, [busquedaOpciones, filtro])

  const filtroActivo = filtro?.tipo === 'texto' || filtro?.tipo === 'fecha'
    ? typeof valorFiltro === 'string' && valorFiltro.length > 0
    : valoresSeleccionados(valorFiltro).length > 0
  const activo = filtroActivo || direccionOrden !== false
  const nombreAccion = filtro && ordenable
    ? 'filtro y ordenamiento'
    : filtro
      ? 'filtro'
      : 'ordenamiento'

  const cerrar = (devolverFoco = true) => {
    setAbierto(false)
    if (devolverFoco) botonRef.current?.focus()
  }

  const actualizarPosicion = () => {
    const boton = botonRef.current
    if (!boton) return
    const rectangulo = boton.getBoundingClientRect()
    const anchoMenu = Math.min(304, window.innerWidth - 16)
    const izquierda = Math.min(
      Math.max(8, rectangulo.left),
      Math.max(8, window.innerWidth - anchoMenu - 8),
    )
    setPosicion({ top: rectangulo.bottom + 6, left: izquierda })

    window.requestAnimationFrame(() => {
      const menu = menuRef.current
      if (!menu) return
      const altoMenu = menu.getBoundingClientRect().height
      if (rectangulo.bottom + altoMenu + 14 > window.innerHeight && rectangulo.top > altoMenu) {
        setPosicion({ top: Math.max(8, rectangulo.top - altoMenu - 6), left: izquierda })
      }
      const primerControl = menu.querySelector<HTMLElement>(
        'input:not(:disabled), button:not(:disabled)',
      )
      primerControl?.focus()
    })
  }

  const abrir = () => {
    setTexto(
      (filtro?.tipo === 'texto' || filtro?.tipo === 'fecha') && typeof valorFiltro === 'string'
        ? valorFiltro
        : '',
    )
    setBusquedaOpciones('')
    setSeleccion(new Set(valoresSeleccionados(valorFiltro)))
    setAbierto(true)
    window.requestAnimationFrame(actualizarPosicion)
  }

  const alternarMenu = () => {
    if (abierto) cerrar()
    else abrir()
  }

  useEffect(() => {
    if (!abierto) return
    const cerrarPorClickExterno = (event: PointerEvent) => {
      const objetivo = event.target
      if (!(objetivo instanceof Node)) return
      if (menuRef.current?.contains(objetivo) || botonRef.current?.contains(objetivo)) return
      setAbierto(false)
    }
    const cerrarPorCambioDeVista = () => setAbierto(false)
    document.addEventListener('pointerdown', cerrarPorClickExterno)
    window.addEventListener('resize', cerrarPorCambioDeVista)
    window.addEventListener('scroll', cerrarPorCambioDeVista, true)
    return () => {
      document.removeEventListener('pointerdown', cerrarPorClickExterno)
      window.removeEventListener('resize', cerrarPorCambioDeVista)
      window.removeEventListener('scroll', cerrarPorCambioDeVista, true)
    }
  }, [abierto])

  const aplicarFiltro = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (filtro?.tipo === 'texto' || filtro?.tipo === 'fecha') {
      onCambiarFiltro(texto.trim() || undefined)
    } else if (filtro?.tipo === 'opciones') {
      onCambiarFiltro(seleccion.size > 0 ? [...seleccion] : undefined)
    }
    cerrar()
  }

  const limpiarFiltro = () => {
    setTexto('')
    setSeleccion(new Set())
    onCambiarFiltro(undefined)
    cerrar()
  }

  const ordenar = (direccion: 'asc' | 'desc' | false) => {
    onOrdenar(direccion)
    cerrar()
  }

  const alternarOpcion = (valor: string) => {
    setSeleccion((actual) => {
      if (filtro?.tipo === 'opciones' && filtro.multiple === false) {
        return actual.has(valor) ? new Set() : new Set([valor])
      }
      const siguiente = new Set(actual)
      if (siguiente.has(valor)) siguiente.delete(valor)
      else siguiente.add(valor)
      return siguiente
    })
  }

  const todasVisiblesSeleccionadas = opcionesVisibles.length > 0
    && opcionesVisibles.every((opcion) => seleccion.has(opcion.valor))

  const alternarOpcionesVisibles = () => {
    setSeleccion((actual) => {
      const siguiente = new Set(actual)
      for (const opcion of opcionesVisibles) {
        if (todasVisiblesSeleccionadas) siguiente.delete(opcion.valor)
        else siguiente.add(opcion.valor)
      }
      return siguiente
    })
  }

  const contenidoMenu = abierto ? (
    <div
      id={menuId}
      ref={menuRef}
      className={styles.menuFiltro}
      role="dialog"
      aria-label={`${nombreAccion} de ${titulo}`}
      style={{ top: posicion.top, left: posicion.left }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          cerrar()
        }
      }}
    >
      <div className={styles.menuTitulo}>
        <strong>{titulo}</strong>
        <button type="button" onClick={() => cerrar()} aria-label={`Cerrar filtro de ${titulo}`}>×</button>
      </div>

      {ordenable && (
        <div className={styles.grupoOrden} aria-label={`Ordenar ${titulo}`}>
          <button
            type="button"
            className={direccionOrden === 'asc' ? styles.accionActiva : undefined}
            aria-pressed={direccionOrden === 'asc'}
            onClick={() => ordenar('asc')}
          >
            <span aria-hidden="true">A→Z</span> Ascendente
          </button>
          <button
            type="button"
            className={direccionOrden === 'desc' ? styles.accionActiva : undefined}
            aria-pressed={direccionOrden === 'desc'}
            onClick={() => ordenar('desc')}
          >
            <span aria-hidden="true">Z→A</span> Descendente
          </button>
          {direccionOrden !== false && (
            <button type="button" onClick={() => ordenar(false)}>Quitar orden</button>
          )}
        </div>
      )}

      {filtro && (
        <form className={styles.formularioFiltro} onSubmit={aplicarFiltro}>
          {filtro.tipo === 'texto' || filtro.tipo === 'fecha' ? (
            <label>
              <span>{filtro.etiqueta}</span>
              <input
                type={filtro.tipo === 'fecha' ? 'date' : 'search'}
                value={texto}
                maxLength={filtro.tipo === 'texto' ? 100 : undefined}
                min={filtro.tipo === 'fecha' ? filtro.minimo : undefined}
                max={filtro.tipo === 'fecha' ? filtro.maximo : undefined}
                placeholder={filtro.tipo === 'texto' ? filtro.placeholder : undefined}
                onChange={(event) => setTexto(event.target.value)}
              />
            </label>
          ) : (
            <>
              {filtro.buscable !== false && (
                <label>
                  <span>Buscar opciones</span>
                  <input
                    type="search"
                    value={busquedaOpciones}
                    placeholder={`Buscar en ${titulo.toLocaleLowerCase('es-GT')}`}
                    onChange={(event) => setBusquedaOpciones(event.target.value)}
                  />
                </label>
              )}
              {filtro.multiple !== false && (
                <div className={styles.cabeceraOpciones}>
                  <button type="button" onClick={alternarOpcionesVisibles} disabled={opcionesVisibles.length === 0}>
                    {todasVisiblesSeleccionadas ? 'Quitar visibles' : 'Seleccionar visibles'}
                  </button>
                  <span>{seleccion.size} seleccionadas</span>
                </div>
              )}
              <div className={styles.listaOpciones}>
                {opcionesVisibles.length > 0 ? opcionesVisibles.map((opcion) => (
                  <label key={opcion.valor} className={styles.opcionFiltro}>
                    <input
                      type={filtro.multiple === false ? 'radio' : 'checkbox'}
                      checked={seleccion.has(opcion.valor)}
                      onChange={() => alternarOpcion(opcion.valor)}
                    />
                    <span>
                      <strong>{opcion.etiqueta}</strong>
                      {opcion.descripcion && <small>{opcion.descripcion}</small>}
                    </span>
                  </label>
                )) : (
                  <p className={styles.sinOpciones}>No hay opciones que coincidan.</p>
                )}
              </div>
            </>
          )}
          <div className={styles.accionesFiltro}>
            <button type="button" className={styles.botonLimpiar} onClick={limpiarFiltro} disabled={!filtroActivo}>
              Limpiar
            </button>
            <button type="submit" className={styles.botonAplicar}>Aplicar</button>
          </div>
        </form>
      )}
    </div>
  ) : null

  return (
    <>
      <button
        ref={botonRef}
        className={`${styles.botonEncabezado} ${activo ? styles.botonEncabezadoActivo : ''}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
        aria-label={`${titulo}. Abrir ${nombreAccion}${activo ? '. Tiene opciones activas' : ''}`}
        onClick={alternarMenu}
      >
        <span>{titulo}</span>
        <span className={styles.iconoFiltro} aria-hidden="true">
          {direccionOrden === 'asc' ? '↑' : direccionOrden === 'desc' ? '↓' : '▾'}
        </span>
        {filtroActivo && <span className={styles.puntoFiltro} aria-hidden="true" />}
      </button>
      {contenidoMenu && createPortal(contenidoMenu, document.body)}
    </>
  )
}
