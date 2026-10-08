import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarCliente, crearCliente, obtenerCliente } from '../comercial-api'
import type { ClienteComercial, GuardarClienteRequest, TipoCliente, TipoIdentificacionCliente } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

type DatosCliente = {
  tipo: TipoCliente
  nombres: string
  apellidos: string
  razonSocial: string
  tipoIdentificacion: '' | TipoIdentificacionCliente
  identificacion: string
  telefono: string
  correo: string
  direccion: string
  motivo: string
}
type CampoCliente = keyof DatosCliente
type ErroresCliente = Partial<Record<CampoCliente, string>>

const datosVacios: DatosCliente = { tipo: 'PERSONA', nombres: '', apellidos: '', razonSocial: '', tipoIdentificacion: '', identificacion: '', telefono: '', correo: '', direccion: '', motivo: '' }

function desdeCliente(cliente: ClienteComercial): DatosCliente {
  return { tipo: cliente.tipo, nombres: cliente.nombres ?? '', apellidos: cliente.apellidos ?? '', razonSocial: cliente.razonSocial ?? '', tipoIdentificacion: cliente.tipoIdentificacion ?? '', identificacion: cliente.identificacion ?? '', telefono: cliente.telefono ?? '', correo: cliente.correo ?? '', direccion: cliente.direccion ?? '', motivo: '' }
}

function validar(datos: DatosCliente, esEdicion: boolean): ErroresCliente {
  const errores: ErroresCliente = {}
  if (datos.tipo === 'PERSONA') {
    if (!datos.nombres.trim()) errores.nombres = 'Ingresa los nombres de la persona.'
    if (!datos.apellidos.trim()) errores.apellidos = 'Ingresa los apellidos de la persona.'
  } else if (!datos.razonSocial.trim()) errores.razonSocial = 'Ingresa la razón social de la empresa.'
  if (datos.nombres.trim().length > 100) errores.nombres = 'Admite hasta 100 caracteres.'
  if (datos.apellidos.trim().length > 100) errores.apellidos = 'Admite hasta 100 caracteres.'
  if (datos.razonSocial.trim().length > 200) errores.razonSocial = 'Admite hasta 200 caracteres.'
  if (Boolean(datos.tipoIdentificacion) !== Boolean(datos.identificacion.trim())) errores.identificacion = 'Selecciona el tipo y escribe el número de identificación.'
  if (datos.identificacion.trim().length > 30) errores.identificacion = 'Admite hasta 30 caracteres.'
  if (datos.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) errores.correo = 'Ingresa un correo electrónico válido.'
  if (datos.correo.trim().length > 150) errores.correo = 'Admite hasta 150 caracteres.'
  if (datos.telefono.trim().length > 30) errores.telefono = 'Admite hasta 30 caracteres.'
  if (datos.direccion.trim().length > 300) errores.direccion = 'Admite hasta 300 caracteres.'
  if (esEdicion && !datos.motivo.trim()) errores.motivo = 'Explica el motivo de la actualización.'
  if (datos.motivo.trim().length > 250) errores.motivo = 'Admite hasta 250 caracteres.'
  return errores
}

function solicitud(datos: DatosCliente): GuardarClienteRequest {
  const esPersona = datos.tipo === 'PERSONA'
  return {
    tipo: datos.tipo,
    nombres: esPersona ? datos.nombres.trim() : null,
    apellidos: esPersona ? datos.apellidos.trim() : null,
    razonSocial: esPersona ? null : datos.razonSocial.trim(),
    tipoIdentificacion: datos.tipoIdentificacion || null,
    identificacion: datos.identificacion.trim() || null,
    telefono: datos.telefono.trim() || null,
    correo: datos.correo.trim().toLowerCase() || null,
    direccion: datos.direccion.trim() || null,
  }
}

