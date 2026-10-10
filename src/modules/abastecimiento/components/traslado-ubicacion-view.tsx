import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { ejecutarAccionAbastecimiento, listarUbicacionesAbastecimiento, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import type { DetalleProductoAbastecimiento, TrasladoInterno, UbicacionAbastecimiento, UbicarTrasladoInternoRequest } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

type Asignacion = { clave: number; ubicacionId: string; cantidad: string }
const numero = (valor: unknown) => Number(valor ?? 0)

export function TrasladoUbicacionView({ trasladoId, rutaBase = '/abastecimiento/traslados', onNavegar, onCambiosPendientes }: { trasladoId: string; rutaBase?: '/abastecimiento/traslados' | '/abastecimiento/devoluciones-internas'; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [traslado, setTraslado] = useState<TrasladoInterno | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionAbastecimiento[]>([])
  const [asignaciones, setAsignaciones] = useState<Record<string, Asignacion[]>>({})
  const [secuencia, setSecuencia] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<TrasladoInterno | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<TrasladoInterno>('traslados', trasladoId, controlador.signal)
      .then(async (registro) => {
        setTraslado(registro)
        const detallesPendientes = registro.detalles.filter((detalle) => numero(detalle.cantidadPendienteUbicacion) > 0)
        let clave = 1
        setAsignaciones(Object.fromEntries(detallesPendientes.map((detalle) => [detalle.id, [{ clave: clave++, ubicacionId: '', cantidad: String(numero(detalle.cantidadPendienteUbicacion)) }]])))
        setSecuencia(clave)
        const catalogo = await listarUbicacionesAbastecimiento(registro.sucursalDestinoId, controlador.signal)
        setUbicaciones(catalogo.filter((ubicacion) => ubicacion.activa !== false && !ubicacion.bloqueada && ['BODEGA', 'VENTA'].includes(ubicacion.tipo)))
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar los productos pendientes de ubicación.')
      })
    return () => controlador.abort()
  }, [trasladoId])

  const pendientes = useMemo(() => traslado?.detalles.filter((detalle) => numero(detalle.cantidadPendienteUbicacion) > 0) ?? [], [traslado])
  const tieneCambios = Boolean(motivo || Object.values(asignaciones).flat().some((asignacion) => asignacion.ubicacionId))
  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const actualizar = (detalleId: string, clave: number, cambio: Partial<Asignacion>) => setAsignaciones((actuales) => ({
    ...actuales,
    [detalleId]: (actuales[detalleId] ?? []).map((asignacion) => asignacion.clave === clave ? { ...asignacion, ...cambio } : asignacion),
  }))
  const agregar = (detalleId: string) => {
    setAsignaciones((actuales) => ({ ...actuales, [detalleId]: [...(actuales[detalleId] ?? []), { clave: secuencia, ubicacionId: '', cantidad: '' }] }))
    setSecuencia((valor) => valor + 1)
  }
  const quitar = (detalleId: string, clave: number) => setAsignaciones((actuales) => ({ ...actuales, [detalleId]: (actuales[detalleId] ?? []).filter((asignacion) => asignacion.clave !== clave) }))

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!traslado) return
    const siguientes: Record<string, string> = {}
    if (motivo.trim().length < 5) siguientes.motivo = 'El motivo debe contener al menos 5 caracteres.'
    pendientes.forEach((detalle) => {
      const lineas = asignaciones[detalle.id] ?? []
      if (!lineas.length || lineas.some((linea) => !linea.ubicacionId || !(numero(linea.cantidad) > 0))) siguientes[detalle.id] = 'Completa ubicación y cantidad en todas las asignaciones.'
      if (new Set(lineas.map((linea) => linea.ubicacionId).filter(Boolean)).size !== lineas.filter((linea) => linea.ubicacionId).length) siguientes[detalle.id] = 'No repitas una ubicación para el mismo producto.'
      if (Math.abs(lineas.reduce((suma, linea) => suma + numero(linea.cantidad), 0) - numero(detalle.cantidadPendienteUbicacion)) > 0.000001) siguientes[detalle.id] = `La distribución debe sumar ${numero(detalle.cantidadPendienteUbicacion)}.`
    })
    setErrores(siguientes)
    if (Object.keys(siguientes).length) return
    const datos: UbicarTrasladoInternoRequest = {
      version: traslado.version,
      motivo: motivo.trim(),
      detalles: pendientes.map((detalle) => ({ detalleId: detalle.id, asignaciones: (asignaciones[detalle.id] ?? []).map((linea) => ({ ubicacionId: linea.ubicacionId, cantidad: numero(linea.cantidad) })) })),
    }
    setGuardando(true)
    setError(null)
    try {
      setGuardado(await ejecutarAccionAbastecimiento<TrasladoInterno>('traslados', traslado.id, 'ubicacion', datos))
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible confirmar la ubicación final.')
    } finally {
      setGuardando(false)
    }
  }

  if (error && !traslado) return <section className={styles.pagina}><div className={styles.alertaError} role="alert">{error}</div></section>
  if (!traslado) return <section className={styles.pagina} aria-busy="true"><div className={styles.estadoVacio}><h1>Cargando productos</h1></div></section>
  const disponible = traslado.estado === 'PENDIENTE_UBICACION' && pendientes.length > 0
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-ubicacion-traslado">
      <AbastecimientoBreadcrumb recurso="ubicaciones-traslado" actual={`Traslado ${traslado.numero}`} onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Recepción completada · disponibilidad pendiente</p><h1 id="titulo-ubicacion-traslado">Ubicar productos recibidos</h1><p>Distribuye cada cantidad aceptada en una o varias ubicaciones finales. Solo al confirmar quedará disponible en inventario.</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      {!disponible && <div className={styles.alertaAdvertencia} role="alert">Este traslado ya no tiene productos pendientes de ubicación.</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando || !disponible}>
          <legend>Distribución por producto</legend>
          <div className={styles.lineasProductos}>{pendientes.map((detalle) => <ProductoPendiente
            key={detalle.id}
            detalle={detalle}
            lineas={asignaciones[detalle.id] ?? []}
            ubicaciones={ubicaciones}
            error={errores[detalle.id]}
            onActualizar={(clave, cambio) => actualizar(detalle.id, clave, cambio)}
            onAgregar={() => agregar(detalle.id)}
            onQuitar={(clave) => quitar(detalle.id, clave)}
          />)}</div>
        </fieldset>
        <fieldset disabled={guardando || !disponible}><legend>Confirmación</legend><div className={styles.campo}><label htmlFor="motivo-ubicacion">Motivo <span>*</span></label><textarea id="motivo-ubicacion" rows={4} maxLength={500} value={motivo} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <small className={styles.errorCampo}>{errores.motivo}</small>}</div></fieldset>
        <div className={styles.accionesFormulario}><p>La confirmación moverá el inventario de recepción a disponible.</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(rutaBase === '/abastecimiento/devoluciones-internas' ? `${rutaBase}/${traslado.id}` : '/abastecimiento/traslados/ubicaciones')}><IconoAccion nombre="cancelar" />Volver</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre="guardar" />{guardando ? 'Ubicando…' : 'Confirmar ubicación'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Productos ubicados" mensaje={guardado ? `Los productos del traslado ${guardado.numero} ya están disponibles en sus ubicaciones finales.` : ''} textoAccionPrincipal="Ver traslado" onAccionPrincipal={() => onNavegar(`${rutaBase}/${trasladoId}`)} onCerrar={() => onNavegar(`${rutaBase}/${trasladoId}`)} />
  </>
}

