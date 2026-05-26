import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import type { InsertIndicator } from './TableBlock.types';

export function useInsertIndicators(
    isSelected: boolean,
    safeHeadersLength: number,
    safeRowsLength: number,
    wrapperRef: React.RefObject<HTMLDivElement | null>,
    tableRef: React.RefObject<HTMLTableElement | null>
) {
    const [rowInsert, setRowInsert] = useState<InsertIndicator | null>(null);
    const [colInsert, setColInsert] = useState<InsertIndicator | null>(null);

    const clearIndicators = () => {
        setRowInsert(null);
        setColInsert(null);
    };

    const updateHoverIndicators = (event: MouseEvent<HTMLDivElement>) => {
        if (!isSelected) return;
        const wrapper = wrapperRef.current;
        const table = tableRef.current;
        if (!wrapper || !table) return;

        const rect = wrapper.getBoundingClientRect();
        const scrollLeft = wrapper.scrollLeft || 0;
        
        // x relative to scrolled coordinates (absolute children scroll with wrapperRef content)
        const x = event.clientX - rect.left + scrollLeft;
        // y relative to container client coordinate (no vertical scroll on wrapperRef itself)
        const y = event.clientY - rect.top;
        const threshold = 8;

        const tableRect = table.getBoundingClientRect();
        const tableLeft = tableRect.left - rect.left + scrollLeft;
        const tableTop = tableRect.top - rect.top;
        const tableWidth = tableRect.width;
        const tableHeight = tableRect.height;

        const tbody = table.querySelector('tbody');
        if (tbody) {
            const rowsEls = Array.from(tbody.querySelectorAll('tr'));
            const boundaries: number[] = [];
            const tbodyRect = tbody.getBoundingClientRect();
            boundaries.push(tbodyRect.top - rect.top);
            rowsEls.forEach((row) => {
                const rowRect = row.getBoundingClientRect();
                boundaries.push(rowRect.bottom - rect.top);
            });
            if (safeRowsLength === 0) {
                boundaries.push(tbodyRect.bottom - rect.top);
            }
            if (boundaries.length > 0) {
                let closest = -1;
                let min = Infinity;
                boundaries.forEach((pos, idx) => {
                    const dist = Math.abs(y - pos);
                    if (dist < min) {
                        min = dist;
                        closest = idx;
                    }
                });
                if (min <= threshold) {
                    const top = boundaries[closest];
                    setRowInsert({
                        index: closest,
                        top,
                        left: tableLeft,
                        width: tableWidth,
                    });
                } else {
                    setRowInsert(null);
                }
            } else {
                setRowInsert(null);
            }
        } else {
            setRowInsert(null);
        }

        const headerRow = table.querySelector('thead tr');
        let colCells: HTMLTableCellElement[] = [];
        if (headerRow) {
            colCells = Array.from(headerRow.querySelectorAll('th.table-col'));
        }
        if (colCells.length > 0) {
            const boundaries: number[] = [];
            const firstRect = colCells[0].getBoundingClientRect();
            boundaries.push(firstRect.left - rect.left + scrollLeft);
            colCells.forEach((cell) => {
                const cellRect = cell.getBoundingClientRect();
                boundaries.push(cellRect.right - rect.left + scrollLeft);
            });
            let closest = -1;
            let min = Infinity;
            boundaries.forEach((pos, idx) => {
                const dist = Math.abs(x - pos);
                if (dist < min) {
                    min = dist;
                    closest = idx;
                }
            });
            if (min <= threshold) {
                const left = boundaries[closest];
                setColInsert({
                    index: closest,
                    left,
                    top: tableTop,
                    height: tableHeight,
                });
            } else {
                setColInsert(null);
            }
        } else {
            setColInsert(null);
        }
    };

    useEffect(() => {
        if (!isSelected) {
            clearIndicators();
        }
    }, [isSelected]);

    return {
        rowInsert,
        colInsert,
        updateHoverIndicators,
        clearIndicators,
    };
}
