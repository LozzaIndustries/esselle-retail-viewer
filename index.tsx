import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Starting Application Mount...");

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("FATAL: Could not find root element <div id='root'> to mount to.");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <App />
  );
  console.log("Application Mount Successful.");
} catch (err) {
  console.error("Mount Error:", err);
  if (err instanceof Error) {
    document.body.innerHTML = `<div style="padding:20px;color:red"><h1>Startup Error</h1><p>${err.message}</p></div>`;
  }
}