import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { crearUbicacionInventario } from '../inventario-api'
import type { GuardarUbicacionInventarioRequest, TipoUbicacionInventario } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

const tipos: Array<{ valor: TipoUbicacionInventario; etiqueta: string }> = [
  { valor: 'VENTA', etiqueta: 'Área de venta' }, { valor: 'BODEGA', etiqueta: 'Bodega' },
  { valor: 'RECEPCION', etiqueta: 'Recepción' }, { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'DEVOLUCIONES', etiqueta: 'Devoluciones' }, { valor: 'TRANSITO', etiqueta: 'Tránsito' },
  { valor: 'DESTRUCCION', etiqueta: 'Destrucción' },
]

const inicial: GuardarUbicacionInventarioRequest = { codigo: '', nombre: '', tipo: 'BODEGA', descripcion: null }

export function InventarioUbicacionCrearView({ onNavegar, onCambiosPendientes }: { onNavegar: (ruta: string) => void; onCambiosPendientes: (hayCambios: boolean) => void }) {
  const [formulario, setFormulario] = useState(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const tieneCambios = formulario.codigo !== '' || formulario.nombre !== '' || formulario.tipo !== 'BODEGA' || Boolean(formulario.descripcion)
  const guardadoExitoso = mensaje?.tipo === 'exito'
  useEffect(() => { onCambiosPendientes(tieneCambios && !guardando && !guardadoExitoso); return () => onCambiosPendientes(false) }, [guardadoExitoso, guardando, onCambiosPendientes, tieneCambios])

  const guardar = async () => {
    const siguientes: Record<string, string> = {}
    if (!/^[A-Za-z0-9_-]{2,30}$/.test(formulario.codigo.trim())) siguientes.codigo = 'Usa de 2 a 30 letras, números, guion o guion bajo.'
    if (formulario.nombre.trim().length < 2) siguientes.nombre = 'Escribe un nombre de al menos 2 caracteres.'
    if ((formulario.descripcion?.trim().length ?? 0) > 300) siguientes.descripcion = 'La descripción no puede superar 300 caracteres.'
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) { window.requestAnimationFrame(() => document.getElementById(`ubicacion-${primero}`)?.focus()); return }
    setGuardando(true)
    try {
      const guardada = await crearUbicacionInventario({ codigo: formulario.codigo.trim().toUpperCase(), nombre: formulario.nombre.trim(), tipo: formulario.tipo, descripcion: formulario.descripcion?.trim() || null })
      onCambiosPendientes(false)
      setMensaje({ tipo: 'exito', texto: `La ubicación ${guardada.nombre} fue creada correctamente.` })
    } catch (errorActual) { setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible crear la ubicación.' }) }
    finally { setGuardando(false) }
  }

  return <section className={styles.pagina} aria-labelledby="titulo-nueva-ubicacion">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Nueva ubicación" onNavegar={onNavegar} /><h1 id="titulo-nueva-ubicacion">Nueva ubicación</h1></header>
    <form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); void guardar() }} noValidate><fieldset><legend>Información de la ubicación</legend><div className={styles.grillaFormulario}><div className={styles.campo}><label htmlFor="ubicacion-codigo">Código *</label><input id="ubicacion-codigo" value={formulario.codigo} maxLength={30} aria-invalid={Boolean(errores.codigo)} onChange={(evento) => setFormulario((actual) => ({ ...actual, codigo: evento.target.value.toUpperCase() }))} />{errores.codigo && <span className={styles.campoError}>{errores.codigo}</span>}</div><div className={styles.campo}><label htmlFor="ubicacion-tipo">Tipo *</label><select id="ubicacion-tipo" value={formulario.tipo} onChange={(evento) => setFormulario((actual) => ({ ...actual, tipo: evento.target.value as TipoUbicacionInventario }))}>{tipos.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}</select></div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ubicacion-nombre">Nombre *</label><input id="ubicacion-nombre" value={formulario.nombre} maxLength={150} aria-invalid={Boolean(errores.nombre)} onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} />{errores.nombre && <span className={styles.campoError}>{errores.nombre}</span>}</div><div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ubicacion-descripcion">Descripción</label><textarea id="ubicacion-descripcion" value={formulario.descripcion ?? ''} maxLength={300} aria-invalid={Boolean(errores.descripcion)} onChange={(evento) => setFormulario((actual) => ({ ...actual, descripcion: evento.target.value || null }))} />{errores.descripcion && <span className={styles.campoError}>{errores.descripcion}</span>}</div></div></fieldset><div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" onClick={() => onNavegar('/inventario/ubicaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : 'Guardar ubicación'}</button></div></form>
    <ModalEstado abierto={Boolean(mensaje)} tipo={mensaje?.tipo ?? 'informacion'} titulo={mensaje?.tipo === 'exito' ? 'Ubicación creada' : 'No se pudo crear'} mensaje={mensaje?.texto ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => mensaje?.tipo === 'exito' ? onNavegar('/inventario/ubicaciones') : setMensaje(null)} onCerrar={() => mensaje?.tipo === 'exito' ? onNavegar('/inventario/ubicaciones') : setMensaje(null)} />
  </section>
}
