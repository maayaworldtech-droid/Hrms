import { useSearchParams } from 'react-router-dom';
import { businessDate } from '@/utils/operations';

export const useOperationsFilters = (attendance = false) => {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  return { venue: params.get('location') || 'ALL', date: params.has('date') ? params.get('date') || '' : (attendance ? businessDate() : ''), leaveDate: params.get('onDate') || '', shift: params.get('shift') || 'ALL', status: params.get('status') || 'ALL', set };
};
