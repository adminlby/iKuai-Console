import { Component, type ReactNode } from 'react'

/**
 * Catches render-time errors in a page so a single bad field (e.g. an
 * unexpected object from the device) degrades to a message instead of
 * white-screening the whole console. Reset by changing `resetKey` (the view).
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: unknown },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[page error]', error)
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    // Navigating to another view clears the error so the next page can render.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="umain" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="page-error">
            <div className="pe-title">此页面加载出错</div>
            <div className="pe-msg">{this.state.error.message || '渲染时发生未知错误'}</div>
            <button className="pe-btn" onClick={() => this.setState({ error: null })}>重试</button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
