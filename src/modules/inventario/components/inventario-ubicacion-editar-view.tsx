import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarUbicacionInventario, listarUbicacionesInventario } from '../inventario-api'
import type { GuardarUbicacionInventarioRequest, TipoUbicacionInventario, UbicacionInventario } from '../inventario.types'
import { InventarioBreadcrumb } from './inventario-breadcrumb'
import styles from './inventario.module.css'

type FormularioUbicacion = GuardarUbicacionInventarioRequest & { activa: boolean }

const tipos: Array<{ valor: TipoUbicacionInventario; etiqueta: string }> = [
  { valor: 'VENTA', etiqueta: 'Área de venta' },
  { valor: 'BODEGA', etiqueta: 'Bodega' },
  { valor: 'RECEPCION', etiqueta: 'Recepción' },
  { valor: 'CUARENTENA', etiqueta: 'Cuarentena' },
  { valor: 'DEVOLUCIONES', etiqueta: 'Devoluciones' },
  { valor: 'TRANSITO', etiqueta: 'Tránsito' },
  { valor: 'DESTRUCCION', etiqueta: 'Destrucción' },
]

function datosFormulario(ubicacion: UbicacionInventario): FormularioUbicacion {
  return {
    codigo: ubicacion.codigo,
    nombre: ubicacion.nombre,
    tipo: ubicacion.tipo,
    descripcion: ubicacion.descripcion,
    activa: ubicacion.activa,
  }
}

function validar(datos: FormularioUbicacion): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(datos.codigo.trim())) errores.codigo = 'Usa de 2 a 30 letras, números, guion o guion bajo.'
  if (datos.nombre.trim().length < 2) errores.nombre = 'Escribe un nombre de al menos 2 caracteres.'
  if (datos.nombre.trim().length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.'
  if ((datos.descripcion?.trim().length ?? 0) > 300) errores.descripcion = 'La descripción no puede superar 300 caracteres.'
  return errores
}

