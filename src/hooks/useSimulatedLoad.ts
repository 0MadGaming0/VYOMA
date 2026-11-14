import { useEffect, useState } from 'react';

/** Shows a short loading state whenever `dep` changes (stand-in for a real fetch). */
export function useSimulatedLoad(dep: unknown, ms = 450) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [dep, ms]);
  return loading;
}
