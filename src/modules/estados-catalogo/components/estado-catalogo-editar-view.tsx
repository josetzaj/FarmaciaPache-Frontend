import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarEstadoCatalogo, obtenerEstadoCatalogo } from '../estado-catalogo-api'
import type { EstadoCatalogo } from '../estado-catalogo.types'
import { validarFormularioEstadoCatalogo, type DatosFormularioEstadoCatalogo, type ErroresFormularioEstadoCatalogo } from '../validacion-estado-catalogo'
import { EstadoCatalogoBreadcrumb } from './estado-catalogo-breadcrumb'
import { EstadoCatalogoFormularioCampos } from './estado-catalogo-formulario-campos'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = { estadoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }
const datosDesdeEstado = (estado: EstadoCatalogo): DatosFormularioEstadoCatalogo => ({ codigo: estado.codigo, nombre: estado.nombre, descripcion: estado.descripcion ?? '' })

export function EstadoCatalogoEditarView({ estadoId, onNavegar, onCambiosPendientes }: Props) {
  const [estado, setEstado] = useState<EstadoCatalogo | null>(null)
  const [datos, setDatos] = useState<DatosFormularioEstadoCatalogo | null>(null)
  const [iniciales, setIniciales] = useState<DatosFormularioEstadoCatalogo | null>(null)
  const [errores, setErrores] = useState<ErroresFormularioEstadoCatalogo>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [sinCambios, setSinCambios] = useState(false)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerEstadoCatalogo(estadoId, controlador.signal).then((respuesta) => {
      const valores = datosDesdeEstado(respuesta)
      setEstado(respuesta); setDatos(valores); setIniciales(valores); setErrorGeneral(null)
    }).catch((error: unknown) => {
      if (!controlador.signal.aborted) setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar el estado.')
    })
    return () => controlador.abort()
  }, [estadoId, revision])

  const hayCambios = useMemo(() => Boolean(datos && iniciales && JSON.stringify(datos) !== JSON.stringify(iniciales)), [datos, iniciales])
  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!estado || !datos) return
    const siguientes = validarFormularioEstadoCatalogo(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    if (!hayCambios) { setSinCambios(true); return }
    setGuardando(true); setErrorGeneral(null)
    try {
      const actualizado = await actualizarEstadoCatalogo(estado.id, { version: estado.version, codigo: datos.codigo.trim().toUpperCase(), nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() || null })
      setEstado(actualizado); onCambiosPendientes(false); setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        setErrorGeneral(error.message)
        const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioEstadoCatalogo
        if (Object.keys(erroresApi).length) setErrores(erroresApi)
      } else setErrorGeneral('No fue posible actualizar el estado.')
    } finally { setGuardando(false) }
  }

  if (!estado || !datos) return (
    <section className={styles.estadoCargaFormulario}>
      <EstadoCatalogoBreadcrumb actual="Editar estado" onNavegar={onNavegar} />
      <h1>{errorGeneral ? 'No se pudo cargar el estado' : 'Cargando estado…'}</h1><p>{errorGeneral ?? 'Estamos preparando la información.'}</p>
      {errorGeneral && <button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}
    </section>
  )

  return (
    <section className={styles.paginaFormulario}>
      <header className={styles.encabezadoPagina}><div><EstadoCatalogoBreadcrumb actual="Editar estado" onNavegar={onNavegar} /><h1>Editar estado</h1></div><span className={styles.indicadorFormulario}>{estado.nombre}</span></header>
      {errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}
      <form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate>
        <EstadoCatalogoFormularioCampos datos={datos} errores={errores} deshabilitado={guardando} onChange={(siguientes) => { setDatos(siguientes); setErrores({}) }} />
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div>
          <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/catalogos/estados')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button>
          <button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</span></button>
        </div></div>
      </form>
      <ModalEstado abierto={exito} tipo="exito" titulo="Estado actualizado" mensaje="La información fue actualizada correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/catalogos/estados')} onCerrar={() => onNavegar('/catalogos/estados')} />
      <ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información del estado." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/catalogos/estados')} onCerrar={() => setSinCambios(false)} />
    </section>
  )
}