export function ClienteFormularioView({ clienteId, onNavegar, onCambiosPendientes }: { clienteId?: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const esEdicion = Boolean(clienteId)
  const [cliente, setCliente] = useState<ClienteComercial | null>(null)
  const [datos, setDatos] = useState<DatosCliente>(datosVacios)
  const [errores, setErrores] = useState<ErroresCliente>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(esEdicion)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<ClienteComercial | null>(null)
  const originales = useMemo(() => cliente ? desdeCliente(cliente) : datosVacios, [cliente])
  const tieneCambios = JSON.stringify(datos) !== JSON.stringify(originales)

  useEffect(() => {
    if (!clienteId) return
    const controlador = new AbortController()
    void obtenerCliente(clienteId, controlador.signal).then((actual) => { setCliente(actual); setDatos(desdeCliente(actual)); setCargando(false) }).catch((error: unknown) => { if (!controlador.signal.aborted) { setErrorGeneral(error instanceof ErrorApi ? error.message : 'No fue posible cargar el cliente.'); setCargando(false) } })
    return () => controlador.abort()
  }, [clienteId])
  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const actualizar = <K extends CampoCliente>(campo: K, valor: DatosCliente[K]) => { setDatos((actual) => ({ ...actual, [campo]: valor })); setErrores((actual) => ({ ...actual, [campo]: undefined })); setErrorGeneral(null) }
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const erroresActuales = validar(datos, esEdicion)
    if (Object.keys(erroresActuales).length) { setErrores(erroresActuales); setErrorGeneral('Revisa los campos señalados antes de guardar.'); document.getElementById(`cliente-${Object.keys(erroresActuales)[0]}`)?.focus(); return }
    setGuardando(true); setErrorGeneral(null)
    try {
      const base = solicitud(datos)
      const respuesta = cliente ? await actualizarCliente(cliente.id, { ...base, activo: cliente.activo, version: cliente.version, motivo: datos.motivo.trim() }) : await crearCliente(base)
      setGuardado(respuesta); onCambiosPendientes(false)
    } catch (actual) {
      if (actual instanceof ErrorApi) {
        const backend: ErroresCliente = {}; actual.detalles.forEach((detalle) => { if (detalle.campo in datos) backend[detalle.campo as CampoCliente] = detalle.mensaje })
        setErrores(backend); setErrorGeneral(actual.message); const primero = Object.keys(backend)[0]; if (primero) document.getElementById(`cliente-${primero}`)?.focus()
      } else setErrorGeneral(`No fue posible ${esEdicion ? 'actualizar' : 'registrar'} el cliente.`)
    } finally { setGuardando(false) }
  }

  if (cargando) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual="Cargando" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando cliente</h1><p>Consultando la información registrada…</p></div></section>
  if (esEdicion && !cliente) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual="Editar cliente" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible abrir el cliente</h1><p>{errorGeneral}</p><button type="button" onClick={() => onNavegar('/clientes')}>Volver al listado</button></div></section>

  return <>
    <section className={styles.pagina} aria-labelledby="titulo-formulario-cliente">
      <ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual={esEdicion ? 'Editar cliente' : 'Nuevo cliente'} onNavegar={onNavegar} />
      <header className={styles.cabeceraPagina}><div><p className={styles.sobretitulo}>Ventas y atención al cliente</p><h1 id="titulo-formulario-cliente">{esEdicion ? 'Editar cliente' : 'Registrar cliente'}</h1><p>La sucursal de registro se toma automáticamente de la sesión y no puede modificarse.</p></div></header>
      {errorGeneral && <div className={styles.alertaError} role="alert">{errorGeneral}</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando}><legend>Tipo y nombre</legend><p className={styles.descripcionSeccion}>Define si el registro corresponde a una persona o una empresa.</p><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="cliente-tipo">Tipo de cliente <span aria-hidden="true">*</span></label><select id="cliente-tipo" value={datos.tipo} onChange={(evento) => actualizar('tipo', evento.target.value as TipoCliente)}><option value="PERSONA">Persona</option><option value="EMPRESA">Empresa</option></select></div>{datos.tipo === 'EMPRESA' && <Campo id="razonSocial" etiqueta="Razón social" requerido valor={datos.razonSocial} error={errores.razonSocial} maxLength={200} onChange={(valor) => actualizar('razonSocial', valor)} />}</div>{datos.tipo === 'PERSONA' && <div className={styles.grillaDos}><Campo id="nombres" etiqueta="Nombres" requerido valor={datos.nombres} error={errores.nombres} maxLength={100} onChange={(valor) => actualizar('nombres', valor)} /><Campo id="apellidos" etiqueta="Apellidos" requerido valor={datos.apellidos} error={errores.apellidos} maxLength={100} onChange={(valor) => actualizar('apellidos', valor)} /></div>}</fieldset>
        <fieldset disabled={guardando}><legend>Identificación</legend><p className={styles.descripcionSeccion}>La identificación es opcional, pero el tipo y el número deben registrarse juntos.</p><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="cliente-tipoIdentificacion">Tipo de identificación</label><select id="cliente-tipoIdentificacion" value={datos.tipoIdentificacion} aria-invalid={Boolean(errores.identificacion)} onChange={(evento) => actualizar('tipoIdentificacion', evento.target.value as DatosCliente['tipoIdentificacion'])}><option value="">Sin identificación</option><option value="NIT">NIT</option><option value="CUI">CUI / DPI</option><option value="PASAPORTE">Pasaporte</option></select></div><Campo id="identificacion" etiqueta="Número de identificación" valor={datos.identificacion} error={errores.identificacion} maxLength={30} onChange={(valor) => actualizar('identificacion', valor)} /></div></fieldset>
        <fieldset disabled={guardando}><legend>Contacto</legend><div className={styles.grillaDos}><Campo id="telefono" etiqueta="Teléfono" tipo="tel" valor={datos.telefono} error={errores.telefono} maxLength={30} onChange={(valor) => actualizar('telefono', valor)} /><Campo id="correo" etiqueta="Correo electrónico" tipo="email" valor={datos.correo} error={errores.correo} maxLength={150} onChange={(valor) => actualizar('correo', valor)} /></div><div className={styles.campo}><label htmlFor="cliente-direccion">Dirección</label><textarea id="cliente-direccion" rows={4} maxLength={300} value={datos.direccion} aria-invalid={Boolean(errores.direccion)} onChange={(evento) => actualizar('direccion', evento.target.value)} />{errores.direccion && <small className={styles.errorCampo}>{errores.direccion}</small>}</div></fieldset>
        {esEdicion && <fieldset disabled={guardando}><legend>Justificación</legend><div className={styles.campo}><label htmlFor="cliente-motivo">Motivo del cambio <span aria-hidden="true">*</span></label><textarea id="cliente-motivo" rows={3} maxLength={250} value={datos.motivo} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => actualizar('motivo', evento.target.value)} />{errores.motivo && <small className={styles.errorCampo}>{errores.motivo}</small>}<small className={styles.ayudaCampo}>Este motivo quedará registrado en la auditoría.</small></div></fieldset>}
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar(cliente ? `/clientes/${cliente.id}` : '/clientes')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar cliente'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo={esEdicion ? 'Cliente actualizado' : 'Cliente registrado'} mensaje={guardado ? `${guardado.nombre} quedó guardado correctamente.` : ''} textoAccionPrincipal="Ver cliente" onAccionPrincipal={() => guardado && onNavegar(`/clientes/${guardado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/clientes')} onCerrar={() => guardado && onNavegar(`/clientes/${guardado.id}`)} />
  </>
}

function Campo({ id, etiqueta, valor, onChange, requerido, error, tipo = 'text', maxLength }: { id: Extract<CampoCliente, 'nombres' | 'apellidos' | 'razonSocial' | 'identificacion' | 'telefono' | 'correo'>; etiqueta: string; valor: string; onChange: (valor: string) => void; requerido?: boolean; error?: string; tipo?: 'text' | 'email' | 'tel'; maxLength: number }) {
  return <div className={styles.campo}><label htmlFor={`cliente-${id}`}>{etiqueta} {requerido && <span aria-hidden="true">*</span>}</label><input id={`cliente-${id}`} type={tipo} value={valor} required={requerido} maxLength={maxLength} aria-invalid={Boolean(error)} onChange={(evento) => onChange(evento.target.value)} />{error && <small className={styles.errorCampo}>{error}</small>}</div>
}
