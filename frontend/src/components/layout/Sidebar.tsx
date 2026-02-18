import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineTruck,
  HiOutlineClipboardList,
  HiOutlineCube,
  HiOutlineSearchCircle,
  HiOutlineDocumentText,
  HiOutlineShoppingCart,
  HiOutlineAdjustments,
  HiOutlineChartBar,
  HiOutlineCog,
} from 'react-icons/hi';

const navItems = [
  { to: '/', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/proyectos', icon: HiOutlineClipboardList, label: 'Proyectos' },
  { to: '/empresas', icon: HiOutlineOfficeBuilding, label: 'Empresas' },
  { to: '/cocheras', icon: HiOutlineCog, label: 'Cocheras' },
  { to: '/autobuses', icon: HiOutlineTruck, label: 'Autobuses' },
  { to: '/trabajos', icon: HiOutlineAdjustments, label: 'Trabajos' },
  { to: '/materiales', icon: HiOutlineCube, label: 'Materiales' },
  { to: '/replanteos', icon: HiOutlineSearchCircle, label: 'Replanteos' },
  { to: '/presupuestos', icon: HiOutlineDocumentText, label: 'Presupuestos' },
  { to: '/compras', icon: HiOutlineShoppingCart, label: 'Compras' },
  { to: '/ordenes-trabajo', icon: HiOutlineAdjustments, label: 'Órdenes Trabajo' },
  { to: '/control', icon: HiOutlineChartBar, label: 'Control Económico' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary-900 text-white flex flex-col z-30">
      <div className="px-6 py-5 border-b border-primary-800">
        <h1 className="text-xl font-bold">ERP Presu</h1>
        <p className="text-xs text-primary-300 mt-1">Instalaciones Embarcadas</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-700 text-white font-medium border-r-3 border-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-primary-800 text-xs text-primary-400">
        v1.0.0 &copy; 2026
      </div>
    </aside>
  );
}
