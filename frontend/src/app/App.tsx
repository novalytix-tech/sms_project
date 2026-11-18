// ==========================================
// School ERP Root Application
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ERPProvider } from '../context/ERPContext';

export const App: React.FC = () => {
  return (
    <ERPProvider>
      <RouterProvider router={router} />
    </ERPProvider>
  );
};

export default App;

