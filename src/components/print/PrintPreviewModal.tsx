import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Printer, X } from 'lucide-react';
import { LetterCategory, SchoolSettings, SignatureMode } from '../../types/surat';
import { exportElementToWordDoc } from '../../utils/wordExport';
import { LetterPreviewA4 } from './LetterPreviewA4';
import { ScaledA4Container } from './ScaledA4Container';

export type PaperSizeOption = 'a4' | 'f4';
export type MarginPresetOption = 'normal' | 'kemendagri';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  kategori: LetterCategory;
  nomorSurat: string;
  tanggalSurat: string;
  perihal: string;
  modeTtd: SignatureMode;
  payload: Record<string, unknown>;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  open,
  onClose,
  settings,
  kategori,
  nomorSurat,
  tanggalSurat,
  perihal,
  modeTtd,
  payload,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSizeOption>('a4');
  const [marginPreset, setMarginPreset] = useState<MarginPresetOption>('normal');
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const styleId = 'esurat-dynamic-page-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const sizeRule = paperSize === 'f4' ? '215mm 330mm' : 'A4 portrait';
    const marginRule =
      marginPreset === 'kemendagri'
        ? '15mm 18mm 15mm 25mm'
        : '20mm 20mm 20mm 20mm';

    styleEl.textContent = `@media print { @page { size: ${sizeRule}; margin: ${marginRule}; } }`;

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, [open, paperSize, marginPreset]);

  if (!open) return null;

  const ensurePortalContainer = (): HTMLElement => {
    let el = document.getElementById('esurat-print-area');
    if (!el) {
      el = document.createElement('div');
      el.id = 'esurat-print-area';
      document.body.appendChild(el);
    }
    return el;
  };

  const handlePrintNow = () => {
    setPrintNotice(null);
    // Small delay ensures portal DOM + dynamic @page style are flushed before print dialog
    window.setTimeout(() => {
      try {
        window.print();
      } catch {
        setPrintNotice(
          'Dialog cetak browser tidak terbuka di mode ini. Gunakan tombol Unduh Word (.doc) untuk mencetak dokumen dengan margin normal.'
        );
      }
    }, 80);
  };

  const handleDownloadWord = () => {
    const safeName = (perihal || 'naskah-dinas')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50);
    exportElementToWordDoc(
      portalContentRef.current,
      `${safeName}.doc`,
      paperSize,
      marginPreset
    );
  };

  const portalRoot = ensurePortalContainer();

  return (
    <>
      {/* Modal Pratinjau Cetak */}
      <div className="no-print fixed inset-0 z-50 bg-slate-900/60 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              Pratinjau Cetak — {perihal}
            </h3>
            <div className="text-xs font-mono text-slate-500 truncate">
              {nomorSurat}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pilihan Ukuran Kertas */}
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSizeOption)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
              aria-label="Ukuran Kertas"
            >
              <option value="a4">Kertas A4 (210 × 297 mm)</option>
              <option value="f4">Kertas F4 / Folio (215 × 330 mm)</option>
            </select>

            {/* Pilihan Margin Normal vs Kemendagri */}
            <select
              value={marginPreset}
              onChange={(e) => setMarginPreset(e.target.value as MarginPresetOption)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
              aria-label="Margin Kertas"
            >
              <option value="normal">Margin Normal (2 cm semua sisi)</option>
              <option value="kemendagri">Margin Dinas (Atas/Bawah 1.5 cm · Kiri 2.5 cm · Kanan 1.8 cm)</option>
            </select>

            <button
              type="button"
              onClick={handleDownloadWord}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              Unduh Word (.doc)
            </button>

            <button
              type="button"
              onClick={handlePrintNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {printNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-900">
            {printNotice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/80">
          <div className="max-w-[215mm] mx-auto">
            <ScaledA4Container paperWidthPx={paperSize === 'f4' ? 813 : 794}>
              <LetterPreviewA4
                settings={settings}
                kategori={kategori}
                nomorSurat={nomorSurat}
                tanggalSurat={tanggalSurat}
                perihal={perihal}
                modeTtd={modeTtd}
                payload={payload}
                paperSize={paperSize}
                marginPreset={marginPreset}
                forceShowAllSheets
              />
            </ScaledA4Container>
          </div>
        </div>
      </div>

      {/* Portal Cetak Murni langsung di document.body */}
      {createPortal(
        <div ref={portalContentRef}>
          <LetterPreviewA4
            settings={settings}
            kategori={kategori}
            nomorSurat={nomorSurat}
            tanggalSurat={tanggalSurat}
            perihal={perihal}
            modeTtd={modeTtd}
            payload={payload}
            paperSize={paperSize}
            marginPreset={marginPreset}
            forceShowAllSheets
          />
        </div>,
        portalRoot
      )}
    </>
  );
};
