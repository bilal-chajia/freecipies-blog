import { Settings } from 'lucide-react';
import { SettingsSection } from '../DocumentSettings';
import { parseJsonArray } from '../../utils/json';

interface TableSettingsProps {
    selectedBlock: any;
}

export default function TableSettings({ selectedBlock }: TableSettingsProps) {
    const tableHeaders = parseJsonArray(selectedBlock.props.headersJson);
    const tableRows = parseJsonArray(selectedBlock.props.rowsJson);

    return (
        <SettingsSection title="Table Settings" icon={Settings} defaultOpen>
            <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                    <span>Columns</span>
                    <span>{tableHeaders.length}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span>Rows</span>
                    <span>{tableRows.length}</span>
                </div>
            </div>
        </SettingsSection>
    );
}
