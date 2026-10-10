import { useEffect, useMemo, useState } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { RutaNavegacion } from '../../../shared/components/ruta-navegacion'
import { obtenerOpcionesReportes } from '../reportes-api'
import type { OpcionesReportes } from '../reportes.types'
import { LimiteErrorReporte } from './limite-error-reporte'
import { ReporteClientes } from './reporte-clientes'
import { ReporteComprasProveedores } from './reporte-compras-proveedores'
import { ReporteInventario } from './reporte-inventario'
import { ReporteProductos } from './reporte-productos'
import { ReporteRecetas } from './reporte-recetas'
import { ReporteResumen } from './reporte-resumen'
import { ReporteRotacionValoracion } from './reporte-rotacion-valoracion'
import { ReporteSucursales } from './reporte-sucursales'
import { ReporteTraslados } from './reporte-traslados'
import { ReporteVentas } from './reporte-ventas'
import { ReporteVencimientosPerdidas } from './reporte-vencimientos-perdidas'
import styles from './reportes.module.css'

export type SubmoduloReportes = 'comercial' | 'inventario-abastecimiento' | 'finanzas-sucursales'
type Props = { permisos: readonly string[]; submodulo: SubmoduloReportes; onNavegar: (ruta: string) => void }
type PestanaReporte = 'resumen' | 'ventas' | 'productos' | 'clientes' | 'recetas' | 'inventario' | 'rotacion' | 'perdidas' | 'proveedores' | 'traslados' | 'sucursales'

const opcionesVacias: OpcionesReportes = {
  permiteTodasSucursales: false,
  sucursales: [],
  productos: [],
  laboratorios: [],
  categorias: [],
}

const titulosSubmodulo: Record<SubmoduloReportes, { titulo: string; descripcion: string }> = {
  comercial: { titulo: 'Reportes comerciales', descripcion: 'Analiza ventas, productos, clientes y dispensación en el alcance autorizado.' },
  'inventario-abastecimiento': { titulo: 'Reportes de inventario y abastecimiento', descripcion: 'Controla existencias, rotación, pérdidas, compras y traslados.' },
  'finanzas-sucursales': { titulo: 'Reportes de finanzas y sucursales', descripcion: 'Consulta la comparación corporativa y los próximos indicadores financieros.' },
}

