// Chart theme — Navy (#16324F) + Teal (#2A9D8F) on White
export const tick = { fill: '#6B8AA6', fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' };
export const grid = '#E8EFF6';
export const gridDashed = '#D6E0EB';

export const tooltipProps = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid #D6E0EB',
    borderRadius: 8,
    color: '#16324F',
    fontSize: 12,
    fontFamily: '"Inter", system-ui, sans-serif',
    boxShadow: '0 4px 16px rgba(22,50,79,0.12)',
    padding: '8px 12px',
  },
  labelStyle: {
    color: '#2A9D8F',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 11,
    marginBottom: 2,
    fontWeight: 500,
  },
  itemStyle: { color: '#16324F', fontSize: 12 },
};

// Primary and secondary chart colours
export const C_PRIMARY   = '#16324F'; // Deep Navy
export const C_SECONDARY = '#2A9D8F'; // Teal
export const C_TERTIARY  = '#3A7FC1'; // Info Blue (use sparingly)
export const C_WARN      = '#E8972D';
export const C_CRIT      = '#C0392B';
