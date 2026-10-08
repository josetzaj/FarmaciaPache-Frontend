import { useEffect, useMemo, useState } from 'react'
import iconoAgregar from '../../../assets/acciones/agregar.png'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { registrarAperturaInventario, listarUbicacionesInventario } from '../inventario-api'
import type {
  EstadoExistenciaInventario,
  ExistenciaProducto,
  OperacionInventario,
  RegistrarAperturaInventarioRequest,
  UbicacionInventario,
} from '../inventario.types'
import { InventarioAuditoria } from './inventario-auditoria'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

type LineaAperturaFormulario = {
  id: string
  producto: ExistenciaProducto | null
  ubicacionId: string
  estado: EstadoExistenciaInventario
  cantidad: string
  costoUnitario: string
  numeroLote: string
  fechaFabricacion: string
  fechaVencimiento: string
}

type ErroresApertura = Record<string, string>

const estadosApertura: Array<{ valor: EstadoExistenciaInventario; etiqueta: string }> = [
  { valor: 'DISPONIBLE', etiqueta: 'Disponible' },
  { valor: 'BLOQUEADO', etiqueta: 'Bloqueado' },
  { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'VENCIDO', etiqueta: 'Vencido' },
]

let secuenciaLinea = 0
function nuevaLinea(): LineaAperturaFormulario {
  secuenciaLinea += 1
  return { id: `linea-${secuenciaLinea}`, producto: null, ubicacionId: '', estado: 'DISPONIBLE', cantidad: '', costoUnitario: '', numeroLote: '', fechaFabricacion: '', fechaVencimiento: '' }
}

