import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarImagenProducto, actualizarProducto, crearProducto, eliminarImagenProducto, obtenerOpcionesProducto, obtenerProducto } from '../producto-api'
import type { GuardarProductoRequest, OpcionesProducto, Producto } from '../producto.types'
import { datosProductoIniciales, validarProducto, type DatosProducto, type ErroresProducto } from '../validacion-producto'
import { ProductoBreadcrumb } from './producto-breadcrumb'
import { ProductoFormularioCampos } from './producto-formulario-campos'
import { ProductoImagenCampo } from './producto-imagen-campo'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = {
  productoId?: string
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (pendientes: boolean) => void
}

const desdeProducto = (producto: Producto): DatosProducto => ({
  codigo: producto.codigo,
  nombreComercial: producto.nombreComercial,
  laboratorioId: producto.laboratorioId,
  presentacionId: producto.presentacionId,
  formaFarmaceuticaId: producto.formaFarmaceuticaId,
  categoriaTerapeuticaIds: producto.categoriaTerapeuticaIds,
  viaAdministracionIds: producto.viaAdministracionIds,
  cantidadContenido: String(producto.cantidadContenido),
  unidadContenidoId: producto.unidadContenidoId,
  requiereReceta: producto.requiereReceta,
  esControlado: producto.esControlado,
  controlaLote: producto.controlaLote,
  requiereVencimiento: producto.requiereVencimiento,
  condicionesAlmacenamiento: producto.condicionesAlmacenamiento ?? '',
  codigosBarras: producto.codigosBarras.length ? producto.codigosBarras : [{ codigo: '', esPrincipal: true }],
  componentes: producto.componentes.map((componente) => ({ principioActivoId: componente.principioActivoId, concentracion: String(componente.concentracion), unidadMedidaId: componente.unidadMedidaId })),
})

const solicitud = (datos: DatosProducto): GuardarProductoRequest => ({
  codigo: datos.codigo.trim().toUpperCase(),
  nombreComercial: datos.nombreComercial.trim(),
  laboratorioId: datos.laboratorioId,
  presentacionId: datos.presentacionId,
  formaFarmaceuticaId: datos.formaFarmaceuticaId,
  categoriaTerapeuticaIds: datos.categoriaTerapeuticaIds,
  viaAdministracionIds: datos.viaAdministracionIds,
  cantidadContenido: Number(datos.cantidadContenido),
  unidadContenidoId: datos.unidadContenidoId,
  requiereReceta: datos.requiereReceta,
  esControlado: datos.esControlado,
  controlaLote: datos.controlaLote,
  requiereVencimiento: datos.requiereVencimiento,
  condicionesAlmacenamiento: datos.condicionesAlmacenamiento?.trim() || null,
  codigosBarras: datos.codigosBarras.filter((codigo) => codigo.codigo.trim()).map((codigo) => ({ codigo: codigo.codigo.trim(), esPrincipal: codigo.esPrincipal })),
  componentes: datos.componentes.map((componente) => ({ principioActivoId: componente.principioActivoId, concentracion: Number(componente.concentracion), unidadMedidaId: componente.unidadMedidaId })),
})

