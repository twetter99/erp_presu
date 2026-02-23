interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export default function DataTable<T extends { id: number }>({ columns, data, onRowClick, emptyMessage = 'No hay datos', loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`table-header ${col.className?.includes('text-right') ? 'text-right' : ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'hover:bg-slate-50/80 cursor-pointer transition-colors' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={`table-cell ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
