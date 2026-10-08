import { useEffect, useMemo, useState } from 'react'
import iconoBusqueda from '../../../assets/acciones/busqueda.png'
import iconoVer from '../../../assets/acciones/ver.png'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { BotonExportar, type FormatoExportacion } from '../../../shared/components/boton-exportar'
import { PaginacionTabla, TablaDatos, type ColumnaTabla, type ColumnFiltersState, type SortingState } from '../../../shared/components/tabla-datos'
import { exportarComercial, listarRecetas, obtenerOpcionesComercial } from '../comercial-api'
import type { ConsultaComercial, OpcionesComercial, RecetaValidacion, ResultadoValidacionReceta } from '../comercial.types'
import { ComercialBreadcrumb } from './comercial-breadcrumb'
import styles from './comercial.module.css'

const filtroPendiente: ColumnFiltersState = [{ id: 'estado', value: ['PENDIENTE'] }]
const etiquetas: Record<ResultadoValidacionReceta, string> = { PENDIENTE: 'Pendiente', VALIDA: 'Válida', RECHAZADA: 'Rechazada' }
const opcionesBase: OpcionesComercial = { sucursales: [], productos: [], clientes: { tipos: ['PERSONA', 'EMPRESA'], estados: ['ACTIVO', 'INACTIVO'] }, margenes: { alcances: ['GENERAL', 'PRODUCTO'], estados: ['ACTIVO', 'INACTIVO'] }, precios: { estados: ['BORRADOR', 'VIGENTE', 'INACTIVO'] }, ventas: { estados: ['BORRADOR', 'PENDIENTE_RECETA', 'LISTA_PARA_COBRO', 'CONFIRMADA', 'ANULADA'], estadosPago: ['PENDIENTE', 'PAGADO', 'REVERTIDO'], estadosDispensacion: ['PENDIENTE', 'DISPENSADA', 'REVERTIDA'], estadosFiscales: ['PENDIENTE', 'EMITIDA', 'ANULADA', 'ERROR'] } }
const valores = (filtros: ColumnFiltersState, id: string) => { const valor = filtros.find((filtro) => filtro.id === id)?.value; return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : undefined }
const fecha = (valor: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'America/Guatemala' }).format(new Date(valor))

