import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { registrarAjusteInventario } from '../inventario-api'
import type {
  EstadoExistenciaInventario,
  ExistenciaProducto,
  OperacionInventario,
  PosicionInventario,
  RegistrarAjusteInventarioRequest,
} from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

const estados: Array<{ valor: EstadoExistenciaInventario; etiqueta: string }> = [
  { valor: 'DISPONIBLE', etiqueta: 'Disponible' }, { valor: 'RESERVADO', etiqueta: 'Reservado' },
  { valor: 'COMPROMETIDO', etiqueta: 'Comprometido' }, { valor: 'EN_TRANSITO', etiqueta: 'En tránsito' },
  { valor: 'BLOQUEADO', etiqueta: 'Bloqueado' }, { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'VENCIDO', etiqueta: 'Vencido' }, { valor: 'DESTRUIDO', etiqueta: 'Destruido' },
]

function numeroValido(valor: string): boolean {
  if (!/^\d+(?:\.\d{1,6})?$/.test(valor.trim())) return false
  const numero = Number(valor)
  return numero > 0 && numero <= 999_999_999_999
}

function clavePosicion(posicion: PosicionInventario): string {
  return `${posicion.ubicacion.id}|${posicion.lote?.id ?? 'SIN_LOTE'}|${posicion.estado}`
}

function etiquetaEstado(estado: EstadoExistenciaInventario): string {
  return estados.find((item) => item.valor === estado)?.etiqueta ?? estado
}

