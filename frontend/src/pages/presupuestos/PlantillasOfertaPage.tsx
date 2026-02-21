import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiSave } from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

type OfertaTemplateCatalog = {
  defaultCode: string;
  templates: Array<{
    codigo: string;
    version: string;
    etiquetas: {
      tituloOferta: string;
    };
  }>;
};

type OfertaModulo = {
  key: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
};

type OfertaModulosGlobalesResponse = {
  templateCode: string;
  defaults: OfertaModulo[];
  overrides: Array<Partial<OfertaModulo> & { key: string }>;
  modules: OfertaModulo[];
};

export default function PlantillasOfertaPage() {
  const navigate = useNavigate();
  const [templateCode, setTemplateCode] = useState<string>('OFERTA_EMT_360_V2');
  const [modulosEditables, setModulosEditables] = useState<OfertaModulo[]>([]);
  const [guardando, setGuardando] = useState(false);

  const { data: templateCatalog } = useApi<OfertaTemplateCatalog>('/presupuestos/oferta-templates/catalogo');
  const {
    data: modulosData,
    loading,
    refetch,
  } = useApi<OfertaModulosGlobalesResponse>(`/presupuestos/oferta-templates/${templateCode}/modulos`, false);

  useEffect(() => {
    if (templateCatalog?.defaultCode) {
      setTemplateCode(templateCatalog.defaultCode);
    }
  }, [templateCatalog?.defaultCode]);

  useEffect(() => {
    if (!templateCode) return;
    refetch();
  }, [templateCode, refetch]);

  useEffect(() => {
    if (!modulosData?.modules) return;
    setModulosEditables(modulosData.modules);
  }, [modulosData?.modules]);

  const actualizarModulo = (key: string, patch: Partial<OfertaModulo>) => {
    setModulosEditables((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
  };

  const guardar = async () => {
    if (!templateCode) return;

    try {
      setGuardando(true);
      const payload = {
        overrides: modulosEditables.map((module) => ({
          key: module.key,
          title: module.title,
          content: module.content,
          enabled: module.enabled,
          order: module.order,
        })),
      };

      await api.put(`/presupuestos/oferta-templates/${templateCode}/modulos`, payload);
      toast.success('Plantilla guardada');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la plantilla');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/presupuestos')}>
            <HiArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <div>
            <h1 className="page-title">Plantillas de oferta</h1>
            <p className="text-[14px] text-slate-500 mt-1">Configura módulos globales por plantilla documental.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Plantilla</label>
          <select
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {(!templateCatalog?.templates || templateCatalog.templates.length === 0) && (
              <option value="OFERTA_EMT_360_V2">Oferta Técnica-Económica · 2.0.0</option>
            )}
            {(templateCatalog?.templates || []).map((template) => (
              <option key={template.codigo} value={template.codigo}>
                {template.etiquetas.tituloOferta} · {template.version}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={guardar} disabled={guardando || loading || modulosEditables.length === 0}>
            <HiSave className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar plantilla'}
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando módulos...</p>
        ) : modulosEditables.length === 0 ? (
          <p className="text-sm text-slate-500">No hay módulos configurados para esta plantilla.</p>
        ) : (
          <div className="space-y-3">
            {modulosEditables
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((module) => (
                <div key={module.key} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={module.enabled}
                      onChange={(e) => actualizarModulo(module.key, { enabled: e.target.checked })}
                    />
                    <input
                      value={module.title}
                      onChange={(e) => actualizarModulo(module.key, { title: e.target.value })}
                      className="flex-1 min-w-[240px] rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={module.order}
                      onChange={(e) => actualizarModulo(module.key, { order: Number(e.target.value) || module.order })}
                      className="w-24 rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <textarea
                    value={module.content}
                    onChange={(e) => actualizarModulo(module.key, { content: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Clave: {module.key}</p>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
