import { useEffect, useState, useMemo } from 'react';
import { DataType, FormulaColumn } from '../types';
import { DataGrid } from '../components/common/DataGrid';
import { FilterPanel } from '../components/common/FilterPanel';
import { EmptyState } from '../components/common/EmptyState';
import { FormulaColumnEditor } from '../components/common/FormulaColumnEditor';
import { useDataImport } from '../hooks/useDataImport';
import { useDatasetStore } from '../stores/datasetStore';
import { computeDatasetWithFormulas } from '../utils/formulaEngine';

export const Workspace = () => {
  const { importFile, error } = useDataImport();
  const datasets = useDatasetStore((state) => state.datasets);
  const selectedDatasetId = useDatasetStore((state) => state.selectedDatasetId);
  const loadDatasets = useDatasetStore((state) => state.loadDatasets);
  const addDataset = useDatasetStore((state) => state.addDataset);
  const selectDataset = useDatasetStore((state) => state.selectDataset);
  const updateColumnType = useDatasetStore((state) => state.updateColumnType);
  const addFormulaColumn = useDatasetStore((state) => state.addFormulaColumn);
  const updateFormulaColumn = useDatasetStore((state) => state.updateFormulaColumn);
  const deleteFormulaColumn = useDatasetStore((state) => state.deleteFormulaColumn);
  const dataset = datasets.find((candidate) => candidate.id === selectedDatasetId);

  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [editingFormulaColumn, setEditingFormulaColumn] = useState<FormulaColumn | undefined>();
  const [formulaError, setFormulaError] = useState<string | null>(null);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const computedDataset = useMemo(() => {
    if (!dataset) return null;
    return computeDatasetWithFormulas(dataset);
  }, [dataset]);

  const handleAddFormulaColumn = () => {
    setEditingFormulaColumn(undefined);
    setFormulaError(null);
    setShowFormulaEditor(true);
  };

  const handleEditFormulaColumn = (column: FormulaColumn) => {
    setEditingFormulaColumn(column);
    setFormulaError(null);
    setShowFormulaEditor(true);
  };

  const handleSaveFormulaColumn = async (column: FormulaColumn) => {
    try {
      if (editingFormulaColumn) {
        await updateFormulaColumn(dataset!.id, editingFormulaColumn.name, {
          name: column.name,
          type: column.type,
          formula: column.formula,
        });
      } else {
        await addFormulaColumn(dataset!.id, column);
      }
      setShowFormulaEditor(false);
      setEditingFormulaColumn(undefined);
      setFormulaError(null);
    } catch (e) {
      setFormulaError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleDeleteFormulaColumn = async (columnName: string) => {
    if (!confirm(`确定要删除公式列 "${columnName}" 吗？`)) return;
    try {
      await deleteFormulaColumn(dataset!.id, columnName);
    } catch (e) {
      setFormulaError(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>数据工作台</h1>
        </div>
        <div className="head-actions">
          <button type="button" className="secondary-btn" onClick={handleAddFormulaColumn} disabled={!dataset}>
            + 添加公式列
          </button>
          <label className="file-button">
            导入 CSV/JSON
            <input
              type="file"
              accept=".csv,.json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const imported = await importFile(file);
                if (imported) await addDataset(imported);
              }}
            />
          </label>
        </div>
      </section>
      {error ? <div className="error-box">{error}</div> : null}
      {formulaError ? <div className="error-box">{formulaError}</div> : null}
      {dataset && computedDataset ? (
        <div className="workspace-grid">
          <aside className="dataset-list">
            {datasets.map((candidate) => (
              <button
                key={candidate.id}
                className={candidate.id === dataset.id ? 'is-active' : ''}
                onClick={() => selectDataset(candidate.id)}
              >
                <strong>{candidate.name}</strong>
                <span>{candidate.rowCount} 行 · {candidate.columnCount} 列</span>
              </button>
            ))}
          </aside>
          <section className="data-panel">
            <div className="column-editor">
              {dataset.columns.map((column) => {
                const isFormula = 'isFormula' in column && column.isFormula;
                return (
                  <div key={column.name} className={`column-editor-item ${isFormula ? 'is-formula' : ''}`}>
                    <label>
                      <span>
                        {column.name}
                        {isFormula && <span className="formula-badge" title={`公式: ${(column as FormulaColumn).formula}`}>fx</span>}
                      </span>
                      <select
                        value={column.type}
                        onChange={(event) => updateColumnType(dataset.id, column.name, event.target.value as DataType)}
                      >
                        {Object.values(DataType).map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    {isFormula && (
                      <div className="formula-column-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="编辑公式"
                          onClick={() => handleEditFormulaColumn(column as FormulaColumn)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="删除公式列"
                          onClick={() => handleDeleteFormulaColumn(column.name)}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <DataGrid rows={computedDataset.data} columns={computedDataset.columns} />
          </section>
          <FilterPanel datasetId={dataset.id} />
        </div>
      ) : (
        <EmptyState title="还没有数据集" description="导入 CSV 或 JSON 后开始筛选和分析。" />
      )}

      {showFormulaEditor && dataset && (
        <FormulaColumnEditor
          columns={dataset.columns}
          editingColumn={editingFormulaColumn}
          onSave={handleSaveFormulaColumn}
          onCancel={() => {
            setShowFormulaEditor(false);
            setEditingFormulaColumn(undefined);
          }}
        />
      )}
    </main>
  );
};
