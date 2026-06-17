import { useState, useEffect } from 'react';
import { DataType, DatasetColumn, FormulaColumn } from '../types';
import { validateFormula, getFormulaAvailableFunctions } from '../utils/formulaEngine';

interface FormulaColumnEditorProps {
  columns: DatasetColumn[];
  editingColumn?: FormulaColumn;
  onSave: (column: FormulaColumn) => void;
  onCancel: () => void;
}

export const FormulaColumnEditor = ({ columns, editingColumn, onSave, onCancel }: FormulaColumnEditorProps) => {
  const [name, setName] = useState(editingColumn?.name ?? '');
  const [formula, setFormula] = useState(editingColumn?.formula ?? '');
  const [type, setType] = useState<DataType>(editingColumn?.type ?? DataType.Number);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (formula.trim()) {
      setValidation(validateFormula(formula, columns));
    } else {
      setValidation({ valid: true });
    }
  }, [formula, columns]);

  const handleSave = () => {
    if (!name.trim()) {
      setValidation({ valid: false, error: '请输入字段名' });
      return;
    }
    if (!formula.trim()) {
      setValidation({ valid: false, error: '请输入公式' });
      return;
    }
    const validation = validateFormula(formula, columns);
    if (!validation.valid) {
      setValidation(validation);
      return;
    }
    onSave({
      name: name.trim(),
      type,
      formula: formula.trim(),
      isFormula: true,
    });
  };

  const insertField = (fieldName: string) => {
    setFormula((prev) => prev + fieldName);
  };

  const insertFunction = (funcName: string) => {
    setFormula((prev) => prev + funcName);
  };

  const availableFunctions = getFormulaAvailableFunctions();

  return (
    <div className="formula-editor-overlay">
      <div className="formula-editor-modal">
        <div className="formula-editor-header">
          <h3>{editingColumn ? '编辑公式列' : '添加公式列'}</h3>
          <button type="button" className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="formula-editor-body">
          <label className="field-control">
            <span>字段名称</span>
            <input
              type="text"
              value={name}
              placeholder="例如: yield_ratio"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field-control">
            <span>数据类型</span>
            <select value={type} onChange={(e) => setType(e.target.value as DataType)}>
              <option value={DataType.Number}>Number (数值)</option>
              <option value={DataType.String}>String (字符串)</option>
            </select>
          </label>

          <label className="field-control">
            <span>
              公式表达式
              <button
                type="button"
                className="help-toggle"
                onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? '隐藏帮助' : '显示帮助'}
              </button>
            </span>
            <textarea
              value={formula}
              placeholder="例如: yield / od600 * 100"
              onChange={(e) => setFormula(e.target.value)}
              rows={4}
              className="formula-input"
            />
            {!validation.valid && <div className="error-box">{validation.error}</div>}
          </label>

          {showHelp && (
            <div className="formula-help">
              <div className="help-section">
                <h4>可用字段</h4>
                <div className="field-chips">
                  {columns.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      className="field-chip"
                      onClick={() => insertField(col.name)}
                      title={`点击插入: ${col.name}`}
                    >
                      {col.name}
                      <span className="chip-type">{col.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="help-section">
                <h4>支持的运算符</h4>
                <div className="op-list">
                  <code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>()</code>
                </div>
              </div>

              <div className="help-section">
                <h4>可用函数</h4>
                <div className="function-list">
                  {availableFunctions.map((fn) => (
                    <button
                      key={fn.name}
                      type="button"
                      className="func-chip"
                      onClick={() => insertFunction(fn.name)}
                      title={fn.description}
                    >
                      <code>{fn.name}</code>
                      <span className="func-desc">{fn.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="help-section">
                <h4>示例</h4>
                <ul className="example-list">
                  <li><code>yield / od600</code> — 计算产率与光密度比值</li>
                  <li><code>od600 * 1000</code> — 放大光密度数值</li>
                  <li><code>pow(od600, 2)</code> — 光密度的平方</li>
                  <li><code>round(yield / od600 * 100) / 100</code> — 保留两位小数</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="formula-editor-footer">
          <button type="button" className="secondary-btn" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleSave}
            disabled={!validation.valid || !name.trim() || !formula.trim()}
          >
            {editingColumn ? '保存修改' : '添加列'}
          </button>
        </div>
      </div>
    </div>
  );
};
