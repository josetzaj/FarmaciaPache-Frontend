import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { notificarFotoEmpleadoActualizada } from '../../../shared/eventos/eventos-aplicacion'
import {
  actualizarEmpleado,
  actualizarFotoEmpleado,
  cambiarSucursalEmpleado,
  eliminarFotoEmpleado,
  obtenerCatalogosEmpleado,
  obtenerEmpleado,
  obtenerMunicipiosPorDepartamento,
} from '../empleado-api'
import type { CatalogosEmpleado, Empleado, MunicipioCatalogo } from '../empleado.types'
import {
  cumpleEdadMinimaEnFecha,
  MENSAJE_EDAD_MINIMA_EMPLEADO,
} from '../validacion-empleado'
import { EmpleadoBreadcrumb } from './empleado-breadcrumb'
import formStyles from './empleado-crear-view.module.css'
import styles from './empleado-gestion.module.css'

type EmpleadoEditarViewProps = {
  empleadoId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

type DatosFormulario = {
  codigo: string
  primerNombre: string
  segundoNombre: string
  tercerNombre: string
  primerApellido: string
  segundoApellido: string
  apellidoCasada: string
  dpi: string
  fechaNacimiento: string
  correo: string
  telefono: string
  puestoId: string
  departamentoGeograficoId: string
  municipioId: string
  direccion: string
  fechaContratacion: string
}

type Campo = keyof DatosFormulario
type Errores = Partial<Record<Campo, string>>

type DatosCambioSucursal = {
  sucursalId: string
  fechaInicio: string
  motivoCambio: string
}

type CampoCambioSucursal = keyof DatosCambioSucursal
type ErroresCambioSucursal = Partial<Record<CampoCambioSucursal, string>>

const tiposPermitidos = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const maximoFotoBytes = 5 * 1024 * 1024

function fechaHoyGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function datosCambioSucursalDesdeEmpleado(empleado: Empleado): DatosCambioSucursal {
  return {
    sucursalId: empleado.asignacionActual?.sucursalId ?? '',
    fechaInicio: [
      fechaHoyGuatemala(),
      empleado.fechaContratacion.slice(0, 10),
      empleado.asignacionActual?.fechaInicio.slice(0, 10) ?? '',
    ].sort().at(-1) ?? fechaHoyGuatemala(),
    motivoCambio: '',
  }
}

function datosDesdeEmpleado(empleado: Empleado): DatosFormulario {
  return {
    codigo: empleado.codigo,
    primerNombre: empleado.primerNombre,
    segundoNombre: empleado.segundoNombre ?? '',
    tercerNombre: empleado.tercerNombre ?? '',
    primerApellido: empleado.primerApellido,
    segundoApellido: empleado.segundoApellido ?? '',
    apellidoCasada: empleado.apellidoCasada ?? '',
    dpi: empleado.dpi,
    fechaNacimiento: empleado.fechaNacimiento.slice(0, 10),
    correo: empleado.correo ?? '',
    telefono: empleado.telefono ?? '',
    puestoId: empleado.puestoId ?? '',
    departamentoGeograficoId: empleado.municipio?.departamentoGeografico.id ?? '',
    municipioId: empleado.municipioId ?? '',
    direccion: empleado.direccion ?? '',
    fechaContratacion: empleado.fechaContratacion.slice(0, 10),
  }
}

function nombreCompleto(empleado: Empleado): string {
  return [
    empleado.primerNombre,
    empleado.segundoNombre,
    empleado.tercerNombre,
    empleado.primerApellido,
    empleado.segundoApellido,
    empleado.apellidoCasada,
  ].filter(Boolean).join(' ')
}

function validar(datos: DatosFormulario): Errores {
  const errores: Errores = {}
  if (!/^[A-Za-z0-9_-]{2,20}$/.test(datos.codigo.trim())) errores.codigo = 'Ingresa de 2 a 20 caracteres válidos.'
  if (!datos.primerNombre.trim()) errores.primerNombre = 'El primer nombre es obligatorio.'
  if (!datos.primerApellido.trim()) errores.primerApellido = 'El primer apellido es obligatorio.'
  if (!/^\d{13}$/.test(datos.dpi)) errores.dpi = 'El DPI debe contener exactamente 13 dígitos.'
  if (!datos.fechaNacimiento) errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.'
  else if (
    datos.fechaContratacion &&
    !cumpleEdadMinimaEnFecha(datos.fechaNacimiento, datos.fechaContratacion)
  ) errores.fechaNacimiento = MENSAJE_EDAD_MINIMA_EMPLEADO
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) errores.correo = 'Ingresa un correo válido.'
  if (!datos.puestoId) errores.puestoId = 'Selecciona el puesto.'
  if (!datos.departamentoGeograficoId) errores.departamentoGeograficoId = 'Selecciona el departamento.'
  if (!datos.municipioId) errores.municipioId = 'Selecciona el municipio.'
  if (datos.direccion.trim().length < 5) errores.direccion = 'La dirección debe contener al menos 5 caracteres.'
  if (!datos.fechaContratacion) errores.fechaContratacion = 'Selecciona la fecha de contratación.'
  if (datos.fechaNacimiento && datos.fechaContratacion && datos.fechaNacimiento >= datos.fechaContratacion) errores.fechaContratacion = 'Debe ser posterior a la fecha de nacimiento.'
  return errores
}