export function InventarioAjusteView({
  permisos,
  onNavegar,
  onCambiosPendientes,
}: {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (hayCambios: boolean) => void
}) {
  const [tipo, setTipo] = useState<'POSITIVO' | 'NEGATIVO'>('POSITIVO')
  const [referencia, setReferencia] = useState('')
  const [producto, setProducto] = useState<ExistenciaProducto | null>(null)
  const [loteClave, setLoteClave] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [posicionClave, setPosicionClave] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [operacion, setOperacion] = useState<OperacionInventario | null>(null)
  const [mostrarExito, setMostrarExito] = useState(false)
  const puedeVerAuditoria = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA') && permisos.includes('INVENTARIO.KARDEX.VER')

  const hayCambios = Boolean(tipo !== 'POSITIVO' || referencia || producto || loteClave || ubicacionId || posicionClave || cantidad || motivo || evidencia)
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  const posiciones = useMemo(() => (producto?.posiciones ?? []).filter((item) => item.cantidad > 0), [producto])
  const posicionSeleccionada = posiciones.find((item) => clavePosicion(item) === posicionClave) ?? null
  const lotesDisponibles = useMemo(() => {
    const porClave = new Map<string, PosicionInventario['lote']>()
    for (const posicion of posiciones) porClave.set(posicion.lote?.id ?? 'SIN_LOTE', posicion.lote)
    return [...porClave.entries()].map(([clave, lote]) => ({ clave, lote }))
  }, [posiciones])
  const ubicacionesDisponibles = useMemo(() => {
    const porId = new Map<string, PosicionInventario['ubicacion']>()
    for (const posicion of posiciones) {
      if ((posicion.lote?.id ?? 'SIN_LOTE') === loteClave) porId.set(posicion.ubicacion.id, posicion.ubicacion)
    }
    return [...porId.values()]
  }, [loteClave, posiciones])
  const posicionesDisponibles = useMemo(() => posiciones.filter((posicion) =>
    (posicion.lote?.id ?? 'SIN_LOTE') === loteClave && posicion.ubicacion.id === ubicacionId,
  ), [loteClave, posiciones, ubicacionId])
  const cantidadExistente = posicionSeleccionada?.cantidad ?? null

  const cambiarLote = (siguiente: string) => {
    setLoteClave(siguiente)
    setUbicacionId('')
    setPosicionClave('')
    setCantidad('')
    setErrores({})
  }

  const cambiarUbicacion = (siguiente: string) => {
    setUbicacionId(siguiente)
    setPosicionClave('')
    setCantidad('')
    setErrores({})
  }

  const cambiarTipo = (siguiente: 'POSITIVO' | 'NEGATIVO') => {
    setTipo(siguiente); setProducto(null); setLoteClave(''); setUbicacionId(''); setPosicionClave(''); setCantidad(''); setErrores({})
  }

  const cambiarProducto = (seleccion: ExistenciaProducto | null) => {
    setProducto(seleccion); setLoteClave(''); setUbicacionId(''); setPosicionClave(''); setCantidad(''); setErrores({})
  }

  const validar = (): boolean => {
    const siguientes: Record<string, string> = {}
    if (referencia.trim().length < 3) siguientes.referencia = 'Escribe una referencia de al menos 3 caracteres.'
    if (referencia.trim().length > 100) siguientes.referencia = 'La referencia no puede superar 100 caracteres.'
    if (!producto) siguientes.producto = 'Selecciona un medicamento.'
    if (producto && !loteClave) siguientes.lote = 'Selecciona el lote registrado que será ajustado.'
    if (producto && loteClave && !ubicacionId) siguientes.ubicacion = 'Selecciona una ubicación que tenga existencia de este lote.'
    if (producto && loteClave && ubicacionId && !posicionSeleccionada) siguientes.posicion = `Selecciona la existencia exacta que será ${tipo === 'POSITIVO' ? 'aumentada' : 'disminuida'}.`
    if (!numeroValido(cantidad)) siguientes.cantidad = 'Ingresa una cantidad mayor que cero, con máximo seis decimales.'
    if (motivo.trim().length < 10) siguientes.motivo = 'Describe el motivo en al menos 10 caracteres.'
    if (motivo.trim().length > 500) siguientes.motivo = 'El motivo no puede superar 500 caracteres.'
    if (evidencia.trim().length < 3) siguientes.evidencia = 'Indica el documento, acta o evidencia de respaldo.'
    if (evidencia.trim().length > 500) siguientes.evidencia = 'La evidencia no puede superar 500 caracteres.'
    if (tipo === 'NEGATIVO' && posicionSeleccionada && Number(cantidad) > posicionSeleccionada.cantidad) siguientes.cantidad = `La cantidad no puede superar la existencia actual (${posicionSeleccionada.cantidad}).`
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) window.requestAnimationFrame(() => document.getElementById(`ajuste-${primero}`)?.focus())
    return !primero
  }

  const solicitud: RegistrarAjusteInventarioRequest | null = producto && posicionSeleccionada
    ? {
      referencia: referencia.trim().toUpperCase(),
      tipo,
      productoId: producto.producto.id,
      ubicacionId: posicionSeleccionada.ubicacion.id,
      estado: posicionSeleccionada.estado,
      cantidad: Number(cantidad),
      loteId: posicionSeleccionada.lote?.id ?? null,
      lote: null,
      motivo: motivo.trim(),
      evidenciaReferencia: evidencia.trim(),
    }
    : null

  const registrar = async () => {
    if (!solicitud) return
    setGuardando(true)
    try {
      const registrado = await registrarAjusteInventario(solicitud)
      setOperacion(registrado); setConfirmando(false); setMostrarExito(true)
      setTipo('POSITIVO'); setReferencia(''); setProducto(null); setLoteClave(''); setUbicacionId(''); setPosicionClave(''); setCantidad(''); setMotivo(''); setEvidencia(''); setErrores({})
      onCambiosPendientes(false)
    } catch (errorActual) {
      setConfirmando(false)
      setErrorGuardado(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar el ajuste de inventario.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-ajuste-inventario">
      <header className={styles.cabecera}><InventarioBreadcrumb anterior={{ etiqueta: 'Ajustes de cantidad', ruta: '/inventario/ajustes' }} actual="Nuevo ajuste de cantidad" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-ajuste-inventario">Nuevo ajuste de cantidad</h1></div></header>
      <form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); if (validar()) setConfirmando(true) }} noValidate>
        <fieldset><legend>Tipo y documento de respaldo</legend><div className={styles.grillaFormulario}>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><span className={styles.etiquetaCampo}>Tipo de ajuste *</span><div className={styles.opcionesTipo}><label><input type="radio" name="tipo-ajuste" checked={tipo === 'POSITIVO'} onChange={() => cambiarTipo('POSITIVO')} />Positivo: aumentar existencia</label><label><input type="radio" name="tipo-ajuste" checked={tipo === 'NEGATIVO'} onChange={() => cambiarTipo('NEGATIVO')} />Negativo: disminuir existencia</label></div></div>
          <div className={styles.campo}><label htmlFor="ajuste-referencia">Referencia *</label><input id="ajuste-referencia" value={referencia} maxLength={100} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setReferencia(evento.target.value.toUpperCase())} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div>
          <div className={styles.campo}><label htmlFor="ajuste-producto">Medicamento *</label><SelectorProductoInventario id="ajuste-producto" valor={producto} soloConExistencia invalido={Boolean(errores.producto)} onChange={cambiarProducto} />{errores.producto && <span className={styles.campoError}>{errores.producto}</span>}</div>
        </div></fieldset>
        <fieldset><legend>Movimiento de inventario</legend><div className={styles.grillaFormulario}>
          <div className={styles.campo}><label htmlFor="ajuste-lote">Lote *</label><select id="ajuste-lote" value={loteClave} disabled={!producto} aria-invalid={Boolean(errores.lote)} onChange={(evento) => cambiarLote(evento.target.value)}><option value="">Selecciona un lote registrado</option>{lotesDisponibles.map(({ clave, lote }) => <option key={clave} value={clave}>{lote ? `${lote.numero}${lote.fechaVencimiento ? ` · vence ${lote.fechaVencimiento.slice(0, 10)}` : ''}` : 'Sin lote'}</option>)}</select>{errores.lote && <span className={styles.campoError}>{errores.lote}</span>}{producto && !posiciones.length && <small>No hay existencias registradas para este medicamento.</small>}</div>
          <div className={styles.campo}><label htmlFor="ajuste-ubicacion">Ubicación *</label><select id="ajuste-ubicacion" value={ubicacionId} disabled={!loteClave} aria-invalid={Boolean(errores.ubicacion)} onChange={(evento) => cambiarUbicacion(evento.target.value)}><option value="">Selecciona una ubicación del lote</option>{ubicacionesDisponibles.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select>{errores.ubicacion && <span className={styles.campoError}>{errores.ubicacion}</span>}</div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-posicion">Existencia que será {tipo === 'POSITIVO' ? 'aumentada' : 'disminuida'} *</label><select id="ajuste-posicion" value={posicionClave} disabled={!ubicacionId} aria-invalid={Boolean(errores.posicion)} onChange={(evento) => { setPosicionClave(evento.target.value); setCantidad(''); setErrores({}) }}><option value="">Selecciona el estado de la existencia</option>{posicionesDisponibles.map((item) => <option key={clavePosicion(item)} value={clavePosicion(item)}>{etiquetaEstado(item.estado)} · cantidad actual: {item.cantidad}</option>)}</select>{errores.posicion && <span className={styles.campoError}>{errores.posicion}</span>}</div>
          <div className={styles.campo}><label htmlFor="ajuste-cantidad">Cantidad *</label><input id="ajuste-cantidad" type="number" min="0.000001" step="0.000001" max={tipo === 'NEGATIVO' ? posicionSeleccionada?.cantidad : undefined} value={cantidad} aria-invalid={Boolean(errores.cantidad)} onChange={(evento) => setCantidad(evento.target.value)} />{errores.cantidad && <span className={styles.campoError}>{errores.cantidad}</span>}</div>
          <div className={`${styles.campo} ${styles.campoSoloLectura}`}><label htmlFor="ajuste-cantidad-existente">Cantidad existente</label><input id="ajuste-cantidad-existente" value={cantidadExistente === null ? '' : cantidadExistente.toLocaleString('es-GT', { maximumFractionDigits: 6 })} placeholder="Selecciona la posición" readOnly aria-readonly="true" /></div>
        </div></fieldset>
        <fieldset><legend>Justificación</legend><div className={styles.grillaFormulario}><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-motivo">Motivo *</label><textarea id="ajuste-motivo" value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}<small>{motivo.length}/500 caracteres</small></div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-evidencia">Evidencia de respaldo *</label><input id="ajuste-evidencia" value={evidencia} maxLength={500} placeholder="Acta, documento, expediente o enlace interno" aria-invalid={Boolean(errores.evidencia)} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <span className={styles.campoError}>{errores.evidencia}</span>}</div></div></fieldset>
        <div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/ajustes')}>Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />Revisar y registrar</button></div>
      </form>
      {operacion && puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={operacion.id} titulo={`Ajuste ${operacion.referencia} confirmado.`} revision={0} />}
      <ModalEstado abierto={confirmando} tipo="advertencia" titulo={`Confirmar ajuste ${tipo === 'POSITIVO' ? 'positivo' : 'negativo'}`} mensaje={`Esta acción modificará el inventario. Se ${tipo === 'POSITIVO' ? 'aumentará' : 'disminuirá'} la existencia en ${cantidad || '0'} unidades con la referencia ${referencia.trim().toUpperCase()}. El movimiento quedará confirmado y auditado.`} textoAccionPrincipal={guardando ? 'Registrando…' : 'Confirmar ajuste'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void registrar()} textoAccionSecundaria="Seguir revisando" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={guardando} />
      <ModalEstado abierto={mostrarExito} tipo="exito" titulo="Ajuste registrado" mensaje={operacion ? `El ajuste ${operacion.referencia} fue confirmado. Saldo anterior: ${operacion.movimientos[0]?.saldoAnterior ?? 0}. Saldo posterior: ${operacion.movimientos[0]?.saldoPosterior ?? 0}.` : ''} textoAccionPrincipal="Ver ajustes" onAccionPrincipal={() => { setMostrarExito(false); onNavegar('/inventario/ajustes') }} textoAccionSecundaria="Ver existencias" onAccionSecundaria={() => { setMostrarExito(false); onNavegar('/inventario/existencias') }} onCerrar={() => setMostrarExito(false)} />
      <ModalEstado abierto={Boolean(errorGuardado)} tipo="error" titulo="No se pudo registrar el ajuste" mensaje={errorGuardado ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorGuardado(null)} onCerrar={() => setErrorGuardado(null)} />
    </section>
  )
}
