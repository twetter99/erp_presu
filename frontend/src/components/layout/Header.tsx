import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <HiOutlineUser className="w-5 h-5 text-gray-400" />
          <span className="font-medium">{user?.nombre} {user?.apellidos}</span>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
            {perfilLabels[user?.perfil || ''] || user?.perfil}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <HiOutlineLogout className="w-5 h-5" />
          Salir
        </button>
      </div>
    </header>
  );
}
