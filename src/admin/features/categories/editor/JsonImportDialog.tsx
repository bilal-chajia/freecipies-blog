import { useState, type ChangeEvent } from 'react';
import { Button } from '@/ui/button';
import { Textarea } from '@/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';

interface JsonImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJson: string;
  /** Returns an error message, or null on success (parent closes the dialog). */
  onImport: (rawJson: string) => string | null;
}

const JsonImportDialog = ({ open, onOpenChange, initialJson, onImport }: JsonImportDialogProps) => {
  const [value, setValue] = useState(initialJson);
  const [error, setError] = useState('');

  // Reset content each time the dialog opens.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValue(initialJson);
      setError('');
    }
    onOpenChange(next);
  };

  const handleImport = () => {
    const result = onImport(value);
    if (result) {
      setError(result);
    } else {
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import from JSON</DialogTitle>
          <DialogDescription>
            Paste a JSON object to automatically fill the form fields.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
            placeholder="Paste your JSON here..."
            className="h-[300px] font-mono text-xs"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport}>Import Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JsonImportDialog;
