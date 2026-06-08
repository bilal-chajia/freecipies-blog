import * as React from "react";

interface TriggerRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

interface ColorPickerProps {
  color: string | null;
  onChange: (color: string | null) => void;
  onClose?: () => void;
  className?: string;
  triggerRect?: DOMRect | null;
}

declare const ColorPicker: React.FC<ColorPickerProps>;
export default ColorPicker;
