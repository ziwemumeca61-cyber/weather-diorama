import { Component, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

/**
 * Catches failures from GLB landmark loading (missing file, decode error) and
 * renders a fallback — typically the city's procedural landmark set — so a bad
 * asset never blanks the scene.
 */
export default class ModelErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err: unknown) {
    console.warn('[landmark] GLB failed, using fallback:', err)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
