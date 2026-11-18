import * as XLSX from 'xlsx';
import { Employee, KATEGORI_LABELS, LetterRecord, StatusKepegawaian, Student, StudentStatus } from '../types/surat';

export interface ImportedEmployeeRow {
  nama: string;
  nip: string;
  nuptk: string;
  pangkatGolongan: string;
  jabatan: string;
  statusKepegawaian: StatusKepegawaian;
  unitKerja: string;
  telepon: string;
  email: string;
}

export interface ImportedStudentRow {
  nama: string;
  nis: string;
  nisn: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  kelas: string;
  namaOrangTua: string;
  pekerjaanOrangTua: string;
  alamat: string;
  teleponOrangTua: string;
  status: StudentStatus;
}

function normalizeHeader(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function pickField(row: Record<string, unknown>, candidates: string[]): string {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [
    normalizeHeader(k),
    v == null ? '' : String(v).trim(),
  ]);
  for (const cand of candidates) {
    const target = normalizeHeader(cand);
    const match = normalizedEntries.find(([k]) => k === target || k.includes(target));
    if (match && match[1]) return match[1];
  }
  return '';
}

export function exportEmployees(employees: Employee[], format: 'xlsx' | 'csv') {
  const rows = employees.map((e, idx) => ({
    No: idx + 1,
    'Nama Lengkap': e.nama,
    NIP: e.nip || '',
    NUPTK: e.nuptk || '',
    'Pangkat/Golongan': e.pangkatGolongan || '',
    Jabatan: e.jabatan,
    'Status Kepegawaian': e.statusKepegawaian,
    'Unit Kerja': e.unitKerja || '',
    'No. Telepon': e.telepon || '',
    Email: e.email || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai');
  const filename = `data-pegawai-sekolah.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format });
}

export function downloadEmployeeTemplate() {
  const sample = [
    {
      'Nama Lengkap': 'Dra. Siti Aminah, M.Pd.',
      NIP: '19760514 200501 2 008',
      NUPTK: '4846754655300012',
      'Pangkat/Golongan': 'Pembina (IV/a)',
      Jabatan: 'Guru Madya / Wakil Kepala Bidang Kurikulum',
      'Status Kepegawaian': 'PNS',
      'Unit Kerja': 'SMP Negeri 1 Purwokerto',
      'No. Telepon': '081226789012',
      Email: 'siti.aminah@sekolah.sch.id',
    },
    {
      'Nama Lengkap': 'Budi Santoso, S.Pd.',
      NIP: '19890321 202221 1 004',
      NUPTK: '7653767668130042',
      'Pangkat/Golongan': 'Ahli Pertama (IX)',
      Jabatan: 'Guru Bahasa Indonesia',
      'Status Kepegawaian': 'PPPK',
      'Unit Kerja': 'SMP Negeri 1 Purwokerto',
      'No. Telepon': '085643210987',
      Email: 'budi.santoso@sekolah.sch.id',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Pegawai');
  XLSX.writeFile(wb, 'template-import-pegawai.xlsx');
}

export async function parseEmployeesFile(file: File): Promise<{
  rows: ImportedEmployeeRow[];
  skipped: number;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: '',
  });

  const rows: ImportedEmployeeRow[] = [];
  let skipped = 0;

  for (const raw of rawRows) {
    const nama = pickField(raw, ['Nama Lengkap', 'Nama', 'Nama Pegawai']);
    if (!nama || nama.length < 2) {
      skipped++;
      continue;
    }
    const rawStatus = pickField(raw, ['Status Kepegawaian', 'Status']).toUpperCase();
    let statusKepegawaian: StatusKepegawaian = 'PNS';
    if (rawStatus.includes('PPPK')) statusKepegawaian = 'PPPK';
    else if (rawStatus.includes('CPNS')) statusKepegawaian = 'CPNS';
    else if (rawStatus.includes('HONOR') || rawStatus.includes('GTT') || rawStatus.includes('PTT'))
      statusKepegawaian = 'Honorer';

    rows.push({
      nama: nama.slice(0, 140),
      nip: pickField(raw, ['NIP']).slice(0, 40),
      nuptk: pickField(raw, ['NUPTK']).slice(0, 40),
      pangkatGolongan: pickField(raw, ['Pangkat/Golongan', 'Pangkat', 'Golongan']).slice(0, 80),
      jabatan: (pickField(raw, ['Jabatan']) || 'Guru / Staf').slice(0, 120),
      statusKepegawaian,
      unitKerja: pickField(raw, ['Unit Kerja', 'Unit']).slice(0, 120),
      telepon: pickField(raw, ['No. Telepon', 'Telepon', 'HP', 'No HP']).slice(0, 30),
      email: pickField(raw, ['Email', 'Posel']).slice(0, 120),
    });
  }

  return { rows, skipped };
}

export function exportStudents(students: Student[], format: 'xlsx' | 'csv') {
  const rows = students.map((s, idx) => ({
    No: idx + 1,
    'Nama Lengkap': s.nama,
    NIS: s.nis || '',
    NISN: s.nisn || '',
    'Tempat Lahir': s.tempatLahir || '',
    'Tanggal Lahir': s.tanggalLahir || '',
    'Jenis Kelamin': s.jenisKelamin,
    Kelas: s.kelas,
    'Nama Orang Tua/Wali': s.namaOrangTua || '',
    'Pekerjaan Orang Tua': s.pekerjaanOrangTua || '',
    Alamat: s.alamat || '',
    'No. HP Orang Tua': s.teleponOrangTua || '',
    Status: s.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  const filename = `data-siswa-sekolah.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format });
}

export function downloadStudentTemplate() {
  const sample = [
    {
      'Nama Lengkap': 'Rafi Pratama Putra',
      NIS: '24081',
      NISN: '0114829103',
      'Tempat Lahir': 'Banyumas',
      'Tanggal Lahir': '2012-04-17',
      'Jenis Kelamin': 'L',
      Kelas: 'VIII-A',
      'Nama Orang Tua/Wali': 'Slamet Riyadi',
      'Pekerjaan Orang Tua': 'Pegawai Negeri Sipil',
      Alamat: 'Jl. Gatot Subroto No. 45, Purwokerto',
      'No. HP Orang Tua': '081327001122',
      Status: 'Aktif',
    },
    {
      'Nama Lengkap': 'Nadia Azzahra',
      NIS: '24082',
      NISN: '0129481204',
      'Tempat Lahir': 'Purwokerto',
      'Tanggal Lahir': '2012-09-03',
      'Jenis Kelamin': 'P',
      Kelas: 'VIII-B',
      'Nama Orang Tua/Wali': 'H. Ahmad Fauzi',
      'Pekerjaan Orang Tua': 'Wiraswasta',
      Alamat: 'Perum Berkoh Indah Blok C-12, Purwokerto',
      'No. HP Orang Tua': '085291122334',
      Status: 'Aktif',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
  XLSX.writeFile(wb, 'template-import-siswa.xlsx');
}

export async function parseStudentsFile(file: File): Promise<{
  rows: ImportedStudentRow[];
  skipped: number;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: '',
  });

  const rows: ImportedStudentRow[] = [];
  let skipped = 0;

  for (const raw of rawRows) {
    const nama = pickField(raw, ['Nama Lengkap', 'Nama Siswa', 'Nama']);
    if (!nama || nama.length < 2) {
      skipped++;
      continue;
    }

    const jkRaw = pickField(raw, ['Jenis Kelamin', 'JK', 'Gender']).toUpperCase();
    const jenisKelamin: 'L' | 'P' = jkRaw.startsWith('P') || jkRaw.includes('WANITA') ? 'P' : 'L';

    const statusRaw = pickField(raw, ['Status']).toLowerCase();
    let status: StudentStatus = 'Aktif';
    if (statusRaw.includes('mutasi') || statusRaw.includes('pindah')) status = 'Mutasi Keluar';
    else if (statusRaw.includes('lulus')) status = 'Lulus';

    rows.push({
      nama: nama.slice(0, 140),
      nis: pickField(raw, ['NIS']).slice(0, 30),
      nisn: pickField(raw, ['NISN']).slice(0, 30),
      tempatLahir: pickField(raw, ['Tempat Lahir']).slice(0, 80),
      tanggalLahir: pickField(raw, ['Tanggal Lahir', 'Tgl Lahir']).slice(0, 30),
      jenisKelamin,
      kelas: (pickField(raw, ['Kelas', 'Rombel']) || 'VII-A').slice(0, 40),
      namaOrangTua: pickField(raw, ['Nama Orang Tua/Wali', 'Nama Orang Tua', 'Orang Tua', 'Wali']).slice(0, 140),
      pekerjaanOrangTua: pickField(raw, ['Pekerjaan Orang Tua', 'Pekerjaan']).slice(0, 100),
      alamat: pickField(raw, ['Alamat']).slice(0, 250),
      teleponOrangTua: pickField(raw, ['No. HP Orang Tua', 'Telepon Orang Tua', 'No HP']).slice(0, 30),
      status,
    });
  }

  return { rows, skipped };
}

export function exportLettersAgenda(letters: LetterRecord[]) {
  const rows = letters.map((l, idx) => ({
    'No. Agenda': idx + 1,
    'Nomor Surat': l.nomorSurat,
    'Tanggal Surat': l.tanggalSurat,
    'Kode Klasifikasi': l.kodeKlasifikasi,
    'Jenis Naskah': KATEGORI_LABELS[l.kategori] || l.kategori,
    Perihal: l.perihal,
    Tujuan: l.tujuanSurat || '-',
    'Mode TTD': l.modeTtd === 'tte' ? 'TTE Elektronik' : 'Tanda Tangan Basah',
    Status: l.status.toUpperCase(),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Agenda Surat');
  XLSX.writeFile(wb, 'buku-agenda-surat-keluar.xlsx');
}
