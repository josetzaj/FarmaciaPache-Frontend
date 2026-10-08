import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerRol } from '../rol-api'
import type { PermisoRol, Rol } from '../rol.types'
import { RolAuditoria } from './rol-auditoria'
import { RolBreadcrumb } from './rol-breadcrumb'
import { RolInactivarModal } from './rol-inactivar-modal'
import styles from './rol-gestion.module.css'

type RolDetalleViewProps = {
  rolId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}

function fechaHora(valor: string | null): string {
  if (!valor) return 'Sin registro'
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(valor))
}

export function RolDetalleView({ rolId, permisos, onNavegar }: RolDetalleViewProps) {
  const [rol, setRol] = useState<Rol | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reintento, setReintento] = useState(0)
  const [confirmarInactivacion, setConfirmarInactivacion] = useState(false)
  const [exitoInactivacion, setExitoInactivacion] = useState(false)
  const puedeEditar = permisos.includes('SEGURIDAD.ROLES.ACTUALIZAR')
  const puedeInactivar = permisos.includes('SEGURIDAD.ROLES.INACTIVAR')
  const puedeVerAuditoria = permisos.includes('SEGURIDAD.ROLES.VER_AUDITORIA')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerRol(rolId, controlador.signal)
      .then((respuesta) => { setRol(respuesta); setError(null) })
      .catch((errorActual: unknown) => {
        if (!controlador.signal.aborted) setError(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar el rol.')
      })
    return () => controlador.abort()
  }, [reintento, rolId])

  const gruposPermisos = useMemo(() => {
    const grupos = new Map<string, PermisoRol[]>()
    for (const permiso of rol?.permisos ?? []) {
      const partes = permiso.codigo.split('.')
      const grupo = `${partes[0] ?? 'OTROS'} / ${partes[1] ?? 'GENERAL'}`
      if (!grupos.has(grupo)) grupos.set(grupo, [])
      grupos.get(grupo)!.push(permiso)
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rol])

  if (!rol) {
    return (
      <section className={styles.errorPagina}>
        <RolBreadcrumb actual="Detalle del rol" onNavegar={onNavegar} />
        <h1>{error ? 'No se pudo cargar el rol' : 'Cargando rol…'}</h1>
        <p>{error ?? 'Estamos consultando la información y los permisos asignados.'}</p>
        {error && <div><button type="button" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => onNavegar('/seguridad/roles')}>Ver listado</button></div>}
      </section>
    )
  }

  return (
    <section className={styles.pagina}>
      <RolBreadcrumb actual="Detalle del rol" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div className={styles.perfilRol}>
          <span className={styles.iconoRol} aria-hidden="true">{rol.nombre.trim().slice(0, 2).toUpperCase()}</span>
          <div><p>Rol {rol.codigo}</p><h1>{rol.nombre}</h1><span className={`${styles.estado} ${rol.activo ? styles.activo : styles.inactivo}`}>{rol.activo ? 'Activo' : 'Inactivo'}</span></div>
        </div>
        <div className={styles.accionesCabecera}>
          {puedeEditar && <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/seguridad/roles/${rol.id}/editar`)}><IconoAccion nombre="editar" /><span>Editar información</span></button>}
          {puedeInactivar && rol.activo && rol.codigo !== 'SUPERADMIN' && <button className={styles.botonPeligro} type="button" onClick={() => setConfirmarInactivacion(true)}><IconoAccion nombre="desactivar" /><span>Desactivar rol</span></button>}
        </div>
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}>
          <h2>Información general</h2>
          <dl>
            <div><dt>Código</dt><dd>{rol.codigo}</dd></div>
            <div><dt>Estado</dt><dd>{rol.activo ? 'Activo' : 'Inactivo'}</dd></div>
            <div className={styles.datoCompleto}><dt>Descripción</dt><dd>{rol.descripcion ?? 'Sin descripción'}</dd></div>
            {!rol.activo && <div className={styles.datoCompleto}><dt>Motivo de desactivación</dt><dd>{rol.motivoInactivacion ?? 'Sin motivo registrado'}</dd></div>}
          </dl>
        </article>
        <article className={styles.tarjetaDetalle}>
          <h2>Control del registro</h2>
          <dl>
            <div><dt>Creado</dt><dd>{fechaHora(rol.creadoEn)}</dd></div>
            <div><dt>Última actualización</dt><dd>{fechaHora(rol.actualizadoEn)}</dd></div>
            <div><dt>Versión</dt><dd>{rol.version}</dd></div>
            <div><dt>Total de permisos</dt><dd>{rol.permisos.length}</dd></div>
          </dl>
        </article>
      </div>

      <article className={styles.tarjetaDetalle}>
        <div className={styles.tituloSeccionDetalle}><div><h2>Permisos asignados</h2><p>Acciones habilitadas para los usuarios que tengan este rol.</p></div><span>{rol.permisos.length}</span></div>
        {gruposPermisos.length ? <div className={styles.gruposPermisosDetalle}>{gruposPermisos.map(([grupo, permisosGrupo]) => (
          <section key={grupo}><h3>{grupo}</h3><ul>{permisosGrupo.map((permiso) => <li key={permiso.id}><strong>{permiso.nombre}</strong><small>{permiso.codigo}</small></li>)}</ul></section>
        ))}</div> : <p className={styles.sinHistorial}>Este rol no tiene permisos asignados.</p>}
      </article>

      {puedeVerAuditoria && <RolAuditoria rolId={rol.id} revision={rol.version} />}

      <RolInactivarModal rol={confirmarInactivacion ? rol : null} onCerrar={() => setConfirmarInactivacion(false)} onInactivado={() => { setConfirmarInactivacion(false); setExitoInactivacion(true) }} />
      <ModalEstado abierto={exitoInactivacion} tipo="exito" titulo="Rol desactivado" mensaje={`El rol ${rol.nombre} fue desactivado correctamente.`} textoAccionPrincipal="Aceptar" onAccionPrincipal={() => onNavegar('/seguridad/roles')} onCerrar={() => onNavegar('/seguridad/roles')} />
    </section>
  )
}
