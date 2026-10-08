import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarCliente, obtenerCliente } from '../comercial-api'
import type { ClienteComercial, GuardarClienteRequest } from '../comercial.types'
import { ComercialAuditoria } from './comercial-auditoria'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import { ConfirmarEstadoModal } from './confirmar-estado-modal'
import styles from './comercial.module.css'

function fechaHora(valor: string): string { return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) }
function baseCliente(cliente: ClienteComercial): GuardarClienteRequest { return { tipo: cliente.tipo, nombres: cliente.nombres ?? null, apellidos: cliente.apellidos ?? null, razonSocial: cliente.razonSocial ?? null, tipoIdentificacion: cliente.tipoIdentificacion, identificacion: cliente.identificacion, telefono: cliente.telefono, correo: cliente.correo, direccion: cliente.direccion ?? null } }

export function ClienteDetalleView({ clienteId, permisos, onNavegar }: { clienteId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [cliente, setCliente] = useState<ClienteComercial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [cambiarEstado, setCambiarEstado] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const puedeGestionar = permisos.includes('COMERCIAL.CLIENTES.ACTUALIZAR')
  const puedeVerAuditoria = permisos.includes('COMERCIAL.CLIENTES.VER_AUDITORIA')

  useEffect(() => { const controlador = new AbortController(); void obtenerCliente(clienteId, controlador.signal).then((actual) => { setCliente(actual); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar el cliente.') }); return () => controlador.abort() }, [clienteId, revision])
  if (error) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual="Detalle del cliente" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible cargar el cliente</h1><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!cliente) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual="Detalle del cliente" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando cliente</h1><p>Consultando sus datos y trazabilidad…</p></div></section>

  const confirmar = async (motivo: string) => {
    const actualizado = await actualizarCliente(cliente.id, { ...baseCliente(cliente), activo: !cliente.activo, version: cliente.version, motivo })
    setCliente(actualizado); setCambiarEstado(false); setMensajeExito(`${actualizado.nombre} quedó ${actualizado.activo ? 'activo' : 'inactivo'}.`); setRevision((valor) => valor + 1)
  }
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-detalle-cliente">
      <ComercialBreadcrumb seccion="Clientes" rutaListado="/clientes" actual="Detalle del cliente" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>{cliente.tipo === 'PERSONA' ? 'Persona' : 'Empresa'}</p><h1 id="titulo-detalle-cliente">{cliente.nombre}</h1><span className={`${styles.estado} ${cliente.activo ? styles.estadoActivo : styles.estadoInactivo}`}>{cliente.activo ? 'Activo' : 'Inactivo'}</span></div>{puedeGestionar && <div className={styles.accionesCabecera}><button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/clientes/${cliente.id}/editar`)}><IconoAccion nombre="editar" />Editar información</button><button className={cliente.activo ? styles.botonPeligro : styles.botonEstado} type="button" onClick={() => setCambiarEstado(true)}><IconoAccion nombre="estado" />{cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}</button></div>}</header>
      <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Identificación</h2><dl><div><dt>Tipo de cliente</dt><dd>{cliente.tipo === 'PERSONA' ? 'Persona' : 'Empresa'}</dd></div><div><dt>Tipo de identificación</dt><dd>{cliente.tipoIdentificacion ?? 'No registrado'}</dd></div><div><dt>Número</dt><dd>{cliente.identificacion ?? 'No registrado'}</dd></div><div><dt>Fecha de registro</dt><dd>{fechaHora(cliente.creadoEn)}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Contacto y origen</h2><dl><div><dt>Teléfono</dt><dd>{cliente.telefono ?? 'No registrado'}</dd></div><div><dt>Correo</dt><dd>{cliente.correo ?? 'No registrado'}</dd></div><div className={styles.datoCompleto}><dt>Dirección</dt><dd>{cliente.direccion ?? 'No registrada'}</dd></div><div className={styles.datoCompleto}><dt>Sucursal de registro</dt><dd>{cliente.sucursalRegistro ? `${cliente.sucursalRegistro.codigo} — ${cliente.sucursalRegistro.nombre}` : 'No disponible'}</dd></div></dl></article></div>
      {puedeVerAuditoria && <ComercialAuditoria recurso="clientes" entidadId={cliente.id} revision={revision} />}
    </section>
    <ConfirmarEstadoModal abierto={cambiarEstado} nombre={cliente.nombre} activar={!cliente.activo} entidad="cliente" onCerrar={() => setCambiarEstado(false)} onConfirmar={confirmar} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Estado actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </>
}
