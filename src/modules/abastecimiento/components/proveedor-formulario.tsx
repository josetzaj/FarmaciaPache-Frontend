import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarProveedor, crearProveedor } from '../abastecimiento-api'
import type {
  ActualizarProveedorRequest,
  GuardarProveedorRequest,
  ProveedorAbastecimiento,
} from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type DatosProveedor = {
  codigo: string
  nit: string
  nombre: string
  nombreComercial: string
  correo: string
  telefono: string
  direccion: string
  autorizado: boolean
  activo: boolean
}

type CampoProveedor = keyof DatosProveedor
type ErroresProveedor = Partial<Record<CampoProveedor, string>>

type ProveedorFormularioProps = {
  proveedor?: ProveedorAbastecimiento
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

const datosVacios: DatosProveedor = {
  codigo: '',
  nit: '',
  nombre: '',
  nombreComercial: '',
  correo: '',
  telefono: '',
  direccion: '',
  autorizado: false,
  activo: true,
}

function datosDesdeProveedor(proveedor?: ProveedorAbastecimiento): DatosProveedor {
  if (!proveedor) return datosVacios
  return {
    codigo: proveedor.codigo,
    nit: proveedor.nit,
    nombre: proveedor.nombre,
    nombreComercial: proveedor.nombreComercial ?? '',
    correo: proveedor.correo ?? '',
    telefono: proveedor.telefono ?? '',
    direccion: proveedor.direccion ?? '',
    autorizado: proveedor.autorizado,
    activo: proveedor.activo,
  }
}

function validar(datos: DatosProveedor): ErroresProveedor {
  const errores: ErroresProveedor = {}
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(datos.codigo.trim())) errores.codigo = 'Usa de 2 a 30 letras, números, guion o guion bajo.'
  if (datos.nit.trim().length < 2 || datos.nit.trim().length > 20) errores.nit = 'El NIT debe contener de 2 a 20 caracteres.'
  if (datos.nombre.trim().length < 2 || datos.nombre.trim().length > 180) errores.nombre = 'El nombre legal debe contener de 2 a 180 caracteres.'
  if (datos.nombreComercial.trim().length > 180) errores.nombreComercial = 'El nombre comercial admite hasta 180 caracteres.'
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) errores.correo = 'Ingresa un correo electrónico válido.'
  if (datos.correo.trim().length > 180) errores.correo = 'El correo admite hasta 180 caracteres.'
  if (datos.telefono.trim().length > 30) errores.telefono = 'El teléfono admite hasta 30 caracteres.'
  if (datos.direccion.trim().length > 500) errores.direccion = 'La dirección admite hasta 500 caracteres.'
  return errores
}

function normalizar(datos: DatosProveedor): GuardarProveedorRequest {
  return {
    codigo: datos.codigo.trim().toUpperCase(),
    nit: datos.nit.trim().toUpperCase(),
    nombre: datos.nombre.trim(),
    nombreComercial: datos.nombreComercial.trim() || null,
    correo: datos.correo.trim().toLowerCase() || null,
    telefono: datos.telefono.trim() || null,
    direccion: datos.direccion.trim() || null,
    autorizado: datos.autorizado,
  }
}

