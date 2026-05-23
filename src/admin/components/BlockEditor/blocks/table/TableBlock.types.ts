export type TableRow = string[];

export interface InsertIndicator {
  index: number;
  top: number;
  left: number;
  width?: number;
  height?: number;
}

export interface TableUpdates {
  headersJson?: string;
  rowsJson?: string;
}
