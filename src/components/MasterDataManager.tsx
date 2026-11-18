import React, { useRef, useState } from 'react';
import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AuthMode,
  batchInsertEmployees,
  batchInsertStudents,
  deleteEmployeeRecord,
  deleteStudentRecord,
  saveEmployeeRecord,
  saveStudentRecord,
} from '../services/dataService';
import {
  Employee,
  StatusKepegawaian,
  Student,
  StudentStatus,
} from '../types/surat';
import {
  downloadEmployeeTemplate,
  downloadStudentTemplate,
  exportEmployees,
  exportStudents,
  ImportedEmployeeRow,
  ImportedStudentRow,
  parseEmployeesFile,
  parseStudentsFile,
} from '../utils/excelHelper';

interface MasterDataManagerProps {
  authMode: AuthMode;
  userId: string;
  employees: Employee[];
  students: Student[];
  onRefresh?: () => void;
}

export const MasterDataManager: React.FC<MasterDataManagerProps> = ({
  authMode,
  userId,
  employees,
  students,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'pegawai' | 'siswa'>('pegawai');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Employee Modal State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    nama: '',
    nip: '',
    nuptk: '',
    pangkatGolongan: '',
    jabatan: '',
    statusKepegawaian: 'PNS' as StatusKepegawaian,
    unitKerja: '',
    telepon: '',
    email: '',
  });

  // Student Modal State
  const [stuModalOpen, setStuModalOpen] = useState(false);
  const [editingStu, setEditingStu] = useState<Student | null>(null);
  const [stuForm, setStuForm] = useState({
    nama: '',
    nis: '',
    nisn: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'L' as 'L' | 'P',
    kelas: '',
    namaOrangTua: '',
    pekerjaanOrangTua: '',
    alamat: '',
    teleponOrangTua: '',
    status: 'Aktif' as StudentStatus,
  });

  // Import Preview Modal
  const [importPreviewEmp, setImportPreviewEmp] = useState<ImportedEmployeeRow[] | null>(null);
  const [importPreviewStu, setImportPreviewStu] = useState<ImportedStudentRow[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.nama.toLowerCase().includes(q) ||
      (e.nip || '').toLowerCase().includes(q) ||
      e.jabatan.toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.nama.toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      s.kelas.toLowerCase().includes(q) ||
      (s.namaOrangTua || '').toLowerCase().includes(q)
    );
  });

  const openAddEmp = () => {
    setEditingEmp(null);
    setEmpForm({
      nama: '',
      nip: '',
      nuptk: '',
      pangkatGolongan: '',
      jabatan: '',
      statusKepegawaian: 'PNS',
      unitKerja: '',
      telepon: '',
      email: '',
    });
    setEmpModalOpen(true);
  };

  const openEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      nama: emp.nama,
      nip: emp.nip || '',
      nuptk: emp.nuptk || '',
      pangkatGolongan: emp.pangkatGolongan || '',
      jabatan: emp.jabatan,
      statusKepegawaian: emp.statusKepegawaian,
      unitKerja: emp.unitKerja || '',
      telepon: emp.telepon || '',
      email: emp.email || '',
    });
    setEmpModalOpen(true);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (empForm.nama.trim().length < 2 || empForm.jabatan.trim().length < 1) return;
    setBusy(true);
    try {
      const payload = {
        ownerId: userId,
        nama: empForm.nama.trim().slice(0, 140),
        nip: empForm.nip.trim().slice(0, 40),
        nuptk: empForm.nuptk.trim().slice(0, 40),
        pangkatGolongan: empForm.pangkatGolongan.trim().slice(0, 80),
        jabatan: empForm.jabatan.trim().slice(0, 120),
        statusKepegawaian: empForm.statusKepegawaian,
        unitKerja: empForm.unitKerja.trim().slice(0, 120),
        telepon: empForm.telepon.trim().slice(0, 30),
        email: empForm.email.trim().slice(0, 120),
      };
      await saveEmployeeRecord(authMode, userId, editingEmp?.id || null, payload);
      setNotice(
        editingEmp
          ? `Data pegawai ${payload.nama} berhasil diperbarui.`
          : `Pegawai ${payload.nama} berhasil ditambahkan.`
      );
      setEmpModalOpen(false);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    setBusy(true);
    try {
      await deleteEmployeeRecord(authMode, emp.id);
      setNotice(`Data pegawai ${emp.nama} dihapus.`);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const openAddStu = () => {
    setEditingStu(null);
    setStuForm({
      nama: '',
      nis: '',
      nisn: '',
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: 'L',
      kelas: 'VII-A',
      namaOrangTua: '',
      pekerjaanOrangTua: '',
      alamat: '',
      teleponOrangTua: '',
      status: 'Aktif',
    });
    setStuModalOpen(true);
  };

  const openEditStu = (stu: Student) => {
    setEditingStu(stu);
    setStuForm({
      nama: stu.nama,
      nis: stu.nis || '',
      nisn: stu.nisn || '',
      tempatLahir: stu.tempatLahir || '',
      tanggalLahir: stu.tanggalLahir || '',
      jenisKelamin: stu.jenisKelamin,
      kelas: stu.kelas,
      namaOrangTua: stu.namaOrangTua || '',
      pekerjaanOrangTua: stu.pekerjaanOrangTua || '',
      alamat: stu.alamat || '',
      teleponOrangTua: stu.teleponOrangTua || '',
      status: stu.status,
    });
    setStuModalOpen(true);
  };

  const saveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stuForm.nama.trim().length < 2 || stuForm.kelas.trim().length < 1) return;
    setBusy(true);
    try {
      const payload = {
        ownerId: userId,
        nama: stuForm.nama.trim().slice(0, 140),
        nis: stuForm.nis.trim().slice(0, 30),
        nisn: stuForm.nisn.trim().slice(0, 30),
        tempatLahir: stuForm.tempatLahir.trim().slice(0, 80),
        tanggalLahir: stuForm.tanggalLahir.trim().slice(0, 30),
        jenisKelamin: stuForm.jenisKelamin,
        kelas: stuForm.kelas.trim().slice(0, 40),
        namaOrangTua: stuForm.namaOrangTua.trim().slice(0, 140),
        pekerjaanOrangTua: stuForm.pekerjaanOrangTua.trim().slice(0, 100),
        alamat: stuForm.alamat.trim().slice(0, 250),
        teleponOrangTua: stuForm.teleponOrangTua.trim().slice(0, 30),
        status: stuForm.status,
      };
      await saveStudentRecord(authMode, userId, editingStu?.id || null, payload);
      setNotice(
        editingStu
          ? `Data siswa ${payload.nama} berhasil diperbarui.`
          : `Siswa ${payload.nama} berhasil ditambahkan.`
      );
      setStuModalOpen(false);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const deleteStudent = async (stu: Student) => {
    setBusy(true);
    try {
      await deleteStudentRecord(authMode, stu.id);
      setNotice(`Data siswa ${stu.nama} dihapus.`);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      if (activeTab === 'pegawai') {
        const res = await parseEmployeesFile(file);
        setSkippedCount(res.skipped);
        setImportPreviewEmp(res.rows);
      } else {
        const res = await parseStudentsFile(file);
        setSkippedCount(res.skipped);
        setImportPreviewStu(res.rows);
      }
    } catch (err) {
      setNotice(
        err instanceof Error ? `Gagal membaca berkas: ${err.message}` : 'Gagal membaca berkas.'
      );
    }
  };

  const confirmImportBatch = async () => {
    setBusy(true);
    try {
      if (activeTab === 'pegawai' && importPreviewEmp) {
        await batchInsertEmployees(
          authMode,
          userId,
          importPreviewEmp.slice(0, 400) as unknown as Record<string, unknown>[]
        );
        setNotice(`${Math.min(importPreviewEmp.length, 400)} data pegawai berhasil diimpor.`);
        setImportPreviewEmp(null);
      } else if (activeTab === 'siswa' && importPreviewStu) {
        await batchInsertStudents(
          authMode,
          userId,
          importPreviewStu.slice(0, 400) as unknown as Record<string, unknown>[]
        );
        setNotice(`${Math.min(importPreviewStu.length, 400)} data siswa berhasil diimpor.`);
        setImportPreviewStu(null);
      }
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const seedSampleData = async () => {
    setBusy(true);
    try {
      if (activeTab === 'pegawai') {
        const samples = [
          {
            nama: 'Dra. Siti Aminah, M.Pd.',
            nip: '19760514 200501 2 008',
            nuptk: '4846754655300012',
            pangkatGolongan: 'Pembina (IV/a)',
            jabatan: 'Guru Madya / Wakasek Kurikulum',
            statusKepegawaian: 'PNS',
            unitKerja: 'Kurikulum',
            telepon: '081226789012',
            email: 'siti.aminah@sekolah.sch.id',
          },
          {
            nama: 'Budi Santoso, S.Pd.',
            nip: '19890321 202221 1 004',
            nuptk: '7653767668130042',
            pangkatGolongan: 'Ahli Pertama (IX)',
            jabatan: 'Guru Bahasa Indonesia / Pembina OSIS',
            statusKepegawaian: 'PPPK',
            unitKerja: 'Kesiswaan',
            telepon: '085643210987',
            email: 'budi.santoso@sekolah.sch.id',
          },
          {
            nama: 'Rina Kusumawati, S.E.',
            nip: '19841109 201001 2 015',
            nuptk: '2441762664300023',
            pangkatGolongan: 'Penata Tk. I (III/d)',
            jabatan: 'Kepala Urusan Tata Usaha',
            statusKepegawaian: 'PNS',
            unitKerja: 'Tata Usaha',
            telepon: '081328114455',
            email: 'tu@sekolah.sch.id',
          },
        ];
        await batchInsertEmployees(authMode, userId, samples);
        setNotice('3 data contoh pegawai berhasil dimuat.');
      } else {
        const samples = [
          {
            nama: 'Rafi Pratama Putra',
            nis: '24081',
            nisn: '0114829103',
            tempatLahir: 'Banyumas',
            tanggalLahir: '17 April 2012',
            jenisKelamin: 'L',
            kelas: 'VIII-A',
            namaOrangTua: 'Slamet Riyadi',
            pekerjaanOrangTua: 'Pegawai Negeri Sipil',
            alamat: 'Jl. Gatot Subroto No. 45, Purwokerto',
            teleponOrangTua: '081327001122',
            status: 'Aktif',
          },
          {
            nama: 'Nadia Azzahra',
            nis: '24082',
            nisn: '0129481204',
            tempatLahir: 'Purwokerto',
            tanggalLahir: '03 September 2012',
            jenisKelamin: 'P',
            kelas: 'VIII-B',
            namaOrangTua: 'H. Ahmad Fauzi',
            pekerjaanOrangTua: 'Wiraswasta',
            alamat: 'Perum Berkoh Indah Blok C-12, Purwokerto',
            teleponOrangTua: '085291122334',
            status: 'Aktif',
          },
          {
            nama: 'Dimas Arya Saputra',
            nis: '25014',
            nisn: '0137721908',
            tempatLahir: 'Cilacap',
            tanggalLahir: '22 Januari 2013',
            jenisKelamin: 'L',
            kelas: 'VII-C',
            namaOrangTua: 'Teguh Prasetyo',
            pekerjaanOrangTua: 'Karyawan Swasta',
            alamat: 'Jl. Prof. Dr. Suharso No. 18, Purwokerto',
            teleponOrangTua: '081215887766',
            status: 'Aktif',
          },
        ];
        await batchInsertStudents(authMode, userId, samples);
        setNotice('3 data contoh siswa berhasil dimuat.');
      }
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar: Segmented Switch + Search + Import/Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('pegawai')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'pegawai'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Pegawai ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('siswa')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'siswa'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Siswa ({students.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() =>
                activeTab === 'pegawai' ? downloadEmployeeTemplate() : downloadStudentTemplate()
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Template .xlsx
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Impor Excel / CSV
            </button>
            <button
              type="button"
              onClick={() =>
                activeTab === 'pegawai'
                  ? exportEmployees(filteredEmployees, 'xlsx')
                  : exportStudents(filteredStudents, 'xlsx')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor .xlsx
            </button>
            <button
              type="button"
              onClick={() =>
                activeTab === 'pegawai'
                  ? exportEmployees(filteredEmployees, 'csv')
                  : exportStudents(filteredStudents, 'csv')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor .csv
            </button>
            <button
              type="button"
              onClick={activeTab === 'pegawai' ? openAddEmp : openAddStu}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'pegawai' ? 'Tambah Pegawai' : 'Tambah Siswa'}
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'pegawai'
                ? 'Cari nama pegawai, NIP, atau jabatan...'
                : 'Cari nama siswa, NISN, kelas, atau nama orang tua...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {activeTab === 'pegawai' ? (
          filteredEmployees.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-medium text-slate-900">
                Belum ada data pegawai tersimpan
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tambahkan pegawai secara manual, impor dari Excel/CSV, atau muat data contoh untuk langsung menguji Surat Tugas, SPPD, dan Surat Keterangan.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={seedSampleData}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Muat Data Contoh Pegawai
                </button>
                <button
                  type="button"
                  onClick={openAddEmp}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900"
                >
                  Tambah Pegawai Pertama
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Nama Lengkap</th>
                    <th className="py-2.5 px-4">NIP / NUPTK</th>
                    <th className="py-2.5 px-4">Pangkat / Gol.</th>
                    <th className="py-2.5 px-4">Jabatan</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 h-11">
                      <td className="py-2 px-4 font-medium text-slate-900">{emp.nama}</td>
                      <td className="py-2 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {emp.nip || emp.nuptk || '-'}
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-700">
                        {emp.pangkatGolongan || '-'}
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-700">{emp.jabatan}</td>
                      <td className="py-2 px-4 text-xs text-slate-600">{emp.statusKepegawaian}</td>
                      <td className="py-2 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditEmp(emp)}
                            className="p-1.5 text-slate-500 hover:text-sky-800 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEmployee(emp)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Database className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-medium text-slate-900">
              Belum ada data siswa tersimpan
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tambahkan peserta didik beserta data orang tua/wali atau impor file Excel Dapodik agar siap digunakan untuk Surat Keterangan, Mutasi, dan Panggilan Orang Tua.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={seedSampleData}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Muat Data Contoh Siswa
              </button>
              <button
                type="button"
                onClick={openAddStu}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900"
              >
                Tambah Siswa Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Nama Siswa</th>
                  <th className="py-2.5 px-4">NIS / NISN</th>
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4">Orang Tua / Wali</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/80 h-11">
                    <td className="py-2 px-4 font-medium text-slate-900">
                      {stu.nama}{' '}
                      <span className="text-xs font-normal text-slate-500">({stu.jenisKelamin})</span>
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {stu.nis || '-'} / {stu.nisn || '-'}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-700">{stu.kelas}</td>
                    <td className="py-2 px-4 text-xs text-slate-700">
                      {stu.namaOrangTua || '-'}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-600">{stu.status}</td>
                    <td className="py-2 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditStu(stu)}
                          className="p-1.5 text-slate-500 hover:text-sky-800 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStudent(stu)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Pegawai */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={saveEmployee}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingEmp ? 'Edit Data Pegawai' : 'Tambah Data Pegawai'}
              </h3>
              <button type="button" onClick={() => setEmpModalOpen(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar *
                </label>
                <input
                  required
                  type="text"
                  value={empForm.nama}
                  onChange={(e) => setEmpForm({ ...empForm, nama: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NIP / NIPPPK</label>
                <input
                  type="text"
                  value={empForm.nip}
                  onChange={(e) => setEmpForm({ ...empForm, nip: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NUPTK</label>
                <input
                  type="text"
                  value={empForm.nuptk}
                  onChange={(e) => setEmpForm({ ...empForm, nuptk: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pangkat / Golongan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pembina (IV/a)"
                  value={empForm.pangkatGolongan}
                  onChange={(e) => setEmpForm({ ...empForm, pangkatGolongan: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Kepegawaian *
                </label>
                <select
                  value={empForm.statusKepegawaian}
                  onChange={(e) =>
                    setEmpForm({
                      ...empForm,
                      statusKepegawaian: e.target.value as StatusKepegawaian,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="CPNS">CPNS</option>
                  <option value="Honorer">Honorer</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan *</label>
                <input
                  required
                  type="text"
                  value={empForm.jabatan}
                  onChange={(e) => setEmpForm({ ...empForm, jabatan: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. Telepon</label>
                <input
                  type="text"
                  value={empForm.telepon}
                  onChange={(e) => setEmpForm({ ...empForm, telepon: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900"
              >
                {busy ? 'Menyimpan...' : 'Simpan Pegawai'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Tambah/Edit Siswa */}
      {stuModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={saveStudent}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingStu ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
              </h3>
              <button type="button" onClick={() => setStuModalOpen(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  required
                  type="text"
                  value={stuForm.nama}
                  onChange={(e) => setStuForm({ ...stuForm, nama: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NIS</label>
                <input
                  type="text"
                  value={stuForm.nis}
                  onChange={(e) => setStuForm({ ...stuForm, nis: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  value={stuForm.nisn}
                  onChange={(e) => setStuForm({ ...stuForm, nisn: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={stuForm.tempatLahir}
                  onChange={(e) => setStuForm({ ...stuForm, tempatLahir: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="text"
                  placeholder="17 April 2012"
                  value={stuForm.tanggalLahir}
                  onChange={(e) => setStuForm({ ...stuForm, tanggalLahir: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jenis Kelamin *
                </label>
                <select
                  value={stuForm.jenisKelamin}
                  onChange={(e) =>
                    setStuForm({ ...stuForm, jenisKelamin: e.target.value as 'L' | 'P' })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kelas / Rombel *
                </label>
                <input
                  required
                  type="text"
                  value={stuForm.kelas}
                  onChange={(e) => setStuForm({ ...stuForm, kelas: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={stuForm.namaOrangTua}
                  onChange={(e) => setStuForm({ ...stuForm, namaOrangTua: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan Orang Tua
                </label>
                <input
                  type="text"
                  value={stuForm.pekerjaanOrangTua}
                  onChange={(e) => setStuForm({ ...stuForm, pekerjaanOrangTua: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  No. HP Orang Tua
                </label>
                <input
                  type="text"
                  value={stuForm.teleponOrangTua}
                  onChange={(e) => setStuForm({ ...stuForm, teleponOrangTua: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={stuForm.status}
                  onChange={(e) =>
                    setStuForm({ ...stuForm, status: e.target.value as StudentStatus })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Mutasi Keluar">Mutasi Keluar</option>
                  <option value="Lulus">Lulus</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
                <input
                  type="text"
                  value={stuForm.alamat}
                  onChange={(e) => setStuForm({ ...stuForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStuModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900"
              >
                {busy ? 'Menyimpan...' : 'Simpan Siswa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Preview Impor Excel / CSV */}
      {(importPreviewEmp || importPreviewStu) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pratinjau Impor Data {importPreviewEmp ? 'Pegawai' : 'Siswa'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ditemukan {(importPreviewEmp || importPreviewStu)?.length || 0} baris siap disimpan
                  {skippedCount > 0 ? ` (${skippedCount} baris dilewati karena nama kosong)` : ''}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportPreviewEmp(null);
                  setImportPreviewStu(null);
                }}
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="overflow-auto flex-1 border border-slate-200 rounded-lg">
              {importPreviewEmp ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Nama</th>
                      <th className="p-2">NIP</th>
                      <th className="p-2">Pangkat/Gol</th>
                      <th className="p-2">Jabatan</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewEmp.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{r.nama}</td>
                        <td className="p-2 font-mono">{r.nip || '-'}</td>
                        <td className="p-2">{r.pangkatGolongan || '-'}</td>
                        <td className="p-2">{r.jabatan}</td>
                        <td className="p-2">{r.statusKepegawaian}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Nama</th>
                      <th className="p-2">NIS / NISN</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">Orang Tua</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(importPreviewStu || []).slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{r.nama}</td>
                        <td className="p-2 font-mono">
                          {r.nis || '-'} / {r.nisn || '-'}
                        </td>
                        <td className="p-2">{r.kelas}</td>
                        <td className="p-2">{r.namaOrangTua || '-'}</td>
                        <td className="p-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setImportPreviewEmp(null);
                  setImportPreviewStu(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy || ((importPreviewEmp || importPreviewStu)?.length || 0) === 0}
                onClick={confirmImportBatch}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 disabled:opacity-50"
              >
                {busy ? 'Mengimpor...' : 'Konfirmasi & Simpan ke Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
