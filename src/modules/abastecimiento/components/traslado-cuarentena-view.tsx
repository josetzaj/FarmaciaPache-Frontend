import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { ejecutarAccionAbastecimiento, listarUbicacionesAbastecimiento, obtenerRegistroAbastecimiento } from '../abastecimiento-api'
import type { DetalleProductoAbastecimiento, EvaluarCuarentenaTrasladoInternoRequest, TrasladoInterno, UbicacionAbastecimiento } from '../abastecimiento.types'
import { AbastecimientoBreadcrumb } from './abastecimiento-breadcrumb'
import styles from './abastecimiento.module.css'

const numero = (valor: unknown) => Number(valor ?? 0)

export function TrasladoCuarentenaView({ trasladoId, onNavegar, onCambiosPendientes }: { trasladoId: string; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }) {
  const [traslado, setTraslado] = useState<TrasladoInterno | null>(null)
  const [ubicaciones, setUbicaciones] = useState<UbicacionAbastecimiento[]>([])
  const [liberadas, setLiberadas] = useState<Record<string, string>>({})
  const [restringidas, setRestringidas] = useState<Record<string, string>>({})
  const [destinos, setDestinos] = useState<Record<string, string>>({})
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<TrasladoInterno | null>(null)
  const [pendiente, setPendiente] = useState<EvaluarCuarentenaTrasladoInternoRequest | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRegistroAbastecimiento<TrasladoInterno>('traslados', trasladoId, controlador.signal).then(async (registro) => {
      setTraslado(registro)
      const pendientes = registro.detalles.filter((detalle) => numero(detalle.cantidadUltimaRechazada) > 0)
      setLiberadas(Object.fromEntries(pendientes.map((detalle) => [detalle.id, '0'])))
      setRestringidas(Object.fromEntries(pendientes.map((detalle) => [detalle.id, String(numero(detalle.cantidadUltimaRechazada))])))
      const catalogo = await listarUbicacionesAbastecimiento(registro.sucursalDestinoId, controlador.signal)
      setUbicaciones(catalogo.filter((ubicacion) => ubicacion.activa !== false && !ubicacion.bloqueada && ['BODEGA', 'VENTA'].includes(ubicacion.tipo)))
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la evaluación de cuarentena.')
    })
    return () => controlador.abort()
  }, [trasladoId])

  const pendientes = useMemo(() => traslado?.detalles.filter((detalle) => numero(detalle.cantidadUltimaRechazada) > 0) ?? [], [traslado])
  const tieneCambios = Boolean(motivo || Object.values(liberadas).some((valor) => numero(valor) > 0) || Object.values(destinos).some(Boolean))
  useEffect(() => onCambiosPendientes(!guardado && tieneCambios), [guardado, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const ejecutar = async (datos: EvaluarCuarentenaTrasladoInternoRequest) => {
    if (!traslado) return
    setGuardando(true)
    setError(null)
    try {
      setGuardado(await ejecutarAccionAbastecimiento<TrasladoInterno>('traslados', traslado.id, 'evaluacion-cuarentena', datos))
      setPendiente(null)
      onCambiosPendientes(false)
    } catch (errorActual) {
      setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la evaluación de cuarentena.')
      setPendiente(null)
    } finally {
      setGuardando(false)
    }
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!traslado) return
    const siguientes: Record<string, string> = {}
    if (motivo.trim().length < 5) siguientes.motivo = 'El motivo debe contener al menos 5 caracteres.'
    pendientes.forEach((detalle) => {
      const liberada = numero(liberadas[detalle.id])
      const restringida = numero(restringidas[detalle.id])
      const total = numero(detalle.cantidadUltimaRechazada)
      if (liberada < 0 || restringida < 0 || Math.abs(liberada + restringida - total) > 0.000001) siguientes[detalle.id] = `La decisión debe sumar exactamente ${total}.`
      if (liberada > 0 && !destinos[detalle.id]) siguientes[detalle.id] = 'Selecciona la ubicación final para la cantidad liberada.'
    })
    setErrores(siguientes)
    if (Object.keys(siguientes).length) return
    setPendiente({
      version: traslado.version,
      motivo: motivo.trim(),
      detalles: pendientes.map((detalle) => ({ detalleId: detalle.id, cantidadLiberada: numero(liberadas[detalle.id]), cantidadRestringida: numero(restringidas[detalle.id]), ubicacionDisponibleId: destinos[detalle.id] || null })),
    })
  }

  if (error && !traslado) return <section className={styles.pagina}><div className={styles.alertaError} role="alert">{error}</div></section>
  if (!traslado) return <section className={styles.pagina} aria-busy="true"><div className={styles.estadoVacio}><h1>Cargando cuarentena</h1></div></section>
  const disponible = traslado.tipo === 'DEVOLUCION_INTERNA' && traslado.estado === 'RETORNO_CUARENTENA' && pendientes.length > 0
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-evaluacion-cuarentena">
      <AbastecimientoBreadcrumb recurso="devoluciones-internas" actual="Evaluar cuarentena" onNavegar={onNavegar} />
      <header className={styles.encabezadoPagina}><div><p className={styles.sobretitulo}>Devolución interna {traslado.numero}</p><h1 id="titulo-evaluacion-cuarentena">Evaluar productos en cuarentena</h1><p>Libera únicamente las cantidades aptas. Las cantidades restringidas quedarán bloqueadas en el área de recepción de Bodega.</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      {!disponible && <div className={styles.alertaAdvertencia} role="alert">Esta devolución interna ya no tiene productos pendientes de evaluación.</div>}
      <form className={styles.formulario} noValidate onSubmit={enviar}>
        <fieldset disabled={guardando || !disponible}><legend>Resultado técnico</legend><div className={styles.lineasProductos}>{pendientes.map((detalle) => <ProductoCuarentena key={detalle.id} detalle={detalle} ubicaciones={ubicaciones} liberada={liberadas[detalle.id] ?? '0'} restringida={restringidas[detalle.id] ?? '0'} destinoId={destinos[detalle.id] ?? ''} error={errores[detalle.id]} onLiberada={(valor) => { const total = numero(detalle.cantidadUltimaRechazada); const cantidad = Math.max(0, numero(valor)); setLiberadas((actuales) => ({ ...actuales, [detalle.id]: valor })); setRestringidas((actuales) => ({ ...actuales, [detalle.id]: String(Math.max(0, total - cantidad)) })) }} onRestringida={(valor) => setRestringidas((actuales) => ({ ...actuales, [detalle.id]: valor }))} onDestino={(valor) => setDestinos((actuales) => ({ ...actuales, [detalle.id]: valor }))} />)}</div></fieldset>
        <fieldset disabled={guardando || !disponible}><legend>Conclusión</legend><div className={styles.campo}><label htmlFor="motivo-evaluacion-cuarentena">Motivo técnico <span>*</span></label><textarea id="motivo-evaluacion-cuarentena" rows={4} maxLength={500} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <small className={styles.errorCampo}>{errores.motivo}</small>}</div></fieldset>
        <div className={styles.accionesFormulario}><p>Esta acción modificará el inventario: liberará cantidades aptas y bloqueará las restringidas.</p><div><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(`/abastecimiento/devoluciones-internas/${traslado.id}`)}><IconoAccion nombre="cancelar" />Volver</button><button className={styles.botonPrimario} type="submit" disabled={guardando || !disponible}><IconoAccion nombre="guardar" />{guardando ? 'Evaluando…' : 'Confirmar evaluación'}</button></div></div>
      </form>
    </section>
    <ModalEstado abierto={Boolean(pendiente)} tipo="advertencia" titulo="Confirmar acción de inventario" mensaje="Esta acción modificará el inventario: las cantidades aptas pasarán de cuarentena a disponible y las restringidas quedarán bloqueadas." textoAccionPrincipal="Confirmar" onAccionPrincipal={() => { if (pendiente) void ejecutar(pendiente) }} textoAccionSecundaria="Volver" onAccionSecundaria={() => setPendiente(null)} onCerrar={() => setPendiente(null)} cargando={guardando} />
    <ModalEstado abierto={Boolean(guardado)} tipo="exito" titulo="Cuarentena evaluada" mensaje={guardado ? `La devolución interna ${guardado.numero} quedó lista para continuar o cerrar.` : ''} textoAccionPrincipal="Ver devolución" onAccionPrincipal={() => onNavegar(`/abastecimiento/devoluciones-internas/${trasladoId}`)} onCerrar={() => onNavegar(`/abastecimiento/devoluciones-internas/${trasladoId}`)} />
  </>
}

