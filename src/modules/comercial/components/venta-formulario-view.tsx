import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { SelectorCatalogoBuscable } from '../../../shared/components/selector-catalogo-buscable'
import { actualizarVenta, buscarDisponibilidadSucursales, crearVenta, listarClientes, obtenerOpcionesComercial, obtenerVenta } from '../comercial-api'
import type { ClienteComercial, DisponibilidadSucursalVenta, GuardarVentaRequest, OpcionesComercial, ProductoComercialCatalogo, RecetaVentaRequest, TipoIdentificacionCliente, VentaComercial } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import { VentaCantidadModal, VentaRecetaModal } from './venta-producto-modales'
import styles from './comercial.module.css'

type LineaFormulario = { clave: string; productoId: string; cantidad: string }
type RecetaFormulario = RecetaVentaRequest & { clave: string }
type SeleccionCantidad = { producto: ProductoComercialCatalogo; cantidadInicial: string }
type RecetaModalEstado = { recetaInicial: RecetaVentaRequest; productoId?: string; cantidad?: number }
type Props = { ventaId?: string; permisos: readonly string[]; onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }

const clave = () => crypto.randomUUID()
const recetaVacia = (): RecetaFormulario => ({ clave: clave(), referencia: '', fechaEmision: '', pacienteIdentificacion: '', pacienteNombre: '', prescriptorNombre: '', prescriptorColegiado: '', detalleMedicacion: '', dosis: '', frecuencia: '', via: '', duracion: '', instrucciones: '' })
const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor)
const cantidad = (valor: number) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 6 }).format(valor)
const normalizar = (valor: string) => valor.trim().toLocaleLowerCase('es-GT')

