import { useState, useEffect, useRef } from 'react';

export function useSelection(allAvailableIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const allSelected =
    allAvailableIds.length > 0 &&
    allAvailableIds.every((id) => selectedIds.includes(id));

  const someSelected =
    allAvailableIds.some((id) => selectedIds.includes(id)) && !allSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      const setOfAvailable = new Set(allAvailableIds);
      setSelectedIds((prev) => prev.filter((id) => !setOfAvailable.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...allAvailableIds]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const toggleSelectCard = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return {
    selectedIds,
    setSelectedIds,
    selectAllCheckboxRef,
    allSelected,
    someSelected,
    toggleSelectAll,
    toggleSelectCard,
    clearSelection,
  };
}
