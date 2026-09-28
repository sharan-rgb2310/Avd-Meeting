import { Component } from 'react'
import ErrorState from './ErrorState'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // Surfaced in the console for developers; the user sees a friendly panel.
    console.error('AV DYNAMICS UI error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <ErrorState onRetry={() => this.setState({ hasError: false })} />
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
