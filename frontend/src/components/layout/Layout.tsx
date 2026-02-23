import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from './Sidebar';
import { cn } from '../../lib/utils';

function LayoutContent() {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Header />
      <main
        className={cn(
          'p-6 lg:p-8 transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
      >
        <div className="max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function Layout() {
  return (
    <>
      <Sidebar />
      <LayoutContent />
    </>
  );
}
