import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AuthMode,
  generateLetterDraftWithGemini,
  saveLetterRecord,
  saveStudentRecord,
} from '../services/dataService';
import {
  AssignedPerson,
  Employee,
  FIELD_LIMITS,
  KATEGORI_LABELS,
  KLASIFIKASI_ARSIP_KEMENDAGRI,
  LetterCategory,
  LetterRecord,
  LetterStatus,
  PERSYARATAN_MUTASI_MASUK_DEFAULT,
  SchoolSettings,
  SignatureMode,
  Student,
  SuratKeteranganPayload,
  SuratMutasiPayload,
  SuratPanggilanPayload,
  SuratPenerimaanMutasiPayload,
  SuratTugasSppdPayload,
  SuratUndanganPayload,
} from '../types/surat';
import {
  buildNomorSurat,
  getNextNomorUrut,
  getTodayISO,
  hitungLamaHari,
} from '../utils/kemendagriFormat';
import { LetterPreviewA4 } from './print/LetterPreviewA4';
import { PrintPreviewModal } from './print/PrintPreviewModal';
import { ScaledA4Container } from './print/ScaledA4Container';

interface LetterComposerProps {
  authMode: AuthMode;
  userId: string;
  settings: SchoolSettings;
  employees: Employee[];
  students: Student[];
  letters: LetterRecord[];
  initialCategory?: LetterCategory;
  editingLetter?: LetterRecord | null;
  onSaved: (savedCategory: LetterCategory) => void;
  onCancelEdit?: () => void;
  onStudentAdded?: () => void;
}

function defaultPayloadFor(
  kategori: LetterCategory,
  settings: SchoolSettings,
  employees: Employee[],
  students: Student[]
): Record<string, unknown> {
  const today = getTodayISO();
  const firstEmp = employees[0];
  const firstStu = students[0];

  if (kategori === 'surat_tugas_sppd') {
    const p: SuratTugasSppdPayload = {
      dasarPenugasan:
        'Surat Undangan Kepala Dinas Pendidikan Kabupaten/Kota tentang Rapat Koordinasi Peningkatan Mutu Satuan Pendidikan.',
      petugas: [
        firstEmp
          ? {
              nama: firstEmp.nama,
              nip: firstEmp.nip || '-',
              pangkatGolongan: firstEmp.pangkatGolongan || '-',
              jabatan: firstEmp.jabatan,
            }
          : {
              nama: 'Dra. Siti Aminah, M.Pd.',
              nip: '19760514 200501 2 008',
              pangkatGolongan: 'Pembina (IV/a)',
              jabatan: 'Guru Madya / Wakasek Kurikulum',
            },
      ],
      uraianTugas:
        'Mengikuti kegiatan Rapat Koordinasi Penyusunan Kurikulum Operasional Satuan Pendidikan dan Sosialisasi Tata Naskah Dinas.',
      tempatBerangkat: settings.kota,
      tempatTujuan: `Kantor Dinas Pendidikan ${settings.kota}`,
      tanggalBerangkat: today,
      tanggalKembali: today,
      lamaHari: 1,
      alatAngkut: 'Kendaraan Dinas / Roda Empat',
      tingkatBiaya: 'Tingkat C',
      pengikut: '-',
      bebanInstansi: settings.namaSekolah,
      bebanAkun: 'Dana BOS Reguler / 5.1.02.04.01',
      keteranganLain: '',
      sertakanSppd: true,
      nomorSppd: '',
      pejabatTujuanJabatan: 'Kepala Dinas Pendidikan / Pejabat yang Menerima,',
      pejabatTujuanNama: '',
      pejabatTujuanNip: '',
    };
    return p as unknown as Record<string, unknown>;
  }

  if (kategori === 'surat_keterangan') {
    const p: SuratKeteranganPayload = {
      jenisSubjek: 'siswa',
      jenisKeterangan: 'aktif_belajar',
      namaSubjek: firstStu?.nama || 'Rafi Pratama Putra',
      identitasNomor: firstStu ? `${firstStu.nis || '-'} / ${firstStu.nisn || '-'}` : '24081 / 0114829103',
      pangkatAtauTtl: firstStu
        ? `${firstStu.tempatLahir || settings.kota}, ${firstStu.tanggalLahir || '17 April 2012'}`
        : `${settings.kota}, 17 April 2012`,
      jabatanAtauKelas: firstStu?.kelas || 'VIII-A',
      namaOrangTua: firstStu?.namaOrangTua || 'Slamet Riyadi',
      alamat: firstStu?.alamat || `Jl. Gatot Subroto No. 45, ${settings.kota}`,
      isiKeterangan: `Yang bersangkutan adalah benar peserta didik aktif pada ${settings.namaSekolah} Tahun Pelajaran berjalan dan berkelakuan baik serta tidak sedang menerima sanksi pelanggaran tata tertib sekolah.`,
      keperluan: 'Pengajuan Beasiswa / Program Indonesia Pintar (PIP)',
    };
    return p as unknown as Record<string, unknown>;
  }

  if (kategori === 'surat_mutasi') {
    const p: SuratMutasiPayload = {
      jenisMutasi: 'keluar',
      namaSiswa: firstStu?.nama || 'Rafi Pratama Putra',
      nis: firstStu?.nis || '24081',
      nisn: firstStu?.nisn || '0114829103',
      tempatTanggalLahir: firstStu
        ? `${firstStu.tempatLahir || settings.kota}, ${firstStu.tanggalLahir || '17 April 2012'}`
        : `${settings.kota}, 17 April 2012`,
      jenisKelamin: firstStu?.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki',
      kelasSaatIni: firstStu?.kelas || 'VIII-A',
      namaOrangTua: firstStu?.namaOrangTua || 'Slamet Riyadi',
      pekerjaanOrangTua: firstStu?.pekerjaanOrangTua || 'Pegawai Negeri Sipil',
      alamatOrangTua: firstStu?.alamat || `Jl. Gatot Subroto No. 45, ${settings.kota}`,
      teleponOrangTua: firstStu?.teleponOrangTua || '081327001122',
      sekolahAsalAtauTujuan: 'SMP Negeri 2 Semarang',
      kotaSekolahAsalAtauTujuan: 'Kota Semarang',
      alasanPindah: 'Mengikuti kepindahan tugas dinas orang tua',
      tanggalEfektif: today,
      sertakanPermohonanOrtu: true,
      pakaiMaterai: true,
      tanggalPermohonanOrtu: today,
    };
    return p as unknown as Record<string, unknown>;
  }

  if (kategori === 'surat_penerimaan_mutasi') {
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 14);
    const batasIso = deadlineDate.toISOString().slice(0, 10);

    const p: SuratPenerimaanMutasiPayload = {
      tahunPelajaran: '2025/2026',
      namaSiswa: 'Naufal Hakim Ramadhan',
      nis: '-',
      nisn: '0128475910',
      tempatTanggalLahir: `${settings.kota}, 12 Agustus 2012`,
      jenisKelamin: 'Laki-laki',
      agama: 'Islam',
      kelasDiterima: 'VIII-B',
      asalSekolah: 'SMP Negeri 3 Surakarta',
      npsnAsalSekolah: '20328104',
      kotaAsalSekolah: 'Kota Surakarta',
      namaOrangTua: 'Budi Santoso, S.T.',
      pekerjaanOrangTua: 'Karyawan BUMN',
      alamatOrangTua: `Jl. Ahmad Yani No. 88, ${settings.kota}`,
      teleponOrangTua: '081290003344',
      tanggalEfektifMasuk: today,
      batasLaporUlang: batasIso,
      dayaTampungCatatan:
        'Berdasarkan rasio rombongan belajar saat ini, masih tersedia 1 (satu) kursi pada kelas VIII-B',
      persyaratanChecklist: [...PERSYARATAN_MUTASI_MASUK_DEFAULT],
      persyaratanTambahan: '',
      sertakanLembarChecklist: true,
    };
    return p as unknown as Record<string, unknown>;
  }

  if (kategori === 'surat_undangan') {
    const p: SuratUndanganPayload = {
      jenisUndangan: 'rapat_orang_tua',
      sifat: 'Penting',
      lampiran: '-',
      tujuanYth: 'Bapak/Ibu Orang Tua/Wali Peserta Didik Kelas VII, VIII, dan IX',
      diTempat: settings.kota,
      kalimatPembuka:
        'Dengan hormat, mengharap kehadiran Bapak/Ibu dalam acara Rapat Pleno Orang Tua/Wali Peserta Didik dan Komite Sekolah yang akan dilaksanakan pada:',
      hariTanggalAcara: today,
      waktuAcara: 'Pukul 08.30 WIB s.d. selesai',
      tempatAcara: `Aula ${settings.namaSekolah}`,
      agendaAcara:
        '1. Sosialisasi Program Kerja Sekolah & Asesmen Nasional\n2. Penyampaian Tata Tertib & Kalender Akademik',
      pakaianCatatan: 'Mohon hadir tepat waktu tanpa diwakilkan.',
      sertakanDaftarHadir: true,
    };
    return p as unknown as Record<string, unknown>;
  }

  const p: SuratPanggilanPayload = {
    sifat: 'Penting',
    lampiran: '-',
    namaSiswa: firstStu?.nama || 'Rafi Pratama Putra',
    nisn: firstStu?.nisn || '0114829103',
    kelas: firstStu?.kelas || 'VIII-A',
    namaOrangTua: firstStu?.namaOrangTua || 'Slamet Riyadi',
    alamatOrangTua: firstStu?.alamat || settings.kota,
    alasanPanggilan:
      'Sehubungan dengan perlu adanya pembinaan kedisiplinan serta koordinasi perkembangan akademik putra/putri Bapak/Ibu, kami mengharap kehadiran Bapak/Ibu di sekolah pada:',
    hariTanggalHadir: today,
    waktuHadir: 'Pukul 09.00 WIB',
    tempatHadir: `Ruang Bimbingan Konseling ${settings.namaSekolah}`,
    menghadapKe: 'Koordinator Guru BK / Wali Kelas',
    catatanTambahan: 'Apabila berhalangan hadir sesuai jadwal, mohon menghubungi Wali Kelas sebelumnya.',
  };
  return p as unknown as Record<string, unknown>;
}

