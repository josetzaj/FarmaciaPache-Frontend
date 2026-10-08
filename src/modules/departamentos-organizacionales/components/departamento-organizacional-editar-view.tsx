import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarDepartamentoOrganizacional, obtenerDepartamentoOrganizacional } from '../departamento-organizacional-api'
import type { DepartamentoOrganizacional } from '../departamento-organizacional.types'
import { validarFormularioDepartamentoOrganizacional, type DatosFormularioDepartamentoOrganizacional, type ErroresFormularioDepartamentoOrganizacional } from '../validacion-departamento-organizacional'
import { DepartamentoOrganizacionalBreadcrumb } from './departamento-organizacional-breadcrumb'
import { DepartamentoOrganizacionalFormularioCampos } from './departamento-organizacional-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { departamentoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const datosDesdeDepartamento = (departamento: DepartamentoOrganizacional): DatosFormularioDepartamentoOrganizacional => ({ codigo: departamento.codigo, nombre: departamento.nombre, descripcion: departamento.descripcion ?? '' })

export function DepartamentoOrganizacionalEditarView({ departamentoId, onNavegar, onCambiosPendientes }: Props) {
  const [departamento, setDepartamento] = useState<DepartamentoOrganizacional | null>(null)
  const [datos, setDatos] = useState<DatosFormularioDepartamentoOrganizacional | null>(null)
  const [iniciales, setIniciales] = useState<DatosFormularioDepartamentoOrganizacional | null>(null)
  const [errores, setErrores] = useState<ErroresFormularioDepartamentoOrganizacional>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [sinCambios, setSinCambios] = useState(false)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)
  useEffect(() => { const controlador = new AbortController(); void obtenerDepartamentoOrganizacional(departamentoId, controlador.signal).then((respuesta) => { const valores = datosDesdeDepartamento(respuesta); setDepartamento(respuesta); setDatos(valores); setIniciales(valores); setErrorGeneral(null) }).catch((error: unknown) => { if (!controlador.signal.aborted) setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar el departamento.') }); return () => controlador.abort() }, [departamentoId, revision])
  const hayCambios = useMemo(() => Boolean(datos && iniciales && JSON.stringify(datos) !== JSON.stringify(iniciales)), [datos, iniciales])
  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])
  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); if (!departamento || !datos) return; const siguientes = validarFormularioDepartamentoOrganizacional(datos); setErrores(siguientes)
    if (Object.keys(siguientes).length) { formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus(); return }
    if (!hayCambios) { setSinCambios(true); return }
    setGuardando(true); setErrorGeneral(null)
    try { const actualizado = await actualizarDepartamentoOrganizacional(departamento.id, { version: departamento.version, codigo: datos.codigo.trim().toUpperCase(), nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() || null }); setDepartamento(actualizado); onCambiosPendientes(false); setExito(true) }
    catch (error: unknown) { if (error instanceof ErrorApi) { setErrorGeneral(error.message); const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioDepartamentoOrganizacional; if (Object.keys(erroresApi).length) setErrores(erroresApi) } else setErrorGeneral('No fue posible actualizar el departamento.') }
    finally { setGuardando(false) }
  }
  if (!departamento || !datos) return <section className={styles.estadoCargaFormulario}><DepartamentoOrganizacionalBreadcrumb actual="Editar departamento" onNavegar={onNavegar} /><h1>{errorGeneral ? 'No se pudo cargar el departamento' : 'Cargando departamento…'}</h1><p>{errorGeneral ?? 'Estamos preparando la información.'}</p>{errorGeneral && <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>
  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><div><DepartamentoOrganizacionalBreadcrumb actual="Editar departamento" onNavegar={onNavegar} /><h1>Editar departamento organizacional</h1></div><span className={styles.indicadorFormulario}>{departamento.nombre}</span></header>{errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}<form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate><DepartamentoOrganizacionalFormularioCampos datos={datos} errores={errores} deshabilitado={guardando} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} /><div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/organizacion/departamentos')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</span></button></div></div></form><ModalEstado abierto={exito} tipo="exito" titulo="Departamento actualizado" mensaje="La información fue actualizada correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/departamentos')} onCerrar={() => onNavegar('/organizacion/departamentos')} /><ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información del departamento." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/departamentos')} onCerrar={() => setSinCambios(false)} /></section>
}
