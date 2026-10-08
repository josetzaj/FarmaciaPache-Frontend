import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearEstadoCatalogo } from '../estado-catalogo-api'
import { validarFormularioEstadoCatalogo, type DatosFormularioEstadoCatalogo, type ErroresFormularioEstadoCatalogo } from '../validacion-estado-catalogo'
import { EstadoCatalogoBreadcrumb } from './estado-catalogo-breadcrumb'
import { EstadoCatalogoFormularioCampos } from './estado-catalogo-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const iniciales: DatosFormularioEstadoCatalogo = { codigo: '', nombre: '', descripcion: '' }

export function EstadoCatalogoCrearView({ onNavegar, onCambiosPendientes }: Props) {
  const [datos, setDatos] = useState(iniciales)
  const [errores, setErrores] = useState<ErroresFormularioEstadoCatalogo>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const formularioRef = useRef<HTMLFormElement>(null)
  const tieneCambios = useMemo(() => JSON.stringify(datos) !== JSON.stringify(iniciales), [datos])

  useEffect(() => onCambiosPendientes(tieneCambios && !exito), [exito, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const siguientes = validarFormularioEstadoCatalogo(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      await crearEstadoCatalogo({ codigo: datos.codigo.trim().toUpperCase(), nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() || null })
      onCambiosPendientes(false)
      setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        setErrorGeneral(error.message)
        const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioEstadoCatalogo
        if (Object.keys(erroresApi).length) setErrores(erroresApi)
      } else setErrorGeneral('No fue posible registrar el estado.')
    } finally { setGuardando(false) }
  }

  return (
    <section className={styles.paginaFormulario}>
      <header className={styles.encabezadoPagina}><div><EstadoCatalogoBreadcrumb actual="Crear estado" onNavegar={onNavegar} /><h1>Crear nuevo estado</h1></div></header>
      {errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}
      <form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate>
        <EstadoCatalogoFormularioCampos datos={datos} errores={errores} deshabilitado={guardando} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} />
        <div className={styles.accionesFormulario}>
          <p><span aria-hidden="true">*</span> Campos obligatorios</p>
          <div>
            <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/catalogos/estados')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button>
            <button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Registrando estado…' : 'Registrar estado'}</span></button>
          </div>
        </div>
      </form>
      <ModalEstado abierto={exito} tipo="exito" titulo="Estado registrado" mensaje="El estado fue guardado correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/catalogos/estados')} onCerrar={() => onNavegar('/catalogos/estados')} />
    </section>
  )
}