function fechaLocalActual(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function numeroValido(valor: string): boolean {
  if (!/^\d+(?:\.\d{1,6})?$/.test(valor.trim())) return false
  const numero = Number(valor)
  return numero > 0 && numero <= 999_999_999_999
}

export function InventarioAperturaView({
  permisos,
  onNavegar,
  onCambiosPendientes,
}: {
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (hayCambios: boolean) => void
}) {
  const [referencia, setReferencia] = useState('')
  const [fechaBase, setFechaBase] = useState(fechaLocalActual)
  const [fechaCorte, setFechaCorte] = useState(fechaBase)
  const [motivo, setMotivo] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [lineas, setLineas] = useState<LineaAperturaFormulario[]>([nuevaLinea()])
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [errores, setErrores] = useState<ErroresApertura>({})
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [operacion, setOperacion] = useState<OperacionInventario | null>(null)
  const [mostrarExito, setMostrarExito] = useState(false)
  const [revision, setRevision] = useState(0)
  const puedeVerAuditoria = permisos.includes('INVENTARIO.KARDEX.VER_AUDITORIA') && permisos.includes('INVENTARIO.KARDEX.VER')

  const hayCambios = Boolean(referencia || fechaCorte !== fechaBase || motivo || evidencia || lineas.length > 1 || lineas.some((linea) => linea.producto || linea.ubicacionId || linea.estado !== 'DISPONIBLE' || linea.cantidad || linea.costoUnitario || linea.numeroLote || linea.fechaFabricacion || linea.fechaVencimiento))
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

  const cambiarLinea = (id: string, cambios: Partial<LineaAperturaFormulario>) => {
    setLineas((actuales) => actuales.map((linea) => linea.id === id ? { ...linea, ...cambios } : linea))
    setErrores((actuales) => Object.fromEntries(Object.entries(actuales).filter(([clave]) => !clave.startsWith(`${id}.`))))
  }

  const validar = (): boolean => {
    const siguientes: ErroresApertura = {}
    if (referencia.trim().length < 3) siguientes.referencia = 'Escribe una referencia de al menos 3 caracteres.'
    if (referencia.trim().length > 100) siguientes.referencia = 'La referencia no puede superar 100 caracteres.'
    if (!fechaCorte) siguientes.fechaCorte = 'Selecciona la fecha y hora de corte.'
    else if (new Date(fechaCorte).getTime() > Date.now()) siguientes.fechaCorte = 'La fecha de corte no puede estar en el futuro.'
    if (motivo.trim().length < 10) siguientes.motivo = 'Describe el motivo en al menos 10 caracteres.'
    if (motivo.trim().length > 500) siguientes.motivo = 'El motivo no puede superar 500 caracteres.'
    if (evidencia.trim().length < 3) siguientes.evidencia = 'Indica el documento, acta o evidencia de respaldo.'
    if (evidencia.trim().length > 500) siguientes.evidencia = 'La evidencia no puede superar 500 caracteres.'
    const claves = new Set<string>()
    for (const linea of lineas) {
      if (!linea.producto) siguientes[`${linea.id}.producto`] = 'Selecciona un medicamento.'
      if (!linea.ubicacionId) siguientes[`${linea.id}.ubicacion`] = 'Selecciona una ubicación.'
      if (!numeroValido(linea.cantidad)) siguientes[`${linea.id}.cantidad`] = 'Ingresa una cantidad mayor que cero, con máximo seis decimales.'
      if (linea.costoUnitario && !numeroValido(linea.costoUnitario)) siguientes[`${linea.id}.costo`] = 'El costo debe ser mayor que cero o quedar vacío.'
      if (linea.producto?.producto.controlaLote) {
        if (!linea.numeroLote.trim()) siguientes[`${linea.id}.lote`] = 'Este medicamento requiere número de lote.'
        if (linea.numeroLote.trim().length > 80) siguientes[`${linea.id}.lote`] = 'El lote no puede superar 80 caracteres.'
        if (linea.producto.producto.requiereVencimiento && !linea.fechaVencimiento) siguientes[`${linea.id}.vencimiento`] = 'Este medicamento requiere fecha de vencimiento.'
        if (linea.fechaFabricacion && linea.fechaVencimiento && linea.fechaVencimiento < linea.fechaFabricacion) siguientes[`${linea.id}.vencimiento`] = 'El vencimiento no puede ser anterior a la fabricación.'
      }
      if (linea.producto && linea.ubicacionId) {
        const clave = `${linea.producto.producto.id}|${linea.ubicacionId}|${linea.estado}|${linea.numeroLote.trim().toUpperCase() || 'SIN_LOTE'}`
        if (claves.has(clave)) siguientes[`${linea.id}.producto`] = 'Esta combinación de medicamento, ubicación, estado y lote está duplicada.'
        claves.add(clave)
      }
    }
    setErrores(siguientes)
    const primerError = Object.keys(siguientes)[0]
    if (primerError) window.requestAnimationFrame(() => document.getElementById(`apertura-${primerError.replace('.', '-')}`)?.focus())
    return !primerError
  }

  const solicitud = useMemo<RegistrarAperturaInventarioRequest | null>(() => {
    if (!fechaCorte || lineas.some((linea) => !linea.producto)) return null
    return {
      referencia: referencia.trim().toUpperCase(),
      fechaCorte: new Date(fechaCorte).toISOString(),
      motivo: motivo.trim(),
      evidenciaReferencia: evidencia.trim(),
      lineas: lineas.map((linea) => ({
        productoId: linea.producto!.producto.id,
        ubicacionId: linea.ubicacionId,
        estado: linea.estado,
        cantidad: Number(linea.cantidad),
        lote: linea.producto!.producto.controlaLote ? {
          numeroLote: linea.numeroLote.trim().toUpperCase(),
          fechaFabricacion: linea.fechaFabricacion || null,
          fechaVencimiento: linea.fechaVencimiento || null,
          proveedorOrigenId: null,
        } : null,
        costoUnitario: linea.costoUnitario ? Number(linea.costoUnitario) : null,
      })),
    }
  }, [evidencia, fechaCorte, lineas, motivo, referencia])

  const prepararRegistro = () => { if (validar()) setConfirmando(true) }
  const registrar = async () => {
    if (!solicitud) return
    setGuardando(true)
    try {
      const registrada = await registrarAperturaInventario(solicitud)
      setOperacion(registrada)
      setConfirmando(false)
      setMostrarExito(true)
      const nuevaFecha = fechaLocalActual()
      setReferencia(''); setFechaBase(nuevaFecha); setFechaCorte(nuevaFecha); setMotivo(''); setEvidencia(''); setLineas([nuevaLinea()]); setErrores({})
      onCambiosPendientes(false)
    } catch (errorActual) {
      setConfirmando(false)
      setErrorGuardado(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible registrar la apertura controlada.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-apertura-inventario">
      <header className={styles.cabecera}><InventarioBreadcrumb anterior={{ etiqueta: 'Aperturas controladas', ruta: '/inventario/apertura' }} actual="Nueva apertura controlada" onNavegar={onNavegar} /><div className={styles.filaCabecera}><h1 id="titulo-apertura-inventario">Nueva apertura controlada</h1></div></header>
      <div className={styles.alertaAdvertencia} role="note"><p>Utiliza este proceso una sola vez para incorporar existencias iniciales verificadas. Cada línea genera un movimiento trazable y no sustituye una recepción de compra.</p></div>
      {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
      <form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); prepararRegistro() }} noValidate>
        <fieldset><legend>Documento de apertura</legend><div className={styles.grillaFormulario}>
          <div className={styles.campo}><label htmlFor="apertura-referencia">Referencia *</label><input id="apertura-referencia" value={referencia} maxLength={100} aria-invalid={Boolean(errores.referencia)} aria-describedby={errores.referencia ? 'error-apertura-referencia' : undefined} onChange={(evento) => { setReferencia(evento.target.value.toUpperCase()); setErrores((actuales) => ({ ...actuales, referencia: '' })) }} />{errores.referencia && <span id="error-apertura-referencia" className={styles.campoError}>{errores.referencia}</span>}</div>
          <div className={styles.campo}><label htmlFor="apertura-fechaCorte">Fecha y hora de corte *</label><input id="apertura-fechaCorte" type="datetime-local" value={fechaCorte} max={fechaLocalActual()} aria-invalid={Boolean(errores.fechaCorte)} onChange={(evento) => setFechaCorte(evento.target.value)} />{errores.fechaCorte && <span className={styles.campoError}>{errores.fechaCorte}</span>}</div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="apertura-motivo">Motivo *</label><textarea id="apertura-motivo" value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setMotivo(evento.target.value)} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}<small>{motivo.length}/500 caracteres</small></div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="apertura-evidencia">Evidencia de respaldo *</label><input id="apertura-evidencia" value={evidencia} maxLength={500} placeholder="Acta, documento, expediente o enlace interno" aria-invalid={Boolean(errores.evidencia)} onChange={(evento) => setEvidencia(evento.target.value)} />{errores.evidencia && <span className={styles.campoError}>{errores.evidencia}</span>}</div>
        </div></fieldset>
        <fieldset><legend>Existencias iniciales</legend><div className={styles.cabeceraLineas}><p>Registra una línea por medicamento, ubicación, estado y lote.</p><button className={styles.botonSecundario} type="button" disabled={lineas.length >= 500} onClick={() => setLineas((actuales) => [...actuales, nuevaLinea()])}><img src={iconoAgregar} alt="" />Agregar línea</button></div>
          <div className={styles.listaLineas}>{lineas.map((linea, indice) => <article key={linea.id} className={styles.lineaOperacion}><div className={styles.tituloLinea}><h2>Línea {indice + 1}</h2>{lineas.length > 1 && <button className={styles.accionPeligroTexto} type="button" onClick={() => setLineas((actuales) => actuales.filter((item) => item.id !== linea.id))}><img src={iconoEliminar} alt="" />Quitar línea</button>}</div><div className={styles.grillaLinea}>
            <div className={`${styles.campo} ${styles.campoProducto}`}><label htmlFor={`apertura-${linea.id}-producto`}>Medicamento *</label><SelectorProductoInventario id={`apertura-${linea.id}-producto`} valor={linea.producto} soloConExistencia={false} invalido={Boolean(errores[`${linea.id}.producto`])} onChange={(producto) => cambiarLinea(linea.id, { producto, numeroLote: '', fechaFabricacion: '', fechaVencimiento: '' })} />{errores[`${linea.id}.producto`] && <span className={styles.campoError}>{errores[`${linea.id}.producto`]}</span>}</div>
            <div className={styles.campo}><label htmlFor={`apertura-${linea.id}-ubicacion`}>Ubicación *</label><select id={`apertura-${linea.id}-ubicacion`} value={linea.ubicacionId} aria-invalid={Boolean(errores[`${linea.id}.ubicacion`])} onChange={(evento) => cambiarLinea(linea.id, { ubicacionId: evento.target.value })}><option value="">Selecciona</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select>{errores[`${linea.id}.ubicacion`] && <span className={styles.campoError}>{errores[`${linea.id}.ubicacion`]}</span>}</div>
            <div className={styles.campo}><label htmlFor={`apertura-${linea.id}-estado`}>Estado *</label><select id={`apertura-${linea.id}-estado`} value={linea.estado} onChange={(evento) => cambiarLinea(linea.id, { estado: evento.target.value as EstadoExistenciaInventario })}>{estadosApertura.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>)}</select></div>
            <div className={styles.campo}><label htmlFor={`apertura-${linea.id}-cantidad`}>Cantidad *</label><input id={`apertura-${linea.id}-cantidad`} type="number" min="0.000001" step="0.000001" value={linea.cantidad} aria-invalid={Boolean(errores[`${linea.id}.cantidad`])} onChange={(evento) => cambiarLinea(linea.id, { cantidad: evento.target.value })} />{errores[`${linea.id}.cantidad`] && <span className={styles.campoError}>{errores[`${linea.id}.cantidad`]}</span>}</div>
            <div className={styles.campo}><label htmlFor={`apertura-${linea.id}-costo`}>Costo unitario</label><input id={`apertura-${linea.id}-costo`} type="number" min="0.000001" step="0.000001" value={linea.costoUnitario} aria-invalid={Boolean(errores[`${linea.id}.costo`])} onChange={(evento) => cambiarLinea(linea.id, { costoUnitario: evento.target.value })} />{errores[`${linea.id}.costo`] && <span className={styles.campoError}>{errores[`${linea.id}.costo`]}</span>}</div>
            {linea.producto?.producto.controlaLote && <><div className={styles.campo}><label htmlFor={`apertura-${linea.id}-lote`}>Número de lote *</label><input id={`apertura-${linea.id}-lote`} value={linea.numeroLote} maxLength={80} aria-invalid={Boolean(errores[`${linea.id}.lote`])} onChange={(evento) => cambiarLinea(linea.id, { numeroLote: evento.target.value.toUpperCase() })} />{errores[`${linea.id}.lote`] && <span className={styles.campoError}>{errores[`${linea.id}.lote`]}</span>}</div><div className={styles.campo}><label htmlFor={`apertura-${linea.id}-fabricacion`}>Fabricación</label><input id={`apertura-${linea.id}-fabricacion`} type="date" value={linea.fechaFabricacion} max={linea.fechaVencimiento || undefined} onChange={(evento) => cambiarLinea(linea.id, { fechaFabricacion: evento.target.value })} /></div><div className={styles.campo}><label htmlFor={`apertura-${linea.id}-vencimiento`}>Vencimiento {linea.producto.producto.requiereVencimiento ? '*' : ''}</label><input id={`apertura-${linea.id}-vencimiento`} type="date" value={linea.fechaVencimiento} min={linea.fechaFabricacion || undefined} aria-invalid={Boolean(errores[`${linea.id}.vencimiento`])} onChange={(evento) => cambiarLinea(linea.id, { fechaVencimiento: evento.target.value })} />{errores[`${linea.id}.vencimiento`] && <span className={styles.campoError}>{errores[`${linea.id}.vencimiento`]}</span>}</div></>}
          </div></article>)}</div>
        </fieldset>
        <div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/apertura')}>Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga)}><IconoAccion nombre="guardar" />Revisar y registrar</button></div>
      </form>
      {operacion && puedeVerAuditoria && <InventarioAuditoria tipo="operacion" entidadId={operacion.id} titulo={`Apertura ${operacion.referencia} confirmada.`} revision={revision} />}
      <ModalEstado abierto={confirmando} tipo="advertencia" titulo="Confirmar apertura controlada" mensaje={`Se registrarán ${lineas.length} ${lineas.length === 1 ? 'línea' : 'líneas'} con la referencia ${referencia.trim().toUpperCase()}. Los movimientos quedarán confirmados y auditados.`} textoAccionPrincipal={guardando ? 'Registrando…' : 'Confirmar apertura'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void registrar()} textoAccionSecundaria="Seguir revisando" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={() => setConfirmando(false)} onCerrar={() => setConfirmando(false)} cargando={guardando} />
      <ModalEstado abierto={mostrarExito} tipo="exito" titulo="Apertura registrada" mensaje={operacion ? `La apertura ${operacion.referencia} fue confirmada con ${operacion.movimientos.length} movimientos.` : ''} textoAccionPrincipal="Ver aperturas" onAccionPrincipal={() => { setMostrarExito(false); onNavegar('/inventario/apertura') }} textoAccionSecundaria="Ver existencias" onAccionSecundaria={() => { setMostrarExito(false); onNavegar('/inventario/existencias') }} onCerrar={() => setMostrarExito(false)} />
      <ModalEstado abierto={Boolean(errorGuardado)} tipo="error" titulo="No se pudo registrar la apertura" mensaje={errorGuardado ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorGuardado(null)} onCerrar={() => setErrorGuardado(null)} />
    </section>
  )
}
