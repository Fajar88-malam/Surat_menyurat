import React, { useState } from 'react';
import {
  Archive,
  Download,
  Eye,
  FileCheck2,
  Lock,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AuthMode,
  deleteLetterRecord,
  sealLetterAsArchive,
} from '../services/dataService';
import {
  KATEGORI_LABELS,
  LetterCategory,
  LetterRecord,
  SchoolSettings,
} from '../types/surat';
import { exportLettersAgenda } from '../utils/excelHelper';
import { formatTanggalIndonesia } from '../utils/kemendagriFormat';
import { PrintPreviewModal } from './print/PrintPreviewModal';

interface ArchiveAgendaProps {
  authMode: AuthMode;
  letters: LetterRecord[];
  settings: SchoolSettings;
  onEditLetter: (letter: LetterRecord) => void;
  onCreateNew: () => void;
  onRefresh?: () => void;
}

export const ArchiveAgenda: React.FC<ArchiveAgendaProps> = ({
  authMode,
  letters,
  settings,
  onEditLetter,
  onCreateNew,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'all' | LetterCategory>('all');
  const [previewLetter, setPreviewLetter] = useState<LetterRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = letters.filter((l) => {
    if (filterCat !== 'all' && l.kategori !== filterCat) return false;
    const q = search.toLowerCase();
    return (
      l.nomorSurat.toLowerCase().includes(q) ||
      l.perihal.toLowerCase().includes(q) ||
      (l.tujuanSurat || '').toLowerCase().includes(q)
    );
  });

  const handleSealArchive = async (letter: LetterRecord) => {
    setBusyId(letter.id);
    try {
      await sealLetterAsArchive(authMode, letter.id);
      onRefresh?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (letter: LetterRecord) => {
    if (letter.status === 'arsip') return;
    setBusyId(letter.id);
    try {
      await deleteLetterRecord(authMode, letter.id);
      onRefresh?.();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterCat('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterCat === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Semua ({letters.length})
            </button>
            {(Object.keys(KATEGORI_LABELS) as LetterCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterCat === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {KATEGORI_LABELS[cat]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => exportLettersAgenda(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Buku Agenda (.xlsx)
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor surat, perihal, atau tujuan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
          />
        </div>
      </div>

      <div className="no-print bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Archive className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-medium text-slate-900">
              Belum ada surat dalam Buku Agenda
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Setiap naskah dinas yang Anda terbitkan atau simpan sebagai draf akan tercatat rapi beserta nomor klasifikasi Kemendagri.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900"
            >
              Buat Naskah Dinas Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Nomor Surat</th>
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4">Jenis Naskah</th>
                  <th className="py-2.5 px-4">Perihal &amp; Tujuan</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-900 whitespace-nowrap tabular-nums">
                      {l.nomorSurat}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {formatTanggalIndonesia(l.tanggalSurat)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {KATEGORI_LABELS[l.kategori]}
                    </td>
                    <td className="py-2.5 px-4 max-w-sm">
                      <div className="text-xs font-medium text-slate-900 truncate">{l.perihal}</div>
                      {l.tujuanSurat && (
                        <div className="text-xs text-slate-500 truncate">
                          Kepada: {l.tujuanSurat}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          l.status === 'arsip'
                            ? 'text-slate-700 font-medium'
                            : l.status === 'terbit'
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {l.status === 'arsip'
                          ? 'Arsip Final'
                          : l.status === 'terbit'
                          ? 'Terbit'
                          : 'Draf'}
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-500">
                        {l.modeTtd === 'tte' ? 'TTE' : 'Basah'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewLetter(l)}
                          className="p-1.5 text-slate-600 hover:text-sky-800 rounded"
                          title="Pratinjau & Cetak"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {l.status !== 'arsip' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditLetter(l)}
                              className="p-1.5 text-slate-600 hover:text-sky-800 rounded"
                              title="Edit Surat"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === l.id}
                              onClick={() => handleSealArchive(l)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 rounded"
                              title="Kunci sebagai Arsip Final"
                            >
                              <FileCheck2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === l.id}
                              onClick={() => handleDelete(l)}
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {l.status === 'arsip' && (
                          <span className="p-1.5 text-slate-400" title="Arsip Terkunci">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pratinjau & Cetak Surat melalui Print Portal */}
      {previewLetter && (
        <PrintPreviewModal
          open={Boolean(previewLetter)}
          onClose={() => setPreviewLetter(null)}
          settings={settings}
          kategori={previewLetter.kategori}
          nomorSurat={previewLetter.nomorSurat}
          tanggalSurat={previewLetter.tanggalSurat}
          perihal={previewLetter.perihal}
          modeTtd={previewLetter.modeTtd}
          payload={previewLetter.payload}
        />
      )}
    </div>
  );
};
