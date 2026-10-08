import { useCallback, useState } from 'react'
import type { ColumnFiltersState } from '../components/tabla-datos'

const filtroEstadoActivo: ColumnFiltersState = [{ id: 'estado', value: ['ACTIVO'] }]

function estadosSeleccionados(filtros: ColumnFiltersState): string[] {
  const valor = filtros.find((filtro) => filtro.id === 'estado')?.value
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === 'string').sort()
    : []
}

function mismosEstados(actuales: ColumnFiltersState, siguientes: ColumnFiltersState): boolean {
  return JSON.stringify(estadosSeleccionados(actuales)) === JSON.stringify(estadosSeleccionados(siguientes))
}

function conEstadoActivo(filtros: ColumnFiltersState): ColumnFiltersState {
  return [...filtros.filter((filtro) => filtro.id !== 'estado'), ...filtroEstadoActivo]
}

export function hayFiltrosAdicionales(filtros: ColumnFiltersState): boolean {
  return filtros.some((filtro) => {
    if (filtro.id !== 'estado') return true
    const estados = estadosSeleccionados([filtro])
    return estados.length !== 1 || estados[0] !== 'ACTIVO'
  })
}

export function useFiltrosListadoActivos() {
  const [filtros, setFiltros] = useState<ColumnFiltersState>(() => [...filtroEstadoActivo])
  const [estadoPersonalizado, setEstadoPersonalizado] = useState(false)

  const cambiarFiltros = useCallback((siguientes: ColumnFiltersState) => {
    if (!mismosEstados(filtros, siguientes)) setEstadoPersonalizado(true)
    setFiltros(siguientes)
  }, [filtros])

  const ajustarPorBusqueda = useCallback((termino: string) => {
    if (estadoPersonalizado) return
    setFiltros((actuales) => {
      const tieneBusqueda = Boolean(termino.trim())
      const tieneFiltroEstado = actuales.some((filtro) => filtro.id === 'estado')
      const estadoYaEsActivo = mismosEstados(actuales, filtroEstadoActivo)

      if ((tieneBusqueda && !tieneFiltroEstado) || (!tieneBusqueda && estadoYaEsActivo)) {
        return actuales
      }

      return tieneBusqueda
        ? actuales.filter((filtro) => filtro.id !== 'estado')
        : conEstadoActivo(actuales)
    })
  }, [estadoPersonalizado])

  const restablecerFiltros = useCallback(() => {
    setFiltros([...filtroEstadoActivo])
    setEstadoPersonalizado(false)
  }, [])

  return { filtros, cambiarFiltros, ajustarPorBusqueda, restablecerFiltros }
}
