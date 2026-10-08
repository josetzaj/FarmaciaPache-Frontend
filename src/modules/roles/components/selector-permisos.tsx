import { useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import type {
  CatalogoPermisos,
  ModuloCatalogoPermisos,
  PermisoCatalogo,
} from '../rol.types'
import { Icono } from '../../dashboard/components/icono'
import styles from './rol-formulario.module.css'

type SelectorPermisosProps = {
  catalogo: CatalogoPermisos
  seleccionados: readonly string[]
  onChange: (permisosIds: string[]) => void
  deshabilitado?: boolean
  protegidos?: readonly string[]
}

type GrupoPermisos = {
  clave: string
  codigo: string
  nombre: string
  descripcion: string | null
  moduloId: string
  permisos: PermisoCatalogo[]
}

const etiquetaAccion: Record<string, string> = {
  VER: 'Puede ver',
  CREAR: 'Puede crear',
  ACTUALIZAR: 'Puede editar',
  INACTIVAR: 'Puede inactivar',
  VER_AUDITORIA: 'Puede ver auditoría',
  CAMBIAR_SUCURSAL: 'Puede cambiar sucursal',
  ASIGNAR: 'Puede asignar',
  CONFIGURAR: 'Puede configurar políticas individuales',
  CREAR_MASIVA: 'Puede crear solicitudes masivas',
  APROBAR_MASIVA: 'Puede autorizar solicitudes de su sucursal',
  VER_CORPORATIVO: 'Puede ver solicitudes de todas las sucursales',
  APROBAR_MASIVA_CORPORATIVA: 'Puede autorizar solicitudes de todas las sucursales',
}

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('es-GT')
}

function coincidePermiso(permiso: PermisoCatalogo, termino: string): boolean {
  return normalizar(`${permiso.codigo} ${permiso.nombre} ${permiso.accion} ${permiso.descripcion ?? ''}`)
    .includes(termino)
}

function crearGrupos(modulo: ModuloCatalogoPermisos): GrupoPermisos[] {
  const grupos: GrupoPermisos[] = []

  if (modulo.permisosDirectos.length > 0) {
    grupos.push({
      clave: `modulo:${modulo.id}`,
      codigo: modulo.codigo,
      nombre: 'Permisos generales',
      descripcion: modulo.descripcion,
      moduloId: modulo.id,
      permisos: modulo.permisosDirectos,
    })
  }

  modulo.submodulos.forEach((submodulo) => {
    grupos.push({
      clave: `submodulo:${submodulo.id}`,
      codigo: submodulo.codigo,
      nombre: submodulo.nombre,
      descripcion: submodulo.descripcion,
      moduloId: modulo.id,
      permisos: submodulo.permisos,
    })
  })

  return grupos
}

