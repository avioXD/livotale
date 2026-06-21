import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { migrateLegacyStaffAuthFromLocalStorage } from '@/rbac/authStorage';
import { AppRoutes } from '@/app/routes/AppRoutes';
import { ToastHost } from '@/components/common/ToastHost';
import { useAuthStore } from '@/store';
import 'react-circular-progressbar/dist/styles.css';
import './index.css';

migrateLegacyStaffAuthFromLocalStorage();

function AppBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <AppRoutes />
      <ToastHost />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  </StrictMode>,
);
