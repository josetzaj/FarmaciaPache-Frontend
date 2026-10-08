import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearPuesto, listarDepartamentosParaPuestos } from '../puesto-api'
import type { DepartamentoDisponiblePuesto } from '../puesto.types'
import { validarFormularioPuesto, type DatosFormularioPuesto, type ErroresFormularioPuesto } from '../validacion-puesto'
import { PuestoBreadcrumb } from './puesto-breadcrumb'
import { PuestoFormularioCampos } from './puesto-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const iniciales: DatosFormularioPuesto = { departamentoOrganizacionalId: '', codigo: '', nombre: '', descripcion: '' }

export function PuestoCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [datos, setDatos] = useState(iniciales)
  const [departamentos, setDepartamentos] = useState<DepartamentoDisponiblePuesto[] | null>(null)
  const [errores, setErrores] = useState<ErroresFormularioPuesto>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)
  const tieneCambios = useMemo(() => JSON.stringify(datos) !== JSON.stringify(iniciales), [datos])

  useEffect(() => {
    const controlador = new AbortController()
    void listarDepartamentosParaPuestos(controlador.signal)
      .then((respuesta) => { setDepartamentos(respuesta); setErrorGeneral(null) })
      .catch((error: unknown) => { if (!controlador.signal.aborted) setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar los departamentos.') })
    return () => controlador.abort()
  }, [revision])
  useEffect(() => onCambiosPendientes(tieneCambios && !exito), [exito, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes = validarFormularioPuesto(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      await crearPuesto({
        departamentoOrganizacionalId: datos.departamentoOrganizacionalId,
        codigo: datos.codigo.trim().toUpperCase(),
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim() || null,
      })
      onCambiosPendientes(false)
      setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        setErrorGeneral(error.message)
        const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioPuesto
        if (Object.keys(erroresApi).length) setErrores(erroresApi)
      } else setErrorGeneral('No fue posible registrar el puesto.')
    } finally { setGuardando(false) }
  }

  if (!departamentos) return <section className={styles.estadoCargaFormulario}><PuestoBreadcrumb actual="Crear puesto" onNavegar={onNavegar} /><h1>{errorGeneral ? 'No se pudieron cargar los departamentos' : 'Preparando formulario…'}</h1><p>{errorGeneral ?? 'Estamos preparando la información.'}</p>{errorGeneral && <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>

  const hayDepartamentosActivos = departamentos.some((departamento) => departamento.activo)
  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><div><PuestoBreadcrumb actual="Crear puesto" onNavegar={onNavegar} /><h1>Crear puesto organizacional</h1></div></header>{errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}{!hayDepartamentosActivos && <div className={styles.alertaError} role="alert"><span>!</span><p>Necesitas al menos un departamento organizacional activo antes de registrar puestos.</p></div>}<form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate><PuestoFormularioCampos datos={datos} errores={errores} departamentos={departamentos} deshabilitado={guardando || !hayDepartamentosActivos} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} /><div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/organizacion/puestos')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button><button className={styles.botonPrincipal} type="submit" disabled={guardando || !hayDepartamentosActivos}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Registrando puesto…' : 'Registrar puesto'}</span></button></div></div></form><ModalEstado abierto={exito} tipo="exito" titulo="Puesto registrado" mensaje="El puesto organizacional fue guardado correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/puestos')} onCerrar={() => onNavegar('/organizacion/puestos')} /></section>
}
