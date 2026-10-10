import type { FormEvent, ReactNode } from 'react'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import type { OpcionesReportes, ReferenciaReporte } from '../reportes.types'
import { formatearFechaHora } from '../reportes-formatos'
import styles from './reportes.module.css'

type FormularioFiltrosProps = {
  children: ReactNode
  consultando: boolean
  puedeExportar: boolean
  exportacionHabilitada: boolean
  onConsultar: () => void
  onExportar: (formato: FormatoExportacion) => Promise<void>
}

export function FormularioFiltros({
  children,
  consultando,
  puedeExportar,
  exportacionHabilitada,
  onConsultar,
  onExportar,
}: FormularioFiltrosProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    onConsultar()
  }

  return (
    <form className={styles.filtros} onSubmit={enviar}>
      <div className={styles.camposFiltros}>{children}</div>
      <div className={styles.accionesFiltros}>
        {puedeExportar && (
          <BotonExportar
            deshabilitado={!exportacionHabilitada || consultando}
            onExportar={onExportar}
          />
        )}
        <button className={styles.botonConsultar} type="submit" disabled={consultando}>
          {consultando ? 'Consultando…' : 'Aplicar filtros'}
        </button>
      </div>
    </form>
  )
}

type CampoPeriodoProps = {
  fechaDesde: string
  fechaHasta: string
  onFechaDesde: (valor: string) => void
  onFechaHasta: (valor: string) => void
}

export function CamposPeriodo({ fechaDesde, fechaHasta, onFechaDesde, onFechaHasta }: CampoPeriodoProps) {
  return (
    <>
      <label className={styles.campo}>
        <span>Desde</span>
        <input type="date" value={fechaDesde} max={fechaHasta || undefined} required onChange={(evento) => onFechaDesde(evento.target.value)} />
      </label>
      <label className={styles.campo}>
        <span>Hasta</span>
        <input type="date" value={fechaHasta} min={fechaDesde || undefined} required onChange={(evento) => onFechaHasta(evento.target.value)} />
      </label>
    </>
  )
}

type CampoSucursalProps = {
  id: string
  opciones: OpcionesReportes
  valor: string
  onChange: (valor: string) => void
}

export function CampoSucursal({ id, opciones, valor, onChange }: CampoSucursalProps) {
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>Sucursal</label>
      <SelectorCatalogoBuscable
        id={id}
        valor={valor}
        opciones={opciones.sucursales.map((item) => ({ valor: item.id, etiqueta: `${item.nombre} · ${item.codigo}` }))}
        placeholder={opciones.permiteTodasSucursales ? 'Todas las sucursales' : 'Sucursal de la sesión'}
        deshabilitado={!opciones.permiteTodasSucursales}
        onChange={onChange}
      />
    </div>
  )
}

type CampoCatalogoProps = {
  id: string
  etiqueta: string
  opciones: readonly ReferenciaReporte[]
  valor: string
  placeholder: string
  onChange: (valor: string) => void
}

export function CampoCatalogo({ id, etiqueta, opciones, valor, placeholder, onChange }: CampoCatalogoProps) {
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{etiqueta}</label>
      <SelectorCatalogoBuscable
        id={id}
        valor={valor}
        opciones={opciones.map((item) => ({ valor: item.id, etiqueta: item.codigo ? `${item.nombre} · ${item.codigo}` : item.nombre }))}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  )
}

export function EstadoReporte({ cargando, error, vacio, onReintentar }: {
  cargando: boolean
  error: string | null
  vacio: boolean
  onReintentar: () => void
}) {
  if (cargando) return <p className={styles.estadoCarga} role="status">Consultando información del reporte…</p>
  if (error) return <div className={styles.estadoError} role="alert"><span>{error}</span><button type="button" onClick={onReintentar}>Reintentar</button></div>
  if (vacio) return <div className={styles.estadoVacio}><strong>Sin datos para mostrar</strong><p>No existen registros que coincidan con los filtros seleccionados.</p></div>
  return null
}

export function AlcanceReporte({ corporativo, sucursal }: { corporativo: boolean; sucursal: ReferenciaReporte | null }) {
  return (
    <span className={styles.alcance}>
      {corporativo
        ? sucursal ? `Vista corporativa · ${sucursal.nombre}` : 'Vista corporativa · Todas las sucursales'
        : `Sucursal · ${sucursal?.nombre ?? 'Sesión actual'}`}
    </span>
  )
}

export function ActualizacionReporte({ generadoEn }: { generadoEn: string }) {
  return <p className={styles.actualizacion}>Actualizado {formatearFechaHora(generadoEn)}</p>
}
