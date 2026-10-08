import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarUbicacionesInventario, registrarAjusteInventario } from '../inventario-api'
import type {
  EstadoExistenciaInventario,
  ExistenciaProducto,
  OperacionInventario,
  PosicionInventario,
  RegistrarAjusteInventarioRequest,
  UbicacionInventario,
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
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [ubicacionId, setUbicacionId] = useState('')
  const [estado, setEstado] = useState<EstadoExistenciaInventario>('DISPONIBLE')
  const [posicionClave, setPosicionClave] = useState('')
  const [loteExistenteId, setLoteExistenteId] = useState('NUEVO')
  const [numeroLote, setNumeroLote] = useState('')
  const [fechaFabricacion, setFechaFabricacion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [costoUnitario, setCostoUnitario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [operacion, setOperacion] = useState<OperacionInventario | null>(null)
  const [mostrarExito, setMostrarExito] = useState(false)
  const [revision, setRevision] = useState(0)
  const puedeVerAuditoria = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA') && permisos.includes('INVENTARIO.KARDEX.VER')

  const hayCambios = Boolean(tipo !== 'POSITIVO' || referencia || producto || ubicacionId || estado !== 'DISPONIBLE' || posicionClave || loteExistenteId !== 'NUEVO' || cantidad || costoUnitario || motivo || evidencia || numeroLote || fechaFabricacion || fechaVencimiento)
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(false, controlador.signal)
      .then((items) => { setUbicaciones(items); setErrorCarga(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las ubicaciones activas.')
      })
    return () => controlador.abort()
  }, [revision])

  const posiciones = useMemo(() => (producto?.posiciones ?? []).filter((item) => item.cantidad > 0), [producto])
  const posicionSeleccionada = posiciones.find((item) => clavePosicion(item) === posicionClave) ?? null
  const lotesExistentes = useMemo(() => {
    const porId = new Map<string, NonNullable<PosicionInventario['lote']>>()
    for (const posicion of producto?.posiciones ?? []) if (posicion.lote) porId.set(posicion.lote.id, posicion.lote)
    return [...porId.values()]
  }, [producto])

  const cambiarTipo = (siguiente: 'POSITIVO' | 'NEGATIVO') => {
    setTipo(siguiente); setProducto(null); setUbicacionId(''); setPosicionClave(''); setLoteExistenteId('NUEVO')
    setNumeroLote(''); setFechaFabricacion(''); setFechaVencimiento(''); setCantidad(''); setCostoUnitario(''); setErrores({})
  }

  const cambiarProducto = (seleccion: ExistenciaProducto | null) => {
    setProducto(seleccion); setUbicacionId(''); setPosicionClave(''); setLoteExistenteId('NUEVO')
    setNumeroLote(''); setFechaFabricacion(''); setFechaVencimiento(''); setCantidad(''); setErrores({})
  }

  const validar = (): boolean => {
    const siguientes: Record<string, string> = {}
    if (referencia.trim().length < 3) siguientes.referencia = 'Escribe una referencia de al menos 3 caracteres.'
    if (referencia.trim().length > 100) siguientes.referencia = 'La referencia no puede superar 100 caracteres.'
    if (!producto) siguientes.producto = 'Selecciona un medicamento.'
    if (!numeroValido(cantidad)) siguientes.cantidad = 'Ingresa una cantidad mayor que cero, con máximo seis decimales.'
    if (costoUnitario && !numeroValido(costoUnitario)) siguientes.costo = 'El costo debe ser mayor que cero o quedar vacío.'
    if (motivo.trim().length < 10) siguientes.motivo = 'Describe el motivo en al menos 10 caracteres.'
    if (motivo.trim().length > 500) siguientes.motivo = 'El motivo no puede superar 500 caracteres.'
    if (evidencia.trim().length < 3) siguientes.evidencia = 'Indica el documento, acta o evidencia de respaldo.'
    if (evidencia.trim().length > 500) siguientes.evidencia = 'La evidencia no puede superar 500 caracteres.'
    if (tipo === 'NEGATIVO') {
      if (!posicionSeleccionada) siguientes.posicion = 'Selecciona la existencia exacta que será disminuida.'
      else if (Number(cantidad) > posicionSeleccionada.cantidad) siguientes.cantidad = `La cantidad no puede superar la existencia actual (${posicionSeleccionada.cantidad}).`
    } else {
      if (!ubicacionId) siguientes.ubicacion = 'Selecciona una ubicación.'
      if (producto?.producto.controlaLote && loteExistenteId === 'NUEVO') {
        if (!numeroLote.trim()) siguientes.lote = 'Este medicamento requiere número de lote.'
        if (numeroLote.trim().length > 80) siguientes.lote = 'El lote no puede superar 80 caracteres.'
        if (producto.producto.requiereVencimiento && !fechaVencimiento) siguientes.vencimiento = 'Este medicamento requiere fecha de vencimiento.'
        if (fechaFabricacion && fechaVencimiento && fechaVencimiento < fechaFabricacion) siguientes.vencimiento = 'El vencimiento no puede ser anterior a la fabricación.'
      }
    }
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) window.requestAnimationFrame(() => document.getElementById(`ajuste-${primero}`)?.focus())
    return !primero
  }

  const solicitud = useMemo<RegistrarAjusteInventarioRequest | null>(() => {
    if (!producto) return null
    const posicion = tipo === 'NEGATIVO' ? posicionSeleccionada : null
    const loteNuevo = tipo === 'POSITIVO' && producto.producto.controlaLote && loteExistenteId === 'NUEVO'
    return {
      referencia: referencia.trim().toUpperCase(),
      tipo,
      productoId: producto.producto.id,
      ubicacionId: posicion?.ubicacion.id ?? ubicacionId,
      estado: posicion?.estado ?? estado,
      cantidad: Number(cantidad),
      loteId: posicion?.lote?.id ?? (tipo === 'POSITIVO' && loteExistenteId !== 'NUEVO' ? loteExistenteId : null),
      lote: loteNuevo ? { numeroLote: numeroLote.trim().toUpperCase(), fechaFabricacion: fechaFabricacion || null, fechaVencimiento: fechaVencimiento || null, proveedorOrigenId: null } : null,
      costoUnitario: costoUnitario ? Number(costoUnitario) : null,
      motivo: motivo.trim(),
      evidenciaReferencia: evidencia.trim(),
    }
  }, [cantidad, costoUnitario, estado, evidencia, fechaFabricacion, fechaVencimiento, loteExistenteId, motivo, numeroLote, posicionSeleccionada, producto, referencia, tipo, ubicacionId])

  const registrar = async () => {
    if (!solicitud) return
    setGuardando(true)
    try {
      const registrado = await registrarAjusteInventario(solicitud)
      setOperacion(registrado); setConfirmando(false); setMostrarExito(true)
      setTipo('POSITIVO'); setReferencia(''); setProducto(null); setUbicacionId(''); setEstado('DISPONIBLE'); setPosicionClave(''); setLoteExistenteId('NUEVO'); setNumeroLote(''); setFechaFabricacion(''); setFechaVencimiento(''); setCantidad(''); setCostoUnitario(''); setMotivo(''); setEvidencia(''); setErrores({})
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
      <header className={styles.cabecera}><InventarioBreadcrumb anterior={{ etiqueta: 'Ajustes de inventario', ruta: '/inventario/ajustes' }} actual="Nuevo ajuste" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-ajuste-inventario">Nuevo ajuste de inventario</h1></div></header>
      <div className={styles.alertaAdvertencia} role="note"><p>Los ajustes corrigen diferencias justificadas. No deben utilizarse para registrar compras, ventas o traslados.</p></div>
      {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); if (validar()) setConfirmando(true) }} noValidate>
        <fieldset><legend>Tipo y documento de respaldo</legend><div className={styles.grillaFormulario}>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><span className={styles.etiquetaCampo}>Tipo de ajuste *</span><div className={styles.opcionesTipo}><label><input type="radio" name="tipo-ajuste" checked={tipo === 'POSITIVO'} onChange={() => cambiarTipo('POSITIVO')} />Positivo: aumentar existencia</label><label><input type="radio" name="tipo-ajuste" checked={tipo === 'NEGATIVO'} onChange={() => cambiarTipo('NEGATIVO')} />Negativo: disminuir existencia</label></div></div>
          <div className={styles.campo}><label htmlFor="ajuste-referencia">Referencia *</label><input id="ajuste-referencia" value={referencia} maxLength={100} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setReferencia(evento.target.value.toUpperCase())} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div>
          <div className={styles.campo}><label htmlFor="ajuste-producto">Medicamento *</label><SelectorProductoInventario id="ajuste-producto" valor={producto} soloConExistencia={tipo === 'NEGATIVO'} invalido={Boolean(errores.producto)} onChange={cambiarProducto} />{errores.producto && <span className={styles.campoError}>{errores.producto}</span>}</div>
        </div></fieldset>
        <fieldset><legend>Movimiento de inventario</legend><div className={styles.grillaFormulario}>
          {tipo === 'NEGATIVO' ? <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-posicion">Existencia que será disminuida *</label><select id="ajuste-posicion" value={posicionClave} disabled={!producto} aria-invalid={Boolean(errores.posicion)} onChange={(evento) => setPosicionClave(evento.target.value)}><option value="">Selecciona ubicación, lote y estado</option>{posiciones.map((item) => <option key={clavePosicion(item)} value={clavePosicion(item)}>{item.ubicacion.nombre} · {item.lote?.numero ?? 'Sin lote'} · {etiquetaEstado(item.estado)} · Disponible en posición: {item.cantidad}</option>)}</select>{errores.posicion && <span className={styles.campoError}>{errores.posicion}</span>}{producto && !posiciones.length && <small>No hay posiciones con existencia para este medicamento.</small>}</div> : <><div className={styles.campo}><label htmlFor="ajuste-ubicacion">Ubicación *</label><select id="ajuste-ubicacion" value={ubicacionId} aria-invalid={Boolean(errores.ubicacion)} onChange={(evento) => setUbicacionId(evento.target.value)}><option value="">Selecciona</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select>{errores.ubicacion && <span className={styles.campoError}>{errores.ubicacion}</span>}</div><div className={styles.campo}><label htmlFor="ajuste-estado">Estado *</label><select id="ajuste-estado" value={estado} onChange={(evento) => setEstado(evento.target.value as EstadoExistenciaInventario)}>{estados.map((item) => <option key={item.valor} value={item.valor}>{item.etiqueta}</option>)}</select></div></>}
          <div className={styles.campo}><label htmlFor="ajuste-cantidad">Cantidad *</label><input id="ajuste-cantidad" type="number" min="0.000001" step="0.000001" max={posicionSeleccionada?.cantidad} value={cantidad} aria-invalid={Boolean(errores.cantidad)} onChange={(evento) => setCantidad(evento.target.value)} />{errores.cantidad && <span className={styles.campoError}>{errores.cantidad}</span>}</div>
          <div className={styles.campo}><label htmlFor="ajuste-costo">Costo unitario</label><input id="ajuste-costo" type="number" min="0.000001" step="0.000001" value={costoUnitario} aria-invalid={Boolean(errores.costo)} onChange={(evento) => setCostoUnitario(evento.target.value)} />{errores.costo && <span className={styles.campoError}>{errores.costo}</span>}</div>
          {tipo === 'POSITIVO' && producto?.producto.controlaLote && <><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-lote-existente">Lote *</label><select id="ajuste-lote-existente" value={loteExistenteId} onChange={(evento) => setLoteExistenteId(evento.target.value)}><option value="NUEVO">Registrar o identificar lote por número</option>{lotesExistentes.map((lote) => <option key={lote.id} value={lote.id}>{lote.numero}{lote.fechaVencimiento ? ` · vence ${lote.fechaVencimiento.slice(0, 10)}` : ''}</option>)}</select></div>{loteExistenteId === 'NUEVO' && <><div className={styles.campo}><label htmlFor="ajuste-lote">Número de lote *</label><input id="ajuste-lote" value={numeroLote} maxLength={80} aria-invalid={Boolean(errores.lote)} onChange={(evento) => setNumeroLote(evento.target.value.toUpperCase())} />{errores.lote && <span className={styles.campoError}>{errores.lote}</span>}</div><div className={styles.campo}><label htmlFor="ajuste-fabricacion">Fabricación</label><input id="ajuste-fabricacion" type="date" value={fechaFabricacion} max={fechaVencimiento || undefined} onChange={(evento) => setFechaFabricacion(evento.target.value)} /></div><div className={styles.campo}><label htmlFor="ajuste-vencimiento">Vencimiento {producto.producto.requiereVencimiento ? '*' : ''}</label><input id="ajuste-vencimiento" type="date" value={fechaVencimiento} min={fechaFabricacion || undefined} aria-invalid={Boolean(errores.vencimiento)} onChange={(evento) => setFechaVencimiento(evento.target.value)} />{errores.vencimiento && <span className={styles.campoError}>{errores.vencimiento}</span>}</div></>}</>}
        </div></fieldset>
        <fieldset><legend>Justificación</legend><div className={styles.grillaFormulario}><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-motivo">Motivo *</label><textarea id="ajuste-motivo" value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}<small>{motivo.length}/500 caracteres</small></div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ajuste-evidencia">Evidencia de respaldo *</label><input id="ajuste-evidencia" value={evidencia} maxLength={500} placeholder="Acta, documento, expediente o enlace interno" aria-invalid={Boolean(errores.evidencia)} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <span className={styles.campoError}>{errores.evidencia}</span>}</div></div></fieldset>
        <div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/ajustes')}>Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga)}><IconoAccion nombre="guardar" />Revisar y registrar</button></div>
      </form>
      {operacion && puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={operacion.id} titulo={`Ajuste ${operacion.referencia} confirmado.`} revision={revision} />}
      <ModalEstado abierto={confirmando} tipo="advertencia" titulo={`Confirmar ajuste ${tipo === 'POSITIVO' ? 'positivo' : 'negativo'}`} mensaje={`Se ${tipo === 'POSITIVO' ? 'aumentará' : 'disminuirá'} la existencia en ${cantidad || '0'} unidades con la referencia ${referencia.trim().toUpperCase()}. El movimiento quedará confirmado y auditado.`} textoAccionPrincipal={guardando ? 'Registrando…' : 'Confirmar ajuste'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void registrar()} textoAccionSecundaria="Seguir revisando" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={guardando} />
      <ModalEstado abierto={mostrarExito} tipo="exito" titulo="Ajuste registrado" mensaje={operacion ? `El ajuste ${operacion.referencia} fue confirmado. Saldo anterior: ${operacion.movimientos[0]?.saldoAnterior ?? 0}. Saldo posterior: ${operacion.movimientos[0]?.saldoPosterior ?? 0}.` : ''} textoAccionPrincipal="Ver ajustes" onAccionPrincipal={() => { setMostrarExito(false); onNavegar('/inventario/ajustes') }} textoAccionSecundaria="Ver existencias" onAccionSecundaria={() => { setMostrarExito(false); onNavegar('/inventario/existencias') }} onCerrar={() => setMostrarExito(false)} />
      <ModalEstado abierto={Boolean(errorGuardado)} tipo="error" titulo="No se pudo registrar el ajuste" mensaje={errorGuardado ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorGuardado(null)} onCerrar={() => setErrorGuardado(null)} />
    </section>
  )
}
