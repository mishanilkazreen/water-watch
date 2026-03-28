import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';
import App from './App';

// Mapbox token injected via Vite env — set VITE_MAPBOX_TOKEN in .env
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
