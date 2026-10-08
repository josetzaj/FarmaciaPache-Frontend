import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import {
  actualizarFotoEmpleado,
  crearEmpleado,
  obtenerCatalogosEmpleado,
  obtenerMunicipiosPorDepartamento,
} from '../empleado-api'
import type {
  CatalogosEmpleado,
  CrearEmpleadoRequest,
  EmpleadoCreado,
  MunicipioCatalogo,
} from '../empleado.types'
import {
  cumpleEdadMinimaEnFecha,
  MENSAJE_EDAD_MINIMA_EMPLEADO,
} from '../validacion-empleado'
import { EmpleadoBreadcrumb } from './empleado-breadcrumb'
import styles from './empleado-crear-view.module.css'

type EmpleadoCrearViewProps = {
  sucursalActualId: string
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
  sucursalId: string
  fechaInicio: string
}

type CampoFormulario = keyof DatosFormulario
type ErroresFormulario = Partial<Record<CampoFormulario, string>>

const tiposFotoPermitidos = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const maximoFotoBytes = 5 * 1024 * 1024

const datosIniciales = (sucursalActualId: string): DatosFormulario => {
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return {
    codigo: '',
    primerNombre: '',
    segundoNombre: '',
    tercerNombre: '',
    primerApellido: '',
    segundoApellido: '',
    apellidoCasada: '',
    dpi: '',
    fechaNacimiento: '',
    correo: '',
    telefono: '',
    puestoId: '',
    departamentoGeograficoId: '',
    municipioId: '',
    direccion: '',
    fechaContratacion: hoy,
    sucursalId: sucursalActualId,
    fechaInicio: hoy,
  }
}

function nombreCompleto(empleado: EmpleadoCreado): string {
  return [
    empleado.primerNombre,
    empleado.segundoNombre,
    empleado.tercerNombre,
    empleado.primerApellido,
    empleado.segundoApellido,
    empleado.apellidoCasada,
  ].filter(Boolean).join(' ')
}

function validarFormulario(datos: DatosFormulario): ErroresFormulario {
  const errores: ErroresFormulario = {}

  if (!/^[A-Za-z0-9_-]{2,20}$/.test(datos.codigo.trim())) {
    errores.codigo = 'Ingresa de 2 a 20 caracteres: letras, números, guion o guion bajo.'
  }
  if (!datos.primerNombre.trim()) errores.primerNombre = 'El primer nombre es obligatorio.'
  if (!datos.primerApellido.trim()) errores.primerApellido = 'El primer apellido es obligatorio.'
  if (!/^\d{13}$/.test(datos.dpi)) errores.dpi = 'El DPI debe contener exactamente 13 dígitos.'
  if (!datos.fechaNacimiento) errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.'
  else if (
    datos.fechaContratacion &&
    !cumpleEdadMinimaEnFecha(datos.fechaNacimiento, datos.fechaContratacion)
  ) {
    errores.fechaNacimiento = MENSAJE_EDAD_MINIMA_EMPLEADO
  }
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
    errores.correo = 'Ingresa un correo electrónico válido.'
  }
  if (!datos.puestoId) errores.puestoId = 'Selecciona el puesto del empleado.'
  if (!datos.departamentoGeograficoId) {
    errores.departamentoGeograficoId = 'Selecciona el departamento de residencia.'
  }
  if (!datos.municipioId) errores.municipioId = 'Selecciona el municipio de residencia.'
  if (datos.direccion.trim().length < 5) {
    errores.direccion = 'La dirección debe contener al menos 5 caracteres.'
  }
  if (!datos.fechaContratacion) errores.fechaContratacion = 'Selecciona la fecha de contratación.'
  if (!datos.sucursalId) errores.sucursalId = 'Selecciona la sucursal inicial.'
  if (!datos.fechaInicio) errores.fechaInicio = 'Selecciona el inicio de la asignación.'

  if (
    datos.fechaNacimiento &&
    datos.fechaContratacion &&
    datos.fechaNacimiento >= datos.fechaContratacion
  ) {
    errores.fechaContratacion = 'Debe ser posterior a la fecha de nacimiento.'
  }
  if (
    datos.fechaContratacion &&
    datos.fechaInicio &&
    datos.fechaInicio < datos.fechaContratacion
  ) {
    errores.fechaInicio = 'No puede ser anterior a la fecha de contratación.'
  }

  return errores
}

