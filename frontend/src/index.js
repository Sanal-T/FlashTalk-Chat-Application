import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/AuthContext'; // ✅ Make sure this file exists and is named correctly

// ErrorBoundary can also be extracted into its own file
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat App Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white', fontFamily: 'Inter, Arial, sans-serif', textAlign: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)',
            borderRadius: '16px', padding: '40px', maxWidth: '500px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>Oops! Something went wrong</h1>
            <p style={{ marginBottom: '20px', opacity: 0.9 }}>
              The chat application encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255, 255, 255, 0.2)', border: '2px solid rgba(255, 255, 255, 0.3)',
                color: 'white', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', transition: 'all 0.2s ease'
              }}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Error Details (Development)</summary>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '8px',
                  fontSize: '12px', overflow: 'auto', maxHeight: '200px'
                }}>
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <AuthProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </AuthProvider>
);

// Optional service worker registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error =>   console.log('SW registration failed:', error));
    });
  }
}

function monitorConnection() {
  const updateStatus = () => {
    const status = navigator.onLine ? 'online' : 'offline';
    document.body.setAttribute('data-connection', status);
    window.dispatchEvent(new CustomEvent('connectionchange', { detail: { status } }));
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

registerServiceWorker();
monitorConnection();

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Optional: Web Vitals
if (typeof reportWebVitals === 'function') {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  }).catch(() => {});
}

// HMR support
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('Hot reloading App component');
  });
}
