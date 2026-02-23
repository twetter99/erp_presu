import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSidebar } from './Sidebar';
import { cn } from '../../lib/utils';

const routeTitles: Record<string, string> = {
  '/': 'Panel de Control',
  '/proyectos': 'Proyectos',
  '/replanteos': 'Replanteos',
  '/presupuestos': 'Presupuestos',
  '/presupuestos/plantillas': 'Plantillas de Oferta',
  '/ordenes-trabajo': 'Órdenes de Trabajo',
  '/compras': 'Compras',
  '/margenes': 'Márgenes',
  '/control': 'Control Económico',
  '/clientes': 'Clientes',
  '/cocheras': 'Cocheras',
  '/autobuses': 'Autobuses',
  '/trabajos': 'Trabajos',
  '/materiales': 'Materiales',
};

function getTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];
  // Detail pages: /proyectos/123 → Proyectos > Detalle
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const parent = '/' + segments[0];
    const parentTitle = routeTitles[parent];
    if (parentTitle) return `${parentTitle} › Detalle`;
  }
  return 'ERP Presu';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { collapsed } = useSidebar();
  const title = getTitle(location.pathname);
  const greeting = getGreeting();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border bg-background/80 backdrop-blur-md transition-all duration-300',
        collapsed ? 'ml-[72px]' : 'ml-[260px]'
      )}
    >
      <div className="flex flex-col">
        <h1 className="text-[15px] font-semibold text-foreground leading-tight">{title}</h1>
        <p className="text-[12px] text-muted-foreground">
          {greeting}, {user?.nombre?.split(' ')[0] || 'usuario'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground text-[13px] w-56">
          <Search className="h-3.5 w-3.5" />
          <span>Buscar...</span>
          <kbd className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}
