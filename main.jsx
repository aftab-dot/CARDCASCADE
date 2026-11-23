import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { BoardProvider } from './context/BoardContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <BoardProvider>
          <App />
        </BoardProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
