'use client';

export function PrintButton() {
  return (
    <div className="report-actions no-print">
      <button className="action-button" onClick={() => window.print()}>
        Imprimir / Salvar PDF
      </button>
      <button className="action-button secondary" onClick={() => window.history.back()}>
        Voltar
      </button>
    </div>
  );
}
