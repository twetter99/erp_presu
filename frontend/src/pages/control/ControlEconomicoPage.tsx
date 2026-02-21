import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ControlEconomicoPage() {
  const [empresa, setEmpresa] = useState('ERP Presupuestos');
  const [prefijo, setPrefijo] = useState('PRE-');
  const [validez, setValidez] = useState('30');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Ajustes generales para el módulo de presupuestos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Datos generales">
          <div className="space-y-4">
            <div>
              <label className="label-field">Nombre de empresa</label>
              <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Prefijo de presupuestos</label>
              <Input value={prefijo} onChange={(e) => setPrefijo(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Validez por defecto (días)</label>
              <Input type="number" value={validez} onChange={(e) => setValidez(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Comportamiento visual">
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="font-semibold">Sidebar compacta</p>
              <p className="text-muted-foreground">La barra lateral puede alternarse entre modo completo y compacto.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="font-semibold">Header con accesos rápidos</p>
              <p className="text-muted-foreground">Botones directos para crear presupuestos y clientes.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="font-semibold">Tablas compactas</p>
              <p className="text-muted-foreground">Densidad visual alineada con la app de operaciones.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancelar</Button>
          <Button>Guardar cambios</Button>
        </div>
      </Card>
    </div>
  );
}