export function VentaFormularioView({ ventaId, permisos, onNavegar, onCambiosPendientes }: Props) {
  const [venta, setVenta] = useState<VentaComercial | null>(null)
  const [opciones, setOpciones] = useState<OpcionesComercial | null>(null)
  const [clientes, setClientes] = useState<ClienteComercial[]>([])
  const [clienteId, setClienteId] = useState('')
  const [tipoFiscal, setTipoFiscal] = useState<'' | TipoIdentificacionCliente>('')
  const [identificacion, setIdentificacion] = useState('')
  const [nombreFiscal, setNombreFiscal] = useState('')
  const [direccion, setDireccion] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [pacienteNombre, setPacienteNombre] = useState('')
  const [lineas, setLineas] = useState<LineaFormulario[]>([])
  const [recetas, setRecetas] = useState<RecetaFormulario[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [busquedaGlobal, setBusquedaGlobal] = useState('')
  const [busquedaGlobalAplicada, setBusquedaGlobalAplicada] = useState('')
  const [resultadosGlobales, setResultadosGlobales] = useState<DisponibilidadSucursalVenta[]>([])
  const [buscandoGlobal, setBuscandoGlobal] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState<VentaComercial | null>(null)
  const [seleccionCantidad, setSeleccionCantidad] = useState<SeleccionCantidad | null>(null)
  const [recetaModal, setRecetaModal] = useState<RecetaModalEstado | null>(null)
  const [recetaGuardada, setRecetaGuardada] = useState(false)
  const [recetaPendiente, setRecetaPendiente] = useState(false)
  const controladorGlobal = useRef<AbortController | null>(null)

  const productos = useMemo(() => opciones?.productos ?? [], [opciones?.productos])
  const disponibles = useMemo(() => productos.filter((producto) => !producto.esControlado && producto.precioVigente !== null && producto.precioVigente !== undefined), [productos])
  const productosVisibles = useMemo(() => {
    const termino = normalizar(busquedaProducto)
    return disponibles.filter((producto) => !termino || normalizar(`${producto.codigo} ${producto.nombre}`).includes(termino)).slice(0, 30)
  }, [busquedaProducto, disponibles])
  const productosSeleccionados = useMemo(() => lineas.map((linea) => productos.find((producto) => producto.id === linea.productoId)).filter(Boolean) as ProductoComercialCatalogo[], [lineas, productos])
  const requiereReceta = productosSeleccionados.some((producto) => producto.requiereReceta)
  const totalEstimado = lineas.reduce((total, linea) => total + (productos.find((producto) => producto.id === linea.productoId)?.precioVigente ?? 0) * (Number(linea.cantidad) || 0), 0)
  const clienteSeleccionado = clientes.find((cliente) => cliente.id === clienteId) ?? null
  const sucursalActual = opciones?.sucursales.find((sucursal) => sucursal.id === opciones.sucursalContextoId) ?? null
  const puedeSolicitarTraslado = permisos.includes('ABASTECIMIENTO.TRASLADOS.VER') && permisos.includes('ABASTECIMIENTO.TRASLADOS.CREAR')
  const hayCambios = Boolean(clienteId || tipoFiscal || identificacion || nombreFiscal || direccion || pacienteId || pacienteNombre || lineas.length || recetas.length)

  useEffect(() => {
    const controlador = new AbortController()
    const solicitudes: Promise<unknown>[] = [obtenerOpcionesComercial(controlador.signal).then(setOpciones)]
    if (permisos.includes('COMERCIAL.CLIENTES.VER')) solicitudes.push(listarClientes({ pagina: 1, tamanoPagina: 200, estados: ['ACTIVO'], orden: 'nombre', direccion: 'asc' }, controlador.signal).then((respuesta) => setClientes(respuesta.items)))
    if (ventaId) solicitudes.push(obtenerVenta(ventaId, controlador.signal).then((actual) => {
      setVenta(actual); setClienteId(actual.clienteId ?? ''); setTipoFiscal(actual.tipoIdentificacionFiscal === 'CF' ? '' : actual.tipoIdentificacionFiscal); setIdentificacion(actual.identificacionFiscal === 'CF' ? '' : actual.identificacionFiscal); setNombreFiscal(actual.cliente === 'CONSUMIDOR FINAL' ? '' : actual.cliente); setDireccion(actual.direccionFiscal ?? ''); setPacienteId(actual.pacienteIdentificacion ?? ''); setPacienteNombre(actual.pacienteNombre ?? '')
      setLineas((actual.detalles ?? []).map((detalle) => ({ clave: clave(), productoId: detalle.productoId, cantidad: String(detalle.cantidad) })))
      setRecetas((actual.recetas ?? []).map((receta) => ({ clave: clave(), referencia: receta.referencia, fechaEmision: String(receta.fechaEmision).slice(0, 10), pacienteIdentificacion: receta.pacienteIdentificacion, pacienteNombre: receta.pacienteNombre, prescriptorNombre: receta.prescriptorNombre, prescriptorColegiado: receta.prescriptorColegiado, detalleMedicacion: receta.detalleMedicacion, dosis: receta.dosis, frecuencia: receta.frecuencia, via: receta.via, duracion: receta.duracion, instrucciones: receta.instrucciones ?? '' })))
    }))
    void Promise.all(solicitudes).then(() => setCargando(false)).catch((errorActual: unknown) => {
      if (!controlador.signal.aborted) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la venta y sus catálogos.'); setCargando(false) }
    })
    return () => controlador.abort()
  }, [permisos, ventaId])

  useEffect(() => onCambiosPendientes(!guardada && hayCambios), [guardada, hayCambios, onCambiosPendientes])
  useEffect(() => () => { controladorGlobal.current?.abort(); onCambiosPendientes(false) }, [onCambiosPendientes])

  const elegirCliente = (id: string) => {
    setClienteId(id)
    const cliente = clientes.find((item) => item.id === id)
    if (cliente) { setTipoFiscal(cliente.tipoIdentificacion ?? ''); setIdentificacion(cliente.identificacion ?? ''); setNombreFiscal(cliente.nombre) }
  }

  const establecerCantidadProducto = (productoId: string, valor: number) => {
    setLineas((actuales) => {
      const existente = actuales.find((linea) => linea.productoId === productoId)
      if (existente) return actuales.map((linea) => linea.clave === existente.clave ? { ...linea, cantidad: String(valor) } : linea)
      return [...actuales, { clave: clave(), productoId, cantidad: String(valor) }]
    })
  }

  const abrirCantidadProducto = (producto: ProductoComercialCatalogo) => {
    const existente = lineas.find((linea) => linea.productoId === producto.id)
    setSeleccionCantidad({ producto, cantidadInicial: existente?.cantidad || '1' })
  }

  const confirmarCantidadProducto = (valor: number) => {
    if (!seleccionCantidad) return
    const { producto } = seleccionCantidad
    setSeleccionCantidad(null)
    if (!producto.requiereReceta) {
      establecerCantidadProducto(producto.id, valor)
      return
    }
    const existente = recetas[0] ?? recetaVacia()
    const { clave: _clave, ...recetaInicial } = existente
    setRecetaModal({
      productoId: producto.id,
      cantidad: valor,
      recetaInicial: {
        ...recetaInicial,
        pacienteIdentificacion: recetaInicial.pacienteIdentificacion || pacienteId,
        pacienteNombre: recetaInicial.pacienteNombre || pacienteNombre,
        detalleMedicacion: recetaInicial.detalleMedicacion || producto.nombre,
      },
    })
  }

  const abrirEdicionReceta = () => {
    const existente = recetas[0] ?? recetaVacia()
    const { clave: _clave, ...recetaInicial } = existente
    setRecetaModal({ recetaInicial })
  }

  const guardarInformacionReceta = (receta: RecetaVentaRequest) => {
    setRecetas((actuales) => actuales.length
      ? actuales.map((actual, indice) => indice === 0 ? { ...receta, clave: actual.clave } : actual)
      : [{ ...receta, clave: clave() }])
    setPacienteId(receta.pacienteIdentificacion)
    setPacienteNombre(receta.pacienteNombre)
    if (recetaModal?.productoId && recetaModal.cantidad) establecerCantidadProducto(recetaModal.productoId, recetaModal.cantidad)
    setRecetaModal(null)
    setRecetaGuardada(true)
  }

  const quitarProducto = (lineaClave: string) => {
    const restantes = lineas.filter((linea) => linea.clave !== lineaClave)
    setLineas(restantes)
    if (!restantes.some((linea) => productos.find((producto) => producto.id === linea.productoId)?.requiereReceta)) setRecetas([])
  }

  const ejecutarBusquedaGlobal = async () => {
    const termino = busquedaGlobal.trim()
    if (termino.length < 2) { setErrorGlobal('Escribe al menos 2 caracteres para buscar en otras sucursales.'); return }
    controladorGlobal.current?.abort()
    const controlador = new AbortController(); controladorGlobal.current = controlador
    setBuscandoGlobal(true); setErrorGlobal(null); setBusquedaGlobalAplicada(termino)
    try { setResultadosGlobales(await buscarDisponibilidadSucursales(termino, controlador.signal)) }
    catch (errorActual) { if (!controlador.signal.aborted) setErrorGlobal(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible consultar otras sucursales.') }
    finally { if (!controlador.signal.aborted) setBuscandoGlobal(false) }
  }

  const manejarEnterGlobal = (evento: KeyboardEvent<HTMLInputElement>) => { if (evento.key === 'Enter') { evento.preventDefault(); void ejecutarBusquedaGlobal() } }
  const solicitarTraslado = (resultado: DisponibilidadSucursalVenta) => {
    const consulta = new URLSearchParams({ origen: 'venta', tipo: resultado.sucursal.tipo === 'BODEGA' ? 'ABASTECIMIENTO' : 'TRASLADO_HORIZONTAL', sucursalOrigenId: resultado.sucursal.id, productoId: resultado.producto.id, cantidad: '1' })
    onNavegar(`/abastecimiento/traslados/nuevo?${consulta}`)
  }

  const construir = (): GuardarVentaRequest | null => {
    if (!lineas.length || lineas.some((linea) => !linea.productoId || !Number.isInteger(Number(linea.cantidad)) || Number(linea.cantidad) <= 0)) { setError('Agrega al menos un medicamento y usa cantidades enteras mayores que cero.'); return null }
    if (new Set(lineas.map((linea) => linea.productoId)).size !== lineas.length) { setError('No repitas un medicamento; ajusta la cantidad en el carrito.'); return null }
    if (requiereReceta && (tipoFiscal !== 'NIT' || !identificacion.trim())) { setError('Los medicamentos bajo receta requieren NIT del comprador.'); return null }
    if (requiereReceta && (!pacienteId.trim() || !pacienteNombre.trim())) { setError('Completa la identificación y el nombre del paciente.'); return null }
    const camposReceta: (keyof RecetaVentaRequest)[] = ['referencia', 'fechaEmision', 'pacienteIdentificacion', 'pacienteNombre', 'prescriptorNombre', 'prescriptorColegiado', 'detalleMedicacion', 'dosis', 'frecuencia', 'via', 'duracion']
    if (requiereReceta && (!recetas.length || recetas.some((receta) => camposReceta.some((campo) => !String(receta[campo] ?? '').trim())))) { setError('Completa todos los datos obligatorios de cada receta.'); return null }
    if (identificacion.trim() && (!tipoFiscal || !nombreFiscal.trim())) { setError('La identificación fiscal requiere tipo y nombre o razón social.'); return null }
    return { clienteId: clienteId || null, tipoIdentificacionFiscal: identificacion.trim() ? tipoFiscal || null : null, identificacionFiscal: identificacion.trim() || null, nombreFiscal: nombreFiscal.trim() || null, direccionFiscal: direccion.trim() || null, pacienteIdentificacion: pacienteId.trim() || null, pacienteNombre: pacienteNombre.trim() || null, lineas: lineas.map((linea) => ({ productoId: linea.productoId, cantidad: Number(linea.cantidad) })), recetas: requiereReceta ? recetas.map(({ clave: _clave, ...receta }) => ({ ...receta, instrucciones: receta.instrucciones?.trim() || null })) : [] }
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); const datos = construir(); if (!datos) return
    setGuardando(true); setError(null)
    try { const respuesta = venta ? await actualizarVenta(venta.id, venta.version, datos) : await crearVenta(datos); setGuardada(respuesta); onCambiosPendientes(false) }
    catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible guardar la venta.') }
    finally { setGuardando(false) }
  }

  if (cargando) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual="Nueva venta" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando venta</h1><p>Consultando medicamentos, existencias y precios vigentes…</p></div></section>
  if (ventaId && !venta) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual="Editar venta" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible abrir la venta</h1><p>{error}</p></div></section>

  return <>
    <section className={`${styles.pagina} ${styles.paginaVenta}`} aria-labelledby="titulo-formulario-venta">
      <ComercialBreadcrumb seccion="Ventas" rutaListado="/ventas" actual={venta ? 'Editar venta' : 'Nueva venta'} onNavegar={onNavegar} />
      <header className={styles.cabeceraPagina}><div><p className={styles.sobretitulo}>Ventas y atención al cliente</p><h1 id="titulo-formulario-venta">{venta ? `Editar ${venta.numero}` : 'Nueva venta'}</h1><p>Busca medicamentos de la sucursal, identifica al cliente y prepara el carrito antes de continuar al cobro.</p></div></header>
      {error && <div className={styles.alertaError} role="alert">{error}</div>}
      {productos.some((producto) => producto.esControlado) && <div className={styles.alertaAdvertencia}>Los medicamentos controlados permanecen excluidos hasta definir su regulación específica.</div>}

      <form className={styles.formularioVenta} noValidate onSubmit={enviar}>
        <div className={styles.distribucionVenta}>
          <main className={styles.areaVentaPrincipal}>
            <div className={styles.cabeceraOperacionVenta}>
              <fieldset className={styles.panelVenta} disabled={guardando}>
                <legend>Búsqueda de medicamentos</legend><p className={styles.subtituloPanel}>En {sucursalActual?.nombre ?? 'la sucursal actual'}</p>
                <label className={styles.busquedaVenta} htmlFor="venta-busqueda-producto"><span className={styles.soloLectores}>Buscar medicamento por nombre o código</span><input id="venta-busqueda-producto" value={busquedaProducto} onChange={(evento) => setBusquedaProducto(evento.target.value)} placeholder="Nombre o código del medicamento" autoComplete="off" /><span aria-hidden="true">⌕</span></label>
              </fieldset>
              <fieldset className={styles.panelVenta} disabled={guardando}>
                <legend>Búsqueda del cliente</legend>
                <div className={styles.filaClienteVenta}>{clientes.length > 0 ? <SelectorCatalogoBuscable id="venta-cliente" valor={clienteId} opciones={clientes.map((cliente) => ({ valor: cliente.id, etiqueta: `${cliente.nombre}${cliente.identificacion ? ` — ${cliente.identificacion}` : ''}` }))} placeholder="Buscar por nombre o identificación" apariencia="busqueda" onChange={elegirCliente} deshabilitado={guardando} /> : <p className={styles.textoApoyoVenta}>Puedes registrar la venta como Consumidor Final.</p>}{permisos.includes('COMERCIAL.CLIENTES.CREAR') && <button className={styles.botonSecundario} type="button" onClick={() => onNavegar('/clientes/nuevo')}><IconoAccion nombre="agregar" />Nuevo cliente</button>}</div>
                <div className={styles.clienteSeleccionado} aria-live="polite"><span aria-hidden="true">●</span><div><strong>{(clienteSeleccionado?.nombre ?? nombreFiscal) || 'Consumidor Final'}</strong><small>{(clienteSeleccionado?.identificacion ?? identificacion) || 'CF'}</small></div></div>
                <details className={styles.datosComplementarios} open={Boolean(identificacion || nombreFiscal)}><summary>Datos fiscales y de facturación</summary><div className={styles.grillaDos}>
                  <div className={styles.campo}><label htmlFor="venta-tipo-fiscal">Tipo de identificación</label><select id="venta-tipo-fiscal" value={tipoFiscal} onChange={(evento) => setTipoFiscal(evento.target.value as '' | TipoIdentificacionCliente)}><option value="">Consumidor Final (CF)</option><option value="NIT">NIT</option><option value="CUI">CUI</option><option value="PASAPORTE">Pasaporte</option></select></div>
                  <div className={styles.campo}><label htmlFor="venta-identificacion">Identificación fiscal</label><input id="venta-identificacion" value={identificacion} maxLength={30} onChange={(evento) => setIdentificacion(evento.target.value)} /></div>
                  <div className={styles.campo}><label htmlFor="venta-nombre-fiscal">Nombre o razón social</label><input id="venta-nombre-fiscal" value={nombreFiscal} maxLength={200} onChange={(evento) => setNombreFiscal(evento.target.value)} /></div>
                  <div className={styles.campo}><label htmlFor="venta-direccion">Dirección fiscal</label><input id="venta-direccion" value={direccion} maxLength={300} onChange={(evento) => setDireccion(evento.target.value)} /></div>
                </div></details>
              </fieldset>
            </div>

            <section className={`${styles.panelVenta} ${styles.catalogoVenta}`} aria-labelledby="titulo-catalogo-venta">
              <div className={styles.tituloPanelVenta}><div><h2 id="titulo-catalogo-venta">Medicamentos disponibles</h2><p>El precio y la existencia se consultan para la sucursal de tu sesión.</p></div><span>{productosVisibles.length} resultados</span></div>
              {productosVisibles.length ? <div className={styles.grillaProductosVenta}>{productosVisibles.map((producto) => {
                const sinExistencia = (producto.cantidadDisponible ?? 0) <= 0
                const imagen = producto.imagenUrl ? `${construirUrlApi(producto.imagenUrl)}?v=${producto.version ?? 0}` : null
                return <article className={styles.tarjetaProductoVenta} key={producto.id}><div className={styles.imagenProductoVenta}>{imagen ? <img src={imagen} alt="" crossOrigin="use-credentials" /> : <span aria-hidden="true">Rx</span>}</div><div className={styles.datosProductoVenta}><small>{producto.codigo}</small><h3>{producto.nombre}</h3><strong>{moneda(producto.precioVigente ?? 0)}</strong><p className={sinExistencia ? styles.sinExistenciaVenta : undefined}>{sinExistencia ? 'Sin existencias disponibles' : `Stock: ${cantidad(producto.cantidadDisponible ?? 0)}`}</p></div><button type="button" disabled={guardando || sinExistencia} onClick={() => abrirCantidadProducto(producto)}>{sinExistencia ? 'No disponible' : 'Agregar'}</button></article>
              })}</div> : <div className={styles.estadoCompactoVenta}><strong>Sin coincidencias</strong><span>Prueba con otro nombre o código.</span></div>}
            </section>
          </main>

          <aside className={styles.areaVentaLateral} aria-label="Consulta general y carrito de venta">
            <section className={`${styles.panelVenta} ${styles.panelBusquedaGlobal}`} aria-labelledby="titulo-busqueda-global">
              <div className={styles.tituloPanelVenta}><div><h2 id="titulo-busqueda-global">Búsqueda general</h2><p>Existencia disponible en otras sucursales.</p></div></div>
              <label className={styles.busquedaVenta} htmlFor="venta-busqueda-global"><span className={styles.soloLectores}>Buscar en otras sucursales</span><input id="venta-busqueda-global" value={busquedaGlobal} onChange={(evento) => setBusquedaGlobal(evento.target.value)} onKeyDown={manejarEnterGlobal} placeholder="Nombre o código" autoComplete="off" /><button type="button" aria-label="Buscar en otras sucursales" onClick={() => void ejecutarBusquedaGlobal()} disabled={buscandoGlobal}>⌕</button></label>
              {errorGlobal && <p className={styles.errorBusquedaVenta} role="alert">{errorGlobal}</p>}
              <div className={styles.resultadosGlobales} aria-live="polite" aria-busy={buscandoGlobal}>
                {buscandoGlobal && <div className={styles.estadoCompactoVenta}><strong>Buscando existencias…</strong></div>}
                {!buscandoGlobal && !busquedaGlobalAplicada && <div className={styles.estadoCompactoVenta}><span>Escribe un medicamento para consultar la red.</span></div>}
                {!buscandoGlobal && busquedaGlobalAplicada && !resultadosGlobales.length && !errorGlobal && <div className={styles.estadoCompactoVenta}><strong>Sin existencias en otras sucursales</strong><span>No se encontraron coincidencias para “{busquedaGlobalAplicada}”.</span></div>}
                {!buscandoGlobal && resultadosGlobales.map((resultado) => { const imagen = resultado.producto.imagenUrl ? `${construirUrlApi(resultado.producto.imagenUrl)}?v=${resultado.producto.version}` : null; return <article className={styles.resultadoGlobalVenta} key={`${resultado.producto.id}-${resultado.sucursal.id}`}><div className={styles.miniaturaVenta}>{imagen ? <img src={imagen} alt="" crossOrigin="use-credentials" /> : <span aria-hidden="true">Rx</span>}</div><div><strong>{resultado.producto.nombre}</strong><small>{resultado.producto.codigo}</small><p>Stock: {cantidad(resultado.cantidadDisponible)} en <b>{resultado.sucursal.nombre}</b></p></div>{puedeSolicitarTraslado ? <button type="button" onClick={() => solicitarTraslado(resultado)}>Solicitar traslado</button> : <span className={styles.etiquetaConsulta}>Consulta</span>}</article> })}
              </div>
            </section>

            <section className={`${styles.panelVenta} ${styles.carritoVenta}`} aria-labelledby="titulo-carrito-venta">
              <div className={styles.tituloPanelVenta}><div><h2 id="titulo-carrito-venta">Carrito</h2><p>{lineas.length} {lineas.length === 1 ? 'medicamento' : 'medicamentos'}</p></div><span className={styles.iconoCarritoVenta}><IconoAccion nombre="carrito" /></span></div>
              {lineas.length ? <div className={styles.tablaCarritoContenedor}><table className={styles.tablaCarritoVenta}>
                <caption className={styles.soloLectores}>Medicamentos agregados al carrito</caption>
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th><span className={styles.soloLectores}>Acciones</span></th></tr></thead>
                <tbody>{lineas.map((linea) => {
                  const producto = productos.find((item) => item.id === linea.productoId)
                  if (!producto) return null
                  const imagen = producto.imagenUrl ? `${construirUrlApi(producto.imagenUrl)}?v=${producto.version ?? 0}` : null
                  return <tr key={linea.clave}>
                    <td><div className={styles.productoCarritoVenta}><span className={styles.miniaturaCarritoVenta}>{imagen ? <img src={imagen} alt="" crossOrigin="use-credentials" /> : <span aria-hidden="true">Rx</span>}</span><span><strong>{producto.nombre}</strong><small>{producto.codigo}</small></span></div></td>
                    <td><label><span className={styles.soloLectores}>Cantidad de {producto.nombre}</span><input type="number" min="1" max={producto.cantidadDisponible ?? undefined} step="1" value={linea.cantidad} onChange={(evento) => setLineas((actuales) => actuales.map((item) => item.clave === linea.clave ? { ...item, cantidad: evento.target.value } : item))} /></label></td>
                    <td>{moneda(producto.precioVigente ?? 0)}</td>
                    <td><strong>{moneda((producto.precioVigente ?? 0) * (Number(linea.cantidad) || 0))}</strong></td>
                    <td><button className={styles.quitarCarritoVenta} type="button" aria-label={`Quitar ${producto.nombre}`} title={`Quitar ${producto.nombre}`} onClick={() => quitarProducto(linea.clave)}><IconoAccion nombre="cancelar" /></button></td>
                  </tr>
                })}</tbody>
              </table></div> : <div className={styles.estadoCompactoVenta}><strong>Carrito vacío</strong><span>Agrega medicamentos desde el catálogo.</span></div>}
              {requiereReceta && recetas.length > 0 && <button className={styles.botonEditarReceta} type="button" onClick={abrirEdicionReceta}><IconoAccion nombre="editar" />Editar información de receta</button>}
              <div className={styles.totalCarritoVenta}><span>Total estimado</span><strong>{moneda(totalEstimado)}</strong></div><p className={styles.notaCobroVenta}>El backend vuelve a validar precio, receta y disponibilidad. Después del registro podrás preparar la venta para cobro.</p>
              <div className={styles.accionesCarritoVenta}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar(venta ? `/ventas/${venta.id}` : '/ventas')} disabled={guardando}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || !lineas.length}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : venta ? 'Guardar cambios' : 'Registrar venta'}</button></div>
            </section>
          </aside>
        </div>
      </form>
    </section>
    {seleccionCantidad && <VentaCantidadModal key={seleccionCantidad.producto.id} producto={seleccionCantidad.producto} cantidadInicial={seleccionCantidad.cantidadInicial} onCerrar={() => setSeleccionCantidad(null)} onConfirmar={confirmarCantidadProducto} />}
    {recetaModal && <VentaRecetaModal key={`${recetaModal.productoId ?? 'editar'}-${recetaModal.cantidad ?? 0}`} recetaInicial={recetaModal.recetaInicial} onCerrar={() => setRecetaModal(null)} onGuardar={guardarInformacionReceta} />}
    <ModalEstado abierto={recetaGuardada} tipo="exito" titulo="Información de receta guardada" mensaje="Los datos de la receta se agregaron correctamente a la venta." textoAccionPrincipal="Continuar" onAccionPrincipal={() => { setRecetaGuardada(false); setRecetaPendiente(true) }} onCerrar={() => { setRecetaGuardada(false); setRecetaPendiente(true) }} />
    <ModalEstado abierto={recetaPendiente} tipo="advertencia" titulo="Receta pendiente de autorización" mensaje="La receta todavía debe ser revisada y autorizada. Al registrar la venta quedará pendiente y no podrá continuar al cobro hasta recibir la aprobación." textoAccionPrincipal="Entendido" onAccionPrincipal={() => setRecetaPendiente(false)} onCerrar={() => setRecetaPendiente(false)} />
    <ModalEstado abierto={Boolean(guardada)} tipo="exito" titulo={venta ? 'Venta actualizada' : 'Venta registrada'} mensaje={guardada ? `${guardada.numero} quedó guardada como ${guardada.estado === 'PENDIENTE_RECETA' ? 'pendiente de receta' : 'borrador'}.` : ''} textoAccionPrincipal="Ver venta y continuar" onAccionPrincipal={() => guardada && onNavegar(`/ventas/${guardada.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/ventas')} onCerrar={() => guardada && onNavegar(`/ventas/${guardada.id}`)} />
  </>
}
