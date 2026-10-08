import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerDepartamentoOrganizacional } from '../departamento-organizacional-api'
import type { DepartamentoOrganizacional } from '../departamento-organizacional.types'
import { DepartamentoOrganizacionalAuditoria } from './departamento-organizacional-auditoria'
import { DepartamentoOrganizacionalBreadcrumb } from './departamento-organizacional-breadcrumb'
import { DepartamentoOrganizacionalInactivarModal } from './departamento-organizacional-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { departamentoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }
function fechaHora(valor: string | null): string { if (!valor) return 'Sin registro'; return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) }

export function DepartamentoOrganizacionalDetalleView({ departamentoId, permisos, onNavegar }: Props) {
  const [departamento, setDepartamento] = useState<DepartamentoOrganizacional | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)
  const puedeEditar = permisos.includes('ORGANIZACION.DEPARTAMENTOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ORGANIZACION.DEPARTAMENTOS.INACTIVAR')
  const puedeVerAuditoria = permisos.includes('ORGANIZACION.DEPARTAMENTOS.VER_AUDITORIA')
  useEffect(() => { const controlador = new AbortController(); void obtenerDepartamentoOrganizacional(departamentoId, controlador.signal).then((respuesta) => { setDepartamento(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el departamento.') }); return () => controlador.abort() }, [departamentoId, revision])
  if (!departamento) return <section className={styles.errorPagina}><DepartamentoOrganizacionalBreadcrumb actual="Detalle del departamento" onNavegar={onNavegar} /><h1>{error ? 'No se pudo cargar el departamento' : 'Cargando departamento…'}</h1><p>{error ?? 'Estamos consultando la información.'}</p>{error && <div><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => onNavegar('/organizacion/departamentos')}>Ver listado</button></div>}</section>
  return <section className={styles.pagina}><DepartamentoOrganizacionalBreadcrumb actual="Detalle del departamento" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div className={styles.perfilRol}><span className={styles.iconoRol} aria-hidden="true">{departamento.nombre.trim().slice(0, 2).toUpperCase()}</span><div><p>Departamento {departamento.codigo}</p><h1>{departamento.nombre}</h1><span className={`${styles.estado} ${departamento.activo ? styles.activo : styles.inactivo}`}>{departamento.activo ? 'Activo' : 'Inactivo'}</span></div></div><div className={styles.accionesCabecera}>{puedeEditar && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/organizacion/departamentos/${departamento.id}/editar`)}><IconoAccion nombre="editar" /><span>Editar información</span></button>}{puedeInactivar && departamento.activo && <button className={styles.botonPeligro} type="button" onClick={() => setConfirmar(true)}><IconoAccion nombre="desactivar" /><span>Desactivar departamento</span></button>}</div></header><div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Información general</h2><dl><div><dt>Código</dt><dd>{departamento.codigo}</dd></div><div><dt>Situación</dt><dd>{departamento.activo ? 'Activo' : 'Inactivo'}</dd></div><div className={styles.datoCompleto}><dt>Descripción</dt><dd>{departamento.descripcion ?? 'Sin descripción'}</dd></div>{!departamento.activo && <div className={styles.datoCompleto}><dt>Motivo de desactivación</dt><dd>{departamento.motivoInactivacion ?? 'Sin motivo registrado'}</dd></div>}</dl></article><article className={styles.tarjetaDetalle}><h2>Control del registro</h2><dl><div><dt>Creado</dt><dd>{fechaHora(departamento.creadoEn)}</dd></div><div><dt>Última actualización</dt><dd>{fechaHora(departamento.actualizadoEn)}</dd></div><div><dt>Desactivado</dt><dd>{fechaHora(departamento.inactivadoEn)}</dd></div><div><dt>Versión</dt><dd>{departamento.version}</dd></div></dl></article></div>{puedeVerAuditoria && <DepartamentoOrganizacionalAuditoria departamentoId={departamento.id} revision={departamento.version} />}<DepartamentoOrganizacionalInactivarModal departamento={confirmar ? departamento : null} onCerrar={() => setConfirmar(false)} onInactivado={() => { setConfirmar(false); setExito(true) }} /><ModalEstado abierto={exito} tipo="exito" titulo="Departamento desactivado" mensaje={`El departamento ${departamento.nombre} fue desactivado correctamente.`} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/departamentos')} onCerrar={() => onNavegar('/organizacion/departamentos')} /></section>
}
