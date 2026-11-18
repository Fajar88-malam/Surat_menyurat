import { Timestamp } from 'firebase/firestore';

export type PolaPenomoran =
  | 'kemendagri_2023'
  | 'kemendagri_bulan_romawi'
  | 'kemendagri_bulan_angka';

export interface SchoolSettings {
  ownerId: string;
  pemerintahDaerah: string;
  dinasPendidikan: string;
  namaSekolah: string;
  npsn?: string;
  alamat: string;
  kota: string;
  kodePos?: string;
  telepon?: string;
  email?: string;
  website?: string;
  kodeUnitSurat: string;
  kepalaSekolahNama: string;
  kepalaSekolahNip?: string;
  kepalaSekolahPangkat?: string;
  logoDaerahDataUrl?: string;
  logoSekolahDataUrl?: string;
  tampilkanLogoKanan: boolean;
  polaPenomoran: PolaPenomoran;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type StatusKepegawaian = 'PNS' | 'PPPK' | 'Honorer' | 'CPNS';

export interface Employee {
  id: string;
  ownerId: string;
  nama: string;
  nip?: string;
  nuptk?: string;
  pangkatGolongan?: string;
  jabatan: string;
  statusKepegawaian: StatusKepegawaian;
  unitKerja?: string;
  telepon?: string;
  email?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type StudentStatus = 'Aktif' | 'Mutasi Keluar' | 'Lulus';

export interface Student {
  id: string;
  ownerId: string;
  nama: string;
  nis?: string;
  nisn?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin: 'L' | 'P';
  kelas: string;
  namaOrangTua?: string;
  pekerjaanOrangTua?: string;
  alamat?: string;
  teleponOrangTua?: string;
  status: StudentStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type LetterCategory =
  | 'surat_tugas_sppd'
  | 'surat_keterangan'
  | 'surat_mutasi'
  | 'surat_penerimaan_mutasi'
  | 'surat_undangan'
  | 'surat_panggilan';

export type LetterStatus = 'draf' | 'terbit' | 'arsip';
export type SignatureMode = 'tte' | 'basah';

export interface AssignedPerson {
  nama: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
}

export interface SuratTugasSppdPayload {
  dasarPenugasan: string;
  petugas: AssignedPerson[];
  uraianTugas: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  tanggalBerangkat: string;
  tanggalKembali: string;
  lamaHari: number;
  alatAngkut: string;
  tingkatBiaya: string;
  pengikut: string;
  bebanInstansi: string;
  bebanAkun: string;
  keteranganLain: string;
  sertakanSppd: boolean;
  nomorSppd: string;
  pejabatTujuanJabatan: string;
  pejabatTujuanNama: string;
  pejabatTujuanNip: string;
}

export interface SuratKeteranganPayload {
  jenisSubjek: 'pegawai' | 'siswa';
  jenisKeterangan:
    | 'aktif_bekerja'
    | 'kelakuan_baik_pegawai'
    | 'aktif_belajar'
    | 'kelakuan_baik_siswa'
    | 'nisn_pip'
    | 'kustom';
  namaSubjek: string;
  identitasNomor: string; // NIP/NUPTK or NIS/NISN
  pangkatAtauTtl: string;
  jabatanAtauKelas: string;
  namaOrangTua: string;
  alamat: string;
  isiKeterangan: string;
  keperluan: string;
}

export interface SuratMutasiPayload {
  jenisMutasi: 'keluar' | 'masuk';
  namaSiswa: string;
  nis: string;
  nisn: string;
  tempatTanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  kelasSaatIni: string;
  namaOrangTua: string;
  pekerjaanOrangTua: string;
  alamatOrangTua: string;
  teleponOrangTua: string;
  sekolahAsalAtauTujuan: string;
  kotaSekolahAsalAtauTujuan: string;
  alasanPindah: string;
  tanggalEfektif: string;
  sertakanPermohonanOrtu: boolean;
  pakaiMaterai: boolean;
  tanggalPermohonanOrtu: string;
}

export const PERSYARATAN_MUTASI_MASUK_DEFAULT: string[] = [
  'Surat Keterangan Pindah Sekolah resmi dari Sekolah Asal (disahkan Dinas Pendidikan setempat bila mutasi antar kabupaten/kota/provinsi).',
  'Surat Keterangan Kelakuan Baik dan Bebas Pelanggaran Tata Tertib dari Kepala Sekolah Asal.',
  'Buku Rapor asli beserta fotokopi halaman identitas dan nilai semester berjalan/sebelumnya yang telah dilegalisir Kepala Sekolah Asal.',
  'Surat Keterangan Mutasi Keluar / Bukti Tarik Data Peserta Didik pada sistem Dapodik atau EMIS dari operator sekolah asal.',
  'Fotokopi Akta Kelahiran dan Kartu Keluarga (KK) terbaru yang mencantumkan NIK dan NISN peserta didik yang valid.',
  'Fotokopi Ijazah / Surat Keterangan Lulus (SKL) jenjang pendidikan sebelumnya dan sertifikat akreditasi sekolah asal.',
  'Surat Permohonan Pindah Sekolah yang ditandatangani Orang Tua / Wali bermeterai Rp10.000.',
  'Pas foto berwarna terbaru ukuran 3 x 4 cm sebanyak 4 (empat) lembar (pakaian seragam sekolah).',
];

export interface SuratPenerimaanMutasiPayload {
  tahunPelajaran: string;
  namaSiswa: string;
  nis: string;
  nisn: string;
  tempatTanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  kelasDiterima: string;
  asalSekolah: string;
  npsnAsalSekolah: string;
  kotaAsalSekolah: string;
  namaOrangTua: string;
  pekerjaanOrangTua: string;
  alamatOrangTua: string;
  teleponOrangTua: string;
  tanggalEfektifMasuk: string;
  batasLaporUlang: string;
  dayaTampungCatatan: string;
  persyaratanChecklist: string[];
  persyaratanTambahan: string;
  sertakanLembarChecklist: boolean;
}

export interface SuratUndanganPayload {
  jenisUndangan: 'rapat_orang_tua' | 'rapat_pegawai';
  sifat: 'Biasa' | 'Penting' | 'Segera';
  lampiran: string;
  tujuanYth: string;
  diTempat: string;
  kalimatPembuka: string;
  hariTanggalAcara: string;
  waktuAcara: string;
  tempatAcara: string;
  agendaAcara: string;
  pakaianCatatan: string;
  sertakanDaftarHadir: boolean;
}

export interface SuratPanggilanPayload {
  sifat: 'Penting' | 'Segera' | 'Rahasia';
  lampiran: string;
  namaSiswa: string;
  nisn: string;
  kelas: string;
  namaOrangTua: string;
  alamatOrangTua: string;
  alasanPanggilan: string;
  hariTanggalHadir: string;
  waktuHadir: string;
  tempatHadir: string;
  menghadapKe: string;
  catatanTambahan: string;
}

export type LetterPayload =
  | SuratTugasSppdPayload
  | SuratKeteranganPayload
  | SuratMutasiPayload
  | SuratPenerimaanMutasiPayload
  | SuratUndanganPayload
  | SuratPanggilanPayload;

export interface LetterRecord {
  id: string;
  ownerId: string;
  kategori: LetterCategory;
  subKategori: string;
  kodeKlasifikasi: string;
  nomorUrut: string;
  nomorSurat: string;
  tanggalSurat: string;
  perihal: string;
  tujuanSurat?: string;
  status: LetterStatus;
  modeTtd: SignatureMode;
  payload: Record<string, unknown>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const FIELD_LIMITS = {
  PEMERINTAH_MAX: 150,
  DINAS_MAX: 150,
  SEKOLAH_MAX: 150,
  ALAMAT_MAX: 250,
  KOTA_MAX: 100,
  NAMA_MAX: 140,
  JABATAN_MAX: 120,
  PERIHAL_MAX: 220,
  TUJUAN_MAX: 200,
  NOMOR_MAX: 120,
} as const;

export interface KlasifikasiOption {
  kode: string;
  uraian: string;
  rekomendasiKategori: LetterCategory[];
}

// Klasifikasi Arsip berdasarkan Permendagri No. 83 Tahun 2022 & Pedoman Kearsipan Pendidikan
export const KLASIFIKASI_ARSIP_KEMENDAGRI: KlasifikasiOption[] = [
  {
    kode: '000.1.2.3',
    uraian: 'Perjalanan Dinas Dalam Daerah / Luar Daerah (SPT & SPPD)',
    rekomendasiKategori: ['surat_tugas_sppd'],
  },
  {
    kode: '800.1.11.1',
    uraian: 'Surat Perintah Tugas / Penugasan Pegawai & Guru',
    rekomendasiKategori: ['surat_tugas_sppd'],
  },
  {
    kode: '400.3.5',
    uraian: 'Kesiswaan, Pembinaan Peserta Didik, Mutasi & Panggilan Orang Tua',
    rekomendasiKategori: [
      'surat_mutasi',
      'surat_penerimaan_mutasi',
      'surat_panggilan',
      'surat_keterangan',
      'surat_undangan',
    ],
  },
  {
    kode: '400.3.5.1',
    uraian: 'Penerimaan, Perpindahan / Mutasi Peserta Didik',
    rekomendasiKategori: ['surat_mutasi', 'surat_penerimaan_mutasi'],
  },
  {
    kode: '400.3.1',
    uraian: 'Penyelenggaraan Pendidikan Dasar / Menengah & Rapat Sekolah',
    rekomendasiKategori: ['surat_undangan', 'surat_keterangan'],
  },
  {
    kode: '800.1.10',
    uraian: 'Surat Keterangan Kepegawaian / Aktif Melaksanakan Tugas',
    rekomendasiKategori: ['surat_keterangan'],
  },
  {
    kode: '400.3.8',
    uraian: 'Rapat Koordinasi Dinas / Dewan Guru / Komite Sekolah',
    rekomendasiKategori: ['surat_undangan'],
  },
];

export const KATEGORI_LABELS: Record<LetterCategory, string> = {
  surat_tugas_sppd: 'Surat Tugas & SPPD',
  surat_keterangan: 'Surat Keterangan',
  surat_mutasi: 'Surat Mutasi & Permohonan',
  surat_penerimaan_mutasi: 'Penerimaan Mutasi Masuk',
  surat_undangan: 'Surat Undangan Rapat',
  surat_panggilan: 'Surat Panggilan Orang Tua',
};
