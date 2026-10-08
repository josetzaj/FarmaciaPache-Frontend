import type { DatosFormularioEstadoCatalogo, ErroresFormularioEstadoCatalogo } from '../validacion-estado-catalogo'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = {
  datos: DatosFormularioEstadoCatalogo
  errores: ErroresFormularioEstadoCatalogo
  deshabilitado: boolean
  onChange: (datos: DatosFormularioEstadoCatalogo) => void
}

export function EstadoCatalogoFormularioCampos({ datos, errores, deshabilitado, onChange }: Props) {
  const cambiar = (campo: keyof DatosFormularioEstadoCatalogo, valor: string) => onChange({ ...datos, [campo]: valor })
  return (
    <fieldset disabled={deshabilitado}>
      <legend>Información del estado</legend>
      <div className={styles.grillaDos}>
        <div className={styles.campo}>
          <label htmlFor="codigo">Código <span aria-hidden="true">*</span></label>
          <input id="codigo" value={datos.codigo} maxLength={50} autoComplete="off" aria-invalid={Boolean(errores.codigo)} aria-describedby={errores.codigo ? 'error-codigo' : 'ayuda-codigo'} onChange={(evento) => cambiar('codigo', evento.target.value.toUpperCase())} />
          {errores.codigo ? <small id="error-codigo" className={styles.errorCampo}>{errores.codigo}</small> : <small id="ayuda-codigo" className={styles.ayudaCampo}>Letras, números y guion bajo.</small>}
        </div>
        <div className={styles.campo}>
          <label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label>
          <input id="nombre" value={datos.nombre} maxLength={100} autoComplete="off" aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'error-nombre' : undefined} onChange={(evento) => cambiar('nombre', evento.target.value)} />
          {errores.nombre && <small id="error-nombre" className={styles.errorCampo}>{errores.nombre}</small>}
        </div>
      </div>
      <div className={styles.campo}>
        <label htmlFor="descripcion">Descripción</label>
        <textarea id="descripcion" rows={3} value={datos.descripcion} maxLength={250} aria-invalid={Boolean(errores.descripcion)} aria-describedby={errores.descripcion ? 'error-descripcion' : 'contador-descripcion'} onChange={(evento) => cambiar('descripcion', evento.target.value)} />
        {errores.descripcion ? <small id="error-descripcion" className={styles.errorCampo}>{errores.descripcion}</small> : <small id="contador-descripcion" className={styles.ayudaCampo}>{datos.descripcion.length}/250 caracteres</small>}
      </div>
    </fieldset>
  )
}
