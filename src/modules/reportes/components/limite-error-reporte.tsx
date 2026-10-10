import { Component, type ReactNode } from 'react'
import styles from './reportes.module.css'

type Props = {
  children: ReactNode
  mensaje: string
}

type State = {
  tieneError: boolean
}

export class LimiteErrorReporte extends Component<Props, State> {
  state: State = { tieneError: false }

  static getDerivedStateFromError(): State {
    return { tieneError: true }
  }

  private reiniciar = () => {
    this.setState({ tieneError: false })
  }

  render() {
    if (this.state.tieneError) {
      return (
        <div className={styles.estadoError} role="alert">
          <span>{this.props.mensaje}</span>
          <button type="button" onClick={this.reiniciar}>Intentar de nuevo</button>
        </div>
      )
    }

    return this.props.children
  }
}
