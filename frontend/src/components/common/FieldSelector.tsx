import { DatasetColumn } from '../../types';

interface FieldSelectorProps {
  label: string;
  value: string;
  columns: DatasetColumn[];
  numericOnly?: boolean;
  onChange: (value: string) => void;
}

export const FieldSelector = ({ label, value, columns, numericOnly, onChange }: FieldSelectorProps) => {
  const options = numericOnly ? columns.filter((column) => column.type === 'Number') : columns;
  return (
    <label className="field-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">请选择字段</option>
        {options.map((column) => {
          const isFormula = 'isFormula' in column && column.isFormula;
          return (
            <option key={column.name} value={column.name}>
              {column.name}{isFormula ? ' (fx)' : ''} · {column.type}
            </option>
          );
        })}
      </select>
    </label>
  );
};
