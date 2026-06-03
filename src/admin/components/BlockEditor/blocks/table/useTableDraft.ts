import { useEffect, useRef, useState } from 'react';
import { parseJsonProp } from '../shared/block-props';
import type { TableRow } from './TableBlock.types';
import { DEFAULT_HEADERS, normalizeRows } from './TableBlock.defaults';

type TableMaps = {
    draftMap: Map<string, { headers: TableRow; rows: TableRow[] }>;
    lastCommittedPropsMap: Map<string, { headersJson: string; rowsJson: string }>;
    colKeysMap: Map<string, string[]>;
    rowKeysMap: Map<string, string[]>;
};

// Per-editor caches preserve table draft state across BlockNote NodeView
// unmount/remount cycles during editor updates. Keyed by the editor instance
// via a WeakMap so the whole cache is garbage-collected when the editor is
// destroyed (e.g. navigating away). This replaces module-global Maps keyed by
// block id, which never got cleaned up (memory leak) and leaked stale state
// across documents that reuse block ids (e.g. default `init-0`).
const editorTableMaps = new WeakMap<object, TableMaps>();

function getTableMaps(editor: object): TableMaps {
    let maps = editorTableMaps.get(editor);
    if (!maps) {
        maps = {
            draftMap: new Map(),
            lastCommittedPropsMap: new Map(),
            colKeysMap: new Map(),
            rowKeysMap: new Map(),
        };
        editorTableMaps.set(editor, maps);
    }
    return maps;
}

