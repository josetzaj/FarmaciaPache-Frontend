import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerPuesto } from '../puesto-api'
import type { Puesto } from '../puesto.types'
import { PuestoAuditoria } from './puesto-auditoria'
import { PuestoBreadcrumb } from './puesto-breadcrumb'
import { PuestoInactivarModal } from './puesto-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'

type Props = { puestoId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }
function fechaHora(valor: string | null): string { if (!valor) return 'Sin registro'; return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor)) }

export function PuestoDetalleView({ puestoId, permisos, onNavegar }: Props) {
  const [puesto, setPuesto] = useState<Puesto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)
  const puedeEditar = permisos.includes('ORGANIZACION.PUESTOS.ACTUALIZAR')
  const puedeInactivar = permisos.includes('ORGANIZACION.PUESTOS.INACTIVAR')
  const puedeVerAuditoria = permisos.includes('ORGANIZACION.PUESTOS.VER_AUDITORIA')
  useEffect(() => { const controlador = new AbortController(); void obtenerPuesto(puestoId, controlador.signal).then((respuesta) => { setPuesto(respuesta); setError(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el puesto.') }); return () => controlador.abort() }, [puestoId, revision])
  if (!puesto) return <section className={styles.errorPagina}><PuestoBreadcrumb actual="Detalle del puesto" onNavegar={onNavegar} /><h1>{error ? 'No se pudo cargar el puesto' : 'Cargando puesto…'}</h1><p>{error ?? 'Estamos consultando la información.'}</p>{error && <div><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => onNavegar('/organizacion/puestos')}>Ver listado</button></div>}</section>
  return <section className={styles.pagina}><PuestoBreadcrumb actual="Detalle del puesto" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div className={styles.perfilRol}><span className={styles.iconoRol} aria-hidden="true">{puesto.nombre.trim().slice(0, 2).toUpperCase()}</span><div><p>Puesto {puesto.codigo}</p><h1>{puesto.nombre}</h1><span className={`${styles.estado} ${puesto.activo ? styles.activo : styles.inactivo}`}>{puesto.activo ? 'Activo' : 'Inactivo'}</span></div></div><div className={styles.accionesCabecera}>{puedeEditar && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/organizacion/puestos/${puesto.id}/editar`)}><IconoAccion nombre="editar" /><span>Editar información</span></button>}{puedeInactivar && puesto.activo && <button className={styles.botonPeligro} type="button" onClick={() => setConfirmar(true)}><IconoAccion nombre="desactivar" /><span>Desactivar puesto</span></button>}</div></header><div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Información general</h2><dl><div><dt>Código</dt><dd>{puesto.codigo}</dd></div><div><dt>Situación</dt><dd>{puesto.activo ? 'Activo' : 'Inactivo'}</dd></div><div className={styles.datoCompleto}><dt>Departamento organizacional</dt><dd>{puesto.departamentoOrganizacionalCodigo} — {puesto.departamentoOrganizacionalNombre}</dd></div><div className={styles.datoCompleto}><dt>Descripción</dt><dd>{puesto.descripcion ?? 'Sin descripción'}</dd></div>{!puesto.activo && <div className={styles.datoCompleto}><dt>Motivo de desactivación</dt><dd>{puesto.motivoInactivacion ?? 'Sin motivo registrado'}</dd></div>}</dl></article><article className={styles.tarjetaDetalle}><h2>Control del registro</h2><dl><div><dt>Creado</dt><dd>{fechaHora(puesto.creadoEn)}</dd></div><div><dt>Última actualización</dt><dd>{fechaHora(puesto.actualizadoEn)}</dd></div><div><dt>Desactivado</dt><dd>{fechaHora(puesto.inactivadoEn)}</dd></div><div><dt>Versión</dt><dd>{puesto.version}</dd></div></dl></article></div>{puedeVerAuditoria && <PuestoAuditoria puestoId={puesto.id} revision={puesto.version} />}<PuestoInactivarModal puesto={confirmar ? puesto : null} onCerrar={() => setConfirmar(false)} onInactivado={() => { setConfirmar(false); setExito(true) }} /><ModalEstado abierto={exito} tipo="exito" titulo="Puesto desactivado" mensaje={`El puesto ${puesto.nombre} fue desactivado correctamente.`} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/organizacion/puestos')} onCerrar={() => onNavegar('/organizacion/puestos')} /></section>
}
