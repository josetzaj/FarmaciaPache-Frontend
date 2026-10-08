import { useEffect, useState } from 'react'
import iconoEliminar from '../../../assets/acciones/eliminar.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearConteoInventario, listarUbicacionesInventario } from '../inventario-api'
import type { ExistenciaProducto, TipoConteoInventario, UbicacionInventario } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

type Formulario = { referencia: string; tipo: TipoConteoInventario; ubicacionId: string; motivo: string; productos: ExistenciaProducto[] }
const inicial: Formulario = { referencia: '', tipo: 'GENERAL', ubicacionId: '', motivo: '', productos: [] }

export function InventarioConteoCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (hayCambios: boolean) => void }) {
  const [formulario, setFormulario] = useState<Formulario>(inicial)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { const controlador = new AbortController(); void listarUbicacionesInventario(true, controlador.signal).then(setUbicaciones).catch(() => { if (!controlador.signal.aborted) setError('No fue posible cargar las ubicaciones.') }); return () => controlador.abort() }, [])
  const tieneCambios = Boolean(formulario.referencia || formulario.ubicacionId || formulario.motivo || formulario.productos.length || formulario.tipo !== 'GENERAL')
  useEffect(() => { onCambiosPendientes(tieneCambios && !guardando); return () => onCambiosPendientes(false) }, [guardando, onCambiosPendientes, tieneCambios])
  const crear = async () => {
    const siguientes: Record<string, string> = {}
    if (formulario.referencia.trim().length < 3) siguientes.referencia = 'Ingresa una referencia de al menos 3 caracteres.'
    if (!formulario.ubicacionId) siguientes.ubicacionId = 'Selecciona una ubicación.'
    if (formulario.motivo.trim().length < 10) siguientes.motivo = 'Explica el motivo con al menos 10 caracteres.'
    if (formulario.tipo !== 'GENERAL' && !formulario.productos.length) siguientes.productos = 'Agrega al menos un medicamento.'
    setErrores(siguientes); const primero = Object.keys(siguientes)[0]
    if (primero) { window.requestAnimationFrame(() => document.getElementById(`conteo-${primero}`)?.focus()); return }
    setGuardando(true)
    try { const conteo = await crearConteoInventario({ referencia: formulario.referencia.trim().toUpperCase(), tipo: formulario.tipo, ubicacionId: formulario.ubicacionId, motivo: formulario.motivo.trim(), productoIds: formulario.tipo === 'GENERAL' ? [] : formulario.productos.map((item) => item.producto.id) }); onCambiosPendientes(false); onNavegar(`/inventario/conteos/${conteo.id}`) }
    catch (errorActual) { setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible iniciar el conteo.') }
    finally { setGuardando(false) }
  }
  const disponibles = ubicaciones.filter((item) => item.activa && !item.bloqueadaPorConteoId)
  return <section className={styles.pagina} aria-labelledby="titulo-nuevo-conteo"><header className={styles.cabecera}><InventarioBreadcrumb actual="Nuevo conteo físico" onNavegar={onNavegar} /><h1 id="titulo-nuevo-conteo">Nuevo conteo físico</h1></header><form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); void crear() }} noValidate><fieldset><legend>Información del conteo</legend><div className={styles.grillaFormulario}><div className={styles.campo}><label htmlFor="conteo-referencia">Referencia *</label><input id="conteo-referencia" value={formulario.referencia} maxLength={50} aria-invalid={Boolean(errores.referencia)} onChange={(evento) => setFormulario((actual) => ({ ...actual, referencia: evento.target.value }))} />{errores.referencia && <span className={styles.campoError}>{errores.referencia}</span>}</div><div className={styles.campo}><label htmlFor="conteo-tipo">Tipo *</label><select id="conteo-tipo" value={formulario.tipo} onChange={(evento) => { const tipo = evento.target.value as TipoConteoInventario; setFormulario((actual) => ({ ...actual, tipo, productos: tipo === 'GENERAL' ? [] : actual.productos })) }}><option value="GENERAL">General</option><option value="SELECTIVO">Selectivo</option><option value="ROTATIVO">Rotativo</option></select></div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-ubicacionId">Ubicación *</label><select id="conteo-ubicacionId" value={formulario.ubicacionId} aria-invalid={Boolean(errores.ubicacionId)} onChange={(evento) => setFormulario((actual) => ({ ...actual, ubicacionId: evento.target.value, productos: [] }))}><option value="">Selecciona una ubicación disponible</option>{disponibles.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select>{errores.ubicacionId && <span className={styles.campoError}>{errores.ubicacionId}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-motivo">Motivo *</label><textarea id="conteo-motivo" value={formulario.motivo} maxLength={500} aria-invalid={Boolean(errores.motivo)} onChange={(evento) => setFormulario((actual) => ({ ...actual, motivo: evento.target.value }))} />{errores.motivo && <span className={styles.campoError}>{errores.motivo}</span>}</div>{formulario.tipo !== 'GENERAL' && <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="conteo-productos">Medicamentos incluidos *</label><SelectorProductoInventario id="conteo-productos" valor={null} soloConExistencia ubicacionId={formulario.ubicacionId || undefined} deshabilitado={!formulario.ubicacionId} onChange={(producto) => { if (!producto || formulario.productos.some((item) => item.producto.id === producto.producto.id)) return; setFormulario((actual) => ({ ...actual, productos: [...actual.productos, producto] })); setErrores((actual) => ({ ...actual, productos: '' })) }} invalido={Boolean(errores.productos)} />{errores.productos && <span className={styles.campoError}>{errores.productos}</span>}{formulario.productos.length > 0 && <ul className={styles.listaSeleccion}>{formulario.productos.map((item) => <li key={item.producto.id}><span><strong>{item.producto.nombre}</strong><small>{item.producto.codigo}</small></span><button type="button" aria-label={`Quitar ${item.producto.nombre}`} onClick={() => setFormulario((actual) => ({ ...actual, productos: actual.productos.filter((producto) => producto.producto.id !== item.producto.id) }))}><img src={iconoEliminar} alt="" /></button></li>)}</ul>}</div>}</div></fieldset><div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/conteos')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Iniciando…' : 'Iniciar conteo'}</button></div></form><ModalEstado abierto={Boolean(error)} tipo="error" titulo="No se pudo iniciar el conteo" mensaje={error ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setError(null)} onCerrar={() => setError(null)} /></section>
}
