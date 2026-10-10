import { useEffect, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/api/cliente-api'
import { IconoAccion } from '../../../shared/components/icono-accion'
import { ModalEstado } from '../../../shared/components/modal-estado'
import { listarCaja, prepararDepositoCaja } from '../caja-api'
import { convertirQuetzalesACentavos, formatearCentavos } from '../caja-formatos'
import type { CuentaBancariaCaja, DepositoEfectivo, TransferenciaEfectivo } from '../caja.types'
import { CajaBreadcrumb } from './caja-breadcrumb'
import styles from './caja.module.css'

type Props = { onNavegar: (ruta: string) => void; onCambiosPendientes: (pendientes: boolean) => void }

export function DepositoCrearView({ transferenciaInicialId, onNavegar, onCambiosPendientes }: Props & { transferenciaInicialId?: string }) {
  const [cuentas, setCuentas] = useState<CuentaBancariaCaja[]>([])
  const [transferencias, setTransferencias] = useState<TransferenciaEfectivo[]>([])
  const [cuentaBancariaId, setCuentaBancariaId] = useState('')
  const [transferenciaId, setTransferenciaId] = useState(transferenciaInicialId ?? '')
  const [monto, setMonto] = useState('')
  const [bolsa, setBolsa] = useState('')
  const [sello, setSello] = useState('')
  const [transporte, setTransporte] = useState('')
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [creado, setCreado] = useState<DepositoEfectivo | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => { const controlador = new AbortController(); void Promise.all([listarCaja<CuentaBancariaCaja>('cuentas', { pagina: 1, tamanoPagina: 200, orden: 'alias', direccion: 'asc' }, controlador.signal), listarCaja<TransferenciaEfectivo>('transferencias', { pagina: 1, tamanoPagina: 200, estados: ['RECIBIDA'], custodias: ['PENDIENTE_DEPOSITO', 'TRANSITO', 'RECIBIDO', 'CAJA_FUERTE'], orden: 'fecha', direccion: 'desc' }, controlador.signal)]).then(([respuestaCuentas, respuestaTransferencias]) => { setCuentas(respuestaCuentas.items.filter((item) => item.activa)); setTransferencias(respuestaTransferencias.items); const inicial = respuestaTransferencias.items.find((item) => item.id === transferenciaInicialId); if (inicial) setMonto((inicial.montoCentavos / 100).toFixed(2)); setErrorCarga(null) }).catch((errorActual: unknown) => { if (!controlador.signal.aborted) setErrorCarga(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible cargar las cuentas y transferencias disponibles.') }); return () => controlador.abort() }, [revision, transferenciaInicialId])
  const hayCambios = Boolean(cuentaBancariaId || transferenciaId || monto || bolsa || sello || transporte) && !creado
  useEffect(() => { onCambiosPendientes(hayCambios); return () => onCambiosPendientes(false) }, [hayCambios, onCambiosPendientes])
  const seleccionarTransferencia = (id: string) => { setTransferenciaId(id); const transferencia = transferencias.find((item) => item.id === id); if (transferencia) setMonto((transferencia.montoCentavos / 100).toFixed(2)); setErrorFormulario(null) }
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const montoPreparadoCentavos = convertirQuetzalesACentavos(monto)
    const mensaje = !cuentaBancariaId ? 'Selecciona una cuenta bancaria activa.' : !transferenciaId ? 'Selecciona la transferencia de custodia que respalda el depósito.' : !montoPreparadoCentavos || montoPreparadoCentavos <= 0 ? 'Ingresa un monto preparado mayor que cero.' : !bolsa.trim() ? 'Registra el identificador de la bolsa.' : !sello.trim() ? 'Registra el sello de seguridad.' : null
    setErrorFormulario(mensaje)
    if (mensaje || !montoPreparadoCentavos) return
    setGuardando(true); setErrorEnvio(null)
    try { const deposito = await prepararDepositoCaja({ cuentaBancariaId, transferenciaId, montoPreparadoCentavos, bolsa: bolsa.trim(), sello: sello.trim(), transporte: transporte.trim() || null }); onCambiosPendientes(false); setCreado(deposito) }
    catch (errorActual: unknown) { setErrorEnvio(errorActual instanceof ErrorApi ? errorActual.message : 'No fue posible preparar el depósito.') }
    finally { setGuardando(false) }
  }
  return <section className={styles.pagina} aria-labelledby="titulo-deposito"><header className={styles.cabeceraPagina}><CajaBreadcrumb seccion="Depósitos bancarios" actual="Preparar depósito" onNavegar={onNavegar} /><div><p className={styles.sobretitulo}>Custodia bancaria</p><h1 id="titulo-deposito">Preparar depósito bancario</h1><p>La preparación conserva el efectivo bajo custodia; todavía no equivale a un depósito confirmado. Las cuentas bancarias las administra el perfil autorizado en Configuración de caja.</p></div></header>
    {errorCarga && <div className={styles.alertaError} role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button></div>}{!errorCarga && !cuentas.length && <div className={styles.alertaInformativa} role="status"><p>No hay cuentas bancarias activas. Registra una cuenta antes de preparar el depósito.</p></div>}
    <form className={styles.formulario} noValidate onSubmit={enviar}><fieldset disabled={guardando || Boolean(errorCarga)}><legend>Destino bancario</legend><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="cuenta-deposito">Cuenta bancaria <span aria-hidden="true">*</span></label><select id="cuenta-deposito" value={cuentaBancariaId} onChange={(e) => { setCuentaBancariaId(e.target.value); setErrorFormulario(null) }}><option value="">Selecciona una cuenta</option>{cuentas.map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.alias} · {cuenta.banco} · {cuenta.cuentaEnmascarada}</option>)}</select></div><div className={styles.campo}><label htmlFor="transferencia-deposito">Transferencia de custodia <span aria-hidden="true">*</span></label><select id="transferencia-deposito" value={transferenciaId} onChange={(e) => seleccionarTransferencia(e.target.value)}><option value="">Selecciona una transferencia recibida</option>{transferencias.map((item) => <option key={item.id} value={item.id}>{item.numero} · {formatearCentavos(item.montoCentavos)} · {item.bolsa ?? 'Sin bolsa'}</option>)}</select></div><div className={styles.campo}><label htmlFor="monto-deposito">Monto preparado (Q) <span aria-hidden="true">*</span></label><input id="monto-deposito" type="number" min="0.01" step="0.01" inputMode="decimal" value={monto} readOnly aria-readonly="true" /></div></div></fieldset>
      <fieldset disabled={guardando || Boolean(errorCarga)}><legend>Cadena de custodia</legend><div className={styles.grillaTres}><div className={styles.campo}><label htmlFor="bolsa-deposito">Bolsa <span aria-hidden="true">*</span></label><input id="bolsa-deposito" maxLength={100} value={bolsa} onChange={(e) => { setBolsa(e.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="sello-deposito">Sello <span aria-hidden="true">*</span></label><input id="sello-deposito" maxLength={100} value={sello} onChange={(e) => { setSello(e.target.value); setErrorFormulario(null) }} /></div><div className={styles.campo}><label htmlFor="transporte-deposito">Transporte</label><input id="transporte-deposito" maxLength={200} value={transporte} onChange={(e) => setTransporte(e.target.value)} /></div></div>{errorFormulario && <p className={styles.errorCampo} role="alert">{errorFormulario}</p>}</fieldset>
      <div className={styles.accionesFormulario}><p><span aria-hidden="true">*</span> Campos obligatorios</p><div><button className={styles.botonNeutral} type="button" disabled={guardando} onClick={() => onNavegar('/caja/depositos')}><IconoAccion nombre="cancelar" />Cancelar</button><button className={styles.botonPrincipal} type="submit" disabled={guardando || Boolean(errorCarga) || !cuentas.length}><IconoAccion nombre="guardar" />{guardando ? 'Preparando…' : 'Preparar depósito'}</button></div></div></form>
    <ModalEstado abierto={Boolean(errorEnvio)} tipo="error" titulo="No se pudo preparar el depósito" mensaje={errorEnvio ?? ''} textoAccionPrincipal="Entendido" onAccionPrincipal={() => setErrorEnvio(null)} onCerrar={() => setErrorEnvio(null)} /><ModalEstado abierto={Boolean(creado)} tipo="exito" titulo="Depósito preparado" mensaje={creado ? `El depósito ${creado.numero} quedó preparado por ${formatearCentavos(creado.montoPreparadoCentavos)}. Ahora debe registrarse la operación bancaria y adjuntarse evidencia.` : ''} textoAccionPrincipal="Continuar al depósito" onAccionPrincipal={() => creado && onNavegar(`/caja/depositos/${creado.id}`)} textoAccionSecundaria="Volver al listado" onAccionSecundaria={() => onNavegar('/caja/depositos')} onCerrar={() => creado && onNavegar(`/caja/depositos/${creado.id}`)} />
  </section>
}
