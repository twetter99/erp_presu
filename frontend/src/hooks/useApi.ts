import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

export function useApi<T>(url: string, autoFetch = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params });
      setData(res.data);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error de conexión';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (autoFetch) fetch();
  }, [autoFetch, fetch]);

  return { data, loading, error, refetch: fetch, setData };
}

export function useCrud<T>(baseUrl: string) {
  const { data: items, loading, error, refetch } = useApi<T[]>(baseUrl);

  const create = async (payload: any): Promise<T | null> => {
    try {
      const res = await api.post(baseUrl, payload);
      toast.success('Creado correctamente');
      refetch();
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear');
      return null;
    }
  };

  const update = async (id: number, payload: any): Promise<T | null> => {
    try {
      const res = await api.put(`${baseUrl}/${id}`, payload);
      toast.success('Actualizado correctamente');
      refetch();
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
      return null;
    }
  };

  const remove = async (id: number): Promise<boolean> => {
    try {
      await api.delete(`${baseUrl}/${id}`);
      toast.success('Eliminado correctamente');
      refetch();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
      return false;
    }
  };

  return { items: items || [], loading, error, refetch, create, update, remove };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