export function ProveedorFormulario({ proveedor, onNavegar, onCambiosPendientes }: ProveedorFormularioProps) {
  const esEdicion = Boolean(proveedor)
  const originales = useMemo(() => datosDesdeProveedor(proveedor), [proveedor])
  const [datos, setDatos] = useState<DatosProveedor>(originales)
  const [errores, setErrores] = useState<ErroresProveedor>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<ProveedorAbastecimiento | null>(null)
  const [sinCambios, setSinCambios] = useState(false)
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(originales)

  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const actualizar = <K extends CampoProveedor>(campo: K, valor: DatosProveedor[K]) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral(null)
  }

  const enfocarPrimerError = (erroresActuales: ErroresProveedor) => {
    const campo = Object.keys(erroresActuales)[0]
    if (campo) document.getElementById(`proveedor-${campo}`)?.focus()
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const erroresActuales = validar(datos)
    if (Object.keys(erroresActuales).length) {
      setErrores(erroresActuales)
      setErrorGeneral('Revisa los campos señalados antes de guardar.')
      enfocarPrimerError(erroresActuales)
      return
    }
    if (esEdicion && !tieneCambios) {
      setSinCambios(true)
      return
    }

    setGuardando(true)
    setErrorGeneral(null)
    try {
      const base = normalizar(datos)
      const respuesta = proveedor
        ? await actualizarProveedor(proveedor.id, { ...base, version: proveedor.version } satisfies ActualizarProveedorRequest)
        : await crearProveedor(base)
      setGuardado(respuesta)
      onCambiosPendientes(false)
    } catch (errorActual) {
      if (errorActual instanceof ErrorApi) {
        const erroresBackend: ErroresProveedor = {}
        errorActual.detalles.forEach((detalle) => {
          if (detalle.campo in datos) erroresBackend[detalle.campo as CampoProveedor] = detalle.mensaje
        })
        setErrores(erroresBackend)
        setErrorGeneral(errorActual.message)
        enfocarPrimerError(erroresBackend)
      } else {
        setErrorGeneral(`No fue posible ${esEdicion ? 'actualizar' : 'registrar'} el proveedor.`)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <section className={styles.pagina} aria-labelledby="titulo-formulario-proveedor">
        <AbastecimientoBreadcrumb recurso="proveedores" actual={esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'} onNavegar={onNavegar} />
        <header className={styles.encabezadoPagina}>
          <div>
            <p className={styles.sobretitulo}>Abastecimiento</p>
            <h1 id="titulo-formulario-proveedor">{esEdicion ? 'Editar proveedor' : 'Registrar proveedor'}</h1>
            <p>{esEdicion ? 'Actualiza la información comercial y el estado operativo.' : 'Registra la información legal, comercial y de autorización.'}</p>
          </div>
        </header>

        {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}

        <form className={styles.formulario} noValidate onSubmit={enviar}>
          <fieldset disabled={guardando}>
            <legend>Identificación</legend>
            <p className={styles.descripcionSeccion}>Datos que permiten reconocer al proveedor en documentos y búsquedas.</p>
            <div className={styles.grillaDos}>
              <Campo id="codigo" etiqueta="Código" requerido valor={datos.codigo} error={errores.codigo} maxLength={30} ayuda="Letras, números, guion o guion bajo." onChange={(valor) => actualizar('codigo', valor)} />
              <Campo id="nit" etiqueta="NIT" requerido valor={datos.nit} error={errores.nit} maxLength={20} onChange={(valor) => actualizar('nit', valor)} />
            </div>
            <div className={styles.grillaDos}>
              <Campo id="nombre" etiqueta="Nombre legal" requerido valor={datos.nombre} error={errores.nombre} maxLength={180} onChange={(valor) => actualizar('nombre', valor)} />
              <Campo id="nombreComercial" etiqueta="Nombre comercial" valor={datos.nombreComercial} error={errores.nombreComercial} maxLength={180} onChange={(valor) => actualizar('nombreComercial', valor)} />
            </div>
          </fieldset>

          <fieldset disabled={guardando}>
            <legend>Contacto</legend>
            <p className={styles.descripcionSeccion}>Medios de contacto y dirección de referencia.</p>
            <div className={styles.grillaDos}>
              <Campo id="correo" etiqueta="Correo electrónico" tipo="email" valor={datos.correo} error={errores.correo} maxLength={180} onChange={(valor) => actualizar('correo', valor)} />
              <Campo id="telefono" etiqueta="Teléfono" tipo="tel" valor={datos.telefono} error={errores.telefono} maxLength={30} onChange={(valor) => actualizar('telefono', valor)} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="proveedor-direccion">Dirección</label>
              <textarea id="proveedor-direccion" value={datos.direccion} rows={4} maxLength={500} aria-invalid={Boolean(errores.direccion)} aria-describedby={errores.direccion ? 'proveedor-direccion-error' : undefined} onChange={(evento) => actualizar('direccion', evento.target.value)} />
              {errores.direccion && <small id="proveedor-direccion-error" className={styles.errorCampo}>{errores.direccion}</small>}
            </div>
          </fieldset>

          <fieldset disabled={guardando}>
            <legend>Control operativo</legend>
            <p className={styles.descripcionSeccion}>La autorización habilita al proveedor para participar en el proceso de compra.</p>
            <label className={styles.controlMarcable}>
              <input id="proveedor-autorizado" type="checkbox" checked={datos.autorizado} onChange={(evento) => actualizar('autorizado', evento.target.checked)} />
              <span><strong>Proveedor autorizado</strong><small>Puede ser considerado en cotizaciones y órdenes cuando esté activo.</small></span>
            </label>
          </fieldset>

          <div className={styles.accionesFormulario}>
            <p><span aria-hidden="true">*</span> Campos obligatorios</p>
            <div>
              <button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(esEdicion && proveedor ? `/abastecimiento/proveedores/${proveedor.id}` : '/abastecimiento/proveedores')}><IconoAccion nombre="cancelar" />Cancelar</button>
              <button className={styles.botonPrimario} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando proveedor…' : esEdicion ? 'Guardar cambios' : 'Registrar proveedor'}</button>
            </div>
          </div>
        </form>
      </section>

      <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo={esEdicion ? 'Proveedor actualizado' : 'Proveedor registrado'} mensaje={guardado ? `${guardado.nombre} quedó guardado correctamente.` : ''} textoAccionPrincipal="Ver proveedor" onAccionPrincipal={() => guardado && onNavegar(`/abastecimiento/proveedores/${guardado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/abastecimiento/proveedores')} onCerrar={() => guardado && onNavegar(`/abastecimiento/proveedores/${guardado.id}`)} />
      <ModalEstado abierto={sinCambios} tipo="informacion" titulo="No se editó ninguna información" mensaje="Los datos del proveedor permanecen iguales." textoAccionPrincipal="Aceptar y volver al detalle" onAccionPrincipal={() => proveedor && onNavegar(`/abastecimiento/proveedores/${proveedor.id}`)} onCerrar={() => setSinCambios(false)} />
    </>
  )
}

type CampoProps = {
  id: Extract<CampoProveedor, 'codigo' | 'nit' | 'nombre' | 'nombreComercial' | 'correo' | 'telefono'>
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  requerido?: boolean
  error?: string
  ayuda?: string
  tipo?: 'text' | 'email' | 'tel'
  maxLength: number
}

function Campo({ id, etiqueta, valor, onChange, requerido, error, ayuda, tipo = 'text', maxLength }: CampoProps) {
  const inputId = `proveedor-${id}`
  const descripcionId = error ? `${inputId}-error` : ayuda ? `${inputId}-ayuda` : undefined
  return (
    <div className={styles.campo}>
      <label htmlFor={inputId}>{etiqueta} {requerido && <span aria-hidden="true">*</span>}</label>
      <input id={inputId} type={tipo} value={valor} required={requerido} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={descripcionId} onChange={(evento) => onChange(evento.target.value)} />
      {error && <small id={`${inputId}-error`} className={styles.errorCampo}>{error}</small>}
      {!error && ayuda && <small id={`${inputId}-ayuda`} className={styles.ayudaCampo}>{ayuda}</small>}
    </div>
  )
}
