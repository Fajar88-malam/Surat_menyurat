import React from 'react';
import { SchoolSettings } from '../../types/surat';

interface KopSuratProps {
  settings: SchoolSettings;
  fontVariant?: 'arial' | 'bookman';
}

function DefaultLambangDaerah() {
  return (
    <svg
      viewBox="0 0 80 90"
      className="w-[62px] h-[70px] mx-auto text-slate-800"
      fill="none"
      aria-label="Lambang Pemerintah Daerah"
    >
      <path
        d="M40 6L70 16V44C70 64 56 77 40 84C24 77 10 64 10 44V16L40 6Z"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="#f8fafc"
      />
      <path
        d="M40 13L62 20V43C62 58 51 69 40 75C29 69 18 58 18 43V20L40 13Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <polygon
        points="40,21 43,29 51,29 45,34 47,42 40,37 33,42 35,34 29,29 37,29"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M25 51H55M28 57H52M32 63H48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const KopSurat: React.FC<KopSuratProps> = ({ settings, fontVariant = 'arial' }) => {
  const fontClass = fontVariant === 'bookman' ? 'font-kemendagri-bookman' : 'font-kemendagri-arial';
  const showRight = settings.tampilkanLogoKanan && Boolean(settings.logoSekolahDataUrl);

  const contactParts: string[] = [];
  if (settings.telepon) contactParts.push(`Telepon ${settings.telepon}`);
  if (settings.website) contactParts.push(`Laman ${settings.website}`);
  if (settings.email) contactParts.push(`Pos-el ${settings.email}`);

  return (
    <div className={`${fontClass} text-black mb-4 select-text`}>
      <div className="flex items-center gap-3 pb-2">
        {/* Logo Daerah (Kiri — Wajib sesuai Permendagri 1/2023) */}
        <div className="w-[74px] shrink-0 flex items-center justify-center">
          {settings.logoDaerahDataUrl ? (
            <img
              src={settings.logoDaerahDataUrl}
              alt="Logo Pemerintah Daerah"
              className="max-w-[70px] max-h-[76px] object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <DefaultLambangDaerah />
          )}
        </div>

        {/* Teks Instansi */}
        <div className="flex-1 text-center leading-tight">
          <div className="text-[13pt] font-semibold uppercase tracking-[0.02em]">
            {settings.pemerintahDaerah}
          </div>
          <div className="text-[13pt] font-semibold uppercase tracking-[0.02em]">
            {settings.dinasPendidikan}
          </div>
          <div className="text-[15pt] font-bold uppercase tracking-[0.03em] mt-0.5">
            {settings.namaSekolah}
          </div>
          <div className="text-[9pt] mt-0.5 leading-snug">
            {settings.alamat}
            {settings.kodePos ? ` Kode Pos ${settings.kodePos}` : ''}
          </div>
          {contactParts.length > 0 && (
            <div className="text-[8.5pt] leading-snug">{contactParts.join(', ')}</div>
          )}
        </div>

        {/* Logo Kanan Opsional (atau spacer seimbang agar kop tetap center) */}
        <div className="w-[74px] shrink-0 flex items-center justify-center">
          {showRight && settings.logoSekolahDataUrl ? (
            <img
              src={settings.logoSekolahDataUrl}
              alt="Logo Sekolah"
              className="max-w-[68px] max-h-[72px] object-contain"
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>
      </div>

      {/* Garis Pemisah Ganda Tebal-Tipis Standar Tata Naskah Dinas */}
      <div className="border-b-[2.5px] border-black" />
      <div className="border-b-[0.8px] border-black mt-[2px]" />
    </div>
  );
};
