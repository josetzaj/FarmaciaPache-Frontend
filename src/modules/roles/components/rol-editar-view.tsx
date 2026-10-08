import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarRol, asignarPermisosRol, obtenerCatalogoPermisos, obtenerRol } from '../rol-api'
import type { CatalogoPermisos, Rol } from '../rol.types'
import { validarCantidadPermisosRol, validarFormularioRol, type DatosFormularioRol, type ErroresFormularioRol } from '../validacion-rol'
import { RolBreadcrumb } from './rol-breadcrumb'
import { RolFormularioCampos } from './rol-formulario-campos'
import styles from './rol-formulario.module.css'

type RolEditarViewProps = {
  rolId: string
  puedeGestionarPermisos: boolean
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

function datosDesdeRol(rol: Rol): DatosFormularioRol {
  return { codigo: rol.codigo, nombre: rol.nombre, descripcion: rol.descripcion ?? '' }
}

function catalogoDesdeRol(rol: Rol): CatalogoPermisos {
  const modulos = new Map<string, Map<string, typeof rol.permisos>>()
  for (const permiso of rol.permisos) {
    const [modulo = 'OTROS', submodulo = 'GENERAL'] = permiso.codigo.split('.')
    if (!modulos.has(modulo)) modulos.set(modulo, new Map())
    const grupos = modulos.get(modulo)!
    if (!grupos.has(submodulo)) grupos.set(submodulo, [])
    grupos.get(submodulo)!.push(permiso)
  }
  return {
    modulos: [...modulos.entries()].map(([modulo, grupos], indiceModulo) => ({
      id: modulo,
      codigo: modulo,
      nombre: modulo,
      descripcion: null,
      orden: indiceModulo,
      permisosDirectos: [],
      submodulos: [...grupos.entries()].map(([submodulo, permisos], indiceSubmodulo) => ({
        id: `${modulo}.${submodulo}`,
        codigo: submodulo,
        nombre: submodulo,
        descripcion: null,
        orden: indiceSubmodulo,
        permisos: permisos.map((permiso) => ({ ...permiso, descripcion: null })),
      })),
    })),
  }
}

function mismosPermisos(actuales: readonly string[], iniciales: readonly string[]): boolean {
  return [...actuales].sort().join('|') === [...iniciales].sort().join('|')
}

export function RolEditarView({
  rolId,
  puedeGestionarPermisos,
  onNavegar,
  onCambiosPendientes,
}: RolEditarViewProps) {
  const [rol, setRol] = useState<Rol | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoPermisos | null>(null)
  const [datos, setDatos] = useState<DatosFormularioRol | null>(null)
  const [datosIniciales, setDatosIniciales] = useState<DatosFormularioRol | null>(null)
  const [permisos, setPermisos] = useState<string[]>([])
  const [permisosIniciales, setPermisosIniciales] = useState<string[]>([])
  const [errores, setErrores] = useState<ErroresFormularioRol>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [sinCambios, setSinCambios] = useState(false)
  const [reintento, setReintento] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const controlador = new AbortController()
    const cargaCatalogo = puedeGestionarPermisos
      ? obtenerCatalogoPermisos(controlador.signal)
      : Promise.resolve(null)
    void Promise.all([obtenerRol(rolId, controlador.signal), cargaCatalogo])
      .then(([respuestaRol, respuestaCatalogo]) => {
        const iniciales = datosDesdeRol(respuestaRol)
        const permisosRol = respuestaRol.permisos.map((permiso) => permiso.id)
        setRol(respuestaRol)
        setDatos(iniciales)
        setDatosIniciales(iniciales)
        setPermisos(permisosRol)
        setPermisosIniciales(permisosRol)
        setCatalogo(respuestaCatalogo ?? catalogoDesdeRol(respuestaRol))
        setErrorGeneral(null)
      })
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) {
          setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar el rol.')
        }
      })
    return () => controlador.abort()
  }, [puedeGestionarPermisos, reintento, rolId])

  const hayCambiosDatos = useMemo(
    () => Boolean(datos && datosIniciales && JSON.stringify(datos) !== JSON.stringify(datosIniciales)),
    [datos, datosIniciales],
  )
  const permisosEditables = puedeGestionarPermisos && Boolean(rol?.activo)
  const hayCambiosPermisos = permisosEditables && !mismosPermisos(permisos, permisosIniciales)
  const hayCambios = hayCambiosDatos || hayCambiosPermisos

  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rol || !datos) return
    const siguientes = validarFormularioRol(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length > 0) {
      const campo = Object.keys(siguientes)[0]
      formularioRef.current?.querySelector<HTMLElement>(`#${campo}`)?.focus()
      return
    }
    const errorPermisos = validarCantidadPermisosRol(permisos)
    if (errorPermisos) {
      setErrorGeneral(errorPermisos)
      return
    }
    if (!hayCambios) {
      setSinCambios(true)
      return
    }

    setGuardando(true)
    setErrorGeneral(null)
    try {
      let rolActual = rol
      if (hayCambiosDatos) {
        rolActual = await actualizarRol(rol.id, {
          version: rolActual.version,
          codigo: datos.codigo.trim().toUpperCase(),
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim() || null,
        })
      }
      if (hayCambiosPermisos) {
        rolActual = await asignarPermisosRol(rol.id, rolActual.version, permisos)
      }
      setRol(rolActual)
      onCambiosPendientes(false)
      setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        setErrorGeneral(error.message)
        const erroresApi = Object.fromEntries(error.detalles.map((detalle) => [detalle.campo, detalle.mensaje])) as ErroresFormularioRol
        if (Object.keys(erroresApi).length > 0) setErrores(erroresApi)
      } else setErrorGeneral('No fue posible actualizar el rol.')
    } finally {
      setGuardando(false)
    }
  }

  if (!rol || !datos || !catalogo) {
    return (
      <section className={styles.estadoCargaFormulario}>
        <RolBreadcrumb actual="Editar rol" onNavegar={onNavegar} />
        <h1>{errorGeneral ? 'No se pudo cargar el rol' : 'Cargando rol…'}</h1>
        <p>{errorGeneral ?? 'Estamos preparando la información y los permisos.'}</p>
        {errorGeneral && <button type="button" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</button>}
      </section>
    )
  }

  return (
    <section className={styles.paginaFormulario}>
      <header className={styles.encabezadoPagina}>
        <div><RolBreadcrumb actual="Editar rol" onNavegar={onNavegar} /><h1>Editar rol</h1></div>
        <span className={styles.indicadorFormulario}>{rol.nombre}</span>
      </header>
      {errorGeneral && <div className={styles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}
      <form ref={formularioRef} className={styles.formulario} onSubmit={(event) => void guardar(event)} noValidate>
        <RolFormularioCampos
          datos={datos}
          errores={errores}
          catalogo={catalogo}
          permisosSeleccionados={permisos}
          onDatosChange={(siguientes) => { setDatos(siguientes); setErrores({}) }}
          onPermisosChange={setPermisos}
          deshabilitado={guardando}
          permisosEditables={permisosEditables}
          mensajePermisosLectura={rol.activo
            ? 'Puedes consultar los permisos, pero tu usuario no tiene autorización para modificarlos.'
            : 'Los permisos de un rol inactivo se conservan únicamente para consulta.'}
          permisosProtegidos={rol.codigo === 'SUPERADMIN' ? permisosIniciales : []}
        />
        <div className={styles.accionesFormulario}>
          <p><span aria-hidden="true">*</span> Campos obligatorios</p>
          <div>
            <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/seguridad/roles')} disabled={guardando}>
              <IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span>
            </button>
            <button className={styles.botonPrincipal} type="submit" disabled={guardando}>
              <IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</span>
            </button>
          </div>
        </div>
      </form>
      <ModalEstado abierto={exito} tipo="exito" titulo="Rol actualizado" mensaje="La información y los permisos fueron actualizados correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/seguridad/roles')} onCerrar={() => onNavegar('/seguridad/roles')} />
      <ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información ni permiso del rol." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/seguridad/roles')} onCerrar={() => setSinCambios(false)} />
    </section>
  )
}
