import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { configurarPoliticaStockInventario, listarUbicacionesInventario } from '../inventario-api'
import type { ExistenciaProducto, UbicacionInventario } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import { SelectorProductoInventario } from './selector-producto-inventario'
import styles from './inventario.module.css'

type Formulario = { producto: ExistenciaProducto | null; ubicacionId: string; stockMinimo: string; stockMaximo: string; stockSeguridad: string; puntoReposicion: string }
const inicial: Formulario = { producto: null, ubicacionId: '', stockMinimo: '0', stockMaximo: '', stockSeguridad: '0', puntoReposicion: '' }
const cantidadValida = (valor: string) => /^\d+(?:\.\d{1,6})?$/.test(valor.trim()) && Number(valor) <= 999_999_999_999

export function InventarioPoliticaCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (hayCambios: boolean) => void }) {
  const [formulario, setFormulario] = useState<Formulario>(inicial)
  const [ubicaciones, setUbicaciones] = useState<UbicacionInventario[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  useEffect(() => { const controlador = new AbortController(); void listarUbicacionesInventario(true, controlador.signal).then(setUbicaciones).catch(() => { if (!controlador.signal.aborted) setMensaje({ tipo: 'error', texto: 'No fue posible cargar las ubicaciones.' }) }); return () => controlador.abort() }, [])
  const tieneCambios = Boolean(formulario.producto || formulario.ubicacionId || formulario.stockMinimo !== '0' || formulario.stockMaximo || formulario.stockSeguridad !== '0' || formulario.puntoReposicion)
  useEffect(() => { onCambiosPendientes(tieneCambios && !guardando); return () => onCambiosPendientes(false) }, [guardando, onCambiosPendientes, tieneCambios])

  const guardar = async () => {
    const siguientes: Record<string, string> = {}
    if (!formulario.producto) siguientes.producto = 'Selecciona un medicamento.'
    if (!cantidadValida(formulario.stockMinimo)) siguientes.stockMinimo = 'Ingresa una cantidad válida, con máximo seis decimales.'
    if (!cantidadValida(formulario.stockSeguridad)) siguientes.stockSeguridad = 'Ingresa una cantidad válida, con máximo seis decimales.'
    if (formulario.stockMaximo && !cantidadValida(formulario.stockMaximo)) siguientes.stockMaximo = 'Ingresa una cantidad válida o deja el campo vacío.'
    if (formulario.puntoReposicion && !cantidadValida(formulario.puntoReposicion)) siguientes.puntoReposicion = 'Ingresa una cantidad válida o deja el campo vacío.'
    if (!siguientes.stockMaximo && formulario.stockMaximo && Number(formulario.stockMaximo) < Number(formulario.stockMinimo)) siguientes.stockMaximo = 'Debe ser igual o superior al stock mínimo.'
    if (!siguientes.puntoReposicion && formulario.puntoReposicion && Number(formulario.puntoReposicion) < Number(formulario.stockSeguridad)) siguientes.puntoReposicion = 'Debe ser igual o superior al stock de seguridad.'
    setErrores(siguientes); const primero = Object.keys(siguientes)[0]
    if (primero) { window.requestAnimationFrame(() => document.getElementById(`politica-${primero}`)?.focus()); return }
    setGuardando(true)
    try { const guardada = await configurarPoliticaStockInventario({ productoId: formulario.producto!.producto.id, ubicacionId: formulario.ubicacionId || null, stockMinimo: Number(formulario.stockMinimo), stockMaximo: formulario.stockMaximo ? Number(formulario.stockMaximo) : null, stockSeguridad: Number(formulario.stockSeguridad), puntoReposicion: formulario.puntoReposicion ? Number(formulario.puntoReposicion) : null, version: null }); onCambiosPendientes(false); setMensaje({ tipo: 'exito', texto: `La política de ${guardada.producto.nombre} fue creada correctamente.` }) }
    catch (errorActual) { setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible crear la política.' }) }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-nueva-politica"><header className={styles.cabecera}><InventarioBreadcrumb actual="Nueva política de stock" onNavegar={onNavegar} /><h1 id="titulo-nueva-politica">Nueva política de stock</h1></header><form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); void guardar() }} noValidate><fieldset><legend>Medicamento y alcance</legend><div className={styles.grillaFormulario}><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="politica-producto">Medicamento *</label><SelectorProductoInventario id="politica-producto" valor={formulario.producto} soloConExistencia={false} invalido={Boolean(errores.producto)} onChange={(producto) => setFormulario((actual) => ({ ...actual, producto }))} />{errores.producto && <span className={styles.campoError}>{errores.producto}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="politica-ubicacionId">Alcance</label><select id="politica-ubicacionId" value={formulario.ubicacionId} onChange={(evento) => setFormulario((actual) => ({ ...actual, ubicacionId: evento.target.value }))}><option value="">Toda la sucursal</option>{ubicaciones.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo}){!item.activa ? ' · Inactiva' : ''}</option>)}</select></div></div></fieldset><fieldset><legend>Parámetros de reposición</legend><div className={styles.grillaFormulario}>{([['stockMinimo', 'Stock mínimo *'], ['stockSeguridad', 'Stock de seguridad *'], ['puntoReposicion', 'Punto de reposición'], ['stockMaximo', 'Stock máximo']] as const).map(([campo, etiqueta]) => <div className={styles.campo} key={campo}><label htmlFor={`politica-${campo}`}>{etiqueta}</label><input id={`politica-${campo}`} type="number" min="0" step="0.000001" value={formulario[campo]} aria-invalid={Boolean(errores[campo])} onChange={(evento) => setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }))} />{errores[campo] && <span className={styles.campoError}>{errores[campo]}</span>}</div>)}</div></fieldset><div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/politicas')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : 'Guardar política'}</button></div></form><ModalEstado abierto={Boolean(mensaje)} tipo={mensaje?.tipo ?? 'informacion'} titulo={mensaje?.tipo === 'exito' ? 'Política creada' : 'No se pudo crear'} mensaje={mensaje?.texto ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => mensaje?.tipo === 'exito' ? onNavegar('/inventario/politicas') : setMensaje(null)} onCerrar={() => mensaje?.tipo === 'exito' ? onNavegar('/inventario/politicas') : setMensaje(null)} /></section>
}
