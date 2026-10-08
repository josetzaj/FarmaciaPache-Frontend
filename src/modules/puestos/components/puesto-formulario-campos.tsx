import type { DepartamentoDisponiblePuesto } from '../puesto.types'
import type { DatosFormularioPuesto, ErroresFormularioPuesto } from '../validacion-puesto'
import styles from '../../roles/components/rol-formulario.module.css'

type Props = {
  datos: DatosFormularioPuesto
  errores: ErroresFormularioPuesto
  departamentos: readonly DepartamentoDisponiblePuesto[]
  deshabilitado: boolean
  onChange: (datos: DatosFormularioPuesto) => void
}

export function PuestoFormularioCampos({ datos, errores, departamentos, deshabilitado, onChange }: Props) {
  const cambiar = (campo: keyof DatosFormularioPuesto, valor: string) => onChange({ ...datos, [campo]: valor })
  return <fieldset disabled={deshabilitado}><legend>Información del puesto</legend><div className={styles.grillaDos}>
    <div className={styles.campo}><label htmlFor="departamentoOrganizacionalId">Departamento organizacional <span aria-hidden="true">*</span></label><select id="departamentoOrganizacionalId" value={datos.departamentoOrganizacionalId} aria-invalid={Boolean(errores.departamentoOrganizacionalId)} aria-describedby={errores.departamentoOrganizacionalId ? 'error-departamentoOrganizacionalId' : 'ayuda-departamentoOrganizacionalId'} onChange={(evento) => cambiar('departamentoOrganizacionalId', evento.target.value)}><option value="">Selecciona un departamento</option>{departamentos.map((departamento) => <option key={departamento.id} value={departamento.id} disabled={!departamento.activo && departamento.id !== datos.departamentoOrganizacionalId}>{departamento.codigo} — {departamento.nombre}{departamento.activo ? '' : ' (inactivo)'}</option>)}</select>{errores.departamentoOrganizacionalId ? <small id="error-departamentoOrganizacionalId" className={styles.errorCampo}>{errores.departamentoOrganizacionalId}</small> : <small id="ayuda-departamentoOrganizacionalId" className={styles.ayudaCampo}>Solo los departamentos activos admiten nuevos puestos.</small>}</div>
    <div className={styles.campo}><label htmlFor="codigo">Código <span aria-hidden="true">*</span></label><input id="codigo" value={datos.codigo} maxLength={20} autoComplete="off" aria-invalid={Boolean(errores.codigo)} aria-describedby={errores.codigo ? 'error-codigo' : 'ayuda-codigo'} onChange={(evento) => cambiar('codigo', evento.target.value.toUpperCase())} />{errores.codigo ? <small id="error-codigo" className={styles.errorCampo}>{errores.codigo}</small> : <small id="ayuda-codigo" className={styles.ayudaCampo}>Debe ser único dentro del departamento.</small>}</div>
  </div><div className={styles.campo}><label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label><input id="nombre" value={datos.nombre} maxLength={150} autoComplete="off" aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'error-nombre' : undefined} onChange={(evento) => cambiar('nombre', evento.target.value)} />{errores.nombre && <small id="error-nombre" className={styles.errorCampo}>{errores.nombre}</small>}</div><div className={styles.campo}><label htmlFor="descripcion">Descripción</label><textarea id="descripcion" rows={4} value={datos.descripcion} maxLength={500} aria-invalid={Boolean(errores.descripcion)} aria-describedby={errores.descripcion ? 'error-descripcion' : 'contador-descripcion'} onChange={(evento) => cambiar('descripcion', evento.target.value)} />{errores.descripcion ? <small id="error-descripcion" className={styles.errorCampo}>{errores.descripcion}</small> : <small id="contador-descripcion" className={styles.ayudaCampo}>{datos.descripcion.length}/500 caracteres</small>}</div></fieldset>
}