export function RecetaListadoView({ permisos, onNavegar }: { permisos: readonly string[]; onNavegar: (ruta: string) => void }) {
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof listarRecetas>> | null>(null)
  const [opciones, setOpciones] = useState<OpcionesComercial>(opcionesBase)
  const [pagina, setPagina] = useState(1); const [tamanoPagina, setTamanoPagina] = useState(50)
  const [busquedaEntrada, setBusquedaEntrada] = useState(''); const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('')
  const [filtros, setFiltros] = useState<ColumnFiltersState>(filtroPendiente); const [ordenamiento, setOrdenamiento] = useState<SortingState>([{ id: 'fecha', desc: true }])
  const [error, setError] = useState<string | null>(null); const [errorExportacion, setErrorExportacion] = useState<string | null>(null); const [revision, setRevision] = useState(0)
  const parametros = useMemo<ConsultaComercial>(() => ({ pagina, tamanoPagina, busqueda: busqueda || undefined, estados: valores(filtros, 'estado'), sucursalIds: valores(filtros, 'sucursal'), desde: desde || undefined, hasta: hasta || undefined, orden: ordenamiento[0]?.id ?? 'fecha', direccion: ordenamiento[0]?.desc ? 'desc' : 'asc' }), [busqueda, desde, filtros, hasta, ordenamiento, pagina, tamanoPagina])
  useEffect(() => { const controlador = new AbortController(); void obtenerOpcionesComercial(controlador.signal).then(setOpciones).catch(() => undefined); return () => controlador.abort() }, [])
  useEffect(() => { const temporizador = window.setTimeout(() => { setBusqueda(busquedaEntrada.trim().replace(/\s+/g, ' ')); setPagina(1) }, 400); return () => window.clearTimeout(temporizador) }, [busquedaEntrada])
  useEffect(() => { const controlador = new AbortController(); void listarRecetas(parametros, controlador.signal).then((datos) => { if (datos.totalPaginas > 0 && pagina > datos.totalPaginas) { setPagina(datos.totalPaginas); return }; setResultado(datos); setError(null) }).catch((actual: unknown) => { if (!controlador.signal.aborted) setError(actual instanceof ErrorApi ? actual.message : 'No fue posible cargar las recetas.') }); return () => controlador.abort() }, [pagina, parametros, revision])
  const columnas = useMemo<ColumnaTabla<RecetaValidacion>[]>(() => [
    { id: 'referencia', titulo: 'Receta', obtenerValor: (item) => item.referencia, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.referencia}</strong><small>Emitida {fecha(item.fechaEmision)}</small></div> },
    { id: 'venta', titulo: 'Venta', obtenerValor: (item) => item.ventaNumero, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.ventaNumero}</strong><small>{item.ventaEstado.replaceAll('_', ' ')}</small></div> },
    { id: 'paciente', titulo: 'Paciente', obtenerValor: (item) => item.pacienteNombre, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.pacienteNombre}</strong><small>{item.pacienteIdentificacion}</small></div> },
    { id: 'prescriptor', titulo: 'Prescriptor', obtenerValor: (item) => item.prescriptorNombre, ordenable: true, celda: (item) => <div className={styles.identidad}><strong>{item.prescriptorNombre}</strong><small>Colegiado {item.prescriptorColegiado}</small></div> },
    { id: 'sucursal', titulo: 'Sucursal', obtenerValor: (item) => item.sucursal?.nombre ?? '', ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Sucursal', multiple: true, opciones: opciones.sucursales.map((sucursal) => ({ valor: sucursal.id, etiqueta: sucursal.nombre, descripcion: sucursal.codigo })) }, celda: (item) => item.sucursal ? <div className={styles.identidad}><strong>{item.sucursal.nombre}</strong><small>{item.sucursal.codigo}</small></div> : <span className={styles.sinDato}>No disponible</span> },
    { id: 'estado', titulo: 'Validación', obtenerValor: (item) => item.resultadoValidacion, ordenable: true, filtro: { tipo: 'opciones', etiqueta: 'Resultado de validación', multiple: true, buscable: false, opciones: Object.entries(etiquetas).map(([valor, etiqueta]) => ({ valor, etiqueta })) }, celda: (item) => <span className={`${styles.estado} ${item.resultadoValidacion === 'VALIDA' ? styles.estadoActivo : item.resultadoValidacion === 'RECHAZADA' ? styles.estadoPeligro : styles.estadoAdvertencia}`}>{etiquetas[item.resultadoValidacion]}</span> },
    { id: 'acciones', titulo: 'Acciones', tituloSoloLectores: true, obtenerValor: () => '', celda: (item) => <div className={styles.accionesFila}><button type="button" title="Ver detalle" aria-label={`Ver receta ${item.referencia}`} onClick={() => onNavegar(`/ventas/recetas/${item.id}`)}><img src={iconoVer} alt="" /></button></div> },
  ], [onNavegar, opciones.sucursales])
  const hayFiltros = Boolean(busqueda || desde || hasta) || JSON.stringify(filtros) !== JSON.stringify(filtroPendiente)
  const limpiar = () => { setBusquedaEntrada(''); setBusqueda(''); setDesde(''); setHasta(''); setFiltros(filtroPendiente); setPagina(1) }
  const exportar = async (formato: FormatoExportacion) => { setErrorExportacion(null); const { pagina: _pagina, tamanoPagina: _tamano, ...filtrosExportacion } = parametros; try { await exportarComercial('recetas', formato, filtrosExportacion) } catch (actual) { setErrorExportacion(actual instanceof ErrorApi ? actual.message : 'No fue posible exportar las recetas.') } }
  return (
    <section className={styles.pagina} aria-labelledby="titulo-validacion-recetas">
      <header className={styles.cabeceraPagina}>
        <ComercialBreadcrumb seccion="Validación de recetas" rutaListado="/ventas/recetas" onNavegar={onNavegar} />
        <div className={`${styles.filaCabecera} ${styles.filaCabeceraConFiltros}`}>
          <h1 id="titulo-validacion-recetas">Validación de recetas</h1>
          {permisos.includes('COMERCIAL.RECETAS.EXPORTAR') && <BotonExportar deshabilitado={Boolean(error) || !resultado?.total} onExportar={exportar} />}
          <div className={styles.filtrosCabecera} aria-label="Filtros generales de recetas">
            <label className={styles.controlFechaCabecera}>
              <span className={styles.soloLectores}>Registradas desde</span>
              {!desde && <span className={styles.textoFechaCabecera} aria-hidden="true">Desde</span>}
              <input className={!desde ? styles.fechaVacia : undefined} type="date" value={desde} aria-label="Recetas registradas desde" onChange={(evento) => { setDesde(evento.target.value); setPagina(1) }} />
            </label>
            <label className={styles.controlFechaCabecera}>
              <span className={styles.soloLectores}>Registradas hasta</span>
              {!hasta && <span className={styles.textoFechaCabecera} aria-hidden="true">Hasta</span>}
              <input className={!hasta ? styles.fechaVacia : undefined} type="date" value={hasta} aria-label="Recetas registradas hasta" onChange={(evento) => { setHasta(evento.target.value); setPagina(1) }} />
            </label>
          </div>
          <form className={styles.busquedaGeneral} role="search" onSubmit={(evento) => evento.preventDefault()}><label className={styles.soloLectores} htmlFor="buscar-recetas">Buscar receta, paciente, prescriptor o venta</label><div className={styles.controlBusqueda}><img src={iconoBusqueda} alt="" /><input id="buscar-recetas" type="search" value={busquedaEntrada} maxLength={200} placeholder="Buscar receta, paciente, prescriptor o venta" onChange={(evento) => setBusquedaEntrada(evento.target.value)} />{busquedaEntrada && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaEntrada('')}>×</button>}</div></form>
        </div>
      </header>
      {errorExportacion && <div className={styles.alertaError} role="alert">{errorExportacion}</div>}
      <article className={styles.panelTabla}>
        <div className={styles.resumenTabla}><div><strong>Bandeja de recetas</strong><small>Usa los encabezados para filtrar y ordenar.</small></div><div className={styles.accionesResumen}><span>{resultado?.total ?? 0} recetas</span>{hayFiltros && <button type="button" onClick={limpiar}>Restablecer filtros</button>}</div></div>
        {error ? <div className={styles.estadoVacio} role="alert"><h2>No fue posible cargar las recetas</h2><p>{error}</p><button type="button" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div> : resultado?.items.length ? <><TablaDatos descripcion="Bandeja de validación de recetas" datos={resultado.items} columnas={columnas} filtros={filtros} ordenamiento={ordenamiento} obtenerIdFila={(item) => item.id} onFiltrosChange={(siguientes) => { setFiltros(siguientes); setPagina(1) }} onOrdenamientoChange={(siguiente) => { setOrdenamiento(siguiente.length ? siguiente : [{ id: 'fecha', desc: true }]); setPagina(1) }} /><PaginacionTabla pagina={resultado.pagina} tamanoPagina={resultado.tamanoPagina} total={resultado.total} totalPaginas={resultado.totalPaginas} unidadSingular="receta" unidadPlural="recetas" onPaginaChange={setPagina} onTamanoPaginaChange={(tamano) => { setTamanoPagina(tamano); setPagina(1) }} /></> : resultado ? <div className={styles.estadoVacio}><h2>{hayFiltros ? 'Sin coincidencias' : 'No hay recetas pendientes'}</h2><p>{hayFiltros ? 'No hay recetas que coincidan con los filtros actuales.' : 'La bandeja está al día.'}</p></div> : <div className={styles.estadoVacio} aria-busy="true"><h2>Cargando recetas</h2><p>Consultando la bandeja de validación…</p></div>}
      </article>
    </section>
  )
}
