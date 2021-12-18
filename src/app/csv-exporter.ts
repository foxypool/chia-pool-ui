import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CsvExporter {
  private lastObjectUrl: string = null;

  public export(fileName: string, header: string[], rows: any[][]): void {
    this.downloadCsv(this.makeCsv(header, rows), fileName);
  }

  private makeCsv(header: string[], rows: any[][], separator = ','): string {
    const enclosingCharacter = '"';
    const columnOrEmpty = (column) => (column === undefined || column === null) ? '' : column;
    const escapeIfNecessary = (column) => {
      const columnAsString = column.toString();
      if (
        columnAsString.indexOf(enclosingCharacter) !== -1
        || columnAsString.indexOf(separator) !== -1
        || columnAsString.indexOf("'") !== -1
        || columnAsString.indexOf('\\') !== -1
      ) {
        const doubleQuoteEscapedColumn = columnAsString.replace(/"/g, '""');

        return `${enclosingCharacter}${doubleQuoteEscapedColumn}${enclosingCharacter}`;
      }

      return columnAsString;
    };
    const rowsToProcess = [header, ...rows];

    return rowsToProcess.map(row => row
      .map(column => columnOrEmpty(column))
      .map(column => escapeIfNecessary(column))
      .join(separator)
    ).join('\n');
  }

  private downloadCsv(csv: string, fileName: string): void {
    if (this.lastObjectUrl) {
      URL.revokeObjectURL(this.lastObjectUrl);
      this.lastObjectUrl = null;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const dlLink = document.createElement('a');
    dlLink.style.display = 'none';
    dlLink.href = URL.createObjectURL(blob);
    this.lastObjectUrl = dlLink.href;
    dlLink.download = fileName;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
  }
}
