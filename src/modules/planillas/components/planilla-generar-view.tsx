import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { generarPeriodoPlanilla, obtenerOpcionesPlanilla } from '../planilla-api'
import { nombresMes } from '../planilla-formatos'
import type { OpcionesPlanilla } from '../planilla.types'
import { PlanillaBreadcrumb } from './planilla-breadcrumb'
import styles from './planilla.module.css'

type Props = { permisos: readonly string[]; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }

function periodoActual() {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Guatemala', year: 'numeric', month: 'numeric' }).formatToParts(new Date())
  return { anio: Number(partes.find((parte) => parte.type === 'year')?.value), mes: Number(partes.find((parte) => parte.type === 'month')?.value) }
}

export function PlanillaGenerarView({ permisos, onNavegar, onCambiosPendientes }: Props) {
  const actual = useMemo(() => periodoActual(), [])
  const [anio, setAnio] = useState(String(actual.anio))
  const [mes, setMes] = useState(String(actual.mes))
  const [sucursalId, setSucursalId] = useState('')
  const [opciones, setOpciones] = useState<OpcionesPlanilla>({ sucursales: [] })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const puedeGestionGlobal = permisos.includes('PLANILLAS.ALCANCE_GLOBAL.GESTIONAR')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesPlanilla(controlador.signal).then((respuesta) => { setOpciones(respuesta); if (respuesta.sucursales.length === 1) setSucursalId(respuesta.sucursales[0]!.id) }).catch((actualError: unknown) => { if (!controlador.signal.aborted) setError(actualError instanceof ErrorApi ? actualError.message : 'No fue posible cargar las sucursales.') })
    return () => controlador.abort()
  }, [])

  const cambios = anio !== String(actual.anio) || mes !== String(actual.mes) || Boolean(sucursalId)
  useEffect(() => onCambiosPendientes(cambios), [cambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const generar = async (evento: FormEvent) => {
    evento.preventDefault()
    const anioNumero = Number(anio); const mesNumero = Number(mes)
    if (!Number.isInteger(anioNumero) || anioNumero < 2000 || anioNumero > 2100) { setError('Ingresa un año válido entre 2000 y 2100.'); return }
    if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) { setError('Selecciona un mes válido.'); return }
    if (puedeGestionGlobal && !sucursalId) { setError('Selecciona la sucursal para la planilla.'); return }
    setGuardando(true); setError(null)
    try {
      const respuesta = await generarPeriodoPlanilla({ anio: anioNumero, mes: mesNumero, sucursalId: sucursalId || undefined })
      onCambiosPendientes(false)
      onNavegar(`/planillas/${respuesta.id}`)
    } catch (actualError) { setError(actualError instanceof ErrorApi ? actualError.message : 'No fue posible generar la planilla.') } finally { setGuardando(false) }
  }

  return <main className={styles.pagina}>
    <PlanillaBreadcrumb actual="Generar nuevo mes" onNavegar={onNavegar} />
    <header className={styles.cabecera}><div><h1>Generar nuevo mes</h1><p>El sistema incluirá a los empleados activos con salario vigente para el periodo.</p></div></header>
    <p className={styles.aviso}><strong>Alcance de esta fase:</strong> cerrar la planilla dejará constancia del gasto mensual. No generará transferencias, cheques, depósitos ni movimientos de caja.</p>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <form className={`${styles.panel} ${styles.formulario}`} noValidate onSubmit={(evento) => void generar(evento)}><fieldset disabled={guardando}><legend>Periodo de planilla</legend><div className={styles.rejilla}>
      <div className={styles.campo}><label htmlFor="planilla-mes">Mes</label><select id="planilla-mes" value={mes} onChange={(evento) => setMes(evento.target.value)}>{nombresMes.map((nombre, indice) => <option key={nombre} value={indice + 1}>{nombre}</option>)}</select></div>
      <div className={styles.campo}><label htmlFor="planilla-anio">Año</label><input id="planilla-anio" type="number" min="2000" max="2100" value={anio} onChange={(evento) => setAnio(evento.target.value)} /></div>
      {puedeGestionGlobal && <div className={styles.campo}><label htmlFor="planilla-sucursal">Sucursal</label><select id="planilla-sucursal" value={sucursalId} onChange={(evento) => setSucursalId(evento.target.value)}><option value="">Selecciona una sucursal</option>{opciones.sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.codigo} — {sucursal.nombre}</option>)}</select></div>}
    </div><p className={styles.notaLimite}>Si falta el salario vigente de algún empleado elegible, el backend rechazará la generación y mostrará quién debe configurarse.</p></fieldset><div className={styles.acciones}><button className={styles.botonSecundario} type="button" disabled={guardando} onClick={() => onNavegar('/planillas')}>Cancelar</button><button className={styles.botonPrimario} type="submit" disabled={guardando}>{guardando ? 'Generando…' : 'Generar planilla'}</button></div></form>
  </main>
}
