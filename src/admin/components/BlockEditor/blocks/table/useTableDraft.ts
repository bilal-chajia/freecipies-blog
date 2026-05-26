import { useEffect, useRef, useState } from 'react';
import { parseJsonProp } from '../shared/block-props';
import type { TableRow } from './TableBlock.types';
import { DEFAULT_HEADERS, normalizeRows } from './TableBlock.defaults';

// Module-level caches to preserve state across React NodeView unmounts/remounts during editor updates
const draftMap = new Map<string, { headers: TableRow; rows: TableRow[] }>();
const lastCommittedPropsMap = new Map<string, { headersJson: string; rowsJson: string }>();
const isWaitingForCatchUpMap = new Map<string, boolean>();

export function useTableDraft(editor: any, block: any) {
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

    const setDraft = (nextDraft: { headers: TableRow; rows: TableRow[] }) => {
        setDraftState(nextDraft);
        draftMap.set(block.id, nextDraft);
    };

    const draftRef = useRef(draft);
    draftRef.current = draft;

    const safeHeaders = draft.headers;
    const safeRows = draft.rows;

    // Stable keys for rows & columns to prevent React state pollution on mutate / undo-redo
    const rowKeysRef = useRef<string[]>([]);
    const colKeysRef = useRef<string[]>([]);
    const generateId = () => Math.random().toString(36).substring(2, 11);

    // Align stable column keys
    if (colKeysRef.current.length !== safeHeaders.length) {
        const keys = colKeysRef.current;
        if (keys.length < safeHeaders.length) {
            while (keys.length < safeHeaders.length) {
                keys.push(generateId());
            }
        } else {
            colKeysRef.current = keys.slice(0, safeHeaders.length);
        }
    }

    // Align stable row keys
    if (rowKeysRef.current.length !== safeRows.length) {
        const keys = rowKeysRef.current;
        if (keys.length < safeRows.length) {
            while (keys.length < safeRows.length) {
                keys.push(generateId());
            }
        } else {
            rowKeysRef.current = keys.slice(0, safeRows.length);
        }
    }

    const colKeys = colKeysRef.current;
    const rowKeys = rowKeysRef.current;

    // Track last committed block props to prevent recursive state updates or reset on typing
    const lastCommittedPropsRef = useRef<{ headersJson: string; rowsJson: string } | null>(null);
    if (!lastCommittedPropsRef.current) {
        lastCommittedPropsRef.current = lastCommittedPropsMap.get(block.id) || {
            headersJson: block.props.headersJson,
            rowsJson: block.props.rowsJson,
        };
    }

    const isWaitingForCatchUpRef = useRef<boolean | null>(null);
    if (isWaitingForCatchUpRef.current === null) {
        isWaitingForCatchUpRef.current = isWaitingForCatchUpMap.get(block.id) || false;
    }

    const setWaitingForCatchUp = (val: boolean) => {
        isWaitingForCatchUpRef.current = val;
        isWaitingForCatchUpMap.set(block.id, val);
    };

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

        if (isWaitingForCatchUpRef.current) {
            if (
                propsHeaders === lastCommitted.headersJson &&
                propsRows === lastCommitted.rowsJson
            ) {
                setWaitingForCatchUp(false);
            }
            return;
        }

        if (
            propsHeaders !== lastCommitted.headersJson ||
            propsRows !== lastCommitted.rowsJson
        ) {
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
            setWaitingForCatchUp(true);

            const liveBlock = editor.getBlock(block.id);
            const targetBlock = liveBlock || block;

            editor.updateBlock(targetBlock, {
                type: 'simpleTable',
                props: {
                    ...block.props,
                    ...(targetBlock.props || {}),
                    headersJson: headersStr,
                    rowsJson: rowsStr,
                },
            });
        }
    };

    const handleHeaderChange = (cIdx: number, value: string) => {
        setWaitingForCatchUp(false);
        const current = draftRef.current;
        const nextHeaders = [...current.headers];
        nextHeaders[cIdx] = value;
        const nextDraft = {
            ...current,
            headers: nextHeaders,
        };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
    };

    const handleCellChange = (rIdx: number, cIdx: number, value: string) => {
        setWaitingForCatchUp(false);
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

        // Track new stable key at target index
        colKeysRef.current.splice(index, 0, generateId());

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

        // Remove stable key at target index
        colKeysRef.current.splice(index, 1);

        const nextDraft = { headers: nextHeaders, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const addRow = () => {
        const current = draftRef.current;
        const nextRows = [...current.rows, Array(current.headers.length).fill('')];
        rowKeysRef.current.push(generateId());
        const nextDraft = { headers: current.headers, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const insertRowAt = (index: number) => {
        const current = draftRef.current;
        const nextRows = [...current.rows];
        nextRows.splice(index, 0, Array(current.headers.length).fill(''));

        // Track new stable key at target index
        rowKeysRef.current.splice(index, 0, generateId());

        const nextDraft = { headers: current.headers, rows: nextRows };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        commitDraft(nextDraft);
    };

    const removeRow = (index: number) => {
        const current = draftRef.current;
        const nextRows = current.rows.filter((_, i) => i !== index);

        // Remove stable key at target index
        rowKeysRef.current.splice(index, 1);

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
