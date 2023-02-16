import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ensure URL ends with a trailing slash
if (!window.location.pathname.endsWith('/')) {
  window.history.replaceState(null, undefined, window.location.href + '/');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
