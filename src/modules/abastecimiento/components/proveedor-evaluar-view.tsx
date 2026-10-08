import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { evaluarProveedor, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import type { EvaluarProveedorRequest, ProveedorAbastecimiento, ResultadoEvaluacionProveedor } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type DatosEvaluacion = { periodo: string; calidad: string; cumplimiento: string; servicio: string; resultado: ResultadoEvaluacionProveedor | ''; observaciones: string }
type CampoEvaluacion = keyof DatosEvaluacion

const inicial: DatosEvaluacion = { periodo: '', calidad: '', cumplimiento: '', servicio: '', resultado: '', observaciones: '' }

export function ProveedorEvaluarView({ proveedorId, onNavegar, onCambiosPendientes }: { proveedorId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [proveedor, setProveedor] = useState<ProveedorAbastecimiento | null>(null)
  const [datos, setDatos] = useState(inicial)
  const [errores, setErrores] = useState<Partial<Record<CampoEvaluacion, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(inicial)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<ProveedorAbastecimiento>('proveedores', proveedorId, controlador.signal).then(setProveedor).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorGeneral(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el proveedor.') })
    return () => controlador.abort()
  }, [proveedorId])

  const actualizar = (campo: CampoEvaluacion, valor: string) => { setDatos((actual) => ({ ...actual, [campo]: valor })); setErrores((actual) => ({ ...actual, [campo]: undefined })); setErrorGeneral(null) }
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes: Partial<Record<CampoEvaluacion, string>> = {}
    if (datos.periodo.trim().length < 4 || datos.periodo.trim().length > 20) siguientes.periodo = 'El período debe contener de 4 a 20 caracteres.'
    ;(['calidad', 'cumplimiento', 'servicio'] as const).forEach((campo) => { const valor = Number(datos[campo]); if (datos[campo] === '' || !Number.isFinite(valor) || valor < 0 || valor > 100) siguientes[campo] = 'Ingresa un valor entre 0 y 100.' })
    if (!datos.resultado) siguientes.resultado = 'Selecciona el resultado de la evaluación.'
    if (datos.observaciones.trim().length > 1000) siguientes.observaciones = 'Las observaciones admiten hasta 1000 caracteres.'
    if (Object.keys(siguientes).length) { setErrores(siguientes); setErrorGeneral('Revisa los campos señalados antes de guardar.'); document.getElementById(`evaluacion-${Object.keys(siguientes)[0]}`)?.focus(); return }
    const solicitud: EvaluarProveedorRequest = { periodo: datos.periodo.trim(), calidad: Number(datos.calidad), cumplimiento: Number(datos.cumplimiento), servicio: Number(datos.servicio), resultado: datos.resultado as ResultadoEvaluacionProveedor, observaciones: datos.observaciones.trim() || null }
    setGuardando(true)
    try { await evaluarProveedor(proveedorId, solicitud); setGuardado(true); onCambiosPendientes(false) } catch (errorActual) { setErrorGeneral(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la evaluación.') } finally { setGuardando(false) }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-evaluar-proveedor">
        <AbastecimientoBreadcrumb recurso="proveedores" actual="Evaluar proveedor" onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Proveedor {proveedor?.codigo ?? ''}</p><h1 id="titulo-evaluar-proveedor">Evaluar proveedor</h1><p>{proveedor ? `Registra el desempeño de ${proveedor.nombre}.` : 'Cargando información del proveedor…'}</p></div></header>
        {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}
        {proveedor && <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando || !proveedor.activo}>
            <legend>Período y resultado</legend>
            <div className={styles.grillaDos}>
              <CampoEvaluacion id="periodo" etiqueta="Período evaluado" valor={datos.periodo} error={errores.periodo} maxLength={20} placeholder="Ej. 2026-T3" onChange={(valor) => actualizar('periodo', valor)} />
              <div className={styles.campo}><label htmlFor="evaluacion-resultado">Resultado <span aria-hidden="true">*</span></label><select id="evaluacion-resultado" value={datos.resultado} aria-invalid={Boolean(errores.resultado)} aria-describedby={errores.resultado ? 'evaluacion-resultado-error' : undefined} onChange={(evento) => actualizar('resultado', evento.target.value)}><option value="">Selecciona un resultado</option><option value="APROBADO">Aprobado</option><option value="CONDICIONADO">Condicionado</option><option value="NO_APROBADO">No aprobado</option></select>{errores.resultado && <small id="evaluacion-resultado-error" className={styles.errorCampo}>{errores.resultado}</small>}</div>
            </div>
          </fieldset>
          <fieldset disabled={guardando || !proveedor.activo}>
            <legend>Calificación</legend><p className={styles.descripcionSeccion}>Cada criterio se califica de 0 a 100. El backend calcula el promedio final.</p>
            <div className={styles.grillaTres}>{(['calidad', 'cumplimiento', 'servicio'] as const).map((campo) => <CampoEvaluacion key={campo} id={campo} etiqueta={campo === 'calidad' ? 'Calidad' : campo === 'cumplimiento' ? 'Cumplimiento' : 'Servicio'} valor={datos[campo]} error={errores[campo]} tipo="number" min="0" max="100" step="0.01" onChange={(valor) => actualizar(campo, valor)} />)}</div>
            <div className={styles.campo}><label htmlFor="evaluacion-observaciones">Observaciones</label><textarea id="evaluacion-observaciones" value={datos.observaciones} rows={5} maxLength={1000} aria-invalid={Boolean(errores.observaciones)} onChange={(evento) => actualizar('observaciones', evento.target.value)} />{errores.observaciones && <small className={styles.errorCampo}>{errores.observaciones}</small>}</div>
          </fieldset>
          {!proveedor.activo && <div className={styles.alertaAdvertencia} role="status">El proveedor está inactivo y no puede recibir nuevas evaluaciones.</div>}
          <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(`/abastecimiento/proveedores/${proveedor.id}`)}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !proveedor.activo}><IconoAccion nombre="guardar" />{guardando ? 'Registrando evaluación…' : 'Registrar evaluación'}</button></div></div>
        </form>}
      </section>
      <ModalEstado abierto={guardado} tipo="exito" titulo="Evaluación registrada" mensaje="La evaluación quedó guardada y la calificación vigente del proveedor fue actualizada." textoAccionPrincipal="Ver proveedor" onAccionPrincipal={() => onNavegar(`/abastecimiento/proveedores/${proveedorId}`)} onCerrar={() => onNavegar(`/abastecimiento/proveedores/${proveedorId}`)} />
    </>
  )
}

function CampoEvaluacion({ id, etiqueta, valor, error, onChange, tipo = 'text', maxLength, placeholder, min, max, step }: { id: CampoEvaluacion; etiqueta: string; valor: string; error?: string; onChange: (valor: string) => void; tipo?: 'text' | 'number'; maxLength?: number; placeholder?: string; min?: string; max?: string; step?: string }) {
  return <div className={styles.campo}><label htmlFor={`evaluacion-${id}`}>{etiqueta} <span aria-hidden="true">*</span></label><input id={`evaluacion-${id}`} type={tipo} value={valor} required maxLength={maxLength} placeholder={placeholder} min={min} max={max} step={step} aria-invalid={Boolean(error)} aria-describedby={error ? `evaluacion-${id}-error` : undefined} onChange={(evento) => onChange(evento.target.value)} />{error && <small id={`evaluacion-${id}-error`} className={styles.errorCampo}>{error}</small>}</div>
}
