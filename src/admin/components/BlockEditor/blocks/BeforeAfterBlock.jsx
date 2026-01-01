/**
 * Custom Block: Before/After
 *
 * Compare two images with slider or side-by-side layout.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo, useState } from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { parseVariantsJson, getVariantMap, getBestVariantUrl } from '@shared/types/images';
import MediaDialog from '../../MediaDialog';

const parseSlot = (value) => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const toJson = (value) => JSON.stringify(value || null);

export const BeforeAfterBlock = createReactBlockSpec(
    {
        type: 'beforeAfter',
        propSchema: {
            layout: { default: 'slider', values: ['slider', 'side_by_side'] },
            beforeJson: { default: '' },
            afterJson: { default: '' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const before = useMemo(() => parseSlot(props.block.props.beforeJson), [props.block.props.beforeJson]);
            const after = useMemo(() => parseSlot(props.block.props.afterJson), [props.block.props.afterJson]);
            const [activeSlot, setActiveSlot] = useState(null);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

            const updateBlockProps = (updates) => {
                props.editor.updateBlock(props.block, {
                    type: 'beforeAfter',
                    props: { ...props.block.props, ...updates },
                });
            };

            const updateSlot = (slotKey, nextSlot) => {
                updateBlockProps({ [`${slotKey}Json`]: toJson(nextSlot) });
            };

            const resolvePreview = (slot) => {
                if (!slot?.variants) return '';
                return getBestVariantUrl(slot) || '';
            };

            const handleSelect = (item) => {
                if (!activeSlot) return;
                const parsed = parseVariantsJson(item);
                const variants = getVariantMap(parsed);
                const existing = activeSlot === 'before' ? before : after;
                const nextSlot = {
                    media_id: item.id,
                    alt: existing?.alt || item.altText || item.alt_text || item.name || '',
                    label: existing?.label || (activeSlot === 'before' ? 'Before' : 'After'),
                    variants,
                };
                updateSlot(activeSlot, nextSlot);
                setMediaDialogOpen(false);
                setActiveSlot(null);
            };

            const renderSlot = (slotKey, slotData) => {
                const preview = resolvePreview(slotData);
                const label = slotData?.label || (slotKey === 'before' ? 'Before' : 'After');
                return (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {label}
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{slotData?.media_id ? `Media #${slotData.media_id}` : 'No image selected'}</span>
                                {slotData?.media_id && (
                                    <button
                                        type="button"
                                        onClick={() => updateSlot(slotKey, null)}
                                        className="inline-flex items-center gap-1 text-red-500 hover:underline"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="w-full h-40 rounded-md overflow-hidden bg-white border border-dashed border-gray-200 flex items-center justify-center">
                                {preview ? (
                                    <img src={preview} alt={slotData?.alt || ''} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-xs text-gray-400">
                                        <ImageIcon className="w-5 h-5 mb-1" />
                                        Select image
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveSlot(slotKey);
                                        setMediaDialogOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <ImageIcon className="w-3 h-3" />
                                    Choose image
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <input
                                type="text"
                                value={slotData?.alt || ''}
                                onChange={(e) => updateSlot(slotKey, { ...slotData, alt: e.target.value })}
                                placeholder="Alt text"
                                className="w-full px-2 py-1 text-xs border rounded-md"
                            />
                            <input
                                type="text"
                                value={slotData?.label || ''}
                                onChange={(e) => updateSlot(slotKey, { ...slotData, label: e.target.value })}
                                placeholder="Label (optional)"
                                className="w-full px-2 py-1 text-xs border rounded-md"
                            />
                        </div>
                    </div>
                );
            };

            return (
                <>
                    <div className="border border-gray-200 rounded-lg p-4 my-2 bg-white shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-gray-500" />
                                <h4 className="text-sm font-medium text-gray-700">Before / After</h4>
                            </div>
                            <select
                                value={props.block.props.layout}
                                onChange={(e) => updateBlockProps({ layout: e.target.value })}
                                className="px-2 py-1 text-xs border rounded-md"
                            >
                                <option value="slider">Slider</option>
                                <option value="side_by_side">Side by side</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderSlot('before', before)}
                            {renderSlot('after', after)}
                        </div>
                    </div>

                    <MediaDialog
                        open={mediaDialogOpen}
                        onOpenChange={setMediaDialogOpen}
                        onSelect={handleSelect}
                    />
                </>
            );
        },
    }
);
