import { useMemo, useState } from 'react'
import type { RolDisponibleUsuario } from '../usuario.types'
import type { ErroresFormularioUsuario, RolFormularioUsuario } from '../validacion-usuario'
import styles from './usuario-formulario.module.css'

type Props = {
  roles: readonly RolDisponibleUsuario[]
  seleccionados: readonly RolFormularioUsuario[]
  errores: ErroresFormularioUsuario
  deshabilitado: boolean
  onChange: (roles: RolFormularioUsuario[]) => void
}

export function SelectorRolesUsuario({
  roles,
  seleccionados,
  errores,
  deshabilitado,
  onChange,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const seleccion = useMemo(
    () => new Map(seleccionados.map((rol) => [rol.rolId, rol])),
    [seleccionados],
  )
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return termino
      ? roles.filter((rol) => `${rol.codigo} ${rol.nombre} ${rol.descripcion ?? ''}`.toLowerCase().includes(termino))
      : roles
  }, [busqueda, roles])

  const alternar = (rol: RolDisponibleUsuario) => {
    if (!rol.activo && !seleccion.has(rol.id)) return
    if (seleccion.has(rol.id)) {
      onChange(seleccionados.filter((item) => item.rolId !== rol.id))
      return
    }
    onChange([...seleccionados, { rolId: rol.id, vigenteHasta: '', indefinido: false }])
  }

  const cambiarVigencia = (rolId: string, vigenteHasta: string) => {
    onChange(seleccionados.map((rol) =>
      rol.rolId === rolId ? { ...rol, vigenteHasta } : rol,
    ))
  }

  const cambiarIndefinido = (rolId: string, indefinido: boolean) => {
    onChange(seleccionados.map((rol) =>
      rol.rolId === rolId
        ? { ...rol, indefinido, vigenteHasta: indefinido ? '' : rol.vigenteHasta }
        : rol,
    ))
  }

  return (
    <fieldset disabled={deshabilitado}>
      <legend>Roles del usuario</legend>
      <div className={styles.cabeceraRoles}>
        <div>
          <strong>
            {seleccionados.length} {seleccionados.length === 1 ? 'rol seleccionado' : 'roles seleccionados'}
          </strong>
          <small>Define una fecha de vencimiento o marca el rol como indefinido.</small>
        </div>
        <input
          type="search"
          value={busqueda}
          placeholder="Buscar roles"
          aria-label="Buscar roles"
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
      </div>

      {errores.roles && <p className={styles.error} role="alert">{errores.roles}</p>}

      <div className={styles.listaRoles}>
        {visibles.map((rol) => {
          const asignacion = seleccion.get(rol.id)
          const seleccionado = Boolean(asignacion)
          const errorVigencia = errores.vigencias?.[rol.id]

          return (
            <article
              key={rol.id}
              className={`${styles.opcionRol} ${seleccionado ? styles.rolSeleccionado : ''} ${!rol.activo ? styles.rolInactivo : ''}`}
            >
              <label className={styles.identidadRol}>
                <input
                  type="checkbox"
                  checked={seleccionado}
                  disabled={deshabilitado || (!rol.activo && !seleccionado)}
                  onChange={() => alternar(rol)}
                />
                <span>
                  <strong>{rol.nombre}{rol.activo ? '' : ' (inactivo)'}</strong>
                  <small>{rol.codigo}</small>
                  {rol.descripcion && <em>{rol.descripcion}</em>}
                </span>
              </label>

              {asignacion && (
                <div className={styles.vigenciaRol}>
                  <label htmlFor={`vigencia-${rol.id}`}>Vigente hasta</label>
                  <div className={styles.filaVigencia}>
                    <input
                      id={`vigencia-${rol.id}`}
                      type="date"
                      value={asignacion.vigenteHasta}
                      disabled={asignacion.indefinido}
                      required={!asignacion.indefinido}
                      aria-invalid={Boolean(errorVigencia)}
                      aria-describedby={errorVigencia ? `error-vigencia-${rol.id}` : undefined}
                      onChange={(evento) => cambiarVigencia(rol.id, evento.target.value)}
                    />
                    <label className={styles.opcionIndefinida} htmlFor={`indefinido-${rol.id}`}>
                      <input
                        id={`indefinido-${rol.id}`}
                        type="checkbox"
                        checked={asignacion.indefinido}
                        onChange={(evento) => cambiarIndefinido(rol.id, evento.target.checked)}
                      />
                      <span>Indefinido</span>
                    </label>
                  </div>
                  {errorVigencia && (
                    <span id={`error-vigencia-${rol.id}`} className={styles.error} role="alert">
                      {errorVigencia}
                    </span>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {!visibles.length && (
        <p className={styles.sinResultados}>No hay roles que coincidan con la búsqueda.</p>
      )}
    </fieldset>
  )
}
