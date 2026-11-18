import React from 'react';
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  FileCheck,
  FileSpreadsheet,
  PhoneCall,
  Repeat,
  Settings,
  UserPlus,
} from 'lucide-react';
import {
  Employee,
  KATEGORI_LABELS,
  LetterCategory,
  LetterRecord,
  SchoolSettings,
  Student,
} from '../types/surat';
import { formatTanggalIndonesia } from '../utils/kemendagriFormat';

interface DashboardOverviewProps {
  settings: SchoolSettings;
  employees: Employee[];
  students: Student[];
  letters: LetterRecord[];
  onCompose: (cat: LetterCategory) => void;
  onNavigate: (view: 'master' | 'settings' | 'archive') => void;
}

const TEMPLATE_CARDS: {
  kategori: LetterCategory;
  title: string;
  desc: string;
  kode: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    kategori: 'surat_tugas_sppd',
    title: 'Surat Tugas & SPPD',
    desc: 'Format Bookman Old Style dilengkapi SPPD Lembar 1 dan Lembar 2 Pengesahan Tujuan.',
    kode: '000.1.2.3',
    icon: Briefcase,
  },
  {
    kategori: 'surat_keterangan',
    title: 'Surat Keterangan Pegawai & Siswa',
    desc: 'Surat keterangan aktif tugas pegawai, aktif belajar siswa, kelakuan baik, dan NISN.',
    kode: '400.3.5 / 800.1',
    icon: FileCheck,
  },
  {
    kategori: 'surat_mutasi',
    title: 'Mutasi Masuk/Keluar & Permohonan',
    desc: 'Surat keterangan pindah atau menerima pindah berikut lampiran Permohonan Orang Tua.',
    kode: '400.3.5.1',
    icon: Repeat,
  },
  {
    kategori: 'surat_penerimaan_mutasi',
    title: 'Penerimaan Mutasi Masuk Siswa Baru',
    desc: 'Surat keterangan menerima siswa pindahan lengkap dengan daftar persyaratan berkas & ceklis verifikasi.',
    kode: '400.3.5.1',
    icon: UserPlus,
  },
  {
    kategori: 'surat_undangan',
    title: 'Undangan Rapat Orang Tua & Pegawai',
    desc: 'Layout Permendagri 1/2023 dengan alamat tujuan di sisi kiri dan lampiran daftar hadir.',
    kode: '400.3.8',
    icon: CalendarClock,
  },
  {
    kategori: 'surat_panggilan',
    title: 'Surat Panggilan Orang Tua',
    desc: 'Panggilan resmi pembinaan siswa/konseling BK lengkap dengan identitas wali & jadwal.',
    kode: '400.3.5',
    icon: PhoneCall,
  },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  settings,
  employees,
  students,
  letters,
  onCompose,
  onNavigate,
}) => {
  const sppdCount = letters.filter((l) => l.kategori === 'surat_tugas_sppd').length;

  return (
    <div className="space-y-6">
      {/* Identity & Setup Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            {settings.pemerintahDaerah} · {settings.dinasPendidikan}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {settings.namaSekolah}
          </h2>
          <div className="text-xs text-slate-600">
            Kepala Sekolah: {settings.kepalaSekolahNama}
            {settings.kepalaSekolahNip ? ` · NIP ${settings.kepalaSekolahNip}` : ''}
            {' · '}
            {settings.logoDaerahDataUrl ? 'Logo Pemda terpasang' : 'Logo Pemda default'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            Kop Surat &amp; Upload Logo
          </button>
          <button
            type="button"
            onClick={() => onNavigate('master')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Impor/Ekspor Pegawai &amp; Siswa
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Naskah Dinas</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {letters.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Tercatat di Buku Agenda</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Surat Tugas &amp; SPPD</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{sppdCount}</div>
          <div className="text-xs text-slate-500 mt-1">Penugasan perjalanan dinas</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Master Pegawai &amp; Guru</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {employees.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Siap auto-isi surat dinas</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Master Peserta Didik</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {students.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Lengkap data orang tua/wali</div>
        </div>
      </div>

      {/* 5 Template Naskah Dinas Kemendagri */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Buat Naskah Dinas Sesuai Aturan Kemendagri
          </h3>
          <span className="text-xs text-slate-500">
            Permendagri No. 1 Tahun 2023 &amp; Klasifikasi Arsip 83/2022
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.kategori}
                type="button"
                onClick={() => onCompose(card.kategori)}
                className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-sky-700 transition-colors group flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">{card.kode}</span>
                    <Icon className="w-4 h-4 text-sky-800" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-sky-900">
                    {card.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-800">
                  <span>Susun Surat</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Letters */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Agenda Surat Terbaru</h3>
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className="text-xs font-medium text-sky-800 hover:underline"
          >
            Lihat Semua Arsip
          </button>
        </div>
        {letters.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Belum ada naskah dinas yang diterbitkan. Pilih salah satu jenis surat di atas untuk memulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2 px-4">Nomor Surat</th>
                  <th className="py-2 px-4">Jenis</th>
                  <th className="py-2 px-4">Perihal</th>
                  <th className="py-2 px-4">Tanggal</th>
                  <th className="py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {letters.slice(0, 5).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-slate-900 whitespace-nowrap tabular-nums">
                      {l.nomorSurat}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                      {KATEGORI_LABELS[l.kategori]}
                    </td>
                    <td className="py-2.5 px-4 text-slate-900 max-w-xs truncate">{l.perihal}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatTanggalIndonesia(l.tanggalSurat)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 capitalize">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