function ProductoCuarentena({ detalle, ubicaciones, liberada, restringida, destinoId, error, onLiberada, onRestringida, onDestino }: { detalle: DetalleProductoAbastecimiento; ubicaciones: UbicacionAbastecimiento[]; liberada: string; restringida: string; destinoId: string; error?: string; onLiberada: (valor: string) => void; onRestringida: (valor: string) => void; onDestino: (valor: string) => void }) {
  return <article className={styles.tarjetaDetalle}><div className={styles.tituloSeccion}><div><h2>{detalle.producto?.nombre ?? detalle.productoId}</h2><p>{detalle.producto?.codigo ?? ''} · lote {detalle.lote?.numeroLote ?? 'sin lote'}</p></div><span>En cuarentena: {numero(detalle.cantidadUltimaRechazada)}</span></div><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor={`liberada-${detalle.id}`}>Cantidad liberada</label><input id={`liberada-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadUltimaRechazada)} step="0.000001" value={liberada} onChange={(evento) => onLiberada(evento.target.value)} /></div><div className={styles.campo}><label htmlFor={`restringida-${detalle.id}`}>Cantidad restringida</label><input id={`restringida-${detalle.id}`} type="number" min="0" max={numero(detalle.cantidadUltimaRechazada)} step="0.000001" value={restringida} onChange={(evento) => onRestringida(evento.target.value)} /></div><div className={styles.campo}><label htmlFor={`destino-${detalle.id}`}>Ubicación de la cantidad liberada</label><select id={`destino-${detalle.id}`} value={destinoId} disabled={numero(liberada) <= 0} onChange={(evento) => onDestino(evento.target.value)}><option value="">Selecciona una ubicación</option>{ubicaciones.map((ubicacion) => <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.codigo} — {ubicacion.nombre}</option>)}</select></div></div>{error && <small className={styles.errorCampo}>{error}</small>}</article>
}
