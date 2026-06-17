import { DataType } from './enums';

export interface ColumnDefinition {
  name: string;
  type: DataType;
}

export interface FormulaColumn extends ColumnDefinition {
  formula: string;
  isFormula: true;
}

export type DatasetColumn = ColumnDefinition | FormulaColumn;

export type DatasetRow = Record<string, string | number | boolean | null>;

export interface Dataset {
  id: string;
  name: string;
  description: string;
  sourceFileName: string;
  importedAt: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  tags: string[];
  data: DatasetRow[];
}