export function EmpleadoCrearView({
  sucursalActualId,
  onNavegar,
  onCambiosPendientes,
}: EmpleadoCrearViewProps) {
  const entradaFotoRef = useRef<HTMLInputElement>(null)
  const [datosOriginales, setDatosOriginales] = useState(() => datosIniciales(sucursalActualId))
  const [datos, setDatos] = useState(() => datosOriginales)
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogosEmpleado | null>(null)
  const [municipios, setMunicipios] = useState<MunicipioCatalogo[]>([])
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [empleadoCreado, setEmpleadoCreado] = useState<EmpleadoCreado | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState<string | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [fotoNoGuardada, setFotoNoGuardada] = useState(false)
  const [mensajeErrorFoto, setMensajeErrorFoto] = useState<string | null>(null)
  const [revisionCatalogos, setRevisionCatalogos] = useState(0)
  const [registroGuardado, setRegistroGuardado] = useState(false)
  const [mostrarErrorEdad, setMostrarErrorEdad] = useState(false)
  const tieneCambiosPendientes = !registroGuardado && (
    JSON.stringify(datos) !== JSON.stringify(datosOriginales) || Boolean(foto)
  )

  useEffect(() => {
    onCambiosPendientes(tieneCambiosPendientes)
  }, [onCambiosPendientes, tieneCambiosPendientes])

  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  useEffect(() => {
    return () => {
      if (vistaPreviaFoto) URL.revokeObjectURL(vistaPreviaFoto)
    }
  }, [vistaPreviaFoto])

  useEffect(() => {
    const controlador = new AbortController()

    void obtenerCatalogosEmpleado(controlador.signal)
      .then((respuesta) => {
        setCatalogos(respuesta)
        setErrorCatalogos(null)
        if (
          respuesta.sucursales.length > 0 &&
          !respuesta.sucursales.some((sucursal) => sucursal.id === sucursalActualId)
        ) {
          const sucursalId = respuesta.sucursales[0]?.id ?? ''
          setDatosOriginales((actual) => ({ ...actual, sucursalId }))
          setDatos((actual) => ({ ...actual, sucursalId }))
        }
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setErrorCatalogos(
          error instanceof ErrorApi
            ? error.message
            : 'No fue posible cargar los catálogos necesarios para registrar al empleado.',
        )
      })

    return () => controlador.abort()
  }, [revisionCatalogos, sucursalActualId])

  useEffect(() => {
    if (!datos.departamentoGeograficoId) {
      return
    }

    const controlador = new AbortController()
    void obtenerMunicipiosPorDepartamento(
      datos.departamentoGeograficoId,
      controlador.signal,
    )
      .then(setMunicipios)
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setMunicipios([])
        setErrorGeneral(
          error instanceof ErrorApi
            ? error.message
            : 'No fue posible cargar los municipios del departamento.',
        )
      })

    return () => controlador.abort()
  }, [datos.departamentoGeograficoId])

  const puestosOrdenados = useMemo(
    () => [...(catalogos?.puestos ?? [])].sort((a, b) =>
      `${a.departamentoOrganizacionalNombre} ${a.nombre}`.localeCompare(
        `${b.departamentoOrganizacionalNombre} ${b.nombre}`,
        'es',
      ),
    ),
    [catalogos?.puestos],
  )

  const actualizarCampo = useCallback((campo: CampoFormulario, valor: string) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral(null)
  }, [])

  const cambiarDepartamento = (departamentoId: string) => {
    setMunicipios([])
    setDatos((actual) => ({
      ...actual,
      departamentoGeograficoId: departamentoId,
      municipioId: '',
    }))
    setErrores((actual) => ({
      ...actual,
      departamentoGeograficoId: undefined,
      municipioId: undefined,
    }))
    setErrorGeneral(null)
  }

  const quitarFoto = () => {
    setFoto(null)
    setVistaPreviaFoto(null)
    setErrorFoto(null)
    if (entradaFotoRef.current) entradaFotoRef.current.value = ''
  }

  const cambiarFoto = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0] ?? null
    setErrorFoto(null)
    setErrorGeneral(null)

    if (!archivo) {
      quitarFoto()
      return
    }

    if (!tiposFotoPermitidos.has(archivo.type)) {
      quitarFoto()
      setErrorFoto('La fotografía debe tener formato JPG, PNG o WebP.')
      return
    }

    if (archivo.size > maximoFotoBytes) {
      quitarFoto()
      setErrorFoto('La fotografía no puede superar 5 MB.')
      return
    }

    setFoto(archivo)
    setVistaPreviaFoto(URL.createObjectURL(archivo))
  }

  const enfocarPrimerError = (erroresActuales: ErroresFormulario) => {
    const primerCampo = Object.keys(erroresActuales)[0]
    if (!primerCampo) return
    document.getElementById(primerCampo)?.focus()
  }

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const erroresActuales = validarFormulario(datos)

    if (Object.keys(erroresActuales).length > 0 || errorFoto) {
      setErrores(erroresActuales)
      setErrorGeneral('Revisa los campos señalados antes de guardar.')
      if (erroresActuales.fechaNacimiento === MENSAJE_EDAD_MINIMA_EMPLEADO) {
        setMostrarErrorEdad(true)
      }
      if (Object.keys(erroresActuales).length > 0) {
        enfocarPrimerError(erroresActuales)
      } else {
        entradaFotoRef.current?.focus()
      }
      return
    }

    const solicitud: CrearEmpleadoRequest = {
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
      sucursalId: datos.sucursalId,
      fechaInicio: datos.fechaInicio,
    }

    setGuardando(true)
    setErrorGeneral(null)
    setErrores({})
    setFotoNoGuardada(false)
    setMensajeErrorFoto(null)

    try {
      const creado = await crearEmpleado(solicitud)
      setRegistroGuardado(true)

      if (!foto) {
        setEmpleadoCreado(creado)
        return
      }

      try {
        setEmpleadoCreado(await actualizarFotoEmpleado(creado.id, creado.version, foto))
      } catch (errorFotoActualizacion: unknown) {
        setEmpleadoCreado(creado)
        setFotoNoGuardada(true)
        setMensajeErrorFoto(
          errorFotoActualizacion instanceof ErrorApi
            ? errorFotoActualizacion.message
            : 'No fue posible guardar la fotografía seleccionada.',
        )
      }
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        const erroresBackend: ErroresFormulario = {}
        error.detalles.forEach((detalle) => {
          if (detalle.campo in datos) {
            erroresBackend[detalle.campo as CampoFormulario] = detalle.mensaje
          }
        })
        setErrores(erroresBackend)
        setErrorGeneral(error.message)
        enfocarPrimerError(erroresBackend)
      } else {
        setErrorGeneral('No fue posible registrar al empleado. Inténtalo nuevamente.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const registrarOtro = () => {
    const datosNuevos = datosIniciales(sucursalActualId)
    setDatosOriginales(datosNuevos)
    setDatos(datosNuevos)
    setErrores({})
    setErrorGeneral(null)
    setMunicipios([])
    setEmpleadoCreado(null)
    setFotoNoGuardada(false)
    setMensajeErrorFoto(null)
    setRegistroGuardado(false)
    quitarFoto()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reintentarFoto = async () => {
    if (!empleadoCreado || !foto) return

    setGuardando(true)
    setMensajeErrorFoto(null)

    try {
      setEmpleadoCreado(
        await actualizarFotoEmpleado(empleadoCreado.id, empleadoCreado.version, foto),
      )
      setFotoNoGuardada(false)
    } catch (error: unknown) {
      setMensajeErrorFoto(
        error instanceof ErrorApi
          ? error.message
          : 'No fue posible guardar la fotografía seleccionada.',
      )
    } finally {
      setGuardando(false)
    }
  }

  if (errorCatalogos) {
    return (
      <section className={styles.estadoCatalogos} aria-labelledby="titulo-error-catalogos">
        <span aria-hidden="true">!</span>
        <h1 id="titulo-error-catalogos">No se pudo preparar el formulario</h1>
        <p>{errorCatalogos}</p>
        <div>
          <button type="button" className={styles.botonSecundario} onClick={() => onNavegar('/empleados')}>Volver al listado</button>
          <button
            type="button"
            className={styles.botonPrincipal}
            onClick={() => setRevisionCatalogos((revision) => revision + 1)}
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  if (!catalogos) return null

  return (
    <>
      <div className={styles.encabezadoPagina}>
        <div>
          <EmpleadoBreadcrumb actual="Registrar empleado" onNavegar={onNavegar} />
          <h1>Registrar empleado</h1>
        </div>
      </div>

      {errorGeneral && (
        <div className={styles.alertaError} role="alert">
          <span aria-hidden="true">!</span>
          <p>{errorGeneral}</p>
        </div>
      )}

      <form className={styles.formulario} onSubmit={(event) => void manejarEnvio(event)} noValidate>
        <fieldset disabled={guardando}>
          <legend>Información personal</legend>
          <p className={styles.descripcionSeccion}>Datos de identificación del nuevo empleado.</p>
          <div className={styles.selectorFoto}>
            <div className={styles.vistaPreviaFoto}>
              {vistaPreviaFoto ? (
                <img src={vistaPreviaFoto} alt={`Vista previa de ${foto?.name ?? 'la fotografía'}`} />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20c.4-4 2.7-6 6.5-6s6.1 2 6.5 6" />
                </svg>
              )}
            </div>
            <div className={styles.controlesFoto}>
              <div>
                <strong>Fotografía del empleado</strong>
              </div>
              <p>Formato de imagen JPG, PNG o WebP, de hasta 5 MB.</p>
              <input
                ref={entradaFotoRef}
                className={styles.entradaFoto}
                id="foto"
                name="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={cambiarFoto}
                aria-invalid={Boolean(errorFoto)}
                aria-describedby={errorFoto ? 'foto-error' : 'foto-ayuda'}
              />
              <div className={styles.accionesFoto}>
                <label className={styles.botonSeleccionFoto} htmlFor="foto">
                  {foto ? 'Cambiar fotografía' : 'Seleccionar fotografía'}
                </label>
                {foto && (
                  <button type="button" onClick={quitarFoto}>Quitar</button>
                )}
              </div>
              {foto && !errorFoto && (
                <small id="foto-ayuda" className={styles.ayudaCampo}>
                  {foto.name} · {(foto.size / 1024 / 1024).toFixed(2)} MB
                </small>
              )}
              {!foto && !errorFoto && (
                <small id="foto-ayuda" className={styles.ayudaCampo}>No se ha seleccionado ninguna fotografía.</small>
              )}
              {errorFoto && <small id="foto-error" className={styles.errorCampo}>{errorFoto}</small>}
            </div>
          </div>
          <div className={styles.grillaTres}>
            <CampoTexto id="codigo" label="Código de empleado" requerido error={errores.codigo} ayuda="Letras, números, guion o guion bajo." value={datos.codigo} maxLength={20} onChange={(valor) => actualizarCampo('codigo', valor.toUpperCase())} />
            <CampoTexto id="dpi" label="DPI" requerido error={errores.dpi} value={datos.dpi} inputMode="numeric" maxLength={13} onChange={(valor) => actualizarCampo('dpi', valor.replace(/\D/g, '').slice(0, 13))} />
            <CampoTexto id="fechaNacimiento" label="Fecha de nacimiento" requerido error={errores.fechaNacimiento} value={datos.fechaNacimiento} type="date" onChange={(valor) => actualizarCampo('fechaNacimiento', valor)} />
          </div>
          <div className={styles.grillaTres}>
            <CampoTexto id="primerNombre" label="Primer nombre" requerido error={errores.primerNombre} value={datos.primerNombre} maxLength={150} onChange={(valor) => actualizarCampo('primerNombre', valor)} />
            <CampoTexto id="segundoNombre" label="Segundo nombre" error={errores.segundoNombre} value={datos.segundoNombre} maxLength={150} onChange={(valor) => actualizarCampo('segundoNombre', valor)} />
            <CampoTexto id="tercerNombre" label="Tercer nombre" error={errores.tercerNombre} value={datos.tercerNombre} maxLength={150} onChange={(valor) => actualizarCampo('tercerNombre', valor)} />
          </div>
          <div className={styles.grillaTres}>
            <CampoTexto id="primerApellido" label="Primer apellido" requerido error={errores.primerApellido} value={datos.primerApellido} maxLength={150} onChange={(valor) => actualizarCampo('primerApellido', valor)} />
            <CampoTexto id="segundoApellido" label="Segundo apellido" error={errores.segundoApellido} value={datos.segundoApellido} maxLength={150} onChange={(valor) => actualizarCampo('segundoApellido', valor)} />
            <CampoTexto id="apellidoCasada" label="Apellido de casada" error={errores.apellidoCasada} value={datos.apellidoCasada} maxLength={150} onChange={(valor) => actualizarCampo('apellidoCasada', valor)} />
          </div>
        </fieldset>

        <fieldset disabled={guardando}>
          <legend>Contacto y residencia</legend>
          <p className={styles.descripcionSeccion}>Información para contacto y ubicación del empleado.</p>
          <div className={styles.grillaDos}>
            <CampoTexto id="correo" label="Correo electrónico" error={errores.correo} value={datos.correo} type="email" maxLength={150} placeholder="nombre@correo.com" onChange={(valor) => actualizarCampo('correo', valor)} />
            <CampoTexto id="telefono" label="Teléfono" error={errores.telefono} value={datos.telefono} type="tel" maxLength={30} placeholder="Ej. 5555-5555" onChange={(valor) => actualizarCampo('telefono', valor)} />
          </div>
          <div className={styles.grillaDos}>
            <CampoSeleccion id="departamentoGeograficoId" label="Departamento" requerido error={errores.departamentoGeograficoId} value={datos.departamentoGeograficoId} onChange={cambiarDepartamento}>
              <option value="">Selecciona un departamento</option>
              {catalogos.departamentos.map((departamento) => <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>)}
            </CampoSeleccion>
            <CampoSeleccion id="municipioId" label="Municipio" requerido error={errores.municipioId} value={datos.municipioId} disabled={!datos.departamentoGeograficoId} onChange={(valor) => actualizarCampo('municipioId', valor)}>
              <option value="">{datos.departamentoGeograficoId ? 'Selecciona un municipio' : 'Selecciona primero el departamento'}</option>
              {municipios.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}
            </CampoSeleccion>
          </div>
          <div className={styles.campo}>
            <label htmlFor="direccion">Dirección <span aria-hidden="true">*</span></label>
            <textarea id="direccion" name="direccion" value={datos.direccion} onChange={(event) => actualizarCampo('direccion', event.target.value)} maxLength={300} rows={3} aria-invalid={Boolean(errores.direccion)} aria-describedby={errores.direccion ? 'direccion-error' : 'direccion-ayuda'} required />
            {errores.direccion ? <small id="direccion-error" className={styles.errorCampo}>{errores.direccion}</small> : <small id="direccion-ayuda" className={styles.ayudaCampo}>Incluye zona, colonia, calle o referencias necesarias.</small>}
          </div>
        </fieldset>

        <fieldset disabled={guardando}>
          <legend>Información laboral</legend>
          <p className={styles.descripcionSeccion}>Puesto y primera asignación de sucursal.</p>
          <div className={styles.grillaDos}>
            <CampoSeleccion id="puestoId" label="Puesto" requerido error={errores.puestoId} value={datos.puestoId} onChange={(valor) => actualizarCampo('puestoId', valor)}>
              <option value="">Selecciona un puesto</option>
              {puestosOrdenados.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.departamentoOrganizacionalNombre} — {puesto.nombre}</option>)}
            </CampoSeleccion>
            <CampoTexto id="fechaContratacion" label="Fecha de contratación" requerido error={errores.fechaContratacion} value={datos.fechaContratacion} type="date" onChange={(valor) => actualizarCampo('fechaContratacion', valor)} />
          </div>
          <div className={styles.grillaDos}>
            <CampoSeleccion id="sucursalId" label="Sucursal inicial" requerido error={errores.sucursalId} value={datos.sucursalId} onChange={(valor) => actualizarCampo('sucursalId', valor)}>
              <option value="">Selecciona una sucursal</option>
              {catalogos.sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.codigo} — {sucursal.nombre}</option>)}
            </CampoSeleccion>
            <CampoTexto id="fechaInicio" label="Inicio en sucursal" requerido error={errores.fechaInicio} value={datos.fechaInicio} type="date" min={datos.fechaContratacion || undefined} onChange={(valor) => actualizarCampo('fechaInicio', valor)} />
          </div>
        </fieldset>

        <div className={styles.accionesFormulario}>
          <p><span aria-hidden="true">*</span> Campos obligatorios</p>
          <div>
            <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/empleados')} disabled={guardando}>
              <IconoAccion nombre="cancelar" className={styles.iconoBoton} />
              <span>Cancelar</span>
            </button>
            <button className={styles.botonPrincipal} type="submit" disabled={guardando}>
              <IconoAccion nombre="guardar" className={styles.iconoBoton} />
              <span>{guardando ? 'Registrando empleado…' : 'Registrar empleado'}</span>
            </button>
          </div>
        </div>
      </form>

      <ModalEstado
        abierto={Boolean(empleadoCreado)}
        tipo={fotoNoGuardada ? 'advertencia' : 'exito'}
        titulo={fotoNoGuardada ? 'Empleado registrado sin fotografía' : 'Empleado registrado'}
        mensaje={empleadoCreado ? <><strong>{nombreCompleto(empleadoCreado)}</strong> fue registrado con el código <strong>{empleadoCreado.codigo}</strong>. {fotoNoGuardada && <><br /><br />El empleado ya está guardado, pero la fotografía no pudo cargarse. {mensajeErrorFoto}</>}</> : ''}
        textoAccionPrincipal={fotoNoGuardada ? 'Continuar sin fotografía' : 'Volver al listado'}
        onAccionPrincipal={() => onNavegar('/empleados')}
        textoAccionSecundaria={fotoNoGuardada ? 'Reintentar fotografía' : 'Registrar otro'}
        onAccionSecundaria={fotoNoGuardada ? () => void reintentarFoto() : registrarOtro}
        onCerrar={() => onNavegar('/empleados')}
        cargando={guardando}
      />
      <ModalEstado
        abierto={mostrarErrorEdad}
        tipo="error"
        titulo="No cumple la edad mínima"
        mensaje={MENSAJE_EDAD_MINIMA_EMPLEADO}
        textoAccionPrincipal="Entendido"
        onAccionPrincipal={() => setMostrarErrorEdad(false)}
        onCerrar={() => setMostrarErrorEdad(false)}
      />
    </>
  )
}