function ProductoPendiente({ detalle, lineas, ubicaciones, error, onActualizar, onAgregar, onQuitar }: { detalle: DetalleProductoAbastecimiento; lineas: Asignacion[]; ubicaciones: UbicacionAbastecimiento[]; error?: string; onActualizar: (clave: number, cambio: Partial<Asignacion>) => void; onAgregar: () => void; onQuitar: (clave: number) => void }) {
  return <article className={styles.tarjetaDetalle}>
    <div className={styles.tituloSeccion}><div><h2>{detalle.producto?.nombre ?? detalle.productoId}</h2><p>{detalle.producto?.codigo ?? ''}</p></div><span>Pendiente: {numero(detalle.cantidadPendienteUbicacion)}</span></div>
    {lineas.map((asignacion, indice) => <div className={styles.lineaProducto} key={asignacion.clave}>
      <span className={styles.numeroLinea}>{indice + 1}</span>
      <div className={styles.campoProducto}><label htmlFor={`ubicacion-${detalle.id}-${asignacion.clave}`}>Ubicación final</label><select id={`ubicacion-${detalle.id}-${asignacion.clave}`} value={asignacion.ubicacionId} onChange={(evento) => onActualizar(asignacion.clave, { ubicacionId: evento.target.value })}><option value="">Selecciona una ubicación</option>{ubicaciones.filter((ubicacion) => ubicacion.id === asignacion.ubicacionId || !lineas.some((linea) => linea.ubicacionId === ubicacion.id)).map((ubicacion) => <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.codigo} — {ubicacion.nombre} ({ubicacion.tipo.toLowerCase()})</option>)}</select></div>
      <div className={styles.campo}><label htmlFor={`cantidad-${detalle.id}-${asignacion.clave}`}>Cantidad</label><input id={`cantidad-${detalle.id}-${asignacion.clave}`} type="number" min="0.000001" step="0.000001" value={asignacion.cantidad} onChange={(evento) => onActualizar(asignacion.clave, { cantidad: evento.target.value })} /></div>
      <button className={styles.botonQuitarLinea} type="button" aria-label={`Quitar asignación ${indice + 1} de ${detalle.producto?.nombre ?? 'producto'}`} disabled={lineas.length === 1} onClick={() => onQuitar(asignacion.clave)}>×</button>
    </div>)}
    {error && <small className={styles.errorCampo}>{error}</small>}
    <button className={`${styles.botonSecundario} ${styles.botonAgregarLinea}`} type="button" onClick={onAgregar}><IconoAccion nombre="agregar" />Dividir en otra ubicación</button>
  </article>
}
