import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import { StoreProvider } from './store.jsx';
import { TimerProvider } from './timer.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <TimerProvider>
        <App />
      </TimerProvider>
    </StoreProvider>
  </React.StrictMode>
);