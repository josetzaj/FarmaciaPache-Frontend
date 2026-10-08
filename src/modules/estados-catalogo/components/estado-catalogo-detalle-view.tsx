import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerEstadoCatalogo } from '../estado-catalogo-api'
import type { EstadoCatalogo } from '../estado-catalogo.types'
import { EstadoCatalogoAuditoria } from './estado-catalogo-auditoria'
import { EstadoCatalogoBreadcrumb } from './estado-catalogo-breadcrumb'
import { EstadoCatalogoInactivarModal } from './estado-catalogo-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { estadoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }
function fechaHora(valor: string | null): string { if (!valor) return 'Sin registro'; return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) }

export function EstadoCatalogoDetalleView({ estadoId, permisos, onNavegar }: Props) {
  const [estado, setEstado] = useState<EstadoCatalogo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)
  const puedeEditar = permisos.includes('CATALOGOS.ESTADOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('CATALOGOS.ESTADOS.INACTIVAR')
  const puedeVerAuditoria = permisos.includes('CATALOGOS.ESTADOS.VER_AUDITORIA')
  useEffect(() => { const controlador = new AbortController(); void obtenerEstadoCatalogo(estadoId, controlador.signal).then((respuesta) => { setEstado(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el estado.') }); return () => controlador.abort() }, [estadoId, revision])

  if (!estado) return <section className={styles.errorPagina}><EstadoCatalogoBreadcrumb actual="Detalle del estado" onNavegar={onNavegar} /><h1>{error ? 'No se pudo cargar el estado' : 'Cargando estado…'}</h1><p>{error ?? 'Estamos consultando la información.'}</p>{error && <div><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => onNavegar('/catalogos/estados')}>Ver listado</button></div>}</section>

  return <section className={styles.pagina}><EstadoCatalogoBreadcrumb actual="Detalle del estado" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div className={styles.perfilRol}><span className={styles.iconoRol} aria-hidden="true">{estado.nombre.trim().slice(0, 2).toUpperCase()}</span><div><p>Estado {estado.codigo}</p><h1>{estado.nombre}</h1><span className={`${styles.estado} ${estado.activo ? styles.activo : styles.inactivo}`}>{estado.activo ? 'Activo' : 'Inactivo'}</span></div></div><div className={styles.accionesCabecera}>{puedeEditar && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/catalogos/estados/${estado.id}/editar`)}><IconoAccion nombre="editar" /><span>Editar información</span></button>}{puedeInactivar && estado.activo && <button className={styles.botonPeligro} type="button" onClick={() => setConfirmar(true)}><IconoAccion nombre="desactivar" /><span>Desactivar estado</span></button>}</div></header>
    <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Información general</h2><dl><div><dt>Código</dt><dd>{estado.codigo}</dd></div><div><dt>Situación</dt><dd>{estado.activo ? 'Activo' : 'Inactivo'}</dd></div><div className={styles.datoCompleto}><dt>Descripción</dt><dd>{estado.descripcion ?? 'Sin descripción'}</dd></div>{!estado.activo && <div className={styles.datoCompleto}><dt>Motivo de desactivación</dt><dd>{estado.motivoInactivacion ?? 'Sin motivo registrado'}</dd></div>}</dl></article><article className={styles.tarjetaDetalle}><h2>Control del registro</h2><dl><div><dt>Creado</dt><dd>{fechaHora(estado.creadoEn)}</dd></div><div><dt>Última actualización</dt><dd>{fechaHora(estado.actualizadoEn)}</dd></div><div><dt>Desactivado</dt><dd>{fechaHora(estado.inactivadoEn)}</dd></div><div><dt>Versión</dt><dd>{estado.version}</dd></div></dl></article></div>
    {puedeVerAuditoria && <EstadoCatalogoAuditoria estadoId={estado.id} revision={estado.version} />}
    <EstadoCatalogoInactivarModal estado={confirmar ? estado : null} onCerrar={() => setConfirmar(false)} onInactivado={() => { setConfirmar(false); setExito(true) }} />
    <ModalEstado abierto={exito} tipo="exito" titulo="Estado desactivado" mensaje={`El estado ${estado.nombre} fue desactivado correctamente.`} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/catalogos/estados')} onCerrar={() => onNavegar('/catalogos/estados')} />
  </section>
}
