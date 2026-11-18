import { PolaPenomoran, SchoolSettings } from '../types/surat';

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const HARI_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTanggalIndonesia(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) {
    return isoDate;
  }
  return `${day} ${BULAN_ID[monthIdx]} ${year}`;
}

export function formatHariTanggalIndonesia(isoDate: string): string {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  const hari = HARI_ID[parsed.getDay()];
  return `${hari}, ${formatTanggalIndonesia(isoDate)}`;
}

export function hitungLamaHari(tglBerangkat: string, tglKembali: string): number {
  if (!tglBerangkat || !tglKembali) return 1;
  const start = new Date(`${tglBerangkat}T00:00:00`).getTime();
  const end = new Date(`${tglKembali}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export function angkaKeTerbilangHari(n: number): string {
  const words = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
    'dua belas',
    'tiga belas',
    'empat belas',
  ];
  if (n >= 1 && n < words.length) {
    return `${n} (${words[n]}) hari`;
  }
  return `${n} hari`;
}

export function buildNomorSurat(
  kodeKlasifikasi: string,
  nomorUrut: string,
  kodeUnitSurat: string,
  tanggalISO: string,
  pola: PolaPenomoran
): string {
  const cleanKlas = kodeKlasifikasi.trim() || '400.3';
  const cleanUrut = nomorUrut.trim().padStart(3, '0');
  const cleanUnit = kodeUnitSurat.trim() || 'SMPN1';
  const dateParts = (tanggalISO || getTodayISO()).split('-');
  const year = dateParts[0] || String(new Date().getFullYear());
  const monthNum = Math.min(12, Math.max(1, Number(dateParts[1]) || 1));

  if (pola === 'kemendagri_bulan_romawi') {
    return `${cleanKlas}/${cleanUrut}/${cleanUnit}/${ROMAWI[monthNum - 1]}/${year}`;
  }
  if (pola === 'kemendagri_bulan_angka') {
    return `${cleanKlas}/${cleanUrut}/${cleanUnit}/${String(monthNum).padStart(2, '0')}/${year}`;
  }
  // Standar Permendagri No. 1 Tahun 2023 (Kode Klasifikasi / Nomor Urut / Unit Kerja / Tahun)
  return `${cleanKlas}/${cleanUrut}/${cleanUnit}/${year}`;
}

export function getNextNomorUrut(existingNumbers: string[]): string {
  let maxNum = 0;
  for (const raw of existingNumbers) {
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    if (!Number.isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return String(maxNum + 1).padStart(3, '0');
}

export function createDefaultSchoolSettings(ownerId: string): SchoolSettings {
  return {
    ownerId,
    pemerintahDaerah: 'PEMERINTAH KABUPATEN BANYUMAS',
    dinasPendidikan: 'DINAS PENDIDIKAN',
    namaSekolah: 'SMP NEGERI 1 PURWOKERTO',
    npsn: '20301982',
    alamat: 'Jalan Jenderal Soedirman No. 124, Purwokerto',
    kota: 'Purwokerto',
    kodePos: '53116',
    telepon: '(0281) 635120',
    email: 'tatausaha@smpn1purwokerto.sch.id',
    website: 'https://smpn1purwokerto.sch.id',
    kodeUnitSurat: 'SMPN1.PWT',
    kepalaSekolahNama: 'Dr. Hendra Wijaya, M.Pd.',
    kepalaSekolahNip: '19710412 199802 1 003',
    kepalaSekolahPangkat: 'Pembina Utama Muda (IV/c)',
    logoDaerahDataUrl: '',
    logoSekolahDataUrl: '',
    tampilkanLogoKanan: false,
    polaPenomoran: 'kemendagri_2023',
  };
}

export async function compressLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar logo.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid atau rusak.'));
      img.onload = () => {
        const maxDim = 256;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia di peramban.'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        if (dataUrl.length > 250000) {
          reject(new Error('Ukuran logo setelah kompresi terlalu besar. Gunakan gambar beresolusi lebih kecil.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
