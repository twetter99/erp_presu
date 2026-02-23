import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

interface LayoutContextValue {
  // We can keep this empty or remove it if not needed, but let's keep it for now
  // in case we need global layout state later.
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutState() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutState debe usarse dentro de Layout');
  }
  return context;
}

export default function Layout() {
  return (
    <LayoutContext.Provider value={{}}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-primary/20 selection:text-primary flex flex-col">
        <TopNav />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </LayoutContext.Provider>
  );
}
