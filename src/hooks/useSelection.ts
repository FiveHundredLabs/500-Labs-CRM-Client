import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export function useSelection(allAvailableIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allSelected = useMemo(() => {
    if (allAvailableIds.length === 0) return false;
    return allAvailableIds.every((id) => selectedSet.has(id));
  }, [allAvailableIds, selectedSet]);

  const someSelected = useMemo(() => {
    if (allSelected || allAvailableIds.length === 0) return false;
    return allAvailableIds.some((id) => selectedSet.has(id));
  }, [allAvailableIds, selectedSet, allSelected]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      const setOfAvailable = new Set(allAvailableIds);
      setSelectedIds((prev) => prev.filter((id) => !setOfAvailable.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...allAvailableIds]);
      setSelectedIds(Array.from(newSelected));
    }
  }, [allSelected, allAvailableIds, selectedIds]);

  const toggleSelectCard = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedSet,
    setSelectedIds,
    selectAllCheckboxRef,
    allSelected,
    someSelected,
    toggleSelectAll,
    toggleSelectCard,
    clearSelection,
  };
}
