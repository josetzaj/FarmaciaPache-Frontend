import styles from './caja.module.css'

export type IndicadorCaja = {
  etiqueta: string
  valor: string
  detalle: string
  tono?: 'entrada' | 'salida' | 'informacion'
}

type Props = {
  indicadores: IndicadorCaja[]
  cargando: boolean
  error: string | null
  onReintentar: () => void
}

export function ResumenOperativoCaja({ indicadores, cargando, error, onReintentar }: Props) {
  if (error) return <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={onReintentar}>Reintentar</button></div>
  return <section className={styles.grillaIndicadores} aria-label="Resumen monetario" aria-busy={cargando} aria-live="polite">
    {indicadores.map((indicador, indice) => <article className={`${styles.indicadorCaja} ${indicador.tono ? styles[`indicador${indicador.tono[0]!.toUpperCase()}${indicador.tono.slice(1)}`] : ''}`} key={indicador.etiqueta}>
      <span className={styles.numeroIndicador} aria-hidden="true">{String(indice + 1).padStart(2, '0')}</span>
      <div className={styles.contenidoIndicador}>
        <span className={styles.etiquetaIndicador}>{indicador.etiqueta}</span>
        <strong>{cargando ? 'Actualizando…' : indicador.valor}</strong>
        <small>{indicador.detalle}</small>
      </div>
      <span className={styles.trazoIndicador} aria-hidden="true" />
    </article>)}
  </section>
}
