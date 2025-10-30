// CSV Export Utility

export function exportToCSV<T>(data: T[], filename: string, columns: { key: keyof T; label: string }[]) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create CSV header
  const header = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and escape quotes
      let cellValue = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quote
      if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
        cellValue = `"${cellValue}"`;
      }
      
      return cellValue;
    }).join(',');
  });
  
  // Combine header and rows
  const csv = [header, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create a link to the file
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Format currency for export
export function formatCurrencyForExport(amount: number): string {
  return amount.toFixed(2);
}

// Format date for export
export function formatDateForExport(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Format boolean for export
export function formatBooleanForExport(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}
