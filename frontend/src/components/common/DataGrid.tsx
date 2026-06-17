import { AgGridReact } from 'ag-grid-react';
import { ColDef, themeQuartz } from 'ag-grid-community';
import { DatasetColumn, DatasetRow, DataType } from '../../types';
import 'ag-grid-community/styles/ag-grid.css';

interface DataGridProps {
  rows: DatasetRow[];
  columns: DatasetColumn[];
  maxHeight?: number;
}

export const DataGrid = ({ rows, columns, maxHeight = 420 }: DataGridProps) => {
  const columnDefs: ColDef[] = columns.map((column) => {
    const isFormula = 'isFormula' in column && column.isFormula;
    return {
      field: column.name,
      headerName: isFormula ? `${column.name} fx` : column.name,
      sortable: true,
      filter: column.type === DataType.Number ? 'agNumberColumnFilter' : true,
      resizable: true,
      cellStyle: isFormula ? { backgroundColor: 'rgba(99, 102, 241, 0.08)' } : undefined,
      headerComponentParams: isFormula ? { template: `<span style="color: #6366f1; font-style: italic;">${column.name} fx</span>` } : undefined,
    };
  });

  return (
    <div className="data-grid" style={{ height: maxHeight }}>
      <AgGridReact rowData={rows} columnDefs={columnDefs} theme={themeQuartz} pagination paginationPageSize={10} />
    </div>
  );
};
