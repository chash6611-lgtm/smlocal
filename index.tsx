
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// The process.env.API_KEY is injected automatically by the environment.
// Manual definition of process.env is prohibited by guidelines.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);