export function ReportesView({ permisos, submodulo, onNavegar }: Props) {
  const puedeResumen = permisos.includes('REPORTES.RESUMEN.VER')
  const puedeVentas = permisos.includes('REPORTES.VENTAS.VER')
  const puedeInventario = permisos.includes('REPORTES.INVENTARIO.VER')
  const puedeClientes = permisos.includes('REPORTES.CLIENTES.VER')
  const puedeProveedores = permisos.includes('REPORTES.PROVEEDORES.VER')
  const puedeCostos = permisos.includes('REPORTES.COSTOS.VER')
  const alcanceGlobal = permisos.includes('REPORTES.ALCANCE_GLOBAL')
  const puedeExportar = permisos.includes('REPORTES.EXPORTAR')
  const pestanas = useMemo(() => {
    const candidatas = submodulo === 'comercial'
      ? [
          puedeResumen && { id: 'resumen' as const, etiqueta: 'Resumen' },
          puedeVentas && { id: 'ventas' as const, etiqueta: 'Ventas' },
          puedeVentas && { id: 'productos' as const, etiqueta: 'Productos' },
          puedeClientes && { id: 'clientes' as const, etiqueta: 'Clientes' },
          puedeVentas && { id: 'recetas' as const, etiqueta: 'Recetas y dispensación' },
        ]
      : submodulo === 'inventario-abastecimiento'
        ? [
            puedeInventario && { id: 'inventario' as const, etiqueta: 'Inventario crítico' },
            puedeInventario && puedeCostos && { id: 'rotacion' as const, etiqueta: 'Rotación y valoración' },
            puedeInventario && { id: 'perdidas' as const, etiqueta: 'Vencimientos y pérdidas' },
            puedeProveedores && { id: 'proveedores' as const, etiqueta: 'Compras y proveedores' },
            puedeInventario && { id: 'traslados' as const, etiqueta: 'Traslados' },
          ]
        : [puedeResumen && alcanceGlobal && { id: 'sucursales' as const, etiqueta: 'Comparación de sucursales' }]
    return candidatas.filter((item): item is { id: PestanaReporte; etiqueta: string } => Boolean(item))
  }, [alcanceGlobal, puedeClientes, puedeCostos, puedeInventario, puedeProveedores, puedeResumen, puedeVentas, submodulo])
  const [pestana, setPestana] = useState<PestanaReporte>(pestanas[0]?.id ?? 'resumen')
  const [opciones, setOpciones] = useState<OpcionesReportes>(opcionesVacias)
  const [cargandoOpciones, setCargandoOpciones] = useState(true)
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null)
  const [revisionOpciones, setRevisionOpciones] = useState(0)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)
  const pestanaActiva = pestanas.some((item) => item.id === pestana) ? pestana : (pestanas[0]?.id ?? 'resumen')

  useEffect(() => {
    const controlador = new AbortController()
    void obtenerOpcionesReportes(controlador.signal)
      .then((datos) => { setOpciones(datos); setErrorOpciones(null) })
      .catch((actual: unknown) => {
        if (!controlador.signal.aborted) setErrorOpciones(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar los filtros disponibles.')
      })
      .finally(() => { if (!controlador.signal.aborted) setCargandoOpciones(false) })
    return () => controlador.abort()
  }, [revisionOpciones])

  const contenido = () => {
    if (pestanaActiva === 'resumen') return <ReporteResumen opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'ventas') return <ReporteVentas opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'productos') return <ReporteProductos opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'clientes') return <ReporteClientes opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'recetas') return <ReporteRecetas opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'sucursales') return <ReporteSucursales puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'rotacion') return <ReporteRotacionValoracion opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'perdidas') return <ReporteVencimientosPerdidas opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'proveedores') return <ReporteComprasProveedores opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    if (pestanaActiva === 'traslados') return <ReporteTraslados opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
    return <ReporteInventario opciones={opciones} puedeExportar={puedeExportar} onErrorExportacion={setErrorExportacion} />
  }

  return (
    <>
      <main className={styles.pagina}>
        <RutaNavegacion elementos={[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Reportes' }, { etiqueta: titulosSubmodulo[submodulo].titulo }]} onNavegar={onNavegar} />
        <header className={styles.cabeceraPagina}>
          <div><p className={styles.sobretitulo}>Analítica operativa</p><h1>{titulosSubmodulo[submodulo].titulo}</h1><p>{titulosSubmodulo[submodulo].descripcion}</p></div>
          <span className={alcanceGlobal ? styles.distintivoCorporativo : styles.distintivoSucursal}>{alcanceGlobal ? 'Alcance corporativo' : 'Alcance de sucursal'}</span>
        </header>
        {errorOpciones && <div className={styles.estadoError} role="alert"><span>{errorOpciones}</span><button type="button" onClick={() => { setCargandoOpciones(true); setRevisionOpciones((valor) => valor + 1) }}>Reintentar</button></div>}
        {cargandoOpciones && <p className={styles.estadoCarga} role="status">Preparando filtros de reportes…</p>}
        {!cargandoOpciones && !errorOpciones && pestanas.length === 0 && <div className={styles.estadoVacio}><strong>Sin reportes autorizados</strong><p>Tu usuario no tiene permisos para consultar este submódulo.</p></div>}
        {!cargandoOpciones && !errorOpciones && pestanas.length > 0 && <>
          <div className={styles.pestanas} role="tablist" aria-label="Tipos de reporte">
            {pestanas.map((item) => <button key={item.id} id={`pestana-${item.id}`} type="button" role="tab" aria-selected={pestanaActiva === item.id} aria-controls={`panel-${item.id}`} onClick={() => setPestana(item.id)}>{item.etiqueta}</button>)}
          </div>
          <div className={styles.panelPestana} id={`panel-${pestanaActiva}`} role="tabpanel" aria-labelledby={`pestana-${pestanaActiva}`} key={pestanaActiva}>
            <LimiteErrorReporte mensaje="Este reporte encontró datos que no pudo mostrar. Intenta cargarlo nuevamente.">
              {contenido()}
            </LimiteErrorReporte>
          </div>
        </>}
      </main>
      <ModalEstado abierto={Boolean(errorExportacion)} tipo="error" titulo="No se pudo exportar el reporte" mensaje={errorExportacion ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorExportacion(null)} onCerrar={() => setErrorExportacion(null)} />
    </>
  )
}