type CampoTextoProps = {
  id: CampoFormulario
  label: string
  value: string
  onChange: (valor: string) => void
  error?: string
  ayuda?: string
  requerido?: boolean
  type?: 'text' | 'email' | 'tel' | 'date'
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
  maxLength?: number
  min?: string
  placeholder?: string
}

function CampoTexto({ id, label, value, onChange, error, ayuda, requerido = false, type = 'text', inputMode, maxLength, min, placeholder }: CampoTextoProps) {
  const descripcionId = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{label} {requerido && <span aria-hidden="true">*</span>}</label>
      <input id={id} name={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} min={min} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={descripcionId} required={requerido} />
      {error && <small id={`${id}-error`} className={styles.errorCampo}>{error}</small>}
      {!error && ayuda && <small id={`${id}-ayuda`} className={styles.ayudaCampo}>{ayuda}</small>}
    </div>
  )
}

type CampoSeleccionProps = {
  id: CampoFormulario
  label: string
  value: string
  onChange: (valor: string) => void
  children: React.ReactNode
  error?: string
  requerido?: boolean
  disabled?: boolean
}

function CampoSeleccion({ id, label, value, onChange, children, error, requerido = false, disabled = false }: CampoSeleccionProps) {
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{label} {requerido && <span aria-hidden="true">*</span>}</label>
      <select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} required={requerido} disabled={disabled}>
        {children}
      </select>
      {error && <small id={`${id}-error`} className={styles.errorCampo}>{error}</small>}
    </div>
  )
}
