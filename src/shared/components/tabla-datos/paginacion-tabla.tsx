import { useId } from 'react'
import styles from './tabla-datos.module.css'

type PaginacionTablaProps = {
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
  unidadSingular: string
  unidadPlural: string
  onPaginaChange: (pagina: number) => void
  onTamanoPaginaChange: (tamano: number) => void
}

const tamanosPagina = [50, 100, 150, 200] as const

function paginasVisibles(actual: number, total: number): number[] {
  const paginas = new Set([1, total, actual - 1, actual, actual + 1])
  return [...paginas].filter((pagina) => pagina > 0 && pagina <= total).sort((a, b) => a - b)
}

function enteroNoNegativo(valor: number, respaldo: number): number {
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= 0 ? Math.trunc(numero) : respaldo
}

export function PaginacionTabla({
  pagina,
  tamanoPagina,
  total,
  totalPaginas,
  unidadSingular,
  unidadPlural,
  onPaginaChange,
  onTamanoPaginaChange,
}: PaginacionTablaProps) {
  const selectorId = useId()
  const paginaActual = Math.max(1, enteroNoNegativo(pagina, 1))
  const tamanoActual = Math.max(1, enteroNoNegativo(tamanoPagina, 50))
  const totalRegistros = enteroNoNegativo(total, 0)
  const cantidadPaginas = enteroNoNegativo(totalPaginas, 0)
  const inicio = totalRegistros === 0 ? 0 : (paginaActual - 1) * tamanoActual + 1
  const fin = Math.min(paginaActual * tamanoActual, totalRegistros)
  const unidad = totalRegistros === 1 ? unidadSingular : unidadPlural
  const paginas = paginasVisibles(paginaActual, cantidadPaginas)

  return (
    <nav className={styles.paginacion} aria-label={`Paginación de ${unidadPlural}`}>
      <div className={styles.resumenPaginacion}>
        <span>{inicio}–{fin} de {totalRegistros} {unidad}</span>
        <label htmlFor={selectorId}>
          Filas por página
          <select
            id={selectorId}
            value={tamanoActual}
            onChange={(event) => onTamanoPaginaChange(Number(event.target.value))}
          >
            {tamanosPagina.map((tamano) => <option key={tamano} value={tamano}>{tamano}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.controlesPagina}>
        <button type="button" disabled={paginaActual <= 1} onClick={() => onPaginaChange(paginaActual - 1)}>Anterior</button>
        {paginas.map((numero, indice) => (
          <span key={numero} className={styles.numeroPaginaGrupo}>
            {indice > 0 && numero - paginas[indice - 1]! > 1 && <span aria-hidden="true">…</span>}
            <button
              type="button"
              className={numero === paginaActual ? styles.paginaActiva : undefined}
              aria-current={numero === paginaActual ? 'page' : undefined}
              aria-label={`Página ${numero}`}
              onClick={() => onPaginaChange(numero)}
            >
              {numero}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={cantidadPaginas === 0 || paginaActual >= cantidadPaginas}
          onClick={() => onPaginaChange(paginaActual + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
