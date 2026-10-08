import type { DatosFormularioSucursal, ErroresFormularioSucursal } from '../validacion-sucursal'
import styles from '../../roles/components/rol-formulario.module.css'
type Props = { datos: DatosFormularioSucursal; errores: ErroresFormularioSucursal; deshabilitado: boolean; onChange: (datos: DatosFormularioSucursal) => void }
export function SucursalFormularioCampos({ datos, errores, deshabilitado, onChange }: Props) {
  const cambiar = (campo: keyof DatosFormularioSucursal, valor: string) => onChange({ ...datos, [campo]: valor } as DatosFormularioSucursal)
  const campo = (id: keyof DatosFormularioSucursal, etiqueta: string, maxLength: number, requerido = false, tipo = 'text') => <div className={styles.campo}><label htmlFor={id}>{etiqueta} {requerido && <span aria-hidden="true">*</span>}</label><input id={id} type={tipo} value={datos[id]} maxLength={maxLength} autoComplete="off" aria-invalid={Boolean(errores[id])} aria-describedby={errores[id] ? `error-${id}` : undefined} onChange={(evento) => cambiar(id, evento.target.value)} />{errores[id] && <small id={`error-${id}`} className={styles.errorCampo}>{errores[id]}</small>}</div>
  return <>
    <fieldset disabled={deshabilitado}><legend>Información de la sucursal</legend><div className={styles.grillaDos}>
      <div className={styles.campo}><label htmlFor="codigo">Código <span aria-hidden="true">*</span></label><input id="codigo" value={datos.codigo} maxLength={20} autoComplete="off" aria-invalid={Boolean(errores.codigo)} aria-describedby={errores.codigo ? 'error-codigo' : 'ayuda-codigo'} onChange={(evento) => cambiar('codigo', evento.target.value.toUpperCase())} />{errores.codigo ? <small id="error-codigo" className={styles.errorCampo}>{errores.codigo}</small> : <small id="ayuda-codigo" className={styles.ayudaCampo}>Letras, números, guion o guion bajo.</small>}</div>
      {campo('nombre', 'Nombre', 150, true)}
      <div className={styles.campo}><label htmlFor="tipo">Tipo <span aria-hidden="true">*</span></label><select id="tipo" value={datos.tipo} aria-invalid={Boolean(errores.tipo)} aria-describedby={errores.tipo ? 'error-tipo' : undefined} onChange={(evento) => cambiar('tipo', evento.target.value)}><option value="">Selecciona un tipo</option><option value="FARMACIA">Farmacia</option><option value="STAND">Stand</option><option value="BODEGA">Bodega</option><option value="OFICINA">Oficina</option></select>{errores.tipo && <small id="error-tipo" className={styles.errorCampo}>{errores.tipo}</small>}</div>
    </div>{campo('direccion', 'Dirección', 300, true)}</fieldset>
    <fieldset disabled={deshabilitado}><legend>Ubicación y contacto</legend><div className={styles.grillaDos}>{campo('departamento', 'Departamento', 100)}{campo('municipio', 'Municipio', 100)}{campo('telefono', 'Teléfono', 30, false, 'tel')}{campo('correo', 'Correo electrónico', 150, false, 'email')}</div></fieldset>
  </>
}
