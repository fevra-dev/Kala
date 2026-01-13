import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup';
import { Logger } from '../shared/logger';

Logger.debug('Popup: Initializing React app');

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

Logger.debug('Popup: React app rendered');

