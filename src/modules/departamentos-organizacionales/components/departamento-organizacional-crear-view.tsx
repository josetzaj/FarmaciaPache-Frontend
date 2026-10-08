import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearDepartamentoOrganizacional } from '../departamento-organizacional-api'
import { validarFormularioDepartamentoOrganizacional, type DatosFormularioDepartamentoOrganizacional, type ErroresFormularioDepartamentoOrganizacional } from '../validacion-departamento-organizacional'
import { DepartamentoOrganizacionalBreadcrumb } from './departamento-organizacional-breadcrumb'
import { DepartamentoOrganizacionalFormularioCampos } from './departamento-organizacional-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const iniciales: DatosFormularioDepartamentoOrganizacional = { codigo: '', nombre: '', descripcion: '' }

export function DepartamentoOrganizacionalCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [datos, setDatos] = useState(iniciales)
  const [errores, setErrores] = useState<ErroresFormularioDepartamentoOrganizacional>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const formularioRef = useRef<HTMLFormElement>(null)
  const tieneCambios = useMemo(() => JSON.stringify(datos) !== JSON.stringify(iniciales), [datos])
  useEffect(() => onCambiosPendientes(tieneCambios && !exito), [exito, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); const siguientes = validarFormularioDepartamentoOrganizacional(datos); setErrores(siguientes)
    if (Object.keys(siguientes).length) { formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus(); return }
    setGuardando(true); setErrorGeneral(null)
    try { await crearDepartamentoOrganizacional({ codigo: datos.codigo.trim().toUpperCase(), nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() || null }); onCambiosPendientes(false); setExito(true) }
    catch (error: unknown) { if (error instanceof ErrorApi) { setErrorGeneral(error.message); const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioDepartamentoOrganizacional; if (Object.keys(erroresApi).length) setErrores(erroresApi) } else setErrorGeneral('No fue posible registrar el departamento.') }
    finally { setGuardando(false) }
  }
  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><div><DepartamentoOrganizacionalBreadcrumb actual="Crear departamento" onNavegar={onNavegar} /><h1>Crear departamento organizacional</h1></div></header>{errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}<form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate><DepartamentoOrganizacionalFormularioCampos datos={datos} errores={errores} deshabilitado={guardando} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} /><div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/organizacion/departamentos')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Registrando departamento…' : 'Registrar departamento'}</span></button></div></div></form><ModalEstado abierto={exito} tipo="exito" titulo="Departamento registrado" mensaje="El departamento organizacional fue guardado correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/departamentos')} onCerrar={() => onNavegar('/organizacion/departamentos')} /></section>
}
