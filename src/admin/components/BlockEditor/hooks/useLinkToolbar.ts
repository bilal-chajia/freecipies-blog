import { useEffect, useRef, useState } from 'react';

interface LinkToolbarState {
    open: boolean;
    top: number;
    left: number;
    text: string;
    url: string;
    selection: { from: number; to: number } | null;
    mode: 'buttons' | 'link';
}

interface LinkToolbarProps {
    editor: Record<string, unknown> | null;
    wrapperRef: React.RefObject<HTMLElement | null>;
    activeBlockId: string | null;
}

/**
 * Hook that manages the inline link toolbar for text selection.
 * Shows bold/italic/link buttons when text is selected, and
 * a URL input when the link button is clicked.
 */
export function useLinkToolbar({ editor, wrapperRef, activeBlockId }: LinkToolbarProps) {
    const [linkToolbar, setLinkToolbar] = useState<LinkToolbarState>({
        open: false,
        top: 0,
        left: 0,
        text: '',
        url: '',
        selection: null,
        mode: 'buttons',
    });
    const linkToolbarRef = useRef(linkToolbar);
    const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});

    useEffect(() => { linkToolbarRef.current = linkToolbar; }, [linkToolbar]);

    useEffect(() => {
        if (!editor) return undefined;

        const handleSelection = () => {
            if (linkToolbarRef.current.mode === 'link') {
                return;
            }
            const text = (editor as Record<string, () => string>).getSelectedText?.() || '';
            if (!text) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const anchorNode = selection.anchorNode;
            if (anchorNode && (editor as Record<string, HTMLElement | null>).domElement && !(editor as Record<string, HTMLElement | null>).domElement!.contains(anchorNode)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const rect = range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const wrapperRect = wrapper.getBoundingClientRect();
            const left = rect.left - wrapperRect.left + rect.width / 2;
            const top = rect.top - wrapperRect.top - 10;
            const url = (editor as Record<string, () => string>).getSelectedLinkUrl?.() || '';
            const selectionState = (editor as Record<string, { _tiptapEditor?: { state?: { selection?: { from: number; to: number } } } }>)._tiptapEditor?.state?.selection;
            const selectionRange = selectionState ? { from: selectionState.from, to: selectionState.to } : null;
            setLinkToolbar({
                open: true,
                top,
                left,
                text,
                url,
                selection: selectionRange,
                mode: 'buttons',
            });
            setActiveStyles((editor as Record<string, () => Record<string, boolean>>).getActiveStyles?.() || {});
        };

        handleSelection();
        const unsubscribe = (editor as Record<string, (cb: () => void) => (() => void) | void>).onSelectionChange?.(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, activeBlockId]);

    return {
        linkToolbar,
        setLinkToolbar,
        activeStyles,
        setActiveStyles,
        linkToolbarRef,
    };
}
