import type { CatalogoPermisos } from '../rol.types'
import type { DatosFormularioRol, ErroresFormularioRol } from '../validacion-rol'
import { SelectorPermisos } from './selector-permisos'
import styles from './rol-formulario.module.css'

type RolFormularioCamposProps = {
  datos: DatosFormularioRol
  errores: ErroresFormularioRol
  catalogo: CatalogoPermisos
  permisosSeleccionados: readonly string[]
  onDatosChange: (datos: DatosFormularioRol) => void
  onPermisosChange: (permisosIds: string[]) => void
  deshabilitado: boolean
  permisosEditables?: boolean
  mensajePermisosLectura?: string
  permisosProtegidos?: readonly string[]
}

export function RolFormularioCampos({
  datos,
  errores,
  catalogo,
  permisosSeleccionados,
  onDatosChange,
  onPermisosChange,
  deshabilitado,
  permisosEditables = true,
  mensajePermisosLectura = 'Puedes consultar los permisos, pero tu usuario no tiene autorización para modificarlos.',
  permisosProtegidos = [],
}: RolFormularioCamposProps) {
  const cambiar = (campo: keyof DatosFormularioRol, valor: string) => {
    onDatosChange({ ...datos, [campo]: valor })
  }

  return (
    <>
      <fieldset disabled={deshabilitado}>
        <legend>Información del rol</legend>
        <div className={styles.grillaDos}>
          <div className={styles.campo}>
            <label htmlFor="codigo">Código <span aria-hidden="true">*</span></label>
            <input
              id="codigo"
              value={datos.codigo}
              maxLength={50}
              autoComplete="off"
              aria-invalid={Boolean(errores.codigo)}
              aria-describedby={errores.codigo ? 'error-codigo' : 'ayuda-codigo'}
              onChange={(event) => cambiar('codigo', event.target.value.toUpperCase())}
            />
            {errores.codigo
              ? <small id="error-codigo" className={styles.errorCampo}>{errores.codigo}</small>
              : <small id="ayuda-codigo" className={styles.ayudaCampo}>Letras, números y guion bajo.</small>}
          </div>
          <div className={styles.campo}>
            <label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label>
            <input
              id="nombre"
              value={datos.nombre}
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? 'error-nombre' : undefined}
              onChange={(event) => cambiar('nombre', event.target.value)}
            />
            {errores.nombre && <small id="error-nombre" className={styles.errorCampo}>{errores.nombre}</small>}
          </div>
        </div>
        <div className={styles.campo}>
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            rows={1}
            value={datos.descripcion}
            maxLength={250}
            aria-invalid={Boolean(errores.descripcion)}
            aria-describedby={errores.descripcion ? 'error-descripcion' : 'contador-descripcion'}
            onChange={(event) => cambiar('descripcion', event.target.value)}
          />
          {errores.descripcion
            ? <small id="error-descripcion" className={styles.errorCampo}>{errores.descripcion}</small>
            : <small id="contador-descripcion" className={styles.ayudaCampo}>{datos.descripcion.length}/250 caracteres</small>}
        </div>
      </fieldset>

      <fieldset disabled={deshabilitado}>
        <legend>Asignación de permisos</legend>
        {!permisosEditables && (
          <p className={styles.avisoPermisosLectura}>
            {mensajePermisosLectura}
          </p>
        )}
        <SelectorPermisos
          catalogo={catalogo}
          seleccionados={permisosSeleccionados}
          onChange={onPermisosChange}
          deshabilitado={deshabilitado || !permisosEditables}
          protegidos={permisosProtegidos}
        />
      </fieldset>
    </>
  )
}
