import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  HiOutlineHome,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineOfficeBuilding,
  HiOutlineTruck,
  HiOutlineAdjustments,
  HiOutlineCube,
  HiOutlineSearchCircle,
  HiOutlineShoppingCart,
  HiOutlineCollection,
  HiOutlineChartBar,
  HiOutlineCog,
  HiChevronDown,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlinePlus,
  HiMenu,
  HiChevronRight,
} from 'react-icons/hi';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HiOutlineHome,
  },
  {
    name: 'Preparación Técnica',
    icon: HiOutlineClipboardList,
    items: [
      { name: 'Proyectos', href: '/proyectos', icon: HiOutlineClipboardList },
      { name: 'Replanteos', href: '/replanteos', icon: HiOutlineSearchCircle },
      { name: 'Presupuestos', href: '/presupuestos', icon: HiOutlineDocumentText },
      { name: 'Plantillas Oferta', href: '/presupuestos/plantillas', icon: HiOutlineDocumentText },
    ],
  },
  {
    name: 'Operación y Logística',
    icon: HiOutlineTruck,
    items: [
      { name: 'Órdenes de Trabajo', href: '/ordenes-trabajo', icon: HiOutlineCollection },
      { name: 'Compras', href: '/compras', icon: HiOutlineShoppingCart },
    ],
  },
  {
    name: 'Control Económico',
    icon: HiOutlineChartBar,
    items: [
      { name: 'Márgenes', href: '/margenes', icon: HiOutlineChartBar },
      { name: 'Control Económico', href: '/control', icon: HiOutlineCog },
    ],
  },
  {
    name: 'Bases de Datos',
    icon: HiOutlineCollection,
    items: [
      { name: 'Empresas', href: '/empresas', icon: HiOutlineOfficeBuilding },
      { name: 'Cocheras', href: '/cocheras', icon: HiOutlineCollection },
      { name: 'Autobuses', href: '/autobuses', icon: HiOutlineTruck },
      { name: 'Trabajos', href: '/trabajos', icon: HiOutlineAdjustments },
      { name: 'Materiales', href: '/materiales', icon: HiOutlineCube },
    ],
  },
];

export default function TopNav() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [mobileOpenGroups, setMobileOpenGroups] = useState<Record<string, boolean>>({
    'Preparación Técnica': true,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const perfilLabels: Record<string, string> = {
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    OFICINA_TECNICA: 'Oficina Técnica',
    COMPRAS: 'Compras',
    TECNICO_INSTALADOR: 'Técnico',
    ADMINISTRADOR: 'Admin',
  };

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const isGroupActive = (items?: { href: string }[]) => {
    if (!items) return false;
    return items.some((item) => isActive(item.href));
  };

  const canManageTemplateModules = ['ADMINISTRADOR', 'DIRECCION'].includes(user?.perfil || '');

  const visibleNavigation = navigation
    .map((item) => {
      if (!item.items) return item;
      return {
        ...item,
        items: item.items.filter((subItem) => {
          if (subItem.href === '/presupuestos/plantillas') return canManageTemplateModules;
          return true;
        }),
      };
    })
    .filter((item) => !item.items || item.items.length > 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 md:px-6 max-w-[1600px] mx-auto">
        {/* Logo & Mobile Menu Button */}
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <HiMenu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <HiOutlineChartBar className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline-block">ERP Presu</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-8 flex-1">
          {visibleNavigation.map((item) => {
            if (!item.items) {
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              );
            }

            return (
              <DropdownMenu.Root
                key={item.name}
                open={openDesktopMenu === item.name}
                onOpenChange={(open) => setOpenDesktopMenu(open ? item.name : null)}
              >
                <DropdownMenu.Trigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none',
                      isGroupActive(item.items) || openDesktopMenu === item.name
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    <HiChevronDown className={cn('h-3.5 w-3.5 opacity-50 transition-transform', openDesktopMenu === item.name && 'rotate-180')} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-50 w-[240px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in-80 zoom-in-95"
                  >
                    <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      {item.name}
                    </div>
                    {item.items.map((subItem) => (
                      <DropdownMenu.Item key={subItem.name} asChild>
                        <NavLink
                          to={subItem.href}
                          onClick={() => setOpenDesktopMenu(null)}
                          className={({ isActive }) =>
                            cn(
                              'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            )
                          }
                        >
                          <subItem.icon className={cn("h-4 w-4", isActive(subItem.href) ? "text-primary" : "text-slate-400")} />
                          {subItem.name}
                        </NavLink>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden lg:flex items-center gap-2 mr-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/presupuestos')} className="h-8 text-xs">
              <HiOutlinePlus className="h-3.5 w-3.5 mr-1" />
              Presupuesto
            </Button>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm outline-none">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <HiOutlineUser className="h-3.5 w-3.5" />
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user?.nombre}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-[240px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-in fade-in-80 zoom-in-95"
              >
                <div className="px-3 py-2.5 text-sm">
                  <p className="font-semibold text-slate-800">{user?.nombre} {user?.apellidos}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">{perfilLabels[user?.perfil || ''] || user?.perfil}</p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 transition-colors"
                >
                  <HiOutlineLogout className="h-4 w-4" />
                  Cerrar sesión
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {navigation.map((item) => (
            <div key={item.name} className="space-y-1">
              {!item.items ? (
                <NavLink
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => setMobileOpenGroups((prev) => ({ ...prev, [item.name]: !prev[item.name] }))}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-lg hover:bg-slate-50"
                  >
                    <span>{item.name}</span>
                    <HiChevronRight className={cn('h-4 w-4 transition-transform', mobileOpenGroups[item.name] && 'rotate-90')} />
                  </button>
                  {mobileOpenGroups[item.name] && item.items.map((subItem) => (
                    <NavLink
                      key={subItem.name}
                      to={subItem.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ml-2',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                        )
                      }
                    >
                      <subItem.icon className={cn("h-5 w-5", isActive(subItem.href) ? "text-primary" : "text-slate-400")} />
                      {subItem.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
