/**
 * Custom Block: Tip Box (Alert)
 * 
 * A callout box for tips, warnings, notes, and info.
 * Based on BlockNote documentation example.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import { AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide-react';

const alertTypes = ['tip', 'warning', 'info', 'note'];

const alertIcons = {
    tip: Lightbulb,
    warning: AlertTriangle,
    info: Info,
    note: AlertCircle,
};

const alertColors = {
    tip: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    note: 'bg-slate-50 border-slate-200 text-slate-800',
};

// Create the Alert block following BlockNote docs pattern
export const Alert = createReactBlockSpec(
    {
        type: 'alert',
        propSchema: {
            textAlignment: defaultProps.textAlignment,
            textColor: defaultProps.textColor,
            type: {
                default: 'warning',
                values: alertTypes,
            },
        },
        content: 'inline',
    },
    {
        render: (props) => {
            const alertType = props.block.props.type || 'warning';
            const Icon = alertIcons[alertType] || AlertTriangle;
            const colorClass = alertColors[alertType] || alertColors.warning;

            return (
                <div className={`flex gap-3 p-4 rounded-lg border ${colorClass} my-2`}>
                    <div className="flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <select
                            value={alertType}
                            onChange={(e) => {
                                props.editor.updateBlock(props.block, {
                                    type: 'alert',
                                    props: { type: e.target.value },
                                });
                            }}
                            className="text-xs bg-transparent border-none font-medium cursor-pointer focus:outline-none mb-1 block"
                            contentEditable={false}
                        >
                            <option value="tip">Tip</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                            <option value="note">Note</option>
                        </select>
                        <div
                            ref={props.contentRef}
                            className="prose prose-sm max-w-none"
                        />
                    </div>
                </div>
            );
        },
    }
);