export function SelectorPermisos({
  catalogo,
  seleccionados,
  onChange,
  deshabilitado = false,
  protegidos = [],
}: SelectorPermisosProps) {
  const grupos = useMemo(
    () => catalogo.modulos.flatMap(crearGrupos),
    [catalogo],
  )
  const primerGrupo = grupos[0]
  const [busqueda, setBusqueda] = useState('')
  const [moduloSeleccionadoId, setModuloSeleccionadoId] = useState<string | null>(primerGrupo?.moduloId ?? null)
  const [grupoSeleccionadoClave, setGrupoSeleccionadoClave] = useState<string | null>(primerGrupo?.clave ?? null)
  const seleccion = useMemo(() => new Set(seleccionados), [seleccionados])
  const permisosProtegidos = useMemo(() => new Set(protegidos), [protegidos])
  const totalPermisos = useMemo(
    () => grupos.reduce((total, grupo) => total + grupo.permisos.length, 0),
    [grupos],
  )
  const termino = normalizar(busqueda.trim())

  const modulosVisibles = useMemo(() => catalogo.modulos.map((modulo) => {
    const gruposModulo = crearGrupos(modulo)
    if (!termino) return { modulo, grupos: gruposModulo }

    const coincideModulo = normalizar(`${modulo.codigo} ${modulo.nombre} ${modulo.descripcion ?? ''}`)
      .includes(termino)
    const gruposFiltrados = gruposModulo.filter((grupo) => {
      const coincideGrupo = normalizar(`${grupo.codigo} ${grupo.nombre} ${grupo.descripcion ?? ''}`)
        .includes(termino)
      return coincideModulo || coincideGrupo || grupo.permisos.some((permiso) => coincidePermiso(permiso, termino))
    })

    return { modulo, grupos: gruposFiltrados }
  }).filter(({ grupos: gruposModulo }) => gruposModulo.length > 0), [catalogo, termino])

  const moduloSeleccionado = modulosVisibles.find(({ modulo }) => modulo.id === moduloSeleccionadoId)
    ?? modulosVisibles[0]
    ?? null
  const gruposModuloSeleccionado = moduloSeleccionado?.grupos ?? []
  const grupoSeleccionado = gruposModuloSeleccionado.find((grupo) => grupo.clave === grupoSeleccionadoClave)
    ?? gruposModuloSeleccionado[0]
    ?? null

  const cambiarUno = (permisoId: string, activo: boolean) => {
    if (!activo && permisosProtegidos.has(permisoId)) return
    const siguiente = new Set(seleccion)
    if (activo) siguiente.add(permisoId)
    else siguiente.delete(permisoId)
    onChange([...siguiente])
  }

  const cambiarGrupo = (ids: readonly string[], activo: boolean) => {
    const siguiente = new Set(seleccion)
    ids.forEach((id) => {
      if (activo) siguiente.add(id)
      else if (!permisosProtegidos.has(id)) siguiente.delete(id)
    })
    onChange([...siguiente])
  }

  const seleccionarModulo = (moduloId: string, gruposModulo: GrupoPermisos[]) => {
    setModuloSeleccionadoId(moduloId)
    setGrupoSeleccionadoClave(gruposModulo[0]?.clave ?? null)
  }

  const seleccionarGrupo = (grupo: GrupoPermisos) => {
    setModuloSeleccionadoId(grupo.moduloId)
    setGrupoSeleccionadoClave(grupo.clave)
  }

  return (
    <div className={styles.selectorPermisos}>
      <div className={styles.cabeceraSelectorPermisos}>
        <div>
          <strong>Permisos del rol</strong>
          <span>{seleccion.size} de {totalPermisos} seleccionados</span>
        </div>
        <label className={styles.busquedaPermisosCompacta}>
          <span className={styles.soloLectores}>Buscar menú, submódulo o permiso</span>
          <img src={iconoBusqueda} alt="" />
          <input
            type="search"
            value={busqueda}
            placeholder="Buscar"
            onChange={(event) => setBusqueda(event.target.value)}
            disabled={deshabilitado}
          />
        </label>
      </div>

      <div className={styles.exploradorPermisos}>
        <nav className={styles.navegacionPermisos} aria-label="Menús de permisos">
          <div className={styles.cabeceraColumnaPermisos}>
            <div>
              <strong>Menús</strong>
              <span>Selecciona un menú</span>
            </div>
          </div>

          <div className={styles.listaMenusPermisos}>
            {modulosVisibles.map(({ modulo, grupos: gruposModulo }) => {
              const idsModulo = crearGrupos(modulo).flatMap((grupo) => grupo.permisos.map((permiso) => permiso.id))
              const seleccionadosModulo = idsModulo.filter((id) => seleccion.has(id)).length
              const esModuloActivo = moduloSeleccionado?.modulo.id === modulo.id
              return (
                <button
                  key={modulo.id}
                  type="button"
                  className={`${styles.botonMenuPermisos} ${esModuloActivo ? styles.botonMenuPermisosActivo : ''}`}
                  aria-current={esModuloActivo ? 'true' : undefined}
                  onClick={() => seleccionarModulo(modulo.id, gruposModulo)}
                >
                  <span className={styles.iconoMenuPermisos} aria-hidden="true">
                    <Icono nombre={modulo.codigo === 'ORGANIZACION' ? 'organizacion' : modulo.codigo === 'CATALOGOS' ? 'estado' : 'seguridad'} />
                  </span>
                  <span className={styles.textoMenuPermisos}>
                    <strong>{modulo.nombre}</strong>
                    <small>{seleccionadosModulo} de {idsModulo.length} activos</small>
                  </span>
                  <Icono nombre="chevron" className={styles.chevronMenuPermisos} />
                </button>
              )
            })}

            {modulosVisibles.length === 0 && (
              <p className={styles.sinCoincidenciasColumna}>No hay menús que coincidan.</p>
            )}
          </div>
        </nav>

        <section className={styles.columnaSubmodulos} aria-labelledby="titulo-submodulos-permisos">
          <div className={styles.cabeceraColumnaPermisos}>
            <div>
              <strong id="titulo-submodulos-permisos">Submódulos</strong>
              <span>Selecciona un submódulo</span>
            </div>
          </div>

          <div className={styles.listaSubmenusPermisos}>
            {gruposModuloSeleccionado.map((grupo) => {
              const estaSeleccionado = grupo.clave === grupoSeleccionado?.clave
              const seleccionadosGrupo = grupo.permisos.filter((permiso) => seleccion.has(permiso.id)).length
              return (
                <button
                  key={grupo.clave}
                  type="button"
                  className={`${styles.botonSubmenuPermisos} ${estaSeleccionado ? styles.botonSubmenuPermisosActivo : ''}`}
                  aria-current={estaSeleccionado ? 'true' : undefined}
                  onClick={() => seleccionarGrupo(grupo)}
                >
                  <span className={styles.indicadorSubmenuPermisos} aria-hidden="true" />
                  <span>
                    <strong>{grupo.nombre}</strong>
                    <small>{seleccionadosGrupo} de {grupo.permisos.length} permisos</small>
                  </span>
                  <Icono nombre="chevron" className={styles.chevronSubmenuPermisos} />
                </button>
              )
            })}

            {moduloSeleccionado && gruposModuloSeleccionado.length === 0 && (
              <p className={styles.sinCoincidenciasColumna}>No hay submódulos que coincidan.</p>
            )}
          </div>
        </section>

        <section className={styles.panelAccionesPermisos} aria-live="polite">
          {grupoSeleccionado ? (
            <>
              <header className={styles.cabeceraPanelAcciones}>
                <div>
                  <h3>Asignación de permisos</h3>
                </div>
                <label className={styles.seleccionarGrupoPermisos}>
                  <input
                    type="checkbox"
                    checked={grupoSeleccionado.permisos.length > 0 && grupoSeleccionado.permisos.every((permiso) => seleccion.has(permiso.id))}
                    onChange={(event) => cambiarGrupo(grupoSeleccionado.permisos.map((permiso) => permiso.id), event.target.checked)}
                    disabled={deshabilitado}
                  />
                  <span>Seleccionar todas</span>
                </label>
              </header>

              <div className={styles.grillaAccionesPermisos}>
                {grupoSeleccionado.permisos.map((permiso) => (
                  <OpcionPermiso
                    key={permiso.id}
                    permiso={permiso}
                    seleccionado={seleccion.has(permiso.id)}
                    deshabilitado={deshabilitado}
                    protegido={permisosProtegidos.has(permiso.id)}
                    onChange={cambiarUno}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className={styles.estadoPanelPermisos}>
              <Icono nombre="llave" />
              <h3>Selecciona un submódulo</h3>
              <p>Los permisos disponibles aparecerán en esta columna.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function OpcionPermiso({
  permiso,
  seleccionado,
  deshabilitado,
  protegido,
  onChange,
}: {
  permiso: PermisoCatalogo
  seleccionado: boolean
  deshabilitado: boolean
  protegido: boolean
  onChange: (permisoId: string, activo: boolean) => void
}) {
  return (
    <label
      className={`${styles.opcionPermiso} ${seleccionado ? styles.opcionPermisoSeleccionada : ''}`}
      title={protegido ? 'Este permiso está protegido para el rol SUPERADMIN.' : undefined}
    >
      <span className={styles.iconoAccionPermiso} aria-hidden="true">
        <Icono nombre={permiso.accion === 'VER' ? 'escudo' : permiso.accion === 'VER_AUDITORIA' ? 'reloj' : permiso.accion === 'CREAR' ? 'llave' : 'check'} />
      </span>
      <span className={styles.contenidoAccionPermiso}>
        <strong>{etiquetaAccion[permiso.accion] ?? `Puede ${permiso.nombre.toLocaleLowerCase('es-GT')}`}</strong>
        <em>{permiso.descripcion ?? permiso.nombre}</em>
      </span>
      <input
        type="checkbox"
        checked={seleccionado}
        onChange={(event) => onChange(permiso.id, event.target.checked)}
        disabled={deshabilitado || protegido}
        aria-label={`${seleccionado ? 'Retirar' : 'Asignar'} permiso ${permiso.nombre}`}
      />
    </label>
  )
}
