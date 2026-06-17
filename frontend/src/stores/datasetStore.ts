import { create } from 'zustand';
import { Dataset, DatasetColumn, FormulaColumn, DataType } from '../types';
import { sampleDataset } from '../api/mockData';
import { db } from '../utils/db';
import { computeDatasetWithFormulas, validateFormula } from '../utils/formulaEngine';

interface DatasetState {
  datasets: Dataset[];
  selectedDatasetId: string;
  loadDatasets: () => Promise<void>;
  addDataset: (dataset: Dataset) => Promise<void>;
  selectDataset: (datasetId: string) => void;
  updateColumnType: (datasetId: string, columnName: string, type: Dataset['columns'][number]['type']) => Promise<void>;
  addFormulaColumn: (datasetId: string, column: FormulaColumn) => Promise<void>;
  updateFormulaColumn: (datasetId: string, columnName: string, updates: Partial<FormulaColumn>) => Promise<void>;
  deleteFormulaColumn: (datasetId: string, columnName: string) => Promise<void>;
  getComputedDataset: (datasetId: string) => { columns: DatasetColumn[]; data: Dataset['data'] } | null;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [sampleDataset],
  selectedDatasetId: sampleDataset.id,
  loadDatasets: async () => {
    const persisted = await db.datasets.toArray();
    if (persisted.length === 0) {
      await db.datasets.put(sampleDataset);
      return;
    }
    set({ datasets: persisted, selectedDatasetId: persisted[0].id });
  },
  addDataset: async (dataset) => {
    await db.datasets.put(dataset);
    set({ datasets: [dataset, ...get().datasets], selectedDatasetId: dataset.id });
  },
  selectDataset: (datasetId) => set({ selectedDatasetId: datasetId }),
  updateColumnType: async (datasetId, columnName, type) => {
    const datasets = get().datasets.map((dataset) =>
      dataset.id === datasetId
        ? { ...dataset, columns: dataset.columns.map((column) => (column.name === columnName ? { ...column, type } : column)) }
        : dataset,
    );
    const updated = datasets.find((dataset) => dataset.id === datasetId);
    if (updated) await db.datasets.put(updated);
    set({ datasets });
  },
  addFormulaColumn: async (datasetId, column) => {
    const validation = validateFormula(column.formula, get().datasets.find((d) => d.id === datasetId)?.columns ?? []);
    if (!validation.valid) throw new Error(validation.error);
    const datasets = get().datasets.map((dataset) => {
      if (dataset.id !== datasetId) return dataset;
      if (dataset.columns.some((c) => c.name === column.name)) {
        throw new Error(`字段名 "${column.name}" 已存在`);
      }
      return {
        ...dataset,
        columns: [...dataset.columns, column],
        columnCount: dataset.columnCount + 1,
      };
    });
    const updated = datasets.find((dataset) => dataset.id === datasetId);
    if (updated) await db.datasets.put(updated);
    set({ datasets });
  },
  updateFormulaColumn: async (datasetId, columnName, updates) => {
    const datasets = get().datasets.map((dataset) => {
      if (dataset.id !== datasetId) return dataset;
      const targetColumn = dataset.columns.find((c) => c.name === columnName);
      if (!targetColumn || !('isFormula' in targetColumn) || !targetColumn.isFormula) {
        throw new Error('不是公式派生列');
      }
      if (updates.formula) {
        const otherColumns = dataset.columns.filter((c) => c.name !== columnName);
        const validation = validateFormula(updates.formula, otherColumns);
        if (!validation.valid) throw new Error(validation.error);
      }
      if (updates.name && updates.name !== columnName) {
        if (dataset.columns.some((c) => c.name === updates.name)) {
          throw new Error(`字段名 "${updates.name}" 已存在`);
        }
      }
      return {
        ...dataset,
        columns: dataset.columns.map((column) =>
          column.name === columnName ? ({ ...column, ...updates } as FormulaColumn) : column,
        ),
      };
    });
    const updated = datasets.find((dataset) => dataset.id === datasetId);
    if (updated) await db.datasets.put(updated);
    set({ datasets });
  },
  deleteFormulaColumn: async (datasetId, columnName) => {
    const datasets = get().datasets.map((dataset) => {
      if (dataset.id !== datasetId) return dataset;
      const targetColumn = dataset.columns.find((c) => c.name === columnName);
      if (!targetColumn || !('isFormula' in targetColumn) || !targetColumn.isFormula) {
        throw new Error('不是公式派生列');
      }
      return {
        ...dataset,
        columns: dataset.columns.filter((c) => c.name !== columnName),
        columnCount: dataset.columnCount - 1,
      };
    });
    const updated = datasets.find((dataset) => dataset.id === datasetId);
    if (updated) await db.datasets.put(updated);
    set({ datasets });
  },
  getComputedDataset: (datasetId) => {
    const dataset = get().datasets.find((d) => d.id === datasetId);
    if (!dataset) return null;
    return computeDatasetWithFormulas(dataset);
  },
}));

export { DataType };
