import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted max-w-2xl">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}