export function InventarioUbicacionEditarView({
  ubicacionId,
  onNavegar,
  onCambiosPendientes,
}: {
  ubicacionId: string
  onNavegar: (ruta: string) => void
  onCambiosPendientes: (hayCambios: boolean) => void
}) {
  const [ubicacion, setUbicacion] = useState<UbicacionInventario | null>(null)
  const [formulario, setFormulario] = useState<FormularioUbicacion | null>(null)
  const [iniciales, setIniciales] = useState<FormularioUbicacion | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [revision, setRevision] = useState(0)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [sinCambios, setSinCambios] = useState(false)

  useEffect(() => {
    const controlador = new AbortController()
    void listarUbicacionesInventario(true, controlador.signal)
      .then((ubicaciones) => {
        const encontrada = ubicaciones.find((item) => item.id === ubicacionId)
        if (!encontrada) {
          setUbicacion(null)
          setFormulario(null)
          setIniciales(null)
          setMensaje({ tipo: 'error', texto: 'La ubicación solicitada no existe en la sucursal de la sesión.' })
          return
        }
        const datos = datosFormulario(encontrada)
        setUbicacion(encontrada)
        setFormulario(datos)
        setIniciales(datos)
        setMensaje(null)
      })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar la ubicación.' })
      })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [revision, ubicacionId])

  const tieneCambios = useMemo(
    () => Boolean(formulario && iniciales && JSON.stringify(formulario) !== JSON.stringify(iniciales)),
    [formulario, iniciales],
  )
  const guardadoExitoso = mensaje?.tipo === 'exito'
  useEffect(() => { onCambiosPendientes(tieneCambios && !guardadoExitoso) }, [guardadoExitoso, onCambiosPendientes, tieneCambios])
  useEffect(() => () => onCambiosPendientes(false), [onCambiosPendientes])

  const guardar = async () => {
    if (!formulario || !ubicacion) return
    const siguientes = validar(formulario)
    setErrores(siguientes)
    const primero = Object.keys(siguientes)[0]
    if (primero) {
      window.requestAnimationFrame(() => document.getElementById(`ubicacion-${primero}`)?.focus())
      return
    }
    if (!tieneCambios) {
      setSinCambios(true)
      return
    }
    setGuardando(true)
    try {
      const actualizada = await actualizarUbicacionInventario(ubicacion.id, {
        codigo: formulario.codigo.trim().toUpperCase(),
        nombre: formulario.nombre.trim(),
        tipo: formulario.tipo,
        descripcion: formulario.descripcion?.trim() || null,
        activa: formulario.activa,
        version: ubicacion.version,
      })
      const datos = datosFormulario(actualizada)
      setUbicacion(actualizada)
      setFormulario(datos)
      setIniciales(datos)
      onCambiosPendientes(false)
      setMensaje({ tipo: 'exito', texto: `La ubicación ${actualizada.nombre} fue actualizada correctamente.` })
    } catch (errorActual) {
      setMensaje({ tipo: 'error', texto: errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible actualizar la ubicación.' })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <section className={styles.pagina}><InventarioBreadcrumb actual="Editar ubicación" anterior={{ etiqueta: 'Ubicaciones', ruta: '/inventario/ubicaciones' }} onNavegar={onNavegar} /><h1>Editando ubicación…</h1></section>
  }

  if (!formulario || !ubicacion) {
    return <section className={styles.pagina}><InventarioBreadcrumb actual="Editar ubicación" anterior={{ etiqueta: 'Ubicaciones', ruta: '/inventario/ubicaciones' }} onNavegar={onNavegar} /><div className={styles.alertaError} role="alert"><p>{mensaje?.texto ?? 'No fue posible cargar la ubicación.'}</p><button type="button" onClick={() => { setCargando(true); setRevision((valor) => valor + 1) }}>Reintentar</button></div></section>
  }

  return <section className={styles.pagina} aria-labelledby="titulo-editar-ubicacion">
    <header className={styles.cabecera}><InventarioBreadcrumb actual="Editar ubicación" anterior={{ etiqueta: 'Ubicaciones', ruta: '/inventario/ubicaciones' }} onNavegar={onNavegar} /><div><h1 id="titulo-editar-ubicacion">Editar ubicación</h1><p>{ubicacion.nombre} ({ubicacion.codigo})</p></div></header>
    <form className={styles.formularioOperacion} onSubmit={(evento) => { evento.preventDefault(); void guardar() }} noValidate>
      <fieldset disabled={guardando}>
        <legend>Información de la ubicación</legend>
        <div className={styles.grillaFormulario}>
          <div className={styles.campo}><label htmlFor="ubicacion-codigo">Código *</label><input id="ubicacion-codigo" value={formulario.codigo} maxLength={30} aria-invalid={Boolean(errores.codigo)} onChange={(evento) => setFormulario((actual) => actual ? { ...actual, codigo: evento.target.value.toUpperCase() } : actual)} />{errores.codigo && <span className={styles.campoError}>{errores.codigo}</span>}</div>
          <div className={styles.campo}><label htmlFor="ubicacion-tipo">Tipo *</label><select id="ubicacion-tipo" value={formulario.tipo} onChange={(evento) => setFormulario((actual) => actual ? { ...actual, tipo: evento.target.value as TipoUbicacionInventario } : actual)}>{tipos.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}</select></div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ubicacion-nombre">Nombre *</label><input id="ubicacion-nombre" value={formulario.nombre} maxLength={150} aria-invalid={Boolean(errores.nombre)} onChange={(evento) => setFormulario((actual) => actual ? { ...actual, nombre: evento.target.value } : actual)} />{errores.nombre && <span className={styles.campoError}>{errores.nombre}</span>}</div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="ubicacion-descripcion">Descripción</label><textarea id="ubicacion-descripcion" value={formulario.descripcion ?? ''} maxLength={300} aria-invalid={Boolean(errores.descripcion)} onChange={(evento) => setFormulario((actual) => actual ? { ...actual, descripcion: evento.target.value || null } : actual)} />{errores.descripcion && <span className={styles.campoError}>{errores.descripcion}</span>}</div>
          <div className={`${styles.campo} ${styles.campoCompleto}`}><label><input type="checkbox" checked={formulario.activa} onChange={(evento) => setFormulario((actual) => actual ? { ...actual, activa: evento.target.checked } : actual)} /> Ubicación activa</label></div>
        </div>
      </fieldset>
      <div className={styles.accionesFormulario}><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/inventario/ubicaciones')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando}><IconoAccion nombre="guardar" />{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
    <ModalEstado abierto={mensaje?.tipo === 'exito'} tipo="exito" titulo="Ubicación actualizada" mensaje={mensaje?.texto ?? ''} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/inventario/ubicaciones')} onCerrar={() => onNavegar('/inventario/ubicaciones')} />
    <ModalEstado abierto={mensaje?.tipo === 'error'} tipo="error" titulo="No se pudo actualizar" mensaje={mensaje?.texto ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />
    <ModalEstado abierto={sinCambios} tipo="informacion" titulo="Sin cambios por guardar" mensaje="No se editó ninguna información." textoAccionPrincipal="Volver al listado" onAccionPrincipal={() => onNavegar('/inventario/ubicaciones')} textoAccionSecundaria="Seguir editando" onAccionSecundaria={() => setSinCambios(false)} onCerrar={() => setSinCambios(false)} />
  </section>
}
