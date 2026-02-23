import { useNavigate } from 'react-router-dom';
import { HiOutlineLockClosed, HiArrowLeft } from 'react-icons/hi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <HiOutlineLockClosed className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">Acceso denegado</h1>
            <p className="text-sm text-slate-600 mt-1">
              No tienes permisos para acceder a esta sección.
            </p>
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={() => navigate('/presupuestos')}>
                <HiArrowLeft className="h-4 w-4" />
                Volver a Presupuestos
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}