import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarPuesto, listarDepartamentosParaPuestos, obtenerPuesto } from '../puesto-api'
import type { DepartamentoDisponiblePuesto, Puesto } from '../puesto.types'
import { validarFormularioPuesto, type DatosFormularioPuesto, type ErroresFormularioPuesto } from '../validacion-puesto'
import { PuestoBreadcrumb } from './puesto-breadcrumb'
import { PuestoFormularioCampos } from './puesto-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { puestoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const datosDesdePuesto = (puesto: Puesto): DatosFormularioPuesto => ({ departamentoOrganizacionalId: puesto.departamentoOrganizacionalId, codigo: puesto.codigo, nombre: puesto.nombre, descripcion: puesto.descripcion ?? '' })

export function PuestoEditarView({ puestoId, onNavegar, onCambiosPendientes }: Props) {
  const [puesto, setPuesto] = useState<Puesto | null>(null)
  const [departamentos, setDepartamentos] = useState<DepartamentoDisponiblePuesto[] | null>(null)
  const [datos, setDatos] = useState<DatosFormularioPuesto | null>(null)
  const [iniciales, setIniciales] = useState<DatosFormularioPuesto | null>(null)
  const [errores, setErrores] = useState<ErroresFormularioPuesto>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [sinCambios, setSinCambios] = useState(false)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      obtenerPuesto(puestoId, controlador.signal),
      listarDepartamentosParaPuestos(controlador.signal),
    ]).then(([respuestaPuesto, respuestaDepartamentos]) => {
      const valores = datosDesdePuesto(respuestaPuesto)
      setPuesto(respuestaPuesto)
      setDepartamentos(respuestaDepartamentos)
      setDatos(valores)
      setIniciales(valores)
      setErrorGeneral(null)
    }).catch((error: unknown) => {
      if (!controlador.signal.aborted) setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar el puesto.')
    })
    return () => controlador.abort()
  }, [puestoId, revision])

  const hayCambios = useMemo(() => Boolean(datos && iniciales && JSON.stringify(datos) !== JSON.stringify(iniciales)), [datos, iniciales])
  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!puesto || !datos) return
    const siguientes = validarFormularioPuesto(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    if (!hayCambios) { setSinCambios(true); return }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      const actualizado = await actualizarPuesto(puesto.id, {
        version: puesto.version,
        departamentoOrganizacionalId: datos.departamentoOrganizacionalId,
        codigo: datos.codigo.trim().toUpperCase(),
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim() || null,
      })
      setPuesto(actualizado)
      onCambiosPendientes(false)
      setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        setErrorGeneral(error.message)
        const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioPuesto
        if (Object.keys(erroresApi).length) setErrores(erroresApi)
      } else setErrorGeneral('No fue posible actualizar el puesto.')
    } finally { setGuardando(false) }
  }

  if (!puesto || !datos || !departamentos) return <section className={styles.estadoCargaFormulario}><PuestoBreadcrumb actual="Editar puesto" onNavegar={onNavegar} /><h1>{errorGeneral ? 'No se pudo cargar el puesto' : 'Cargando puesto…'}</h1><p>{errorGeneral ?? 'Estamos preparando la información.'}</p>{errorGeneral && <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>
  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><div><PuestoBreadcrumb actual="Editar puesto" onNavegar={onNavegar} /><h1>Editar puesto organizacional</h1></div><span className={styles.indicadorFormulario}>{puesto.nombre}</span></header>{errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}<form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate><PuestoFormularioCampos datos={datos} errores={errores} departamentos={departamentos} deshabilitado={guardando} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} /><div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/organizacion/puestos')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</span></button></div></div></form><ModalEstado abierto={exito} tipo="exito" titulo="Puesto actualizado" mensaje="La información fue actualizada correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/puestos')} onCerrar={() => onNavegar('/organizacion/puestos')} /><ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información del puesto." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/puestos')} onCerrar={() => setSinCambios(false)} /></section>
}
