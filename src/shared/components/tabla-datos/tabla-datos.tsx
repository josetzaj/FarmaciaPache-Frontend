import { Fragment, useMemo, type ReactNode } from 'react'
import {
  columnFilteringFeature,
  functionalUpdate,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { MenuFiltroColumna, type ConfiguracionFiltroTabla } from './menu-filtro-columna'
import styles from './tabla-datos.module.css'

const funcionalidadesTabla = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
})

export type ColumnaTabla<T> = {
  id: string
  titulo: string
  obtenerValor: (fila: T) => unknown
  celda: (fila: T) => ReactNode
  filtro?: ConfiguracionFiltroTabla
  ordenable?: boolean
  tituloSoloLectores?: boolean
}

type TablaDatosProps<T extends object> = {
  descripcion: string
  datos: readonly T[]
  columnas: readonly ColumnaTabla<T>[]
  filtros: ColumnFiltersState
  ordenamiento: SortingState
  obtenerIdFila: (fila: T) => string
  onFiltrosChange: (filtros: ColumnFiltersState) => void
  onOrdenamientoChange: (ordenamiento: SortingState) => void
  renderizarFilaExpandida?: (fila: T) => ReactNode
}

export function TablaDatos<T extends object>({
  descripcion,
  datos,
  columnas,
  filtros,
  ordenamiento,
  obtenerIdFila,
  onFiltrosChange,
  onOrdenamientoChange,
  renderizarFilaExpandida,
}: TablaDatosProps<T>) {
  const definiciones = useMemo<ColumnDef<typeof funcionalidadesTabla, T, unknown>[]>(
    () => columnas.map((columna) => ({
      id: columna.id,
      accessorFn: columna.obtenerValor,
      header: columna.titulo,
      cell: ({ row }) => columna.celda(row.original),
      enableColumnFilter: Boolean(columna.filtro),
      enableSorting: Boolean(columna.ordenable),
    })),
    [columnas],
  )
  const columnasPorId = useMemo(
    () => new Map(columnas.map((columna) => [columna.id, columna])),
    [columnas],
  )

  const tabla = useTable({
    features: funcionalidadesTabla,
    data: datos,
    columns: definiciones,
    getRowId: obtenerIdFila,
    manualFiltering: true,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: true,
    state: { columnFilters: filtros, sorting: ordenamiento },
    onColumnFiltersChange: (actualizador) => {
      onFiltrosChange(functionalUpdate(actualizador, filtros))
    },
    onSortingChange: (actualizador) => {
      onOrdenamientoChange(functionalUpdate(actualizador, ordenamiento).slice(0, 1))
    },
  })

  return (
    <div className={styles.contenedorTabla}>
      <table className={styles.tabla}>
        <caption className={styles.soloLectores}>{descripcion}</caption>
        <thead>
          {tabla.getHeaderGroups().map((grupo) => (
            <tr key={grupo.id}>
              {grupo.headers.map((encabezado) => {
                const configuracion = columnasPorId.get(encabezado.column.id)
                if (!configuracion) return null
                const direccionOrden = encabezado.column.getIsSorted()
                const interactiva = Boolean(configuracion.filtro || configuracion.ordenable)
                return (
                  <th
                    key={encabezado.id}
                    scope="col"
                    aria-sort={
                      direccionOrden === 'asc'
                        ? 'ascending'
                        : direccionOrden === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    {configuracion.tituloSoloLectores ? (
                      <span className={styles.soloLectores}>{configuracion.titulo}</span>
                    ) : interactiva ? (
                      <MenuFiltroColumna
                        titulo={configuracion.titulo}
                        filtro={configuracion.filtro}
                        valorFiltro={encabezado.column.getFilterValue()}
                        ordenable={Boolean(configuracion.ordenable)}
                        direccionOrden={direccionOrden}
                        onCambiarFiltro={(valor) => encabezado.column.setFilterValue(valor)}
                        onOrdenar={(direccion) => {
                          if (direccion === false) encabezado.column.clearSorting()
                          else encabezado.column.toggleSorting(direccion === 'desc', false)
                        }}
                      />
                    ) : (
                      configuracion.titulo
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {tabla.getRowModel().rows.map((fila) => {
            const contenidoExpandido = renderizarFilaExpandida?.(fila.original)
            return (
              <Fragment key={fila.id}>
                <tr>
                  {fila.getAllCells().map((celda) => (
                    <td key={celda.id}><tabla.FlexRender cell={celda} /></td>
                  ))}
                </tr>
                {contenidoExpandido && (
                  <tr className={styles.filaExpandida}>
                    <td colSpan={fila.getAllCells().length}>{contenidoExpandido}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export type { ColumnFiltersState, SortingState }
