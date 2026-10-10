import { useEffect, useMemo, useState } from 'react'
import agregarIcono from '../../../assets/acciones/agregar.png'
import editarIcono from '../../../assets/acciones/editar.png'
import verIcono from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type SortingState } from '../../../shared/components/tabla-datos'
import { crearCajaChica, listarCajasChicas, modificarFondoCajaChica, obtenerOpcionesCajaChica } from '../caja-chica-api'
import { convertirQuetzalesACentavos, crearClaveIdempotencia, etiquetasEstadoCajaChica, formatearCentavos } from '../caja-chica-formatos'
import type { CajaChicaResumen, EstadoCajaChica, OpcionesCajaChica, ResultadoPaginado } from '../caja-chica.types'
import { CajaChicaBreadcrumb } from './caja-chica-breadcrumb'
import localStyles from './caja-chica.module.css'
import styles from '../../caja/components/caja.module.css'

type Props = { permisos: string[]; onNavegar: (ruta: string) => void }
type ModalCaja = { tipo: 'crear'; clave: string } | { tipo: 'fondo'; caja: CajaChicaResumen; clave: string } | null

function claseEstado(estado: EstadoCajaChica): string {
  if (estado === 'DISPONIBLE') return `${styles.estado} ${styles.estadoExito}`
  if (estado === 'SUSPENDIDA') return `${styles.estado} ${styles.estadoAdvertencia}`
  return `${styles.estado} ${styles.estadoNeutral}`
}

