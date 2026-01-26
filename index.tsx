import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root missing");

// NO StrictMode for Games! Double-invoke kills game loops.
ReactDOM.createRoot(rootElement).render(<App />);
