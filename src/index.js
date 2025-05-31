import React from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard'; // Assuming Dashboard.js (where the above code is) is in the same directory

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);