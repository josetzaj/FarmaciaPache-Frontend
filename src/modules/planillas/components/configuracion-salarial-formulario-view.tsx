import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { PistaAuditoria } from '../../../shared/auditoria'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarAuditoriaSalarial, obtenerConfiguracionSalarial, registrarCondicionSalarial } from '../planilla-api'
import { centavosATexto, formatearCentavos, textoACentavos } from '../planilla-formatos'
import type { ConfiguracionSalarialDetalle } from '../planilla.types'
import { PlanillaBreadcrumb } from './planilla-breadcrumb'
import styles from './planilla.module.css'

type Props = {
  empleadoId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

function hoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export function ConfiguracionSalarialFormularioView({ empleadoId, permisos, onNavegar, onCambiosPendientes }: Props) {
  const [detalle, setDetalle] = useState<ConfiguracionSalarialDetalle | null>(null)
  const [salario, setSalario] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState(hoyGuatemala)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [revision, setRevision] = useState(0)
  const puedeActualizar = permisos.includes('PLANILLAS.CONFIGURACION_SALARIAL.ACTUALIZAR')
  const puedeAuditoria = permisos.includes('PLANILLAS.CONFIGURACION_SALARIAL.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerConfiguracionSalarial(empleadoId, controlador.signal).then((respuesta) => {
      setDetalle(respuesta)
      setSalario(respuesta.condicionActual ? centavosATexto(respuesta.condicionActual.salarioBaseCentavos) : '')
      setMotivo('')
      setError(null)
    }).catch((actual: unknown) => {
      if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la configuración salarial.')
    })
    return () => controlador.abort()
  }, [empleadoId, revision])

  const tieneCambios = useMemo(() => {
    if (!detalle || !puedeActualizar) return false
    const original = detalle.condicionActual ? centavosATexto(detalle.condicionActual.salarioBaseCentavos) : ''
    return salario !== original || vigenteDesde !== hoyGuatemala() || motivo.trim() !== ''
  }, [detalle, motivo, puedeActualizar, salario, vigenteDesde])

  useEffect(() => onCambiosPendientes(tieneCambios && !exito), [exito, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!detalle || !puedeActualizar) return
    const salarioCentavos = textoACentavos(salario)
    if (salarioCentavos === null || salarioCentavos <= 0) { setError('Ingresa un salario mayor que cero con máximo dos decimales.'); return }
    if (!vigenteDesde) { setError('Selecciona la fecha desde la cual estará vigente el salario.'); return }
    if (motivo.trim().length < 3) { setError('Explica brevemente el motivo de la configuración o del cambio.'); return }
    setGuardando(true); setError(null)
    try {
      const respuesta = await registrarCondicionSalarial(empleadoId, {
        salarioBaseCentavos: salarioCentavos,
        vigenteDesde,
        motivo: motivo.trim(),
        versionActual: detalle.condicionActual?.version ?? null,
      })
      setDetalle(respuesta)
      setSalario(centavosATexto(respuesta.condicionActual!.salarioBaseCentavos))
      setVigenteDesde(hoyGuatemala())
      setMotivo('')
      onCambiosPendientes(false)
      setRevision((valor) => valor + 1)
      setExito(true)
    } catch (actual) {
      setError(actual instanceof ErrorApi ? actual.message : 'No fue posible guardar la configuración salarial.')
    } finally { setGuardando(false) }
  }

  const cargarAuditoria = useCallback((parametros: Parameters<typeof listarAuditoriaSalarial>[1], signal?: AbortSignal) => listarAuditoriaSalarial(empleadoId, parametros, signal), [empleadoId])

  if (!detalle) return <main className={styles.pagina}><PlanillaBreadcrumb actual="Configuración salarial" onNavegar={onNavegar} /><section className={styles.panel}>{error ? <div className={styles.error} role="alert">{error} <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : <p className={styles.mensaje} role="status">Cargando configuración salarial…</p>}</section></main>

  return <>
    <main className={styles.pagina}>
      <PlanillaBreadcrumb actual={`Salario de ${detalle.empleadoNombre}`} onNavegar={onNavegar} />
      <header className={styles.cabecera}><div><h1>{detalle.empleadoNombre}</h1><p>Salario de referencia con vigencias históricas para generar futuras planillas.</p></div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/planillas/configuracion-salarial')}>Volver al listado</button></header>
      <section className={styles.panel}>
        <div className={styles.resumenEmpleado}><div><span>Código</span><strong>{detalle.empleadoCodigo}</strong></div><div><span>Puesto</span><strong>{detalle.puestoNombre ?? 'Sin puesto'}</strong></div><div><span>Sucursal principal</span><strong>{detalle.sucursal.nombre}</strong></div></div>
      </section>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {puedeActualizar && <form className={`${styles.panel} ${styles.formulario}`} noValidate onSubmit={(evento) => void guardar(evento)}>
        <fieldset disabled={guardando}><legend>{detalle.condicionActual ? 'Registrar nuevo salario vigente' : 'Configurar salario inicial'}</legend><div className={styles.rejilla}>
          <div className={styles.campo}><label htmlFor="salario-base">Salario base mensual (Q)</label><input id="salario-base" type="text" inputMode="decimal" value={salario} onChange={(evento) => setSalario(evento.target.value)} placeholder="0.00" aria-describedby="ayuda-salario" /><small id="ayuda-salario">Se usará como monto inicial al generar la planilla.</small></div>
          <div className={styles.campo}><label htmlFor="vigente-desde">Vigente desde</label><input id="vigente-desde" type="date" value={vigenteDesde} onChange={(evento) => setVigenteDesde(evento.target.value)} /></div>
        </div><div className={styles.campo}><label htmlFor="motivo-salario">Motivo</label><textarea id="motivo-salario" maxLength={500} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. Configuración inicial o ajuste salarial autorizado" /></div></fieldset>
        <div className={styles.acciones}><button className={styles.botonSecundario} type="button" disabled={guardando} onClick={() => onNavegar('/planillas/configuracion-salarial')}>Cancelar</button><button className={styles.botonPrimario} type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar salario'}</button></div>
      </form>}
      {!puedeActualizar && <p className={styles.aviso}>Tu acceso es únicamente de consulta; no puedes modificar el salario de referencia.</p>}
      <section className={styles.panel}><h2>Historial salarial</h2>{detalle.historial.length === 0 ? <p className={styles.mensaje}>Este empleado todavía no tiene salarios configurados.</p> : <div className={styles.tablaHoja}><table className={styles.historial}><caption className={styles.soloLectores}>Historial salarial del empleado</caption><thead><tr><th scope="col">Salario</th><th scope="col">Desde</th><th scope="col">Hasta</th><th scope="col">Motivo</th></tr></thead><tbody>{detalle.historial.map((condicion) => <tr key={condicion.id}><td><strong>{formatearCentavos(condicion.salarioBaseCentavos)}</strong></td><td>{condicion.vigenteDesde}</td><td>{condicion.vigenteHasta ?? 'Vigente'}</td><td>{condicion.motivo}</td></tr>)}</tbody></table></div>}</section>
      {puedeAuditoria && <PistaAuditoria claveEntidad={`salario-${empleadoId}`} descripcion="Cambios de salario registrados para este empleado." etiquetasOperacion={{ CONFIGURAR_SALARIO: 'Configuró salario', CAMBIAR_SALARIO: 'Cambió salario' }} cargarEventos={cargarAuditoria} revision={revision} />}
    </main>
    <ModalEstado abierto={exito} tipo="exito" titulo="Salario guardado" mensaje={`La nueva vigencia salarial de ${detalle.empleadoNombre} quedó registrada.`} textoAccionPrincipal="Entendido" onAccionPrincipal={() => onNavegar('/planillas/configuracion-salarial')} onCerrar={() => onNavegar('/planillas/configuracion-salarial')} />
  </>
}