export function ProductoFormularioView({ productoId, onNavegar, onCambiosPendientes }: Props) {
  const [producto, setProducto] = useState<Producto | null>(null)
  const [opciones, setOpciones] = useState<OpcionesProducto | null>(null)
  const [datos, setDatos] = useState<DatosProducto | null>(productoId ? null : datosProductoIniciales)
  const [iniciales, setIniciales] = useState<DatosProducto | null>(productoId ? null : datosProductoIniciales)
  const [errores, setErrores] = useState<ErroresProducto>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [sinCambios, setSinCambios] = useState(false)
  const [revision, setRevision] = useState(0)
  const [imagen, setImagen] = useState<File | null>(null)
  const [vistaPreviaImagen, setVistaPreviaImagen] = useState<string | null>(null)
  const [retirarImagenActual, setRetirarImagenActual] = useState(false)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [imagenPendiente, setImagenPendiente] = useState(false)
  const [mensajeImagenPendiente, setMensajeImagenPendiente] = useState<string | null>(null)
  const [productoGuardado, setProductoGuardado] = useState<Producto | null>(null)
  const formularioRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const controlador = new AbortController()
    const cargaProducto = productoId ? obtenerProducto(productoId, controlador.signal) : Promise.resolve(null)
    void Promise.all([obtenerOpcionesProducto(controlador.signal), cargaProducto])
      .then(([catalogos, encontrado]) => {
        setOpciones(catalogos)
        setProducto(encontrado)
        const valores = encontrado ? desdeProducto(encontrado) : datosProductoIniciales
        setDatos(valores)
        setIniciales(valores)
        setError(null)
      })
      .catch((errorCarga: unknown) => {
        if (!controlador.signal.aborted) setError(errorCarga instanceof ErrorApi ? errorCarga.message : 'No fue posible preparar el formulario.')
      })
    return () => controlador.abort()
  }, [productoId, revision])

  useEffect(() => () => {
    if (vistaPreviaImagen) URL.revokeObjectURL(vistaPreviaImagen)
  }, [vistaPreviaImagen])

  const hayCambiosDatos = useMemo(() => Boolean(datos && iniciales && JSON.stringify(datos) !== JSON.stringify(iniciales)), [datos, iniciales])
  const hayCambios = hayCambiosDatos || Boolean(imagen) || retirarImagenActual
  useEffect(() => onCambiosPendientes(hayCambios && !exito), [exito, hayCambios, onCambiosPendientes])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const limpiarCambioImagen = () => {
    setImagen(null)
    setVistaPreviaImagen(null)
    setRetirarImagenActual(false)
    setErrorImagen(null)
  }

  const aplicarCambioImagen = async (actual: Producto): Promise<Producto> => {
    if (imagen) return actualizarImagenProducto(actual.id, actual.version, imagen)
    if (retirarImagenActual && actual.imagenUrl) return eliminarImagenProducto(actual.id, actual.version)
    return actual
  }

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!datos) return
    const siguientes = validarProducto(datos)
    setErrores(siguientes)
    if (Object.keys(siguientes).length) {
      formularioRef.current?.querySelector<HTMLElement>(`#${Object.keys(siguientes)[0]}`)?.focus()
      return
    }
    if (producto && !hayCambios) {
      setSinCambios(true)
      return
    }

    setGuardando(true)
    setError(null)
    setErrorImagen(null)
    try {
      let actualizado = producto
        ? hayCambiosDatos
          ? await actualizarProducto(producto.id, { ...solicitud(datos), version: producto.version })
          : producto
        : await crearProducto(solicitud(datos))
      setProductoGuardado(actualizado)

      try {
        actualizado = await aplicarCambioImagen(actualizado)
      } catch (errorArchivo: unknown) {
        setProducto(actualizado)
        setIniciales(datos)
        setProductoGuardado(actualizado)
        setImagenPendiente(true)
        setMensajeImagenPendiente(errorArchivo instanceof ErrorApi ? errorArchivo.message : 'No fue posible guardar la imagen.')
        setExito(true)
        return
      }

      setProducto(actualizado)
      setProductoGuardado(actualizado)
      setIniciales(datos)
      limpiarCambioImagen()
      setImagenPendiente(false)
      setMensajeImagenPendiente(null)
      onCambiosPendientes(false)
      setExito(true)
    } catch (errorGuardado: unknown) {
      setError(errorGuardado instanceof ErrorApi ? errorGuardado.message : 'No fue posible guardar el medicamento.')
    } finally {
      setGuardando(false)
    }
  }

  const reintentarImagen = async () => {
    if (!productoGuardado) return
    setGuardando(true)
    setMensajeImagenPendiente(null)
    try {
      const actualizado = await aplicarCambioImagen(productoGuardado)
      setProducto(actualizado)
      setProductoGuardado(actualizado)
      limpiarCambioImagen()
      setImagenPendiente(false)
      setExito(true)
    } catch (errorArchivo: unknown) {
      setImagenPendiente(true)
      setMensajeImagenPendiente(errorArchivo instanceof ErrorApi ? errorArchivo.message : 'No fue posible guardar la imagen.')
    } finally {
      setGuardando(false)
    }
  }

  const editando = Boolean(productoId)
  if (!datos || !opciones) {
    return <section className={styles.estadoCargaFormulario}><ProductoBreadcrumb actual={editando ? 'Editar medicamento' : 'Registrar medicamento'} onNavegar={onNavegar} /><h1>{error ? 'No se pudo cargar el formulario' : 'Preparando formulario…'}</h1><p>{error ?? 'Estamos consultando los catálogos necesarios.'}</p>{error && <button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>}</section>
  }

  const catalogosListos = [opciones.laboratorios, opciones.presentaciones, opciones.principiosActivos, opciones.unidadesMedida, opciones.formasFarmaceuticas, opciones.categoriasTerapeuticas, opciones.viasAdministracion].every((items) => items.some((item) => item.activo))

  return (
    <section className={styles.paginaFormulario}>
      <header className={styles.encabezadoPagina}><div><ProductoBreadcrumb actual={editando ? 'Editar medicamento' : 'Registrar medicamento'} onNavegar={onNavegar} /><h1>{editando ? 'Editar medicamento' : 'Registrar medicamento'}</h1></div>{producto && <span className={styles.indicadorFormulario}>{producto.codigo}</span>}</header>
      {error && <div className={styles.alertaError} role="alert"><span>!</span><p>{error}</p></div>}
      {!catalogosListos && <div className={styles.alertaError} role="alert"><span>!</span><p>Se necesita al menos un registro activo en cada catálogo requerido, incluidas forma farmacéutica, categoría terapéutica y vía de administración.</p></div>}
      <form ref={formularioRef} className={styles.formulario} onSubmit={(evento) => void guardar(evento)} noValidate>
        <ProductoImagenCampo productoNombre={datos.nombreComercial} imagenActualUrl={producto?.imagenUrl ?? null} version={producto?.version ?? null} archivo={imagen} vistaPrevia={vistaPreviaImagen} retirarActual={retirarImagenActual} error={errorImagen} deshabilitado={guardando} onArchivoChange={(archivo, vistaPrevia, errorSeleccion) => { setImagen(archivo); setVistaPreviaImagen(vistaPrevia); setErrorImagen(errorSeleccion) }} onRetirarActualChange={setRetirarImagenActual} />
        <ProductoFormularioCampos datos={datos} errores={errores} opciones={opciones} deshabilitado={guardando || !catalogosListos} onChange={(siguientesDatos) => { setDatos(siguientesDatos); setErrores({}) }} />
        <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/catalogos/productos')} disabled={guardando}><IconoAccion nombre="cancelar" className={styles.iconoBoton} /><span>Cancelar</span></button><button className={styles.botonPrincipal} type="submit" disabled={guardando || !catalogosListos}><IconoAccion nombre="guardar" className={styles.iconoBoton} /><span>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar medicamento'}</span></button></div></div>
      </form>
      <ModalEstado abierto={exito} tipo={imagenPendiente ? 'advertencia' : 'exito'} titulo={imagenPendiente ? 'Medicamento guardado sin imagen' : editando ? 'Medicamento actualizado' : 'Medicamento registrado'} mensaje={imagenPendiente ? <>Los datos del medicamento ya fueron guardados, pero la imagen no pudo procesarse. {mensajeImagenPendiente}</> : 'La información fue guardada correctamente.'} textoAccionPrincipal={imagenPendiente ? 'Continuar sin imagen' : 'Aceptar'} onAccionPrincipal={() => onNavegar('/catalogos/productos')} textoAccionSecundaria={imagenPendiente ? 'Reintentar imagen' : undefined} onAccionSecundaria={imagenPendiente ? () => void reintentarImagen() : undefined} onCerrar={() => onNavegar('/catalogos/productos')} cargando={guardando} />
      <ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información ni imagen del medicamento." textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/catalogos/productos')} onCerrar={() => setSinCambios(false)} />
    </section>
  )
}
