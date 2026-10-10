import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { crearAsignacion, descargarPdfAsignacion, obtenerOpcionesAsignacion } from '../activos-api'
import type { OpcionesAsignacionActivo } from '../activos.types'
import { ActivosBreadcrumb } from './activos-breadcrumb'
import styles from './activos.module.css'

type Linea = { clave: string; activoId: string; condicionEntregaId: string; notasEntrega: string }
type ResultadoGuardado = { numeroActa: string; pdfGenerado: boolean; detallePdf?: string }

const nuevaLinea = (): Linea => ({ clave: crypto.randomUUID(), activoId: '', condicionEntregaId: '', notasEntrega: '' })

export function AsignacionFormularioView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [opciones, setOpciones] = useState<OpcionesAsignacionActivo | null>(null)
  const [sucursalId, setSucursalId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()])
  const [errores, setErrores] = useState<Record<string, string | undefined>>({})
  const [error, setError] = useState<string | null>(null)
  const [cargandoSucursal, setCargandoSucursal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [resultadoGuardado, setResultadoGuardado] = useState<ResultadoGuardado | null>(null)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLFormElement>(null)
  const hayCambios = Boolean(sucursalId || empleadoId || observaciones.trim() || lineas.some((linea) => linea.activoId || linea.condicionEntregaId || linea.notasEntrega.trim()))
  const activosSeleccionados = useMemo(() => new Set(lineas.map((linea) => linea.activoId).filter(Boolean)), [lineas])

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesAsignacion({ sucursalId: sucursalId || undefined }, controlador.signal)
      .then((respuesta) => {
        setOpciones(respuesta)
        setError(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar sucursales, empleados y activos disponibles.')
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSucursal(false)
      })
    return () => controlador.abort()
  }, [revision, sucursalId])

  useEffect(() => onCambiosPendientes(hayCambios && !resultadoGuardado), [hayCambios, onCambiosPendientes, resultadoGuardado])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const cambiarSucursal = (valor: string) => {
    setSucursalId(valor)
    setEmpleadoId('')
    setLineas([nuevaLinea()])
    setCargandoSucursal(Boolean(valor))
    setOpciones((actuales) => actuales ? { ...actuales, sucursal: null, empleados: [], activosDisponibles: [] } : actuales)
    setErrores({})
    setError(null)
  }
  const cambiarLinea = (clave: string, cambios: Partial<Linea>) => setLineas((actuales) => actuales.map((linea) => linea.clave === clave ? { ...linea, ...cambios } : linea))
  const seleccionarActivo = (linea: Linea, activoId: string) => {
    const activo = opciones?.activosDisponibles.find((item) => item.id === activoId)
    const condicion = opciones?.condiciones.find((item) => item.nombre === activo?.condicion)
    cambiarLinea(linea.clave, { activoId, condicionEntregaId: condicion?.id ?? linea.condicionEntregaId })
  }
  const validar = () => {
    const siguientes: Record<string, string> = {}
    if (!sucursalId) siguientes.sucursalId = 'Selecciona primero la sucursal.'
    if (!empleadoId) siguientes.empleadoId = 'Selecciona al empleado responsable.'
    const completas = lineas.filter((linea) => linea.activoId || linea.condicionEntregaId || linea.notasEntrega.trim())
    if (!completas.length) siguientes.detalles = 'Agrega al menos un activo.'
    completas.forEach((linea) => {
      if (!linea.activoId) siguientes[`activo-${linea.clave}`] = 'Selecciona un activo.'
      if (!linea.condicionEntregaId) siguientes[`condicion-${linea.clave}`] = 'Selecciona la condición de entrega.'
    })
    if (new Set(completas.map((linea) => linea.activoId)).size !== completas.length) siguientes.detalles = 'No puedes repetir un activo.'
    return siguientes
  }
  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    const siguientes = validar()
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) {
      formularioRef.current?.querySelector<HTMLElement>(`#${primero}`)?.focus()
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const asignacion = await crearAsignacion({
        sucursalId,
        empleadoId,
        observaciones: observaciones.trim() || null,
        detalles: lineas.filter((linea) => linea.activoId).map((linea) => ({
          activoId: linea.activoId,
          condicionEntregaId: linea.condicionEntregaId,
          notasEntrega: linea.notasEntrega.trim() || null,
        })),
      })
      onCambiosPendientes(false)
      try {
        await descargarPdfAsignacion(asignacion.id, asignacion.numeroActa)
        setResultadoGuardado({ numeroActa: asignacion.numeroActa, pdfGenerado: true })
      } catch (errorPdf: unknown) {
        setResultadoGuardado({
          numeroActa: asignacion.numeroActa,
          pdfGenerado: false,
          detallePdf: errorPdf instanceof ErrorApi ? errorPdf.message : 'No fue posible descargar el PDF.',
        })
      }
    } catch (errorActual: unknown) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la asignación.')
    } finally {
      setGuardando(false)
    }
  }

  if (!opciones) return <section className={styles.errorPagina}><ActivosBreadcrumb seccion="Asignaciones" actual="Nueva asignación" onNavegar={onNavegar} /><h1>{error ? 'No se pudo preparar la asignación' : 'Preparando asignación…'}</h1><p>{error ?? 'Consultando sucursales disponibles.'}</p>{error && <button className={styles.botonNuevo} type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button>}</section>

  return <section className={styles.paginaFormulario}><header className={styles.encabezadoPagina}><ActivosBreadcrumb seccion="Asignaciones" actual="Nueva asignación" onNavegar={onNavegar} /><h1>Asignar activos a empleado</h1></header>{error && <div className={styles.alertaError} role="alert"><p>{error}</p></div>}<form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate><fieldset disabled={guardando}><legend>Responsable de la custodia</legend><div className={styles.grillaDos}><div className={styles.campo}><label htmlFor="sucursalId">Sucursal *</label><SelectorCatalogoBuscable id="sucursalId" apariencia="busqueda" valor={sucursalId} opciones={opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: `${sucursal.codigo} · ${sucursal.nombre}` }))} placeholder="Seleccionar sucursal" deshabilitado={guardando} invalido={Boolean(errores.sucursalId)} onChange={cambiarSucursal} />{errores.sucursalId ? <small className={styles.errorCampo}>{errores.sucursalId}</small> : <small className={styles.ayuda}>Primer filtro obligatorio para empleados y activos.</small>}</div><div className={styles.campo}><label htmlFor="empleadoId">Empleado *</label><SelectorCatalogoBuscable id="empleadoId" apariencia="busqueda" valor={empleadoId} opciones={opciones.empleados.map((empleado) => ({ valor: empleado.id, etiqueta: `${empleado.codigo} · ${empleado.nombreCompleto}${empleado.puesto ? ` · ${empleado.puesto}` : ''}` }))} placeholder={sucursalId ? 'Buscar empleado de la sucursal' : 'Selecciona primero una sucursal'} deshabilitado={guardando || cargandoSucursal || !sucursalId} invalido={Boolean(errores.empleadoId)} onChange={(valor) => { setEmpleadoId(valor); setErrores((actual) => ({ ...actual, empleadoId: undefined })) }} />{errores.empleadoId ? <small className={styles.errorCampo}>{errores.empleadoId}</small> : sucursalId && !cargandoSucursal && !opciones.empleados.length ? <small className={styles.errorCampo}>No hay empleados activos en esta sucursal.</small> : null}</div><div className={styles.campoCompleto}><label htmlFor="observaciones">Observaciones</label><textarea id="observaciones" rows={3} maxLength={1000} value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)} /><small className={styles.ayuda}>{observaciones.length}/1000 caracteres</small></div></div></fieldset><fieldset disabled={guardando}><legend>Activos entregados</legend><p className={styles.ayuda}>Registra la condición física exacta y cualquier accesorio o detalle entregado.</p><div className={styles.lineas}>{lineas.map((linea, indice) => <div className={styles.linea} key={linea.clave}><div className={styles.campo}><label htmlFor={`activo-${linea.clave}`}>Activo {indice + 1} *</label><SelectorCatalogoBuscable id={`activo-${linea.clave}`} apariencia="busqueda" valor={linea.activoId} opciones={opciones.activosDisponibles.filter((activo) => activo.id === linea.activoId || !activosSeleccionados.has(activo.id)).map((activo) => ({ valor: activo.id, etiqueta: `${activo.codigoInterno} · ${activo.tipo}${activo.marca ? ` · ${activo.marca}` : ''}${activo.modelo ? ` ${activo.modelo}` : ''}` }))} placeholder={sucursalId ? 'Buscar activo disponible' : 'Selecciona primero una sucursal'} deshabilitado={guardando || cargandoSucursal || !sucursalId} invalido={Boolean(errores[`activo-${linea.clave}`])} onChange={(valor) => seleccionarActivo(linea, valor)} />{errores[`activo-${linea.clave}`] && <small className={styles.errorCampo}>{errores[`activo-${linea.clave}`]}</small>}</div><div className={styles.campo}><label htmlFor={`condicion-${linea.clave}`}>Condición de entrega *</label><SelectorCatalogoBuscable id={`condicion-${linea.clave}`} valor={linea.condicionEntregaId} opciones={opciones.condiciones.map((condicion) => ({ valor: condicion.id, etiqueta: condicion.nombre }))} placeholder="Seleccionar condición" deshabilitado={guardando || !sucursalId} invalido={Boolean(errores[`condicion-${linea.clave}`])} onChange={(valor) => cambiarLinea(linea.clave, { condicionEntregaId: valor })} />{errores[`condicion-${linea.clave}`] && <small className={styles.errorCampo}>{errores[`condicion-${linea.clave}`]}</small>}</div><div className={styles.campo}><label htmlFor={`notas-${linea.clave}`}>Notas de entrega</label><input id={`notas-${linea.clave}`} maxLength={500} value={linea.notasEntrega} placeholder="Ej. Incluye cargador" onChange={(evento) => cambiarLinea(linea.clave, { notasEntrega: evento.target.value })} /></div>{lineas.length > 1 && <button className={styles.botonNeutral} type="button" onClick={() => setLineas((actuales) => actuales.filter((item) => item.clave !== linea.clave))}>Quitar</button>}</div>)}</div>{errores.detalles && <p className={styles.errorCampo} role="alert">{errores.detalles}</p>}<button className={`${styles.botonSecundario} ${styles.botonAgregarActivo}`} type="button" disabled={guardando || cargandoSucursal || !sucursalId || lineas.length >= 100 || activosSeleccionados.size >= opciones.activosDisponibles.length} onClick={() => setLineas((actuales) => [...actuales, nuevaLinea()])}><IconoAccion nombre="agregar" />Agregar otro activo</button>{sucursalId && !cargandoSucursal && !opciones.activosDisponibles.length && <p className={styles.errorCampo}>No hay activos disponibles en esta sucursal.</p>}</fieldset><div className={styles.accionesFormulario}><p>* Campos obligatorios</p><div><button className={styles.botonFormularioSecundario} type="button" disabled={guardando} onClick={() => onNavegar('/activos/asignaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonFormularioPrincipal} type="submit" disabled={guardando || cargandoSucursal || !sucursalId || !opciones.activosDisponibles.length}><IconoAccion nombre="guardar" />{guardando ? 'Registrando…' : 'Registrar asignación'}</button></div></div></form><ModalEstado abierto={Boolean(resultadoGuardado)} tipo={resultadoGuardado?.pdfGenerado === false ? 'advertencia' : 'exito'} titulo={resultadoGuardado?.pdfGenerado === false ? 'Asignación registrada; PDF pendiente' : 'Asignación registrada'} mensaje={resultadoGuardado?.pdfGenerado === false ? `El acta ${resultadoGuardado.numeroActa} fue guardada correctamente, pero el PDF no pudo descargarse. ${resultadoGuardado.detallePdf ?? ''} Puedes descargarlo desde la lista de asignaciones.` : `El acta ${resultadoGuardado?.numeroActa ?? ''} fue registrada y el PDF fue generado.`} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/activos/asignaciones')} onCerrar={() => onNavegar('/activos/asignaciones')} /></section>
}
