
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 브라우저 환경에서 process.env를 전역적으로 사용하기 위한 심(Shim) 설정
(window as any).process = (window as any).process || { env: {} };

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
