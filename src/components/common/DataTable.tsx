import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn?: (row: T) => string;
}

export default function DataTable<T extends { id?: string }>({
  columns, rows, keyFn,
}: Props<T>) {
  if (rows.length === 0) {
    return <EmptyState title="No data records" hint="Telemetry tables will populate as packets arrive." />;
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs sm:text-sm border-collapse min-w-[420px]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="label text-left px-3.5 py-2.5 border-b border-line bg-offwhite text-ink font-bold first:rounded-tl-lg last:rounded-tr-lg"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, ri) => (
            <tr
              key={keyFn ? keyFn(row) : (row.id ?? ri)}
              className="transition-colors hover:bg-offwhite/80 group"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-3.5 py-2.5 text-body last:border-0"
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}