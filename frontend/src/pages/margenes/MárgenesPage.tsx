import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { HiRefresh, HiSave, HiTrash, HiArrowRight } from 'react-icons/hi';

interface MargenCategoriaItem {
  id: number;
  categoria: string;
  margen: number;
}

interface MargenesData {
  margenGeneral: number;
  categorias: MargenCategoriaItem[];
  categoriasDisponibles: string[];
}

export default function MárgenesPage() {
  const [data, setData] = useState<MargenesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Formulario margen general
  const [margenGeneral, setMargenGeneral] = useState('30');

  // Formulario edición por categoría (map categoría → margen editable)
  const [catEdits, setCatEdits] = useState<Record<string, string>>({});

  // Nueva categoría
  const [nuevaCat, setNuevaCat] = useState('');
  const [nuevoMargenCat, setNuevoMargenCat] = useState('');

  const showFeedback = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/margenes');
      setData(res);
      setMargenGeneral(String(res.margenGeneral));
      const edits: Record<string, string> = {};
      res.categorias.forEach((c: MargenCategoriaItem) => { edits[c.categoria] = String(c.margen); });
      setCatEdits(edits);
    } catch {
      showFeedback('err', 'Error al cargar márgenes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Guardar margen general ──
  const handleSaveGeneral = async () => {
    const val = parseFloat(margenGeneral);
    if (isNaN(val) || val < 0) { showFeedback('err', 'Valor inválido'); return; }
    setSaving(true);
    try {
      const { data: res } = await api.put('/margenes/general', { margen: val });
      showFeedback('ok', `Margen general actualizado a ${val}% — ${res.recalculo}`);
      fetchData();
    } catch { showFeedback('err', 'Error al guardar'); }
    finally { setSaving(false); }
  };

  // ── Guardar margen de categoría ──
  const handleSaveCategoria = async (cat: string) => {
    const val = parseFloat(catEdits[cat]);
    if (isNaN(val) || val < 0) { showFeedback('err', 'Valor inválido'); return; }
    setSaving(true);
    try {
      const { data: res } = await api.put(`/margenes/categorias/${encodeURIComponent(cat)}`, { margen: val });
      showFeedback('ok', `Margen de "${cat}" actualizado a ${val}% — ${res.recalculo}`);
      fetchData();
    } catch { showFeedback('err', 'Error al guardar'); }
    finally { setSaving(false); }
  };

  // ── Eliminar margen de categoría ──
  const handleDeleteCategoria = async (cat: string) => {
    if (!confirm(`¿Eliminar margen de "${cat}"? Volverán al margen general.`)) return;
    try {
      const { data: res } = await api.delete(`/margenes/categorias/${encodeURIComponent(cat)}`);
      showFeedback('ok', `Margen de "${cat}" eliminado — ${res.recalculo}`);
      fetchData();
    } catch { showFeedback('err', 'Error al eliminar'); }
  };

  // ── Añadir nueva categoría ──
  const handleAddCategoria = async () => {
    if (!nuevaCat) return;
    const val = parseFloat(nuevoMargenCat);
    if (isNaN(val) || val < 0) { showFeedback('err', 'Valor inválido'); return; }
    setSaving(true);
    try {
      await api.put(`/margenes/categorias/${encodeURIComponent(nuevaCat)}`, { margen: val });
      showFeedback('ok', `Margen de "${nuevaCat}" creado a ${val}%`);
      setNuevaCat('');
      setNuevoMargenCat('');
      fetchData();
    } catch { showFeedback('err', 'Error al crear'); }
    finally { setSaving(false); }
  };

  // ── Recalcular todos ──
  const handleRecalcular = async () => {
    setRecalculating(true);
    try {
      const { data: res } = await api.post('/margenes/recalcular');
      showFeedback('ok', `${res.actualizados} materiales recalculados`);
    } catch { showFeedback('err', 'Error al recalcular'); }
    finally { setRecalculating(false); }
  };

  // Categorías sin margen propio (candidatas a añadir)
  const catsSinMargen = data
    ? data.categoriasDisponibles.filter(
        (c) => !data.categorias.find((mc) => mc.categoria === c)
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Márgenes de Materiales</h1>
        <Button onClick={handleRecalcular} disabled={recalculating} variant="secondary">
          <HiRefresh className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Recalculando...' : 'Recalcular todos los precios'}
        </Button>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${feedback.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {feedback.type === 'ok' ? '✅' : '❌'} {feedback.text}
        </div>
      )}

      {/* ── Info de cascada ── */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>Prioridad de márgenes:</strong> Margen individual del material <HiArrowRight className="inline w-4 h-4 mx-1" />
        Margen de su categoría <HiArrowRight className="inline w-4 h-4 mx-1" /> Margen general.
        El precio de venta se calcula como: <code className="bg-blue-100 px-1 rounded">costeMedio × (1 + margen / 100)</code>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── MARGEN GENERAL ── */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Margen General</h2>
          <p className="text-sm text-gray-500 mb-4">
            Se aplica a todos los materiales que no tengan un margen de categoría o individual.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label-field">Margen (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                value={margenGeneral}
                onChange={(e) => setMargenGeneral(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveGeneral} disabled={saving}>
              <HiSave className="w-4 h-4" /> Guardar
            </Button>
          </div>
          {/* Preview */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-500">Ejemplo:</span> Coste 1,00 € → Precio venta{' '}
            <strong>{(1 * (1 + parseFloat(margenGeneral || '0') / 100)).toFixed(2)} €</strong>
          </div>
        </Card>

        {/* ── RECÁLCULO ── */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Estado</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Margen general</span>
              <Badge>{data?.margenGeneral ?? 0}%</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categorías con margen propio</span>
              <Badge variant="blue">{data?.categorias.length ?? 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categorías sin margen propio</span>
              <Badge variant="yellow">{catsSinMargen.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total categorías de materiales</span>
              <Badge variant="gray">{data?.categoriasDisponibles.length ?? 0}</Badge>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Tras cambiar márgenes, pulsa "Recalcular todos los precios" para actualizar los precios de venta en la base de datos.
          </p>
        </Card>
      </div>

      {/* ── MÁRGENES POR CATEGORÍA ── */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Márgenes por Categoría</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sobreescriben el margen general para todos los materiales de esa categoría (salvo los que tengan margen individual).
        </p>

        {data && data.categorias.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Categoría</th>
                <th className="pb-2 w-32">Margen (%)</th>
                <th className="pb-2 w-40 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.categorias.map((mc) => (
                <tr key={mc.categoria} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-2">
                    <Badge>{mc.categoria}</Badge>
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="input-field w-24"
                      value={catEdits[mc.categoria] ?? String(mc.margen)}
                      onChange={(e) => setCatEdits({ ...catEdits, [mc.categoria]: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => handleSaveCategoria(mc.categoria)} disabled={saving}>
                        <HiSave className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteCategoria(mc.categoria)}>
                        <HiTrash className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm py-4">No hay márgenes por categoría. Todas usan el margen general.</p>
        )}

        {/* ── Añadir nueva categoría ── */}
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Añadir margen a categoría</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label-field">Categoría</label>
              {catsSinMargen.length > 0 ? (
                <select
                  className="input-field"
                  value={nuevaCat}
                  onChange={(e) => setNuevaCat(e.target.value)}
                >
                  <option value="">Seleccionar categoría...</option>
                  {catsSinMargen.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input-field"
                  value={nuevaCat}
                  onChange={(e) => setNuevaCat(e.target.value)}
                  placeholder="Nombre de categoría"
                />
              )}
            </div>
            <div className="w-32">
              <label className="label-field">Margen (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                value={nuevoMargenCat}
                onChange={(e) => setNuevoMargenCat(e.target.value)}
                placeholder="30"
              />
            </div>
            <Button onClick={handleAddCategoria} disabled={!nuevaCat || saving}>
              Añadir
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