export function useTableDraft(editor: any, block: any) {
    const { draftMap, lastCommittedPropsMap, colKeysMap, rowKeysMap } = getTableMaps(editor);

    const [draft, setDraftState] = useState<{ headers: TableRow; rows: TableRow[] }>(() => {
        const cached = draftMap.get(block.id);
        if (cached) return cached;

        const parsedHeaders = parseJsonProp<TableRow>(block.props.headersJson, []);
        const safeHeaders = parsedHeaders.length > 0 ? parsedHeaders : DEFAULT_HEADERS;
        const parsedRows = parseJsonProp<TableRow[]>(block.props.rowsJson, []);
        const safeRows = normalizeRows(parsedRows, safeHeaders.length);
        const initialDraft = {
            headers: safeHeaders,
            rows: safeRows,
        };
        draftMap.set(block.id, initialDraft);
        return initialDraft;
    });

    const isMountedRef = useRef(true);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            // Only drop cached entries if the block was actually removed from the
            // document — not on a transient NodeView remount (block still exists).
            try {
                if (!editor?.getBlock?.(block.id)) {
                    draftMap.delete(block.id);
                    lastCommittedPropsMap.delete(block.id);
                    colKeysMap.delete(block.id);
                    rowKeysMap.delete(block.id);
                }
            } catch {
                // editor torn down — WeakMap GC handles the rest.
            }
        };
    }, []);

    const setDraft = (nextDraft: { headers: TableRow; rows: TableRow[] }) => {
        if (!isMountedRef.current) return;
        setDraftState(nextDraft);
        draftMap.set(block.id, nextDraft);
    };

    const draftRef = useRef(draft);
    draftRef.current = draft;

    const debouncedCommit = (currentDraft: { headers: TableRow; rows: TableRow[] }) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                commitDraft(currentDraft);
            }
        }, 400);
    };

    const safeHeaders = draft.headers;
    const safeRows = draft.rows;

    const generateId = () => Math.random().toString(36).substring(2, 11);

    // Retrieve or initialize cached stable keys from module-level store
    const colKeys = (() => {
        let keys = colKeysMap.get(block.id);
        if (!keys) {
            keys = [];
            colKeysMap.set(block.id, keys);
        }
        return keys;
    })();

    const rowKeys = (() => {
        let keys = rowKeysMap.get(block.id);
        if (!keys) {
            keys = [];
            rowKeysMap.set(block.id, keys);
        }
        return keys;
    })();

    // Align stable column keys dynamically
    if (colKeys.length !== safeHeaders.length) {
        if (colKeys.length < safeHeaders.length) {
            while (colKeys.length < safeHeaders.length) {
                colKeys.push(generateId());
            }
        } else {
            colKeys.splice(safeHeaders.length);
        }
    }

    // Align stable row keys dynamically
    if (rowKeys.length !== safeRows.length) {
        if (rowKeys.length < safeRows.length) {
            while (rowKeys.length < safeRows.length) {
                rowKeys.push(generateId());
            }
        } else {
            rowKeys.splice(safeRows.length);
        }
    }

    // Track last committed block props to prevent recursive state updates or reset on typing
    const lastCommittedPropsRef = useRef<{ headersJson: string; rowsJson: string } | null>(null);
    if (!lastCommittedPropsRef.current) {
        lastCommittedPropsRef.current = lastCommittedPropsMap.get(block.id) || {
            headersJson: block.props.headersJson,
            rowsJson: block.props.rowsJson,
        };
    }

    const setLastCommittedProps = (newProps: { headersJson: string; rowsJson: string }) => {
        lastCommittedPropsRef.current = newProps;
        lastCommittedPropsMap.set(block.id, newProps);
    };

    // Reconcile draft state when block props change externally (like undo/redo)
    useEffect(() => {
        const propsHeaders = block.props.headersJson;
        const propsRows = block.props.rowsJson;
        const lastCommitted = lastCommittedPropsRef.current;
        if (!lastCommitted) return;

        if (
            propsHeaders !== lastCommitted.headersJson ||
            propsRows !== lastCommitted.rowsJson
        ) {
            const currentDraft = draftRef.current;
            const draftHeadersStr = JSON.stringify(currentDraft.headers);
            const draftRowsStr = JSON.stringify(currentDraft.rows);

            if (propsHeaders === draftHeadersStr && propsRows === draftRowsStr) {
                setLastCommittedProps({
                    headersJson: propsHeaders,
                    rowsJson: propsRows,
                });
                return;
            }

            const parsedHeaders = parseJsonProp<TableRow>(propsHeaders, []);
            const reconciledHeaders = parsedHeaders.length > 0 ? parsedHeaders : DEFAULT_HEADERS;
            const parsedRows = parseJsonProp<TableRow[]>(propsRows, []);
            const reconciledRows = normalizeRows(parsedRows, reconciledHeaders.length);

            const nextDraft = {
                headers: reconciledHeaders,
                rows: reconciledRows,
            };
            setDraft(nextDraft);

            setLastCommittedProps({
                headersJson: propsHeaders,
                rowsJson: propsRows,
            });
        }
    }, [block.props.headersJson, block.props.rowsJson]);

    const commitDraft = (currentDraft: { headers: TableRow; rows: TableRow[] }) => {
        const headersStr = JSON.stringify(currentDraft.headers);
        const rowsStr = JSON.stringify(currentDraft.rows);
        const lastCommitted = lastCommittedPropsRef.current;
        if (!lastCommitted) return;

        if (
            lastCommitted.headersJson === headersStr &&
            lastCommitted.rowsJson === rowsStr
        ) {
            return;
        }

        if (
            block.props.headersJson !== headersStr ||
            block.props.rowsJson !== rowsStr
        ) {
            setLastCommittedProps({
                headersJson: headersStr,
                rowsJson: rowsStr,
            });

            editor.updateBlock(block.id, {
                // Preserve the block type: omitting it lets BlockNote replace a
                // content:'none' custom block with a default heading on update.
                type: 'simpleTable',
                props: {
                    headersJson: headersStr,
                    rowsJson: rowsStr,
                },
            });
        }
    };

    const handleHeaderChange = (cIdx: number, value: string) => {
        const current = draftRef.current;
        const nextHeaders = [...current.headers];
        nextHeaders[cIdx] = value;
        const nextDraft = {
            ...current,
            headers: nextHeaders,
        };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        debouncedCommit(nextDraft);
    };

    const handleCellChange = (rIdx: number, cIdx: number, value: string) => {
        const current = draftRef.current;
        const nextRows = current.rows.map((row, idx) => {
            if (idx !== rIdx) return row;
            const nextRow = [...row];
            nextRow[cIdx] = value;
            return nextRow;
        });
        const nextDraft = {
            ...current,
            rows: nextRows,
        };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        debouncedCommit(nextDraft);
    };

    const insertColumnAt = (index: number) => {
        const current = draftRef.current;
        const nextHeaders = [...current.headers];
        nextHeaders.splice(index, 0, `Column ${nextHeaders.length + 1}`);
        const nextRows = current.rows.map((row) => {
            const next = Array.isArray(row) ? [...row] : [];
            next.splice(index, 0, '');
            return next;
        });

        // Track new stable key at target index in cache
        colKeys.splice(index, 0, generateId());

        const nextDraft = { headers: nextHeaders, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const addColumn = () => {
        insertColumnAt(draftRef.current.headers.length);
    };

    const removeColumn = (index: number) => {
        const current = draftRef.current;
        if (current.headers.length <= 1) return;
        const nextHeaders = current.headers.filter((_, i) => i !== index);
        const nextRows = current.rows.map((row) => {
            const next = Array.isArray(row) ? [...row] : [];
            next.splice(index, 1);
            return next;
        });

        // Remove stable key at target index in cache
        colKeys.splice(index, 1);

        const nextDraft = { headers: nextHeaders, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const addRow = () => {
        const current = draftRef.current;
        const nextRows = [...current.rows, Array(current.headers.length).fill('')];
        rowKeys.push(generateId());
        const nextDraft = { headers: current.headers, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const insertRowAt = (index: number) => {
        const current = draftRef.current;
        const nextRows = [...current.rows];
        nextRows.splice(index, 0, Array(current.headers.length).fill(''));

        // Track new stable key at target index in cache
        rowKeys.splice(index, 0, generateId());

        const nextDraft = { headers: current.headers, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const removeRow = (index: number) => {
        const current = draftRef.current;
        const nextRows = current.rows.filter((_, i) => i !== index);

        // Remove stable key at target index in cache
        rowKeys.splice(index, 1);

        const nextDraft = { headers: current.headers, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    return {
        draft,
        draftRef,
        safeHeaders,
        safeRows,
        colKeys,
        rowKeys,
        handleHeaderChange,
        handleCellChange,
        insertColumnAt,
        addColumn,
        removeColumn,
        addRow,
        insertRowAt,
        removeRow,
        commitDraft,
    };
}
