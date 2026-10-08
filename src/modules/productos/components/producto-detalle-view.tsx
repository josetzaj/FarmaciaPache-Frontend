import { useEffect, useState } from 'react'
import { construirUrlApi, ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { obtenerProducto } from '../producto-api'
import type { Producto } from '../producto.types'
import { ProductoBreadcrumb } from './producto-breadcrumb'
import { ProductoInactivarModal } from './producto-inactivar-modal'
import styles from '../../roles/components/rol-gestion.module.css'
import productoStyles from './producto-detalle-view.module.css'

const fecha = (valor: string | null) => valor
  ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(valor))
  : 'Sin registro'

type Props = {
  productoId: string
  permisos: readonly string[]
  onNavegar: (ruta: string) => void
}

export function ProductoDetalleView({ productoId, permisos, onNavegar }: Props) {
  const [producto, setProducto] = useState<Producto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerProducto(productoId, controlador.signal)
      .then((encontrado) => {
        setProducto(encontrado)
        setError(null)
      })
      .catch((errorCarga: unknown) => {
        if (!controlador.signal.aborted) {
          setError(errorCarga instanceof ErrorApi ? errorCarga.message : 'No fue posible cargar el medicamento.')
        }
      })
    return () => controlador.abort()
  }, [productoId, revision])

  if (!producto) {
    return (
      <section className={styles.errorPagina}>
        <ProductoBreadcrumb actual="Detalle" onNavegar={onNavegar} />
        <h1>{error ? 'No se pudo cargar el medicamento' : 'Cargando medicamento…'}</h1>
        <p>{error}</p>
        {error && <button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>}
      </section>
    )
  }

  const imagenUrl = producto.imagenUrl
    ? `${construirUrlApi(producto.imagenUrl)}?v=${producto.version}`
    : null

  return (
    <section className={styles.pagina}>
      <ProductoBreadcrumb actual="Detalle" onNavegar={onNavegar} />
      <header className={styles.cabeceraDetalle}>
        <div className={styles.perfilRol}>
          <span className={productoStyles.imagenProducto}>
            {imagenUrl
              ? <img src={imagenUrl} alt={`Imagen de referencia de ${producto.nombreComercial}`} crossOrigin="use-credentials" />
              : <span aria-hidden="true">Rx</span>}
          </span>
          <div>
            <p>Producto {producto.codigo}</p>
            <h1>{producto.nombreComercial}</h1>
            <span className={`${styles.estado} ${producto.activo ? styles.activo : styles.inactivo}`}>{producto.activo ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>
        <div className={styles.accionesCabecera}>
          {permisos.includes('CATALOGOS.PRODUCTOS.ACTUALIZAR') && producto.activo && (
            <button className={styles.botonEditar} type="button" onClick={() => onNavegar(`/catalogos/productos/${producto.id}/editar`)}>
              <IconoAccion nombre="editar" /> Editar información
            </button>
          )}
          {permisos.includes('CATALOGOS.PRODUCTOS.INACTIVAR') && producto.activo && (
            <button className={styles.botonPeligro} type="button" onClick={() => setConfirmar(true)}>
              <IconoAccion nombre="desactivar" /> Desactivar
            </button>
          )}
        </div>
      </header>

      <div className={styles.grillaDetalle}>
        <article className={styles.tarjetaDetalle}>
          <h2>Información farmacéutica</h2>
          <dl>
            <div><dt>Laboratorio</dt><dd>{producto.laboratorio.nombre}</dd></div>
            <div><dt>Presentación comercial</dt><dd>{producto.presentacion.nombre}</dd></div>
            <div><dt>Forma farmacéutica</dt><dd>{producto.formaFarmaceutica.nombre}</dd></div>
            <div><dt>Contenido</dt><dd>{producto.cantidadContenido} {producto.unidadContenido.simbolo ?? producto.unidadContenido.nombre}</dd></div>
            <div className={styles.datoCompleto}><dt>Categorías terapéuticas</dt><dd>{producto.categoriasTerapeuticas.map((item) => item.nombre).join(', ')}</dd></div>
            <div className={styles.datoCompleto}><dt>Vías de administración</dt><dd>{producto.viasAdministracion.map((item) => item.nombre).join(', ')}</dd></div>
            <div><dt>Receta</dt><dd>{producto.requiereReceta ? 'Requerida' : 'No requerida'}</dd></div>
            <div><dt>Controlado</dt><dd>{producto.esControlado ? 'Sí' : 'No'}</dd></div>
            <div><dt>Lote y vencimiento</dt><dd>{producto.controlaLote ? 'Controla lote' : 'Sin lote'} · {producto.requiereVencimiento ? 'Controla vencimiento' : 'Sin vencimiento'}</dd></div>
            <div className={styles.datoCompleto}><dt>Composición</dt><dd>{producto.componentes.map((componente) => `${componente.principioActivo.nombre} ${componente.concentracion} ${componente.unidadMedida.simbolo ?? componente.unidadMedida.nombre}`).join(' + ')}</dd></div>
            <div className={styles.datoCompleto}><dt>Códigos de barras</dt><dd>{producto.codigosBarras.map((codigo) => `${codigo.codigo}${codigo.esPrincipal ? ' (principal)' : ''}`).join(', ') || 'Sin códigos registrados'}</dd></div>
            <div className={styles.datoCompleto}><dt>Almacenamiento</dt><dd>{producto.condicionesAlmacenamiento ?? 'Sin indicaciones especiales'}</dd></div>
          </dl>
        </article>
        <article className={styles.tarjetaDetalle}>
          <h2>Control del registro</h2>
          <dl>
            <div><dt>Creado</dt><dd>{fecha(producto.creadoEn)}</dd></div>
            <div><dt>Actualizado</dt><dd>{fecha(producto.actualizadoEn)}</dd></div>
            <div><dt>Versión</dt><dd>{producto.version}</dd></div>
            {!producto.activo && <div className={styles.datoCompleto}><dt>Motivo de desactivación</dt><dd>{producto.motivoInactivacion}</dd></div>}
          </dl>
        </article>
      </div>

      <ProductoInactivarModal
        producto={confirmar ? producto : null}
        onCerrar={() => setConfirmar(false)}
        onInactivado={() => {
          setConfirmar(false)
          setExito(true)
        }}
      />
      <ModalEstado
        abierto={exito}
        tipo="exito"
        titulo="Medicamento desactivado"
        mensaje="El producto fue desactivado correctamente."
        textoAccionPrincipal="Aceptar"
        onAccionPrincipal={() => onNavegar('/catalogos/productos')}
        onCerrar={() => onNavegar('/catalogos/productos')}
      />
    </section>
  )
}