function validarCambioSucursal(
  empleado: Empleado,
  datosEmpleado: DatosFormulario,
  cambio: DatosCambioSucursal,
): ErroresCambioSucursal {
  const errores: ErroresCambioSucursal = {}
  if (!cambio.sucursalId) errores.sucursalId = 'Selecciona la nueva sucursal.'
  if (!cambio.fechaInicio) errores.fechaInicio = 'Selecciona la fecha de inicio en la nueva sucursal.'
  else if (cambio.fechaInicio < datosEmpleado.fechaContratacion) {
    errores.fechaInicio = 'No puede ser anterior a la fecha de contratación.'
  } else if (
    empleado.asignacionActual?.fechaInicio &&
    cambio.fechaInicio < empleado.asignacionActual.fechaInicio.slice(0, 10)
  ) {
    errores.fechaInicio = 'No puede ser anterior al inicio de la asignación actual.'
  }
  const motivo = cambio.motivoCambio.trim()
  if (motivo.length < 5) errores.motivoCambio = 'Describe el motivo con al menos 5 caracteres.'
  else if (motivo.length > 250) errores.motivoCambio = 'El motivo no puede superar 250 caracteres.'
  return errores
}

export function EmpleadoEditarView({ empleadoId, permisos, onNavegar, onCambiosPendientes }: EmpleadoEditarViewProps) {
  const entradaFotoRef = useRef<HTMLInputElement>(null)
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [datos, setDatos] = useState<DatosFormulario | null>(null)
  const [datosCambioSucursal, setDatosCambioSucursal] = useState<DatosCambioSucursal | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogosEmpleado | null>(null)
  const [municipios, setMunicipios] = useState<MunicipioCatalogo[]>([])
  const [errores, setErrores] = useState<Errores>({})
  const [erroresCambioSucursal, setErroresCambioSucursal] = useState<ErroresCambioSucursal>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [quitarFotoActual, setQuitarFotoActual] = useState(false)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [sinCambios, setSinCambios] = useState(false)
  const [mostrarErrorEdad, setMostrarErrorEdad] = useState(false)
  const puedeCambiarSucursal = permisos.includes('ORGANIZACION.EMPLEADOS.CAMBIAR_SUCURSAL')
  const cambiaSucursal = Boolean(
    puedeCambiarSucursal &&
    empleado &&
    datosCambioSucursal &&
    datosCambioSucursal.sucursalId !== (empleado.asignacionActual?.sucursalId ?? ''),
  )
  const cambiaInformacion = Boolean(
    empleado && datos && JSON.stringify(datos) !== JSON.stringify(datosDesdeEmpleado(empleado)),
  )
  const tieneCambiosPendientes = Boolean(
    cambiaInformacion || cambiaSucursal || foto || quitarFotoActual,
  )

  useEffect(() => {
    onCambiosPendientes(tieneCambiosPendientes)
  }, [onCambiosPendientes, tieneCambiosPendientes])

  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      obtenerEmpleado(empleadoId, controlador.signal),
      obtenerCatalogosEmpleado(controlador.signal),
    ])
      .then(async ([empleadoActual, catalogosActuales]) => {
        setEmpleado(empleadoActual)
        setDatos(datosDesdeEmpleado(empleadoActual))
        setDatosCambioSucursal(datosCambioSucursalDesdeEmpleado(empleadoActual))
        setCatalogos(catalogosActuales)
        if (empleadoActual.municipio?.departamentoGeografico.id) {
          setMunicipios(await obtenerMunicipiosPorDepartamento(empleadoActual.municipio.departamentoGeografico.id, controlador.signal))
        }
        setErrorGeneral(null)
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible preparar la edición del empleado.')
      })
    return () => controlador.abort()
  }, [empleadoId, revision])

  useEffect(() => () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  const actualizarCampo = (campo: Campo, valor: string) => {
    setDatos((actual) => actual ? { ...actual, [campo]: valor } : actual)
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral(null)
  }

  const actualizarCampoCambioSucursal = (campo: CampoCambioSucursal, valor: string) => {
    setDatosCambioSucursal((actual) => actual ? { ...actual, [campo]: valor } : actual)
    setErroresCambioSucursal((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral(null)
  }

  const seleccionarSucursal = (sucursalId: string) => {
    if (!empleado) return
    if (sucursalId === (empleado.asignacionActual?.sucursalId ?? '')) {
      setDatosCambioSucursal(datosCambioSucursalDesdeEmpleado(empleado))
      setErroresCambioSucursal({})
      return
    }
    actualizarCampoCambioSucursal('sucursalId', sucursalId)
  }

  const cambiarDepartamento = async (departamentoId: string) => {
    actualizarCampo('departamentoGeograficoId', departamentoId)
    setDatos((actual) => actual ? { ...actual, municipioId: '' } : actual)
    setMunicipios([])
    if (!departamentoId) return
    try {
      setMunicipios(await obtenerMunicipiosPorDepartamento(departamentoId))
    } catch (error: unknown) {
      setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar los municipios.')
    }
  }

  const cambiarFoto = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0] ?? null
    setErrorFoto(null)
    if (!archivo) return
    if (!tiposPermitidos.has(archivo.type)) {
      setErrorFoto('La fotografía debe tener formato JPG, PNG o WebP.')
      event.target.value = ''
      return
    }
    if (archivo.size > maximoFotoBytes) {
      setErrorFoto('La fotografía no puede superar 5 MB.')
      event.target.value = ''
      return
    }
    setFoto(archivo)
    setVistaPrevia(URL.createObjectURL(archivo))
    setQuitarFotoActual(false)
  }

  const limpiarFotoNueva = () => {
    setFoto(null)
    setVistaPrevia(null)
    setErrorFoto(null)
    if (entradaFotoRef.current) entradaFotoRef.current.value = ''
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!datos || !empleado || !datosCambioSucursal) return
    if (!tieneCambiosPendientes) {
      setSinCambios(true)
      return
    }
    const erroresActuales = validar(datos)
    const erroresSucursalActuales = cambiaSucursal
      ? validarCambioSucursal(empleado, datos, datosCambioSucursal)
      : {}
    if (
      Object.keys(erroresActuales).length ||
      Object.keys(erroresSucursalActuales).length ||
      errorFoto
    ) {
      setErrores(erroresActuales)
      setErroresCambioSucursal(erroresSucursalActuales)
      setErrorGeneral('Revisa los campos señalados antes de guardar.')
      if (erroresActuales.fechaNacimiento === MENSAJE_EDAD_MINIMA_EMPLEADO) {
        setMostrarErrorEdad(true)
      }
      document.getElementById(
        Object.keys(erroresActuales)[0] ??
        Object.keys(erroresSucursalActuales)[0] ??
        'foto-edicion',
      )?.focus()
      return
    }

    setGuardando(true)
    setErrorGeneral(null)
    try {
      let actualizado = empleado
      if (cambiaInformacion) {
        actualizado = await actualizarEmpleado(empleado.id, {
          codigo: datos.codigo.trim().toUpperCase(),
          primerNombre: datos.primerNombre.trim(),
          segundoNombre: datos.segundoNombre.trim() || null,
          tercerNombre: datos.tercerNombre.trim() || null,
          primerApellido: datos.primerApellido.trim(),
          segundoApellido: datos.segundoApellido.trim() || null,
          apellidoCasada: datos.apellidoCasada.trim() || null,
          dpi: datos.dpi,
          fechaNacimiento: datos.fechaNacimiento,
          correo: datos.correo.trim().toLowerCase() || null,
          telefono: datos.telefono.trim() || null,
          puestoId: datos.puestoId,
          municipioId: datos.municipioId,
          direccion: datos.direccion.trim(),
          fechaContratacion: datos.fechaContratacion,
          version: empleado.version,
        })
      }

      if (cambiaSucursal) {
        try {
          actualizado = await cambiarSucursalEmpleado(empleado.id, {
            version: actualizado.version,
            sucursalId: datosCambioSucursal.sucursalId,
            fechaInicio: datosCambioSucursal.fechaInicio,
            motivoCambio: datosCambioSucursal.motivoCambio.trim(),
          })
        } catch (errorSucursal: unknown) {
          if (cambiaInformacion) {
            if (errorSucursal instanceof ErrorApi) {
              const erroresSucursalBackend: ErroresCambioSucursal = {}
              errorSucursal.detalles.forEach((detalle) => {
                if (detalle.campo in datosCambioSucursal) {
                  erroresSucursalBackend[detalle.campo as CampoCambioSucursal] = detalle.mensaje
                }
              })
              setErroresCambioSucursal(erroresSucursalBackend)
            }
            setEmpleado(actualizado)
            setDatos(datosDesdeEmpleado(actualizado))
            setErrorGeneral(
              `La información del empleado fue actualizada, pero no se pudo cambiar la sucursal. ${errorSucursal instanceof ErrorApi ? errorSucursal.message : ''}`.trim(),
            )
            return
          }
          throw errorSucursal
        }
      }

      try {
        if (foto) {
          actualizado = await actualizarFotoEmpleado(actualizado.id, actualizado.version, foto)
          notificarFotoEmpleadoActualizada(actualizado.id)
        } else if (quitarFotoActual && actualizado.fotoUrl) {
          actualizado = await eliminarFotoEmpleado(actualizado.id, actualizado.version)
          notificarFotoEmpleadoActualizada(actualizado.id)
        }
      } catch (errorFotoActual: unknown) {
        setEmpleado(actualizado)
        setDatos(datosDesdeEmpleado(actualizado))
        setDatosCambioSucursal(datosCambioSucursalDesdeEmpleado(actualizado))
        setErrorGeneral(`Los datos fueron actualizados, pero la fotografía no pudo guardarse. ${errorFotoActual instanceof ErrorApi ? errorFotoActual.message : ''}`)
        return
      }

      setEmpleado(actualizado)
      setDatos(datosDesdeEmpleado(actualizado))
      setDatosCambioSucursal(datosCambioSucursalDesdeEmpleado(actualizado))
      setErroresCambioSucursal({})
      limpiarFotoNueva()
      setQuitarFotoActual(false)
      setExito(true)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        const erroresBackend: Errores = {}
        const erroresSucursalBackend: ErroresCambioSucursal = {}
        error.detalles.forEach((detalle) => {
          if (datos && detalle.campo in datos) erroresBackend[detalle.campo as Campo] = detalle.mensaje
          if (detalle.campo in datosCambioSucursal) {
            erroresSucursalBackend[detalle.campo as CampoCambioSucursal] = detalle.mensaje
          }
        })
        setErrores(erroresBackend)
        setErroresCambioSucursal(erroresSucursalBackend)
        setErrorGeneral(error.message)
      } else setErrorGeneral('No fue posible actualizar al empleado.')
    } finally {
      setGuardando(false)
    }
  }

  if (errorGeneral && (!empleado || !datos || !datosCambioSucursal || !catalogos)) {
    return <section className={styles.errorPagina}><h1>No se pudo editar el empleado</h1><p>{errorGeneral}</p><div><button type="button" onClick={() => onNavegar('/empleados')}>Volver</button><button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button></div></section>
  }
  if (!empleado || !datos || !datosCambioSucursal || !catalogos) return null

  const imagenMostrada = vistaPrevia ?? (!quitarFotoActual && empleado.fotoUrl ? `${construirUrlApi(empleado.fotoUrl)}?v=${empleado.version}` : null)
  const sucursalActualFueraCatalogo = empleado.asignacionActual &&
    !catalogos.sucursales.some((sucursal) => sucursal.id === empleado.asignacionActual?.sucursalId)
  const puedeEditarSucursal = puedeCambiarSucursal && empleado.estado === 'ACTIVO'
  const fechaMinimaCambioSucursal = [
    datos.fechaContratacion,
    empleado.asignacionActual?.fechaInicio.slice(0, 10) ?? '',
  ].sort().at(-1) || undefined

  const campo = (id: Campo, etiqueta: string, opciones: { type?: string; requerido?: boolean; maxLength?: number } = {}) => (
    <div className={formStyles.campo}>
      <label htmlFor={id}>{etiqueta} {opciones.requerido && <span aria-hidden="true">*</span>}</label>
      <input id={id} type={opciones.type ?? 'text'} value={datos[id]} maxLength={opciones.maxLength} required={opciones.requerido} aria-invalid={Boolean(errores[id])} onChange={(event) => actualizarCampo(id, id === 'dpi' ? event.target.value.replace(/\D/g, '').slice(0, 13) : event.target.value)} />
      {errores[id] && <small className={formStyles.errorCampo}>{errores[id]}</small>}
    </div>
  )

  return (
    <>
      <div className={formStyles.encabezadoPagina}><div><EmpleadoBreadcrumb actual="Editar empleado" onNavegar={onNavegar} /><h1>Editar empleado</h1></div><span className={formStyles.indicadorFormulario} title={nombreCompleto(empleado)}>{nombreCompleto(empleado)}</span></div>
      {errorGeneral && <div className={formStyles.alertaError} role="alert"><span>!</span><p>{errorGeneral}</p></div>}
      <form className={formStyles.formulario} onSubmit={(event) => void guardar(event)} noValidate>
        <fieldset disabled={guardando}>
          <legend>Información personal</legend><p className={formStyles.descripcionSeccion}>Identificación y fotografía del empleado.</p>
          <div className={formStyles.selectorFoto}><div className={formStyles.vistaPreviaFoto}>{imagenMostrada ? <img src={imagenMostrada} alt="Vista previa de la fotografía" crossOrigin={vistaPrevia ? undefined : 'use-credentials'} /> : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.4-4 2.7-6 6.5-6s6.1 2 6.5 6" /></svg>}</div><div className={formStyles.controlesFoto}><div><strong>Fotografía del empleado</strong></div><p>Formato de imagen JPG, PNG o WebP, de hasta 5 MB.</p><input ref={entradaFotoRef} className={formStyles.entradaFoto} id="foto-edicion" type="file" accept="image/jpeg,image/png,image/webp" onChange={cambiarFoto} /><div className={formStyles.accionesFoto}><label className={formStyles.botonSeleccionFoto} htmlFor="foto-edicion">{imagenMostrada ? 'Cambiar fotografía' : 'Seleccionar fotografía'}</label>{foto && <button type="button" onClick={limpiarFotoNueva}>Descartar cambio</button>}{!foto && empleado.fotoUrl && !quitarFotoActual && <button type="button" onClick={() => setQuitarFotoActual(true)}>Eliminar fotografía</button>}{quitarFotoActual && <button type="button" onClick={() => setQuitarFotoActual(false)}>Conservar fotografía</button>}</div>{errorFoto && <small className={formStyles.errorCampo}>{errorFoto}</small>}</div></div>
          <div className={formStyles.grillaTres}>{campo('codigo', 'Código', { requerido: true, maxLength: 20 })}{campo('dpi', 'DPI', { requerido: true, maxLength: 13 })}{campo('fechaNacimiento', 'Fecha de nacimiento', { requerido: true, type: 'date' })}</div>
          <div className={formStyles.grillaTres}>{campo('primerNombre', 'Primer nombre', { requerido: true, maxLength: 150 })}{campo('segundoNombre', 'Segundo nombre', { maxLength: 150 })}{campo('tercerNombre', 'Tercer nombre', { maxLength: 150 })}</div>
          <div className={formStyles.grillaTres}>{campo('primerApellido', 'Primer apellido', { requerido: true, maxLength: 150 })}{campo('segundoApellido', 'Segundo apellido', { maxLength: 150 })}{campo('apellidoCasada', 'Apellido de casada', { maxLength: 150 })}</div>
        </fieldset>
        <fieldset disabled={guardando}><legend>Contacto y residencia</legend><p className={formStyles.descripcionSeccion}>Información para contacto y ubicación.</p><div className={formStyles.grillaDos}>{campo('correo', 'Correo electrónico', { type: 'email', maxLength: 150 })}{campo('telefono', 'Teléfono', { type: 'tel', maxLength: 30 })}</div><div className={formStyles.grillaDos}><div className={formStyles.campo}><label htmlFor="departamentoGeograficoId">Departamento *</label><select id="departamentoGeograficoId" value={datos.departamentoGeograficoId} onChange={(event) => void cambiarDepartamento(event.target.value)}><option value="">Selecciona un departamento</option>{catalogos.departamentos.map((departamento) => <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>)}</select>{errores.departamentoGeograficoId && <small className={formStyles.errorCampo}>{errores.departamentoGeograficoId}</small>}</div><div className={formStyles.campo}><label htmlFor="municipioId">Municipio *</label><select id="municipioId" value={datos.municipioId} disabled={!datos.departamentoGeograficoId} onChange={(event) => actualizarCampo('municipioId', event.target.value)}><option value="">Selecciona un municipio</option>{municipios.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}</select>{errores.municipioId && <small className={formStyles.errorCampo}>{errores.municipioId}</small>}</div></div><div className={formStyles.campo}><label htmlFor="direccion">Dirección *</label><textarea id="direccion" rows={3} maxLength={300} value={datos.direccion} onChange={(event) => actualizarCampo('direccion', event.target.value)} />{errores.direccion && <small className={formStyles.errorCampo}>{errores.direccion}</small>}</div></fieldset>
        <fieldset disabled={guardando}>
          <legend>Información laboral</legend>
          <p className={formStyles.descripcionSeccion}>Puesto, contratación y asignación vigente de sucursal.</p>
          <div className={formStyles.grillaDos}>
            <div className={formStyles.campo}>
              <label htmlFor="puestoId">Puesto *</label>
              <select id="puestoId" value={datos.puestoId} onChange={(event) => actualizarCampo('puestoId', event.target.value)}>
                <option value="">Selecciona un puesto</option>
                {catalogos.puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.departamentoOrganizacionalNombre} — {puesto.nombre}</option>)}
              </select>
              {errores.puestoId && <small className={formStyles.errorCampo}>{errores.puestoId}</small>}
            </div>
            {campo('fechaContratacion', 'Fecha de contratación', { requerido: true, type: 'date' })}
          </div>
          <div className={formStyles.grillaDos}>
            <div className={formStyles.campo}>
              <label htmlFor="sucursalId">Sucursal asignada <span aria-hidden="true">*</span></label>
              <select
                id="sucursalId"
                value={datosCambioSucursal.sucursalId}
                disabled={!puedeEditarSucursal}
                required
                aria-invalid={Boolean(erroresCambioSucursal.sucursalId)}
                aria-describedby={erroresCambioSucursal.sucursalId ? 'sucursalId-error' : 'sucursalId-ayuda'}
                onChange={(event) => seleccionarSucursal(event.target.value)}
              >
                <option value="">Sin asignación activa</option>
                {sucursalActualFueraCatalogo && empleado.asignacionActual && (
                  <option value={empleado.asignacionActual.sucursalId}>
                    {empleado.asignacionActual.sucursalCodigo} — {empleado.asignacionActual.sucursalNombre} (asignación actual)
                  </option>
                )}
                {catalogos.sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>{sucursal.codigo} — {sucursal.nombre}</option>
                ))}
              </select>
              {erroresCambioSucursal.sucursalId
                ? <small id="sucursalId-error" className={formStyles.errorCampo}>{erroresCambioSucursal.sucursalId}</small>
                : <small id="sucursalId-ayuda" className={formStyles.ayudaCampo}>
                    {!puedeCambiarSucursal
                      ? 'La asignación es informativa; tu usuario no puede cambiar sucursales.'
                      : empleado.estado !== 'ACTIVO'
                        ? 'Solo se puede cambiar de sucursal a un empleado activo.'
                        : 'Selecciona otra sucursal para registrar el traslado y conservar el historial.'}
                  </small>}
            </div>
          </div>
          {cambiaSucursal && (
            <div className={formStyles.grillaDos}>
              <div className={formStyles.campo}>
                <label htmlFor="fechaInicio">Inicio en la nueva sucursal <span aria-hidden="true">*</span></label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={datosCambioSucursal.fechaInicio}
                  min={fechaMinimaCambioSucursal}
                  required
                  aria-invalid={Boolean(erroresCambioSucursal.fechaInicio)}
                  onChange={(event) => actualizarCampoCambioSucursal('fechaInicio', event.target.value)}
                />
                {erroresCambioSucursal.fechaInicio && <small className={formStyles.errorCampo}>{erroresCambioSucursal.fechaInicio}</small>}
              </div>
              <div className={formStyles.campo}>
                <label htmlFor="motivoCambio">Motivo del cambio <span aria-hidden="true">*</span></label>
                <textarea
                  id="motivoCambio"
                  rows={3}
                  maxLength={250}
                  value={datosCambioSucursal.motivoCambio}
                  required
                  aria-invalid={Boolean(erroresCambioSucursal.motivoCambio)}
                  onChange={(event) => actualizarCampoCambioSucursal('motivoCambio', event.target.value)}
                />
                {erroresCambioSucursal.motivoCambio
                  ? <small className={formStyles.errorCampo}>{erroresCambioSucursal.motivoCambio}</small>
                  : <small className={formStyles.ayudaCampo}>Este motivo quedará registrado en el historial de sucursales.</small>}
              </div>
            </div>
          )}
        </fieldset>
        <div className={formStyles.accionesFormulario}><p><span>*</span> Campos obligatorios</p><div><button className={formStyles.botonSecundario} type="button" onClick={() => onNavegar('/empleados')} disabled={guardando}><IconoAccion nombre="cancelar" className={formStyles.iconoBoton} /><span>Cancelar</span></button><button className={formStyles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" className={formStyles.iconoBoton} /><span>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</span></button></div></div>
      </form>
      <ModalEstado abierto={exito} tipo="exito" titulo="Empleado actualizado" mensaje="Los cambios fueron guardados correctamente." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/empleados')} onCerrar={() => onNavegar('/empleados')} />
      <ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información del empleado." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/empleados')} onCerrar={() => setSinCambios(false)} />
      <ModalEstado abierto={mostrarErrorEdad} tipo="error" titulo="No cumple la edad mínima" mensaje={MENSAJE_EDAD_MINIMA_EMPLEADO} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMostrarErrorEdad(false)} onCerrar={() => setMostrarErrorEdad(false)} />
    </>
  )
}
