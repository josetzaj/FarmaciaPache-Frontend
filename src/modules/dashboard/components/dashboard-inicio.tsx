import { useEffect, useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import { listarDiasTurnosCaja } from '../../caja/caja-api'
import { formatearCentavos } from '../../caja/caja-formatos'
import { consultarResumenReporte, consultarVentasReporte } from '../../reportes/reportes-api'
import { formatearDinero, fechaGuatemala } from '../../reportes/reportes-formatos'
import type { ResumenReporte, VentasReporte } from '../../reportes/reportes.types'
import type { SesionUsuario } from '../../autenticacion/autenticacion.types'
import { GraficaReporte } from '../../reportes/components/grafica-reporte'
import { obtenerColoresGrafica, opcionesBaseGrafica } from '../../reportes/components/grafica-config'
import { Icono } from './icono'
import styles from './dashboard-view.module.css'

export type AccesoInicio = {
  id: string
  titulo: string
  descripcion: string
  permiso: string
  permisoExacto?: string
  icono: Parameters<typeof Icono>[0]['nombre']
}

type DashboardInicioProps = {
  sesion: SesionUsuario
  permisos: ReadonlySet<string>
  accesos: AccesoInicio[]
  onAbrirAcceso: (acceso: AccesoInicio) => void
}

type EstadoCarga = 'cargando' | 'listo' | 'sin-acceso' | 'error'

function sumarDias(fecha: string, dias: number): string {
  const valor = new Date(`${fecha}T00:00:00.000Z`)
  valor.setUTCDate(valor.getUTCDate() + dias)
  return valor.toISOString().slice(0, 10)
}

function etiquetaDia(fecha: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${fecha}T00:00:00.000Z`))
}

function textoEstado(estado: EstadoCarga, valor: string): string {
  if (estado === 'cargando') return 'Cargando…'
  if (estado === 'sin-acceso') return 'Sin acceso'
  if (estado === 'error') return 'No disponible'
  return valor
}

export function DashboardInicio({ sesion, permisos, accesos, onAbrirAcceso }: DashboardInicioProps) {
  const puedeVerResumen = permisos.has('REPORTES.RESUMEN.VER')
  const puedeVerTendencia = permisos.has('REPORTES.VENTAS.VER')
  const puedeVerCaja = permisos.has('CAJA.TURNOS.VER')
  const hoy = fechaGuatemala()
  const desdeTendencia = sumarDias(hoy, -6)

  const [resumen, setResumen] = useState<ResumenReporte | null>(null)
  const [ventas, setVentas] = useState<VentasReporte | null>(null)
  const [saldoCajaCentavos, setSaldoCajaCentavos] = useState(0)
  const [turnosAbiertos, setTurnosAbiertos] = useState(0)
  const [estadoResumen, setEstadoResumen] = useState<EstadoCarga>(puedeVerResumen ? 'cargando' : 'sin-acceso')
  const [estadoVentas, setEstadoVentas] = useState<EstadoCarga>(puedeVerTendencia ? 'cargando' : 'sin-acceso')
  const [estadoCaja, setEstadoCaja] = useState<EstadoCarga>(puedeVerCaja ? 'cargando' : 'sin-acceso')
  const alcanceCaja = permisos.has('CAJA.CORPORATIVO.VER') ? 'todas las sucursales' : sesion.sucursal.nombre
  const alcanceVentas = resumen?.alcance.esCorporativo && !resumen.alcance.sucursal
    ? 'todas las sucursales'
    : resumen?.alcance.sucursal?.nombre ?? sesion.sucursal.nombre

  useEffect(() => {
    const controlador = new AbortController()

    if (puedeVerResumen) {
      void consultarResumenReporte({ fechaDesde: hoy, fechaHasta: hoy }, controlador.signal)
        .then((respuesta) => {
          setResumen(respuesta)
          setEstadoResumen('listo')
        })
        .catch(() => {
          if (!controlador.signal.aborted) setEstadoResumen('error')
        })
    }

    if (puedeVerTendencia) {
      void consultarVentasReporte({ fechaDesde: desdeTendencia, fechaHasta: hoy, agrupacion: 'DIA' }, controlador.signal)
        .then((respuesta) => {
          setVentas(respuesta)
          setEstadoVentas('listo')
        })
        .catch(() => {
          if (!controlador.signal.aborted) setEstadoVentas('error')
        })
    }

    if (puedeVerCaja) {
      void listarDiasTurnosCaja({
        pagina: 1,
        tamanoPagina: 200,
        desde: hoy,
        hasta: hoy,
        orden: 'saldo',
        direccion: 'desc',
      }, controlador.signal)
        .then((respuesta) => {
          setSaldoCajaCentavos(respuesta.items.reduce((total, item) => total + item.saldoConfirmadoCentavos, 0))
          setTurnosAbiertos(respuesta.items.reduce((total, item) => total + item.turnosAbiertos, 0))
          setEstadoCaja('listo')
        })
        .catch(() => {
          if (!controlador.signal.aborted) setEstadoCaja('error')
        })
    }

    return () => controlador.abort()
  }, [desdeTendencia, hoy, puedeVerCaja, puedeVerResumen, puedeVerTendencia])

  const puntosTendencia = useMemo(() => {
    const resultados = new Map(ventas?.puntos.map((punto) => [punto.periodo, punto]) ?? [])
    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = sumarDias(desdeTendencia, indice)
      const punto = resultados.get(fecha)
      return { fecha, total: punto?.totalVentas ?? 0, cantidad: punto?.cantidadVentas ?? 0 }
    })
  }, [desdeTendencia, ventas])

  const opcionesGraficaMonto = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    const base = opcionesBaseGrafica(colores)
    return {
      ...base,
      chart: {
        ...base.chart,
        id: 'monto-ventas-dashboard',
        zoom: { enabled: false },
      },
      colors: [colores.primario],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.34, opacityTo: 0.05, stops: [0, 92, 100] },
      },
      xaxis: {
        categories: puntosTendencia.map((punto) => etiquetaDia(punto.fecha)),
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (valor) => new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            maximumFractionDigits: 0,
          }).format(Number(valor ?? 0)),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (valor) => formatearDinero(Number(valor ?? 0)) },
      },
    }
  }, [puntosTendencia])

  const opcionesGraficaCantidad = useMemo<ApexOptions>(() => {
    const colores = obtenerColoresGrafica()
    const base = opcionesBaseGrafica(colores)
    return {
      ...base,
      chart: {
        ...base.chart,
        id: 'cantidad-ventas-dashboard',
        zoom: { enabled: false },
      },
      colors: [colores.acento],
      plotOptions: {
        bar: { borderRadius: 5, columnWidth: '52%' },
      },
      xaxis: {
        categories: puntosTendencia.map((punto) => etiquetaDia(punto.fecha)),
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (valor) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(Number(valor ?? 0)),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (valor) => `${new Intl.NumberFormat('es-GT').format(Number(valor ?? 0))} ventas`,
        },
      },
    }
  }, [puntosTendencia])

  return (
    <>
      <section className={styles.bienvenida} aria-labelledby="titulo-dashboard">
        <div>
          <p className={styles.fecha}>{new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p>
          <h1 id="titulo-dashboard">Bienvenido, {sesion.empleadoNombre.split(' ')[0]}</h1>
          <p>Resumen operativo de hoy y actividad reciente.</p>
        </div>
        <div className={styles.estadoSucursal}>
          <span aria-hidden="true"><Icono nombre="check" /></span>
          <div>
            <small>Operando en</small>
            <strong>{sesion.sucursal.nombre}</strong>
          </div>
        </div>
      </section>

      <section className={styles.resumenOperativo} aria-label="Indicadores operativos de hoy">
        <article className={styles.tarjetaIndicador}>
          <span className={`${styles.iconoResumen} ${styles.iconoCaja}`}><Icono nombre="sucursal" /></span>
          <div>
            <small>Saldo de caja</small>
            <strong>{textoEstado(estadoCaja, formatearCentavos(saldoCajaCentavos))}</strong>
            <span>{estadoCaja === 'listo' ? `${turnosAbiertos} ${turnosAbiertos === 1 ? 'turno abierto' : 'turnos abiertos'} · ${alcanceCaja}` : 'Según tu alcance autorizado'}</span>
          </div>
        </article>
        <article className={styles.tarjetaIndicador}>
          <span className={`${styles.iconoResumen} ${styles.iconoVentas}`}><Icono nombre="ventas" /></span>
          <div>
            <small>Ventas realizadas hoy</small>
            <strong>{textoEstado(estadoResumen, new Intl.NumberFormat('es-GT').format(resumen?.cantidadVentas ?? 0))}</strong>
            <span>Confirmadas · {alcanceVentas}</span>
          </div>
        </article>
        <article className={styles.tarjetaIndicador}>
          <span className={`${styles.iconoResumen} ${styles.iconoTotal}`}><Icono nombre="reportes" /></span>
          <div>
            <small>Total vendido hoy</small>
            <strong>{textoEstado(estadoResumen, formatearDinero(resumen?.totalVentas ?? 0))}</strong>
            <span>Quetzales · {alcanceVentas}</span>
          </div>
        </article>
      </section>

      <div className={styles.grillaGraficasDashboard}>
        <section className={styles.panelGraficaDashboard} aria-labelledby="titulo-monto-dashboard">
          <header className={styles.cabeceraPanel}>
            <div>
              <h2 id="titulo-monto-dashboard">Total vendido</h2>
              <p>Monto confirmado por día en quetzales.</p>
            </div>
            <span className={styles.etiquetaPeriodo}>7 días</span>
          </header>
          {estadoVentas === 'listo' ? (
            <GraficaReporte
              tipo="area"
              opciones={opcionesGraficaMonto}
              series={[{ name: 'Total vendido', data: puntosTendencia.map((punto) => punto.total) }]}
              altura={250}
              descripcion="Gráfica del total vendido durante los últimos siete días"
            />
          ) : (
            <div className={styles.estadoGraficaDashboard} role="status">
              <Icono nombre="reportes" />
              <strong>{estadoVentas === 'cargando' ? 'Preparando la tendencia…' : estadoVentas === 'sin-acceso' ? 'Tendencia no disponible para este perfil' : 'No fue posible cargar la tendencia'}</strong>
              <span>Los indicadores disponibles continúan visibles.</span>
            </div>
          )}
        </section>

        <section className={styles.panelGraficaDashboard} aria-labelledby="titulo-cantidad-dashboard">
          <header className={styles.cabeceraPanel}>
            <div>
              <h2 id="titulo-cantidad-dashboard">Cantidad de ventas</h2>
              <p>Operaciones confirmadas por día.</p>
            </div>
            <span className={styles.etiquetaPeriodo}>7 días</span>
          </header>
          {estadoVentas === 'listo' ? (
            <GraficaReporte
              tipo="bar"
              opciones={opcionesGraficaCantidad}
              series={[{ name: 'Ventas realizadas', data: puntosTendencia.map((punto) => punto.cantidad) }]}
              altura={250}
              descripcion="Gráfica de la cantidad de ventas realizadas durante los últimos siete días"
            />
          ) : (
            <div className={styles.estadoGraficaDashboard} role="status">
              <Icono nombre="ventas" />
              <strong>{estadoVentas === 'cargando' ? 'Preparando las ventas…' : estadoVentas === 'sin-acceso' ? 'Ventas no disponibles para este perfil' : 'No fue posible cargar las ventas'}</strong>
              <span>Los indicadores disponibles continúan visibles.</span>
            </div>
          )}
        </section>
      </div>

      <section className={`${styles.panel} ${styles.panelAccesosCompactos}`} aria-labelledby="titulo-accesos">
        <header className={styles.cabeceraPanel}>
          <div><h2 id="titulo-accesos">Accesos rápidos</h2><p>Abre las funciones que utilizas con mayor frecuencia.</p></div>
        </header>

        {accesos.length > 0 ? (
          <div className={styles.listaAccesosCompacta}>
            {accesos.map((acceso) => (
              <button key={acceso.id} type="button" onClick={() => onAbrirAcceso(acceso)} title={acceso.descripcion}>
                <span className={styles.iconoAcceso}><Icono nombre={acceso.icono} /></span>
                <strong>{acceso.titulo}</strong>
                <Icono nombre="flecha" />
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.estadoVacio}>
            <span><Icono nombre="llave" /></span>
            <strong>Sin accesos administrativos</strong>
            <p>Tu sesión está activa, pero no tiene módulos de administración asignados.</p>
          </div>
        )}
      </section>
    </>
  )
}
