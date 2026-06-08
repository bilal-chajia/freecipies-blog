import React, { useEffect, useState } from 'react';
import { FileText, Clock, Type, Hash } from 'lucide-react';
import type { AppEditor } from '../schema';
import { cn } from '@/lib/utils';

interface EditorStatsProps {
    editor: AppEditor | null;
    className?: string;
}

interface Stats {
    words: number;
    characters: number;
    charNoSpaces: number;
    readingTime: number;
    paragraphs: number;
}

export default function EditorStats({ editor, className }: EditorStatsProps) {
    const [stats, setStats] = useState<Stats>({
        words: 0,
        characters: 0,
        charNoSpaces: 0,
        readingTime: 0,
        paragraphs: 0,
    });

    useEffect(() => {
        if (!editor) return undefined;

        const extractTextFromBlocks = (blocks: any[]): string => {
            let text = '';
            for (const block of blocks) {
                if (!block) continue;
                if (Array.isArray(block.content)) {
                    for (const span of block.content) {
                        if (span && typeof span === 'object' && 'text' in span) {
                            text += ' ' + span.text;
                        }
                    }
                }
                if (block.props) {
                    if (typeof block.props.title === 'string') {
                        text += ' ' + block.props.title;
                    }
                    if (typeof block.props.text === 'string') {
                        text += ' ' + block.props.text;
                    }
                }
                if (Array.isArray(block.children)) {
                    text += ' ' + extractTextFromBlocks(block.children);
                }
            }
            return text;
        };

        const countParagraphs = (blocks: any[]): number => {
            let count = 0;
            for (const block of blocks) {
                if (!block) continue;
                if (block.type === 'paragraph') count++;
                if (Array.isArray(block.children)) {
                    count += countParagraphs(block.children);
                }
            }
            return count;
        };

        const calculateStats = () => {
            const blocks = editor.document;
            const combinedText = extractTextFromBlocks(blocks);
            
            const wordsList = combinedText.trim().split(/\s+/).filter(Boolean);
            const words = wordsList.length;
            const characters = combinedText.length;
            const charNoSpaces = combinedText.replace(/\s+/g, '').length;
            const paragraphs = countParagraphs(blocks);
            const readingTime = Math.max(1, Math.ceil(words / 200));

            setStats({
                words,
                characters,
                charNoSpaces,
                readingTime,
                paragraphs,
            });
        };

        calculateStats();

        // Listen for editor content changes
        const unsubscribe = (editor as any).onEditorContentChange?.(calculateStats);

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <div className={cn(
            "flex items-center gap-4 select-none text-muted-foreground",
            className
        )}>
            {/* Word count */}
            <div className="flex items-center gap-1.5" title="Word count">
                <Type className="size-3.5 text-primary" />
                <span className="font-bold text-foreground">{stats.words}</span>
                <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-semibold">Words</span>
            </div>

            <div className="h-4 w-[1px] bg-border/80" />

            {/* Reading Time */}
            <div className="flex items-center gap-1.5" title="Estimated reading time">
                <Clock className="size-3.5 text-primary" />
                <span className="font-bold text-foreground">{stats.readingTime}</span>
                <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-semibold">Min read</span>
            </div>

            <div className="h-4 w-[1px] bg-border/80" />

            {/* Paragraph count */}
            <div className="flex items-center gap-1.5" title="Paragraphs">
                <FileText className="size-3.5 text-primary" />
                <span className="font-bold text-foreground">{stats.paragraphs}</span>
                <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-semibold">Paras</span>
            </div>

            <div className="h-4 w-[1px] bg-border/80" />

            {/* Character count */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium" title="Characters (no spaces)">
                <Hash className="size-3.5 text-primary" />
                <span className="text-foreground">{stats.charNoSpaces}</span>
                <span className="text-[9px] text-muted-foreground/60 font-medium">Chars</span>
            </div>
        </div>
    );
}
