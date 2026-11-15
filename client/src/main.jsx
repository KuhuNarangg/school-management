import React from 'react';
import ReactDOM from 'react-dom/client';
import { installApiFetchInterceptor } from './api-client';
import App from './App';
import './globals.css';
installApiFetchInterceptor();
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <App />
  </React.StrictMode>);
