import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileText,
  FileStack,
  Truck,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Users,
  Warehouse,
  Bus,
  Wrench,
  Package,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { useState, createContext, useContext } from 'react';

/* ──────────────── Sidebar context ──────────────── */
interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}
const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

/* ──────────────── Nav item types ──────────────── */
interface NavDirectLink {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  group: string;
  items: { name: string; href: string; icon: LucideIcon }[];
}

type NavItem = NavDirectLink | NavGroup;

function isDirectLink(item: NavItem): item is NavDirectLink {
  return 'href' in item;
}

/* ──────────────── Nav items ──────────────── */
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    group: 'Preparación Técnica',
    items: [
      { name: 'Proyectos', href: '/proyectos', icon: FolderKanban },
      { name: 'Replanteos', href: '/replanteos', icon: ClipboardList },
      { name: 'Presupuestos', href: '/presupuestos', icon: FileText },
      { name: 'Plantillas', href: '/presupuestos/plantillas', icon: FileStack },
    ],
  },
  {
    group: 'Operación',
    items: [
      { name: 'Órdenes de Trabajo', href: '/ordenes-trabajo', icon: Truck },
      { name: 'Compras', href: '/compras', icon: ShoppingCart },
    ],
  },
  {
    group: 'Economía',
    items: [
      { name: 'Márgenes', href: '/margenes', icon: TrendingUp },
      { name: 'Control Económico', href: '/control', icon: BarChart3 },
    ],
  },
  {
    group: 'Base de Datos',
    items: [
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Cocheras', href: '/cocheras', icon: Warehouse },
      { name: 'Autobuses', href: '/autobuses', icon: Bus },
      { name: 'Trabajos', href: '/trabajos', icon: Wrench },
      { name: 'Materiales', href: '/materiales', icon: Package },
    ],
  },
];

/* ──────────────── Component ──────────────── */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const toggle = () => setCollapsed((p) => !p);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canManageTemplates = ['ADMINISTRADOR', 'DIRECCION'].includes(user?.perfil || '');

  const perfilLabels: Record<string, string> = {
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    OFICINA_TECNICA: 'Oficina Técnica',
    COMPRAS: 'Compras',
    TECNICO_INSTALADOR: 'Técnico',
    ADMINISTRADOR: 'Admin',
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* ── Logo ── */}
        <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-glow">
            EP
          </div>
          {!collapsed && (
            <span className="font-bold text-[17px] text-foreground tracking-tight whitespace-nowrap">
              ERP Presu
            </span>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
          {navigation.map((item, idx) => {
            // Top-level link (Dashboard)
            if (isDirectLink(item)) {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/'}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200',
                    isActive(item.href)
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-sidebar-foreground hover:bg-white/[0.04] hover:text-foreground',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              );
            }

            // Group
            const group = item as NavGroup;
            return (
              <div key={group.group} className={cn(idx > 0 && 'mt-5')}>
                {!collapsed && (
                  <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.group}
                  </p>
                )}
                {collapsed && idx > 0 && <div className="mx-3 my-3 border-t border-sidebar-border" />}
                <div className="space-y-0.5">
                  {group.items
                    .filter((sub) => {
                      if (sub.href === '/presupuestos/plantillas') return canManageTemplates;
                      return true;
                    })
                    .map((sub) => {
                      const Icon = sub.icon;
                      return (
                        <NavLink
                          key={sub.href}
                          to={sub.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200',
                            isActive(sub.href)
                              ? 'bg-primary/15 text-primary'
                              : 'text-sidebar-foreground hover:bg-white/[0.04] hover:text-foreground',
                            collapsed && 'justify-center px-0'
                          )}
                          title={collapsed ? sub.name : undefined}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span>{sub.name}</span>}
                        </NavLink>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Bottom: user + collapse ── */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {/* User */}
          <div className={cn('flex items-center gap-3 rounded-xl px-3 py-2', collapsed && 'justify-center px-0')}>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <User className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground truncate">{user?.nombre}</p>
                <p className="text-[11px] text-muted-foreground truncate">{perfilLabels[user?.perfil || ''] || user?.perfil}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className={cn(
                'p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
                collapsed && 'ml-0'
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors text-[13px]"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}