export function CajaChicaListadoView({ permisos, onNavegar }: Props) {
  const [resultado, setResultado] = useState<ResultadoPaginado<CajaChicaResumen> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesCajaChica | null>(null)
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(50)
  const [entradaBusqueda, setEntradaBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [estado, setEstado] = useState<EstadoCajaChica | ''>('')
  const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'codigo', desc: false }])
  const [modal, setModal] = useState<ModalCaja>(null)
  const [sucursalCrear, setSucursalCrear] = useState('')
  const [fondo, setFondo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [solicitudFinalizada, setSolicitudFinalizada] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [revision, setRevision] = useState(0)

  const puedeCrear = permisos.includes('CAJA.CHICA.CREAR')
  const puedeModificar = permisos.includes('CAJA.CHICA.MODIFICAR_FONDO')
  const sucursalesConCaja = useMemo(() => new Set(opciones?.cajas.map((caja) => caja.sucursal.id) ?? []), [opciones])
  const sucursalesDisponibles = useMemo(() => opciones?.sucursales.filter((sucursal) => !sucursalesConCaja.has(sucursal.id)) ?? [], [opciones, sucursalesConCaja])
  const orden = ordenamiento[0]
  const parametros = useMemo(() => ({
    pagina, tamanoPagina, busqueda: busqueda || undefined,
    sucursalIds: sucursalId ? [sucursalId] : undefined,
    estados: estado ? [estado] : undefined,
    orden: ((orden?.id ?? 'codigo') as 'codigo' | 'sucursal' | 'estado' | 'fondo'),
    direccion: orden?.desc ? 'desc' as const : 'asc' as const,
  }), [busqueda, estado, orden?.desc, orden?.id, pagina, sucursalId, tamanoPagina])
  const claveCarga = useMemo(() => JSON.stringify({ parametros, revision }), [parametros, revision])
  const cargando = solicitudFinalizada !== claveCarga

  useEffect(() => {
    const temporizador = window.setTimeout(() => { setBusqueda(entradaBusqueda.trim()); setPagina(1) }, 400)
    return () => window.clearTimeout(temporizador)
  }, [entradaBusqueda])

  useEffect(() => {
    const controlador = new AbortController()
    void Promise.all([
      listarCajasChicas(parametros, controlador.signal),
      obtenerOpcionesCajaChica(controlador.signal),
    ]).then(([cajas, opcionesActuales]) => {
      if (cajas.totalPaginas > 0 && pagina > cajas.totalPaginas) { setPagina(cajas.totalPaginas); return }
      setResultado(cajas)
      setOpciones(opcionesActuales)
      setError(null)
    }).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las cajas chicas.')
    }).finally(() => { if (!controlador.signal.aborted) setSolicitudFinalizada(claveCarga) })
    return () => controlador.abort()
  }, [claveCarga, pagina, parametros])

  const abrirCrear = () => {
    setSucursalCrear(''); setFondo(''); setMotivo(''); setReferencia(''); setErrores({}); setErrorAccion(null)
    setModal({ tipo: 'crear', clave: crearClaveIdempotencia('crear-caja-chica') })
  }
  const abrirFondo = (caja: CajaChicaResumen) => {
    setFondo((caja.fondoAutorizadoCentavos / 100).toFixed(2)); setMotivo(''); setReferencia(''); setErrores({}); setErrorAccion(null)
    setModal({ tipo: 'fondo', caja, clave: crearClaveIdempotencia('modificar-fondo') })
  }
  const cerrarModal = () => { if (!procesando) setModal(null) }

  const guardar = async () => {
    if (!modal || procesando) return
    const centavos = convertirQuetzalesACentavos(fondo)
    const siguientes: Record<string, string> = {}
    if (!centavos) siguientes.fondo = 'Ingresa un monto positivo con máximo dos decimales.'
    if (modal.tipo === 'crear' && !sucursalCrear) siguientes.sucursal = 'Selecciona una sucursal.'
    if (modal.tipo === 'fondo') {
      if (centavos === modal.caja.fondoAutorizadoCentavos) siguientes.fondo = 'El nuevo fondo debe ser distinto del actual.'
      if (motivo.trim().length < 5) siguientes.motivo = 'Describe el motivo con al menos 5 caracteres.'
      if (referencia.trim().length < 2) siguientes.referencia = 'Ingresa una referencia o evidencia.'
    }
    setErrores(siguientes)
    if (Object.keys(siguientes).length || !centavos) return
    setProcesando(true); setErrorAccion(null)
    try {
      if (modal.tipo === 'crear') {
        const creada = await crearCajaChica({ sucursalId: sucursalCrear, fondoAutorizadoCentavos: centavos, claveIdempotencia: modal.clave })
        setMensajeExito(`Se creó ${creada.codigo} con fondo autorizado de ${formatearCentavos(creada.fondoAutorizadoCentavos)}. El efectivo no fue entregado automáticamente.`)
      } else {
        const actualizada = await modificarFondoCajaChica(modal.caja.id, { nuevoFondoCentavos: centavos, motivo: motivo.trim(), evidenciaReferencia: referencia.trim(), version: modal.caja.version, claveIdempotencia: modal.clave })
        setMensajeExito(`El fondo de ${actualizada.codigo} quedó en ${formatearCentavos(actualizada.fondoAutorizadoCentavos)}. Las liquidaciones existentes conservaron su fondo.`)
      }
      setModal(null); setRevision((valor) => valor + 1)
    } catch (errorActual) {
      setErrorAccion(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible completar la operación.')
    } finally { setProcesando(false) }
  }

  const columnas = useMemo<ColumnaTabla<CajaChicaResumen>[]>(() => [
    { id: 'codigo', titulo: 'Identificación', obtenerValor: (caja) => caja.codigo, ordenable: true, celda: (caja) => <span className={styles.identidad}><strong>{caja.codigo}</strong><small>{caja.nombre}</small></span> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (caja) => caja.sucursal.nombre, ordenable: true, celda: (caja) => <span className={styles.identidad}><strong>{caja.sucursal.nombre}</strong><small>{caja.sucursal.codigo}</small></span> },
    { id: 'estado', titulo: 'Estado', obtenerValor: (caja) => caja.estado, ordenable: true, celda: (caja) => <span className={claseEstado(caja.estado)}>{etiquetasEstadoCajaChica[caja.estado]}</span> },
    { id: 'fondo', titulo: 'Fondo autorizado', obtenerValor: (caja) => caja.fondoAutorizadoCentavos, ordenable: true, celda: (caja) => <strong>{formatearCentavos(caja.fondoAutorizadoCentavos)}</strong> },
    { id: 'saldo', titulo: 'Saldo actual', obtenerValor: (caja) => caja.saldoActualCentavos, celda: (caja) => formatearCentavos(caja.saldoActualCentavos) },
    { id: 'disponible', titulo: 'Efectivo disponible', obtenerValor: (caja) => caja.efectivoDisponibleCentavos, celda: (caja) => <strong>{formatearCentavos(caja.efectivoDisponibleCentavos)}</strong> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (caja) => <div className={styles.accionesFila}>
      {puedeModificar && <button type="button" title="Modificar fondo" aria-label={`Modificar fondo de ${caja.codigo}`} onClick={() => abrirFondo(caja)}><img src={editarIcono} alt="" /></button>}
      <button type="button" title="Ver liquidaciones" aria-label={`Ver liquidaciones de ${caja.sucursal.nombre}`} onClick={() => onNavegar(`/caja/liquidaciones?sucursalId=${encodeURIComponent(caja.sucursal.id)}`)}><img src={verIcono} alt="" /></button>
    </div> },
  ], [onNavegar, puedeModificar])

  const hayFiltros = Boolean(entradaBusqueda || sucursalId || estado)
  return <section className={styles.pagina} aria-labelledby="titulo-cajas-chicas">
    <header className={styles.cabeceraPagina}>
      <CajaChicaBreadcrumb seccion="Caja Chica" onNavegar={onNavegar} />
      <div className={styles.filaCabecera}><h1 id="titulo-cajas-chicas">Caja Chica</h1>{puedeCrear && <button className={styles.botonNuevo} type="button" onClick={abrirCrear}><img src={agregarIcono} alt="" />Crear Caja Chica</button>}</div>
    </header>
    <div className={localStyles.filtros}>
      <label>Buscar<input value={entradaBusqueda} placeholder="Código, nombre o sucursal" onChange={(evento) => setEntradaBusqueda(evento.target.value)} /></label>
      <label>Sucursal<select value={sucursalId} onChange={(evento) => { setSucursalId(evento.target.value); setPagina(1) }}><option value="">Todas</option>{opciones?.sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre} ({sucursal.codigo})</option>)}</select></label>
      <label>Estado<select value={estado} onChange={(evento) => { setEstado(evento.target.value as EstadoCajaChica | ''); setPagina(1) }}><option value="">Todos</option>{opciones?.estadosCaja.map((valor) => <option key={valor} value={valor}>{etiquetasEstadoCajaChica[valor]}</option>)}</select></label>
      {hayFiltros && <button type="button" onClick={() => { setEntradaBusqueda(''); setBusqueda(''); setSucursalId(''); setEstado(''); setPagina(1) }}>Limpiar</button>}
    </div>
    {error && <div className={styles.alertaError} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <article className={styles.panelTabla} aria-busy={cargando}>
      <div className={styles.resumenTabla}><div><strong>Cajas creadas</strong><small>{cargando ? 'Actualizando información…' : 'Fondos y saldos calculados por el servidor.'}</small></div>{resultado && <span>{resultado.total} {resultado.total === 1 ? 'caja' : 'cajas'}</span>}</div>
      {resultado?.items.length ? <><TablaDatos descripcion="Cajas chicas por sucursal" datos={resultado.items} columnas={columnas} filtros={[]} ordenamiento={ordenamiento} obtenerIdFila={(caja) => caja.id} onFiltrosChange={() => undefined} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'codigo', desc: false }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="caja" unidadPlural="cajas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : !cargando && !error ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay cajas chicas creadas'}</h2><p>{hayFiltros ? 'Ajusta o limpia los filtros.' : 'Administración debe crear la caja y asignar su fondo autorizado.'}</p>{puedeCrear && !hayFiltros && <button type="button" onClick={abrirCrear}>Crear Caja Chica</button>}</div> : null}
    </article>
    <ModalEstado ancho="amplio" abierto={Boolean(modal)} tipo="informacion" titulo={modal?.tipo === 'crear' ? 'Crear Caja Chica' : `Modificar fondo de ${modal?.tipo === 'fondo' ? modal.caja.codigo : ''}`} mensaje={<form className={localStyles.formularioModal} onSubmit={(evento) => { evento.preventDefault(); void guardar() }} noValidate>
      {modal?.tipo === 'crear' && <label>Sucursal *<select value={sucursalCrear} aria-invalid={Boolean(errores.sucursal)} onChange={(evento) => { setSucursalCrear(evento.target.value); setErrores((actual) => ({ ...actual, sucursal: '' })) }}><option value="">Selecciona una sucursal</option>{sucursalesDisponibles.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre} ({sucursal.codigo})</option>)}</select>{errores.sucursal && <span className={localStyles.errorCampo}>{errores.sucursal}</span>}</label>}
      <label>{modal?.tipo === 'crear' ? 'Fondo autorizado' : 'Nuevo fondo autorizado'} (Q) *<input inputMode="decimal" value={fondo} aria-invalid={Boolean(errores.fondo)} onChange={(evento) => { setFondo(evento.target.value); setErrores((actual) => ({ ...actual, fondo: '' })) }} />{errores.fondo && <span className={localStyles.errorCampo}>{errores.fondo}</span>}</label>
      {modal?.tipo === 'fondo' && <><label>Motivo *<textarea value={motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => { setMotivo(evento.target.value); setErrores((actual) => ({ ...actual, motivo: '' })) }} />{errores.motivo && <span className={localStyles.errorCampo}>{errores.motivo}</span>}</label><label>Evidencia o referencia *<input value={referencia} maxLength={500} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => { setReferencia(evento.target.value); setErrores((actual) => ({ ...actual, referencia: '' })) }} />{errores.referencia && <span className={localStyles.errorCampo}>{errores.referencia}</span>}</label></>}
      <p className={localStyles.ayuda}>El fondo autorizado no entrega ni retira efectivo. Se aplicará a las siguientes liquidaciones.</p>{errorAccion && <div className={styles.alertaError} role="alert"><p>{errorAccion}</p></div>}
    </form>} textoAccionPrincipal={procesando ? 'Guardando…' : modal?.tipo === 'crear' ? 'Crear caja' : 'Guardar fondo'} iconoAccionPrincipal={<IconoAccion nombre="guardar" />} onAccionPrincipal={() => void guardar()} textoAccionSecundaria="Cancelar" iconoAccionSecundaria={<IconoAccion nombre="cancelar" />} onAccionSecundaria={cerrarModal} onCerrar={cerrarModal} cargando={procesando} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Operación completada" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </section>
}
