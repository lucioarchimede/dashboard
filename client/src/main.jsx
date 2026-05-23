import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1c1c21',
              color: '#fafafa',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '13px',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1c1c21' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1c1c21' } },
          }}
        />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
