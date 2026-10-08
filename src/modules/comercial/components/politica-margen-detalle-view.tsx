import { useEffect, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { actualizarPoliticaMargen, obtenerPoliticaMargen } from '../comercial-api'
import type { GuardarPoliticaMargenRequest, PoliticaMargen } from '../comercial.types'
import { ComercialAuditoria } from './comercial-auditoria'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import { ConfirmarEstadoModal } from './confirmar-estado-modal'
import styles from './comercial.module.css'

function basePolitica(politica: PoliticaMargen): GuardarPoliticaMargenRequest { return { nombre: politica.nombre, alcance: politica.alcance, productoId: politica.producto?.id ?? null, margenPorcentaje: politica.margenPorcentaje } }
export function PoliticaMargenDetalleView({ politicaId, permisos, onNavegar }: { politicaId: string; permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [politica, setPolitica] = useState<PoliticaMargen | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [cambiarEstado, setCambiarEstado] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const puedeGestionar = permisos.includes('COMERCIAL.MARGENES.ACTUALIZAR')
  const puedeVerAuditoria = permisos.includes('COMERCIAL.MARGENES.VER_AUDITORIA')
  useEffect(() => { const controlador = new AbortController(); void obtenerPoliticaMargen(politicaId, controlador.signal).then((actual) => { setPolitica(actual); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar la política.') }); return () => controlador.abort() }, [politicaId, revision])
  if (error) return <section className={styles.pagina}><ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual="Detalle de política" onNavegar={onNavegar} /><div className={styles.estadoVacio} role="alert"><h1>No fue posible cargar la política</h1><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div></section>
  if (!politica) return <section className={styles.pagina} aria-busy="true"><ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual="Detalle de política" onNavegar={onNavegar} /><div className={styles.estadoVacio}><h1>Cargando política</h1><p>Consultando configuración y trazabilidad…</p></div></section>
  const confirmar = async (motivo: string) => { const actualizada = await actualizarPoliticaMargen(politica.id, { ...basePolitica(politica), activo: !politica.activo, version: politica.version, motivo }); setPolitica(actualizada); setCambiarEstado(false); setMensajeExito(`${actualizada.nombre} quedó ${actualizada.activo ? 'activa' : 'inactiva'}.`); setRevision((valor) => valor + 1) }
  return <>
    <section className={styles.pagina} aria-labelledby="titulo-detalle-politica"><ComercialBreadcrumb seccion="Políticas de margen" rutaListado="/comercial/politicas-margen" actual="Detalle de política" onNavegar={onNavegar} /><header className={styles.cabeceraDetalle}><div><p className={styles.sobretitulo}>{politica.alcance === 'GENERAL' ? 'Alcance general' : 'Alcance por producto'}</p><h1 id="titulo-detalle-politica">{politica.nombre}</h1><span className={`${styles.estado} ${politica.activo ? styles.estadoActivo : styles.estadoInactivo}`}>{politica.activo ? 'Activa' : 'Inactiva'}</span></div>{puedeGestionar && <div className={styles.accionesCabecera}><button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/comercial/politicas-margen/${politica.id}/editar`)}><IconoAccion nombre="editar" />Editar política</button><button className={politica.activo ? styles.botonPeligro : styles.botonEstado} type="button" onClick={() => setCambiarEstado(true)}><IconoAccion nombre="estado" />{politica.activo ? 'Desactivar política' : 'Activar política'}</button></div>}</header>
      <div className={styles.grillaDetalle}><article className={styles.tarjetaDetalle}><h2>Configuración</h2><dl><div><dt>Alcance</dt><dd>{politica.alcance === 'GENERAL' ? 'General' : 'Por producto'}</dd></div><div><dt>Margen</dt><dd><strong>{politica.margenPorcentaje.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%</strong></dd></div><div className={styles.datoCompleto}><dt>Producto</dt><dd>{politica.producto ? `${politica.producto.codigo} — ${politica.producto.nombre}` : 'Todos los productos sin política específica'}</dd></div></dl></article><article className={styles.tarjetaDetalle}><h2>Regla de cálculo</h2><p className={styles.explicacionCalculo}>El sistema toma el mayor entre el costo promedio ponderado y el costo de reposición. Luego calcula el precio sugerido con la fórmula:</p><code>precio = costo base ÷ (1 − margen / 100)</code><p className={styles.explicacionCalculo}>Los cambios de margen no modifican código ni reescriben ventas históricas.</p></article></div>
      {puedeVerAuditoria && <ComercialAuditoria recurso="politicas-margen" entidadId={politica.id} revision={revision} />}
    </section>
    <ConfirmarEstadoModal abierto={cambiarEstado} nombre={politica.nombre} activar={!politica.activo} entidad="política" onCerrar={() => setCambiarEstado(false)} onConfirmar={confirmar} />
    <ModalEstado abierto={Boolean(mensajeExito)} tipo="exito" titulo="Estado actualizado" mensaje={mensajeExito ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setMensajeExito(null)} onCerrar={() => setMensajeExito(null)} />
  </>
}