function defaultKlasifikasiFor(kategori: LetterCategory): string {
  switch (kategori) {
    case 'surat_tugas_sppd':
      return '000.1.2.3';
    case 'surat_keterangan':
      return '400.3.5';
    case 'surat_mutasi':
    case 'surat_penerimaan_mutasi':
      return '400.3.5.1';
    case 'surat_undangan':
      return '400.3.8';
    case 'surat_panggilan':
      return '400.3.5';
  }
}

function defaultPerihalFor(kategori: LetterCategory): string {
  switch (kategori) {
    case 'surat_tugas_sppd':
      return 'Surat Tugas & SPPD Mengikuti Rapat Koordinasi';
    case 'surat_keterangan':
      return 'Surat Keterangan Peserta Didik Aktif';
    case 'surat_mutasi':
      return 'Surat Keterangan Pindah Sekolah (Mutasi Keluar)';
    case 'surat_penerimaan_mutasi':
      return 'Surat Keterangan Penerimaan Mutasi Masuk Siswa Baru';
    case 'surat_undangan':
      return 'Undangan Rapat Orang Tua / Wali Peserta Didik';
    case 'surat_panggilan':
      return 'Panggilan Orang Tua / Wali Peserta Didik';
  }
}

export const LetterComposer: React.FC<LetterComposerProps> = ({
  authMode,
  userId,
  settings,
  employees,
  students,
  letters,
  initialCategory = 'surat_tugas_sppd',
  editingLetter,
  onSaved,
  onCancelEdit,
  onStudentAdded,
}) => {
  const [kategori, setKategori] = useState<LetterCategory>(
    editingLetter?.kategori || initialCategory
  );
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState<string>(
    editingLetter?.kodeKlasifikasi || defaultKlasifikasiFor(initialCategory)
  );
  const [nomorUrut, setNomorUrut] = useState<string>(
    editingLetter?.nomorUrut || getNextNomorUrut(letters.map((l) => l.nomorUrut))
  );
  const [tanggalSurat, setTanggalSurat] = useState<string>(
    editingLetter?.tanggalSurat || getTodayISO()
  );
  const [perihal, setPerihal] = useState<string>(
    editingLetter?.perihal || defaultPerihalFor(initialCategory)
  );
  const [modeTtd, setModeTtd] = useState<SignatureMode>(editingLetter?.modeTtd || 'tte');
  const [payload, setPayload] = useState<Record<string, unknown>>(
    editingLetter?.payload || defaultPayloadFor(initialCategory, settings, employees, students)
  );

  const [manualNomor, setManualNomor] = useState<string>(editingLetter?.nomorSurat || '');
  const [useCustomNomor, setUseCustomNomor] = useState<boolean>(Boolean(editingLetter));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customReqInput, setCustomReqInput] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const previewSectionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingLetter) {
      setKategori(editingLetter.kategori);
      setKodeKlasifikasi(editingLetter.kodeKlasifikasi);
      setNomorUrut(editingLetter.nomorUrut);
      setTanggalSurat(editingLetter.tanggalSurat);
      setPerihal(editingLetter.perihal);
      setModeTtd(editingLetter.modeTtd);
      setPayload(editingLetter.payload);
      setManualNomor(editingLetter.nomorSurat);
      setUseCustomNomor(true);
    }
  }, [editingLetter]);

  const generatedNomorSurat = useMemo(() => {
    if (useCustomNomor && manualNomor.trim()) return manualNomor.trim();
    return buildNomorSurat(
      kodeKlasifikasi,
      nomorUrut,
      settings.kodeUnitSurat,
      tanggalSurat,
      settings.polaPenomoran
    );
  }, [
    useCustomNomor,
    manualNomor,
    kodeKlasifikasi,
    nomorUrut,
    settings.kodeUnitSurat,
    tanggalSurat,
    settings.polaPenomoran,
  ]);

  const handleCategorySwitch = (nextKat: LetterCategory) => {
    if (editingLetter) return;
    setKategori(nextKat);
    setKodeKlasifikasi(defaultKlasifikasiFor(nextKat));
    setPerihal(defaultPerihalFor(nextKat));
    setPayload(defaultPayloadFor(nextKat, settings, employees, students));
    setUseCustomNomor(false);
  };

  const updatePayload = (patch: Record<string, unknown>) => {
    setPayload((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerateWithGemini = async () => {
    if (aiPrompt.trim().length < 4) {
      setErrorMsg('Tuliskan deskripsi singkat keperluan surat minimal 4 karakter.');
      return;
    }
    setAiLoading(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      const draft = await generateLetterDraftWithGemini({
        kategori,
        instruksi: aiPrompt,
        namaSekolah: settings.namaSekolah,
        kota: settings.kota,
      });

      if (draft.perihal) setPerihal(draft.perihal);
      if (draft.kodeKlasifikasi) setKodeKlasifikasi(draft.kodeKlasifikasi);

      const patch: Record<string, unknown> = {};
      if (kategori === 'surat_tugas_sppd') {
        if (draft.dasarPenugasan) patch.dasarPenugasan = draft.dasarPenugasan;
        if (draft.uraianTugas) patch.uraianTugas = draft.uraianTugas;
        if (draft.tempatTujuan) patch.tempatTujuan = draft.tempatTujuan;
        if (draft.tanggalBerangkat && /^\d{4}-\d{2}-\d{2}$/.test(draft.tanggalBerangkat)) {
          patch.tanggalBerangkat = draft.tanggalBerangkat;
        }
        if (draft.tanggalKembali && /^\d{4}-\d{2}-\d{2}$/.test(draft.tanggalKembali)) {
          patch.tanggalKembali = draft.tanggalKembali;
        }
      } else if (kategori === 'surat_keterangan') {
        if (draft.isiKeterangan) patch.isiKeterangan = draft.isiKeterangan;
        if (draft.keperluan) patch.keperluan = draft.keperluan;
      } else if (kategori === 'surat_mutasi') {
        if (draft.alasanPindah) patch.alasanPindah = draft.alasanPindah;
      } else if (kategori === 'surat_penerimaan_mutasi') {
        if (draft.dayaTampungCatatan) patch.dayaTampungCatatan = draft.dayaTampungCatatan;
        if (draft.persyaratanTambahan) patch.persyaratanTambahan = draft.persyaratanTambahan;
      } else if (kategori === 'surat_undangan') {
        if (draft.tujuanYth) patch.tujuanYth = draft.tujuanYth;
        if (draft.kalimatPembuka) patch.kalimatPembuka = draft.kalimatPembuka;
        if (draft.agendaAcara) patch.agendaAcara = draft.agendaAcara;
        if (draft.waktuAcara) patch.waktuAcara = draft.waktuAcara;
        if (draft.tempatAcara) patch.tempatAcara = draft.tempatAcara;
        if (draft.tanggalBerangkat && /^\d{4}-\d{2}-\d{2}$/.test(draft.tanggalBerangkat)) {
          patch.hariTanggalAcara = draft.tanggalBerangkat;
        }
      } else if (kategori === 'surat_panggilan') {
        if (draft.alasanPanggilan) patch.alasanPanggilan = draft.alasanPanggilan;
        if (draft.menghadapKe) patch.menghadapKe = draft.menghadapKe;
        if (draft.waktuAcara) patch.waktuHadir = draft.waktuAcara;
        if (draft.tempatAcara) patch.tempatHadir = draft.tempatAcara;
        if (draft.tanggalBerangkat && /^\d{4}-\d{2}-\d{2}$/.test(draft.tanggalBerangkat)) {
          patch.hariTanggalHadir = draft.tanggalBerangkat;
        }
      }

      if (Object.keys(patch).length > 0) {
        updatePayload(patch);
      }
      setFeedback('Draf naskah dinas berhasil disusun dengan Gemini AI. Silakan periksa dan sesuaikan kolom di bawah.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyusun draf surat dengan Gemini AI.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyEmployeeToKeterangan = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    updatePayload({
      jenisSubjek: 'pegawai',
      jenisKeterangan: 'aktif_bekerja',
      namaSubjek: emp.nama,
      identitasNomor: emp.nip || emp.nuptk || '-',
      pangkatAtauTtl: emp.pangkatGolongan || '-',
      jabatanAtauKelas: emp.jabatan,
      alamat: settings.alamat,
      isiKeterangan: `Yang bersangkutan adalah benar Pegawai (${emp.statusKepegawaian}) yang aktif melaksanakan tugas sebagai ${emp.jabatan} pada ${settings.namaSekolah} sejak diangkat hingga saat surat keterangan ini diterbitkan.`,
      keperluan: 'Kelengkapan Administrasi Kepegawaian / Tunjangan Profesi',
    });
    setKodeKlasifikasi('800.1.10');
    setPerihal(`Surat Keterangan Aktif Melaksanakan Tugas - ${emp.nama}`);
  };

  const handleApplyStudentToKeterangan = (stuId: string) => {
    const stu = students.find((s) => s.id === stuId);
    if (!stu) return;
    updatePayload({
      jenisSubjek: 'siswa',
      jenisKeterangan: 'aktif_belajar',
      namaSubjek: stu.nama,
      identitasNomor: `${stu.nis || '-'} / ${stu.nisn || '-'}`,
      pangkatAtauTtl: `${stu.tempatLahir || settings.kota}, ${stu.tanggalLahir || '-'}`,
      jabatanAtauKelas: stu.kelas,
      namaOrangTua: stu.namaOrangTua || '-',
      alamat: stu.alamat || '-',
      isiKeterangan: `Yang bersangkutan adalah benar peserta didik aktif pada ${settings.namaSekolah} kelas ${stu.kelas} Tahun Pelajaran berjalan dan berkelakuan baik.`,
      keperluan: 'Pengajuan Beasiswa / Administrasi Kependudukan',
    });
    setKodeKlasifikasi('400.3.5');
    setPerihal(`Surat Keterangan Peserta Didik Aktif - ${stu.nama}`);
  };

  const handleApplyStudentToMutasi = (stuId: string) => {
    const stu = students.find((s) => s.id === stuId);
    if (!stu) return;
    updatePayload({
      namaSiswa: stu.nama,
      nis: stu.nis || '-',
      nisn: stu.nisn || '-',
      tempatTanggalLahir: `${stu.tempatLahir || settings.kota}, ${stu.tanggalLahir || '-'}`,
      jenisKelamin: stu.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki',
      kelasSaatIni: stu.kelas,
      namaOrangTua: stu.namaOrangTua || '-',
      pekerjaanOrangTua: stu.pekerjaanOrangTua || '-',
      alamatOrangTua: stu.alamat || '-',
      teleponOrangTua: stu.teleponOrangTua || '-',
    });
    const isKeluar = (payload as unknown as SuratMutasiPayload).jenisMutasi === 'keluar';
    setPerihal(
      isKeluar
        ? `Surat Keterangan Pindah Sekolah - ${stu.nama}`
        : `Surat Keterangan Menerima Mutasi Siswa - ${stu.nama}`
    );
  };

  const handleApplyStudentToPanggilan = (stuId: string) => {
    const stu = students.find((s) => s.id === stuId);
    if (!stu) return;
    updatePayload({
      namaSiswa: stu.nama,
      nisn: stu.nisn || '-',
      kelas: stu.kelas,
      namaOrangTua: stu.namaOrangTua || 'Orang Tua/Wali Siswa',
      alamatOrangTua: stu.alamat || settings.kota,
    });
    setPerihal(`Panggilan Orang Tua/Wali a.n. ${stu.nama} (${stu.kelas})`);
  };

  const computeTujuanSummary = (): string => {
    if (kategori === 'surat_tugas_sppd') {
      const p = payload as unknown as SuratTugasSppdPayload;
      return (p.petugas || []).map((o) => o.nama).join(', ').slice(0, FIELD_LIMITS.TUJUAN_MAX);
    }
    if (kategori === 'surat_keterangan') {
      return String((payload as unknown as SuratKeteranganPayload).namaSubjek || '').slice(
        0,
        FIELD_LIMITS.TUJUAN_MAX
      );
    }
    if (kategori === 'surat_mutasi') {
      const p = payload as unknown as SuratMutasiPayload;
      return `${p.namaSiswa} (${p.sekolahAsalAtauTujuan})`.slice(0, FIELD_LIMITS.TUJUAN_MAX);
    }
    if (kategori === 'surat_penerimaan_mutasi') {
      const p = payload as unknown as SuratPenerimaanMutasiPayload;
      return `${p.namaSiswa} (Asal: ${p.asalSekolah})`.slice(0, FIELD_LIMITS.TUJUAN_MAX);
    }
    if (kategori === 'surat_undangan') {
      return String((payload as unknown as SuratUndanganPayload).tujuanYth || '').slice(
        0,
        FIELD_LIMITS.TUJUAN_MAX
      );
    }
    const p = payload as unknown as SuratPanggilanPayload;
    return `${p.namaOrangTua} (Ortu ${p.namaSiswa})`.slice(0, FIELD_LIMITS.TUJUAN_MAX);
  };

  const computeSubKategori = (): string => {
    if (kategori === 'surat_tugas_sppd') {
      return (payload as unknown as SuratTugasSppdPayload).sertakanSppd
        ? 'surat_tugas_dan_sppd'
        : 'surat_tugas_saja';
    }
    if (kategori === 'surat_keterangan') {
      return `ket_${(payload as unknown as SuratKeteranganPayload).jenisSubjek}`;
    }
    if (kategori === 'surat_mutasi') {
      return `mutasi_${(payload as unknown as SuratMutasiPayload).jenisMutasi}`;
    }
    if (kategori === 'surat_penerimaan_mutasi') {
      return 'penerimaan_mutasi_masuk';
    }
    if (kategori === 'surat_undangan') {
      return String((payload as unknown as SuratUndanganPayload).jenisUndangan);
    }
    return 'panggilan_orang_tua';
  };

  const handleSave = async (targetStatus: LetterStatus) => {
    if (perihal.trim().length < 2) {
      setErrorMsg('Perihal surat wajib diisi minimal 2 karakter.');
      return;
    }
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);

    const cleanData = {
      ownerId: userId,
      kategori,
      subKategori: computeSubKategori().slice(0, 60),
      kodeKlasifikasi: kodeKlasifikasi.trim().slice(0, 30) || '400.3',
      nomorUrut: nomorUrut.trim().slice(0, 20) || '001',
      nomorSurat: generatedNomorSurat.slice(0, FIELD_LIMITS.NOMOR_MAX),
      tanggalSurat: tanggalSurat.slice(0, 30),
      perihal: perihal.trim().slice(0, FIELD_LIMITS.PERIHAL_MAX),
      tujuanSurat: computeTujuanSummary(),
      status: targetStatus,
      modeTtd,
      payload,
    };

    try {
      await saveLetterRecord(authMode, userId, editingLetter?.id || null, cleanData);
      setFeedback(
        targetStatus === 'draf'
          ? 'Draf surat berhasil disimpan ke arsip.'
          : 'Naskah dinas berhasil diterbitkan dan dicatat dalam Buku Agenda.'
      );
      onSaved(kategori);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan surat.');
    } finally {
      setSaving(false);
    }
  };

  // Helper renderer for Category-specific fields
  const renderSpecificFields = () => {
    if (kategori === 'surat_tugas_sppd') {
      const p = payload as unknown as SuratTugasSppdPayload;
      const petugas = Array.isArray(p.petugas) ? p.petugas : [];
      const lama = hitungLamaHari(p.tanggalBerangkat, p.tanggalKembali);

      const addEmployeeFromMaster = (empId: string) => {
        const emp = employees.find((e) => e.id === empId);
        if (!emp) return;
        const next: AssignedPerson[] = [
          ...petugas,
          {
            nama: emp.nama,
            nip: emp.nip || '-',
            pangkatGolongan: emp.pangkatGolongan || '-',
            jabatan: emp.jabatan,
          },
        ];
        updatePayload({ petugas: next });
      };

      const updatePerson = (idx: number, patch: Partial<AssignedPerson>) => {
        const next = petugas.map((item, i) => (i === idx ? { ...item, ...patch } : item));
        updatePayload({ petugas: next });
      };

      const removePerson = (idx: number) => {
        if (petugas.length <= 1) return;
        updatePayload({ petugas: petugas.filter((_, i) => i !== idx) });
      };

      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Dasar Penugasan (Surat Undangan / DPA / Program Kerja)
            </label>
            <textarea
              rows={2}
              value={p.dasarPenugasan}
              onChange={(e) => updatePayload({ dasarPenugasan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
            />
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Pegawai yang Ditugaskan ({petugas.length})
              </span>
              <div className="flex items-center gap-2">
                {employees.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addEmployeeFromMaster(e.target.value);
                    }}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700"
                  >
                    <option value="">+ Tambah dari Master Pegawai...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nama} — {emp.jabatan}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updatePayload({
                      petugas: [
                        ...petugas,
                        { nama: '', nip: '', pangkatGolongan: '', jabatan: '' },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Baris Manual
                </button>
              </div>
            </div>

            {petugas.map((org, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-md p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Petugas #{idx + 1} {idx === 0 ? '(Pelaksana Utama SPPD)' : '(Pengikut)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {employees.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const emp = employees.find((x) => x.id === e.target.value);
                          if (emp) {
                            updatePerson(idx, {
                              nama: emp.nama,
                              nip: emp.nip || '-',
                              pangkatGolongan: emp.pangkatGolongan || '-',
                              jabatan: emp.jabatan,
                            });
                          }
                        }}
                        className="text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-700 max-w-[180px]"
                      >
                        <option value="">Pilih Pegawai...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nama}
                          </option>
                        ))}
                      </select>
                    )}
                    {petugas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerson(idx)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Hapus petugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Lengkap & Gelar"
                    value={org.nama}
                    onChange={(e) => updatePerson(idx, { nama: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="NIP / NIPPPK"
                    value={org.nip}
                    onChange={(e) => updatePerson(idx, { nip: e.target.value })}
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Pangkat / Golongan"
                    value={org.pangkatGolongan}
                    onChange={(e) => updatePerson(idx, { pangkatGolongan: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={org.jabatan}
                    onChange={(e) => updatePerson(idx, { jabatan: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Maksud / Uraian Tugas
            </label>
            <textarea
              rows={2}
              value={p.uraianTugas}
              onChange={(e) => updatePayload({ uraianTugas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat Berangkat
              </label>
              <input
                type="text"
                value={p.tempatBerangkat}
                onChange={(e) => updatePayload({ tempatBerangkat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat Tujuan
              </label>
              <input
                type="text"
                value={p.tempatTujuan}
                onChange={(e) => updatePayload({ tempatTujuan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Berangkat
              </label>
              <input
                type="date"
                value={p.tanggalBerangkat}
                onChange={(e) => updatePayload({ tanggalBerangkat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Kembali ({lama} hari)
              </label>
              <input
                type="date"
                value={p.tanggalKembali}
                onChange={(e) => updatePayload({ tanggalKembali: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={p.sertakanSppd}
                onChange={(e) => updatePayload({ sertakanSppd: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-sky-800"
              />
              <span className="text-sm font-medium text-slate-800">
                Lampirkan Lembar SPPD (Halaman 1 &amp; Halaman 2 Pengesahan)
              </span>
            </label>
          </div>

          {p.sertakanSppd && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nomor SPPD (Opsional, default sama)
                </label>
                <input
                  type="text"
                  placeholder={generatedNomorSurat}
                  value={p.nomorSppd}
                  onChange={(e) => updatePayload({ nomorSppd: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alat Angkut
                </label>
                <input
                  type="text"
                  value={p.alatAngkut}
                  onChange={(e) => updatePayload({ alatAngkut: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tingkat Biaya Perjalanan
                </label>
                <select
                  value={p.tingkatBiaya}
                  onChange={(e) => updatePayload({ tingkatBiaya: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="Tingkat A">Tingkat A</option>
                  <option value="Tingkat B">Tingkat B</option>
                  <option value="Tingkat C">Tingkat C</option>
                  <option value="Tingkat D">Tingkat D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Akun / Kode Rekening Anggaran
                </label>
                <input
                  type="text"
                  value={p.bebanAkun}
                  onChange={(e) => updatePayload({ bebanAkun: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jabatan Pejabat di Lokasi Tujuan
                </label>
                <input
                  type="text"
                  value={p.pejabatTujuanJabatan}
                  onChange={(e) => updatePayload({ pejabatTujuanJabatan: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Pejabat Tujuan (Kosongkan jika diisi manual)
                </label>
                <input
                  type="text"
                  placeholder="Isi jika sudah diketahui"
                  value={p.pejabatTujuanNama}
                  onChange={(e) => updatePayload({ pejabatTujuanNama: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (kategori === 'surat_keterangan') {
      const p = payload as unknown as SuratKeteranganPayload;
      const isPegawai = p.jenisSubjek === 'pegawai';

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => {
                updatePayload({
                  jenisSubjek: 'pegawai',
                  jenisKeterangan: 'aktif_bekerja',
                  isiKeterangan: `Yang bersangkutan adalah benar Pegawai aktif yang melaksanakan tugas pada ${settings.namaSekolah} dan menunjukkan kinerja serta dedikasi yang baik.`,
                });
                setKodeKlasifikasi('800.1.10');
                setPerihal('Surat Keterangan Pegawai Aktif Melaksanakan Tugas');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isPegawai ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Keterangan Pegawai
            </button>
            <button
              type="button"
              onClick={() => {
                updatePayload({
                  jenisSubjek: 'siswa',
                  jenisKeterangan: 'aktif_belajar',
                  isiKeterangan: `Yang bersangkutan adalah benar peserta didik aktif pada ${settings.namaSekolah} Tahun Pelajaran berjalan dan berkelakuan baik.`,
                });
                setKodeKlasifikasi('400.3.5');
                setPerihal('Surat Keterangan Peserta Didik Aktif');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isPegawai ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Keterangan Siswa
            </button>
          </div>

          {isPegawai && employees.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ambil Otomatis dari Master Pegawai
              </label>
              <select
                value=""
                onChange={(e) => handleApplyEmployeeToKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="">-- Pilih Pegawai / Guru --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama} ({emp.jabatan})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isPegawai && students.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ambil Otomatis dari Master Siswa
              </label>
              <select
                value=""
                onChange={(e) => handleApplyStudentToKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="">-- Pilih Peserta Didik --</option>
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.nama} — Kelas {stu.kelas} (NISN: {stu.nisn || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={p.namaSubjek}
                onChange={(e) => updatePayload({ namaSubjek: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isPegawai ? 'NIP / NUPTK' : 'NIS / NISN'}
              </label>
              <input
                type="text"
                value={p.identitasNomor}
                onChange={(e) => updatePayload({ identitasNomor: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isPegawai ? 'Pangkat / Golongan' : 'Tempat, Tanggal Lahir'}
              </label>
              <input
                type="text"
                value={p.pangkatAtauTtl}
                onChange={(e) => updatePayload({ pangkatAtauTtl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isPegawai ? 'Jabatan' : 'Kelas / Rombel'}
              </label>
              <input
                type="text"
                value={p.jabatanAtauKelas}
                onChange={(e) => updatePayload({ jabatanAtauKelas: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            {!isPegawai && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={p.namaOrangTua}
                  onChange={(e) => updatePayload({ namaOrangTua: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            )}
            <div className={isPegawai ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
              <input
                type="text"
                value={p.alamat}
                onChange={(e) => updatePayload({ alamat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Isi Pernyataan Keterangan
            </label>
            <textarea
              rows={3}
              value={p.isiKeterangan}
              onChange={(e) => updatePayload({ isiKeterangan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Keperluan Surat
            </label>
            <input
              type="text"
              value={p.keperluan}
              onChange={(e) => updatePayload({ keperluan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      );
    }

    if (kategori === 'surat_mutasi') {
      const p = payload as unknown as SuratMutasiPayload;
      const isKeluar = p.jenisMutasi === 'keluar';

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => {
                updatePayload({ jenisMutasi: 'keluar' });
                setPerihal(`Surat Keterangan Pindah Sekolah (Mutasi Keluar) - ${p.namaSiswa}`);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isKeluar ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Mutasi Keluar (Pindah)
            </button>
            <button
              type="button"
              onClick={() => {
                updatePayload({ jenisMutasi: 'masuk' });
                setPerihal(`Surat Keterangan Menerima Mutasi Siswa (Masuk) - ${p.namaSiswa}`);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isKeluar ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Mutasi Masuk (Menerima)
            </button>
          </div>

          {students.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ambil Data Siswa dari Master
              </label>
              <select
                value=""
                onChange={(e) => handleApplyStudentToMutasi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.nama} — {stu.kelas} (NISN: {stu.nisn || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Siswa</label>
              <input
                type="text"
                value={p.namaSiswa}
                onChange={(e) => updatePayload({ namaSiswa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kelas</label>
              <input
                type="text"
                value={p.kelasSaatIni}
                onChange={(e) => updatePayload({ kelasSaatIni: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NIS</label>
              <input
                type="text"
                value={p.nis}
                onChange={(e) => updatePayload({ nis: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NISN</label>
              <input
                type="text"
                value={p.nisn}
                onChange={(e) => updatePayload({ nisn: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat, Tanggal Lahir
              </label>
              <input
                type="text"
                value={p.tempatTanggalLahir}
                onChange={(e) => updatePayload({ tempatTanggalLahir: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={p.jenisKelamin}
                onChange={(e) => updatePayload({ jenisKelamin: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={p.namaOrangTua}
                onChange={(e) => updatePayload({ namaOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pekerjaan Orang Tua
              </label>
              <input
                type="text"
                value={p.pekerjaanOrangTua}
                onChange={(e) => updatePayload({ pekerjaanOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                No. HP Orang Tua
              </label>
              <input
                type="text"
                value={p.teleponOrangTua}
                onChange={(e) => updatePayload({ teleponOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Efektif Mutasi
              </label>
              <input
                type="date"
                value={p.tanggalEfektif}
                onChange={(e) => updatePayload({ tanggalEfektif: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Orang Tua / Wali
              </label>
              <input
                type="text"
                value={p.alamatOrangTua}
                onChange={(e) => updatePayload({ alamatOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isKeluar ? 'Sekolah Tujuan' : 'Sekolah Asal'}
              </label>
              <input
                type="text"
                value={p.sekolahAsalAtauTujuan}
                onChange={(e) => updatePayload({ sekolahAsalAtauTujuan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kabupaten / Kota Sekolah {isKeluar ? 'Tujuan' : 'Asal'}
              </label>
              <input
                type="text"
                value={p.kotaSekolahAsalAtauTujuan}
                onChange={(e) => updatePayload({ kotaSekolahAsalAtauTujuan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Alasan Pindah</label>
              <input
                type="text"
                value={p.alasanPindah}
                onChange={(e) => updatePayload({ alasanPindah: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={p.sertakanPermohonanOrtu}
                onChange={(e) => updatePayload({ sertakanPermohonanOrtu: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-sky-800"
              />
              <span className="text-sm font-medium text-slate-800">
                Sertakan Surat Permohonan Mutasi dari Orang Tua / Wali (Lembar 2)
              </span>
            </label>
            {p.sertakanPermohonanOrtu && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Surat Permohonan Ortu
                  </label>
                  <input
                    type="date"
                    value={p.tanggalPermohonanOrtu}
                    onChange={(e) => updatePayload({ tanggalPermohonanOrtu: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-4">
                  <input
                    type="checkbox"
                    checked={p.pakaiMaterai}
                    onChange={(e) => updatePayload({ pakaiMaterai: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-sky-800"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Tampilkan Kotak Materai Rp10.000
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (kategori === 'surat_penerimaan_mutasi') {
      const p = payload as unknown as SuratPenerimaanMutasiPayload;
      const reqList = Array.isArray(p.persyaratanChecklist) ? p.persyaratanChecklist : [];

      const toggleRequirement = (item: string) => {
        const exists = reqList.includes(item);
        const next = exists ? reqList.filter((r) => r !== item) : [...reqList, item];
        updatePayload({ persyaratanChecklist: next });
      };

      const addCustomRequirement = () => {
        const trimmed = customReqInput.trim();
        if (!trimmed) return;
        if (!reqList.includes(trimmed)) {
          updatePayload({ persyaratanChecklist: [...reqList, trimmed] });
        }
        setCustomReqInput('');
      };

      const handleAddIncomingStudentToMaster = async () => {
        if (!p.namaSiswa.trim() || p.namaSiswa.trim().length < 2) {
          setErrorMsg('Nama siswa minimal 2 karakter sebelum disimpan ke Master Siswa.');
          return;
        }
        setSavingStudent(true);
        setErrorMsg(null);
        setFeedback(null);
        try {
          const ttlParts = (p.tempatTanggalLahir || '').split(',');
          await saveStudentRecord(authMode, userId, null, {
            ownerId: userId,
            nama: p.namaSiswa.trim().slice(0, 140),
            nis: (p.nis || '').trim().slice(0, 30),
            nisn: (p.nisn || '').trim().slice(0, 30),
            tempatLahir: (ttlParts[0] || settings.kota).trim().slice(0, 80),
            tanggalLahir: (ttlParts.slice(1).join(',') || '').trim().slice(0, 30),
            jenisKelamin: p.jenisKelamin === 'Perempuan' ? 'P' : 'L',
            kelas: (p.kelasDiterima || 'VII-A').trim().slice(0, 40),
            namaOrangTua: (p.namaOrangTua || '').trim().slice(0, 140),
            pekerjaanOrangTua: (p.pekerjaanOrangTua || '').trim().slice(0, 100),
            alamat: (p.alamatOrangTua || '').trim().slice(0, 250),
            teleponOrangTua: (p.teleponOrangTua || '').trim().slice(0, 30),
            status: 'Aktif',
          });
          onStudentAdded?.();
          setFeedback(`Siswa pindahan a.n. ${p.namaSiswa} berhasil ditambahkan ke Master Data Siswa.`);
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan siswa ke Master Data.');
        } finally {
          setSavingStudent(false);
        }
      };

      const extraCustomItems = reqList.filter(
        (item) => !PERSYARATAN_MUTASI_MASUK_DEFAULT.includes(item)
      );

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-sky-50/70 border border-sky-200 rounded-lg">
            <div className="text-xs text-sky-950">
              <div className="font-semibold">Penerimaan Peserta Didik Pindahan (Mutasi Masuk)</div>
              <div className="text-sky-800">
                Meliputi identitas asal sekolah, kelas diterima, batas lapor ulang, dan daftar persyaratan wajib.
              </div>
            </div>
            <button
              type="button"
              disabled={savingStudent}
              onClick={() => void handleAddIncomingStudentToMaster()}
              className="px-3 py-1.5 text-xs font-medium text-sky-900 bg-white border border-sky-300 rounded-md hover:bg-sky-50 disabled:opacity-50 whitespace-nowrap"
            >
              {savingStudent ? 'Menyimpan...' : '+ Simpan ke Master Siswa'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                value={p.tahunPelajaran}
                onChange={(e) => updatePayload({ tahunPelajaran: e.target.value })}
                placeholder="2025/2026"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Diterima di Kelas / Rombel
              </label>
              <input
                type="text"
                value={p.kelasDiterima}
                onChange={(e) => updatePayload({ kelasDiterima: e.target.value })}
                placeholder="VIII-B"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Calon Peserta Didik
              </label>
              <input
                type="text"
                value={p.namaSiswa}
                onChange={(e) => updatePayload({ namaSiswa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat, Tanggal Lahir
              </label>
              <input
                type="text"
                value={p.tempatTanggalLahir}
                onChange={(e) => updatePayload({ tempatTanggalLahir: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NIS (Asal)</label>
              <input
                type="text"
                value={p.nis}
                onChange={(e) => updatePayload({ nis: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NISN</label>
              <input
                type="text"
                value={p.nisn}
                onChange={(e) => updatePayload({ nisn: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={p.jenisKelamin}
                onChange={(e) => updatePayload({ jenisKelamin: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Agama</label>
              <input
                type="text"
                value={p.agama}
                onChange={(e) => updatePayload({ agama: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sekolah Asal
              </label>
              <input
                type="text"
                value={p.asalSekolah}
                onChange={(e) => updatePayload({ asalSekolah: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NPSN Sekolah Asal
                </label>
                <input
                  type="text"
                  value={p.npsnAsalSekolah}
                  onChange={(e) => updatePayload({ npsnAsalSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kota/Kab Asal
                </label>
                <input
                  type="text"
                  value={p.kotaAsalSekolah}
                  onChange={(e) => updatePayload({ kotaAsalSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={p.namaOrangTua}
                onChange={(e) => updatePayload({ namaOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pekerjaan &amp; No. HP
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pekerjaan"
                  value={p.pekerjaanOrangTua}
                  onChange={(e) => updatePayload({ pekerjaanOrangTua: e.target.value })}
                  className="w-1/2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="No. HP"
                  value={p.teleponOrangTua}
                  onChange={(e) => updatePayload({ teleponOrangTua: e.target.value })}
                  className="w-1/2 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Lengkap Orang Tua / Wali
              </label>
              <input
                type="text"
                value={p.alamatOrangTua}
                onChange={(e) => updatePayload({ alamatOrangTua: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Efektif Masuk
              </label>
              <input
                type="date"
                value={p.tanggalEfektifMasuk}
                onChange={(e) => updatePayload({ tanggalEfektifMasuk: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Batas Waktu Lengkapi Berkas
              </label>
              <input
                type="date"
                value={p.batasLaporUlang}
                onChange={(e) => updatePayload({ batasLaporUlang: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Keterangan Ketersediaan Daya Tampung (Opsional)
              </label>
              <input
                type="text"
                value={p.dayaTampungCatatan}
                onChange={(e) => updatePayload({ dayaTampungCatatan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Kelola Persyaratan yang Harus Dilengkapi */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Persyaratan Mutasi Masuk yang Harus Dilengkapi ({reqList.length} poin)
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePayload({ persyaratanChecklist: [...PERSYARATAN_MUTASI_MASUK_DEFAULT] })
                }
                className="text-xs text-sky-800 hover:underline whitespace-nowrap"
              >
                Reset Standar Dinas
              </button>
            </div>

            <div className="space-y-1.5">
              {PERSYARATAN_MUTASI_MASUK_DEFAULT.map((req, idx) => {
                const checked = reqList.includes(req);
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-md bg-white border border-slate-200 cursor-pointer hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRequirement(req)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-800 shrink-0"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">{req}</span>
                  </label>
                );
              })}

              {extraCustomItems.map((req, idx) => (
                <div
                  key={`custom-${idx}`}
                  className="flex items-start justify-between gap-2 p-2 rounded-md bg-white border border-sky-200"
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleRequirement(req)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-800 shrink-0"
                    />
                    <span className="text-xs text-slate-800 leading-relaxed">{req}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleRequirement(req)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Hapus persyaratan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customReqInput}
                onChange={(e) => setCustomReqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomRequirement();
                  }
                }}
                placeholder="Tambah persyaratan khusus sekolah (misal: Surat Keterangan Sehat / KIP)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <button
                type="button"
                onClick={addCustomRequirement}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan / Persyaratan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={p.persyaratanTambahan}
                onChange={(e) => updatePayload({ persyaratanTambahan: e.target.value })}
                placeholder="Misal: Membawa orang tua/wali langsung saat penyerahan berkas ke ruang TU"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={p.sertakanLembarChecklist}
                onChange={(e) => updatePayload({ sertakanLembarChecklist: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-sky-800"
              />
              <span className="text-xs font-medium text-slate-800">
                Sertakan Lembar Verifikasi / Ceklis Kelengkapan Berkas (Halaman 2)
              </span>
            </label>
          </div>
        </div>
      );
    }

    if (kategori === 'surat_undangan') {
      const p = payload as unknown as SuratUndanganPayload;
      const isOrtu = p.jenisUndangan === 'rapat_orang_tua';

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => {
                updatePayload({
                  jenisUndangan: 'rapat_orang_tua',
                  tujuanYth: 'Bapak/Ibu Orang Tua/Wali Peserta Didik Kelas VII, VIII, dan IX',
                  kalimatPembuka:
                    'Dengan hormat, mengharap kehadiran Bapak/Ibu dalam acara Rapat Pleno Orang Tua/Wali Peserta Didik yang akan dilaksanakan pada:',
                });
                setPerihal('Undangan Rapat Orang Tua / Wali Peserta Didik');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isOrtu ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Undangan Rapat Orang Tua
            </button>
            <button
              type="button"
              onClick={() => {
                updatePayload({
                  jenisUndangan: 'rapat_pegawai',
                  tujuanYth: 'Bapak/Ibu Guru dan Tenaga Kependidikan ' + settings.namaSekolah,
                  kalimatPembuka:
                    'Dengan hormat, mengharap kehadiran Bapak/Ibu Guru dan Staf Tata Usaha dalam Rapat Dinas Dewan Guru yang akan dilaksanakan pada:',
                });
                setPerihal('Undangan Rapat Dinas Pegawai dan Dewan Guru');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isOrtu ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Undangan Rapat Pegawai / Guru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sifat Surat</label>
              <select
                value={p.sifat}
                onChange={(e) => updatePayload({ sifat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Biasa">Biasa</option>
                <option value="Penting">Penting</option>
                <option value="Segera">Segera</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Lampiran</label>
              <input
                type="text"
                value={p.lampiran}
                onChange={(e) => updatePayload({ lampiran: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tujuan Surat (Yth. — Posisi kiri sesuai Permendagri 1/2023)
              </label>
              <input
                type="text"
                value={p.tujuanYth}
                onChange={(e) => updatePayload({ tujuanYth: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">di (Tempat)</label>
              <input
                type="text"
                value={p.diTempat}
                onChange={(e) => updatePayload({ diTempat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hari / Tanggal Acara
              </label>
              <input
                type="date"
                value={p.hariTanggalAcara}
                onChange={(e) => updatePayload({ hariTanggalAcara: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Waktu</label>
              <input
                type="text"
                value={p.waktuAcara}
                onChange={(e) => updatePayload({ waktuAcara: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tempat Acara</label>
              <input
                type="text"
                value={p.tempatAcara}
                onChange={(e) => updatePayload({ tempatAcara: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Kalimat Pembuka</label>
              <textarea
                rows={2}
                value={p.kalimatPembuka}
                onChange={(e) => updatePayload({ kalimatPembuka: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Agenda / Acara</label>
              <textarea
                rows={2}
                value={p.agendaAcara}
                onChange={(e) => updatePayload({ agendaAcara: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pakaian / Catatan Tambahan
              </label>
              <input
                type="text"
                value={p.pakaianCatatan}
                onChange={(e) => updatePayload({ pakaianCatatan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={p.sertakanDaftarHadir}
              onChange={(e) => updatePayload({ sertakanDaftarHadir: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-sky-800"
            />
            <span className="text-sm font-medium text-slate-800">
              Sertakan Lampiran Daftar Hadir Rapat (Lembar 2)
            </span>
          </label>
        </div>
      );
    }

    // SURAT PANGGILAN ORANG TUA
    const p = payload as unknown as SuratPanggilanPayload;
    return (
      <div className="space-y-4">
        {students.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Ambil Identitas Siswa &amp; Orang Tua dari Master
            </label>
            <select
              value=""
              onChange={(e) => handleApplyStudentToPanggilan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.nama} ({stu.kelas}) — Ortu: {stu.namaOrangTua || '-'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sifat Surat</label>
            <select
              value={p.sifat}
              onChange={(e) => updatePayload({ sifat: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Penting">Penting</option>
              <option value="Segera">Segera</option>
              <option value="Rahasia">Rahasia</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Lampiran</label>
            <input
              type="text"
              value={p.lampiran}
              onChange={(e) => updatePayload({ lampiran: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Siswa</label>
            <input
              type="text"
              value={p.namaSiswa}
              onChange={(e) => updatePayload({ namaSiswa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">NISN / Kelas</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="NISN"
                value={p.nisn}
                onChange={(e) => updatePayload({ nisn: e.target.value })}
                className="w-1/2 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Kelas"
                value={p.kelas}
                onChange={(e) => updatePayload({ kelas: e.target.value })}
                className="w-1/2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Orang Tua / Wali
            </label>
            <input
              type="text"
              value={p.namaOrangTua}
              onChange={(e) => updatePayload({ namaOrangTua: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alamat Orang Tua
            </label>
            <input
              type="text"
              value={p.alamatOrangTua}
              onChange={(e) => updatePayload({ alamatOrangTua: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alasan / Keperluan Panggilan
            </label>
            <textarea
              rows={2}
              value={p.alasanPanggilan}
              onChange={(e) => updatePayload({ alasanPanggilan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Hari / Tanggal Hadir
            </label>
            <input
              type="date"
              value={p.hariTanggalHadir}
              onChange={(e) => updatePayload({ hariTanggalHadir: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Waktu</label>
            <input
              type="text"
              value={p.waktuHadir}
              onChange={(e) => updatePayload({ waktuHadir: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tempat</label>
            <input
              type="text"
              value={p.tempatHadir}
              onChange={(e) => updatePayload({ tempatHadir: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Menghadap</label>
            <input
              type="text"
              value={p.menghadapKe}
              onChange={(e) => updatePayload({ menghadapKe: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Category Selector Tabs (Only when creating new letter) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(Object.keys(KATEGORI_LABELS) as LetterCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={Boolean(editingLetter)}
              onClick={() => handleCategorySwitch(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                kategori === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
              }`}
            >
              {KATEGORI_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="xl:hidden px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 whitespace-nowrap"
          >
            Lihat Pratinjau
          </button>

          {editingLetter && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Batal Edit
            </button>
          )}

          <button
            type="button"
            onClick={() => setPrintPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Pratinjau &amp; Cetak
          </button>
        </div>
      </div>

      {feedback && (
        <div className="no-print flex items-center gap-2 px-4 py-2.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="no-print px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Split Workspace: Form Left, A4 Preview Right (stacked on smaller viewports, always visible) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Form Column */}
        <div className="no-print xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-800" />
              <h2 className="text-sm font-semibold text-slate-900">
                {editingLetter ? 'Edit Naskah Dinas' : 'Penyusunan Naskah Dinas'}
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Permendagri 1/2023</span>
          </div>

          {/* Asisten Draf Otomatis (Gemini AI via Server) */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              Asisten Penyusun Draf Naskah (Gemini AI)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleGenerateWithGemini();
                  }
                }}
                placeholder="Contoh: Bimtek Kurikulum di Dinas Pendidikan besok selama 2 hari..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
              />
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleGenerateWithGemini()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {aiLoading ? 'Menyusun...' : 'Susun Isi'}
              </button>
            </div>
          </div>

          {/* Penomoran & Klasifikasi Arsip Kemendagri */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kode Klasifikasi (Permendagri 83/2022)
                </label>
                <select
                  value={kodeKlasifikasi}
                  onChange={(e) => setKodeKlasifikasi(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                >
                  {KLASIFIKASI_ARSIP_KEMENDAGRI.map((k) => (
                    <option key={k.kode} value={k.kode}>
                      {k.kode} — {k.uraian}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  No. Urut Agenda &amp; Tanggal
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nomorUrut}
                    onChange={(e) => setNomorUrut(e.target.value)}
                    className="w-20 px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg tabular-nums"
                  />
                  <input
                    type="date"
                    value={tanggalSurat}
                    onChange={(e) => setTanggalSurat(e.target.value)}
                    className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">Nomor Surat Resmi</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomNomor}
                    onChange={(e) => {
                      setUseCustomNomor(e.target.checked);
                      if (e.target.checked && !manualNomor) setManualNomor(generatedNomorSurat);
                    }}
                    className="rounded border-slate-300"
                  />
                  Ubah manual
                </label>
              </div>
              <input
                type="text"
                readOnly={!useCustomNomor}
                value={useCustomNomor ? manualNomor : generatedNomorSurat}
                onChange={(e) => setManualNomor(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono border rounded-lg ${
                  useCustomNomor
                    ? 'border-slate-300 bg-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Perihal / Ringkasan Isi Surat
              </label>
              <input
                type="text"
                value={perihal}
                onChange={(e) => setPerihal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">{renderSpecificFields()}</div>

          {/* TTE vs Basah + Action Buttons */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">Metode Penandatanganan</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setModeTtd('tte')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    modeTtd === 'tte' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  TTE Elektronik (QR)
                </button>
                <button
                  type="button"
                  onClick={() => setModeTtd('basah')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    modeTtd === 'basah' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Tanda Tangan Basah
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('draf')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                Simpan Draf
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('terbit')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Terbitkan & Agendakan'}
              </button>
            </div>
          </div>
        </div>

        {/* Live A4 Preview Column — always visible & scaled proportionally */}
        <div
          ref={previewSectionRef}
          className="no-print xl:col-span-7 bg-slate-100/80 border border-slate-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Pratinjau Naskah Dinas (A4 · Margin Normal 2 cm)
              </div>
              <div className="text-[11px] text-slate-500">
                Klik tombol &ldquo;Pratinjau &amp; Cetak&rdquo; untuk memilih kertas A4/F4, margin, cetak PDF, atau unduh Word (.doc).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPrintPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Buka Mode Cetak
            </button>
          </div>

          <ScaledA4Container paperWidthPx={794}>
            <LetterPreviewA4
              settings={settings}
              kategori={kategori}
              nomorSurat={generatedNomorSurat}
              tanggalSurat={tanggalSurat}
              perihal={perihal}
              modeTtd={modeTtd}
              payload={payload}
              paperSize="a4"
              marginPreset="normal"
            />
          </ScaledA4Container>
        </div>
      </div>

      <PrintPreviewModal
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        settings={settings}
        kategori={kategori}
        nomorSurat={generatedNomorSurat}
        tanggalSurat={tanggalSurat}
        perihal={perihal}
        modeTtd={modeTtd}
        payload={payload}
      />
    </div>
  );
};
