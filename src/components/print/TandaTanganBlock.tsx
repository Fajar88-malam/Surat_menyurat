import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SchoolSettings, SignatureMode } from '../../types/surat';
import { formatTanggalIndonesia } from '../../utils/kemendagriFormat';

interface TandaTanganBlockProps {
  settings: SchoolSettings;
  tanggalSurat: string;
  nomorSurat: string;
  perihal: string;
  modeTtd: SignatureMode;
  jabatanPenandatangan?: string;
  showTempatTanggal?: boolean;
  align?: 'right' | 'center';
}

export const TandaTanganBlock: React.FC<TandaTanganBlockProps> = ({
  settings,
  tanggalSurat,
  nomorSurat,
  perihal,
  modeTtd,
  jabatanPenandatangan = 'Kepala Sekolah,',
  showTempatTanggal = true,
  align = 'right',
}) => {
  const qrPayload = JSON.stringify({
    instansi: settings.namaSekolah,
    nomor: nomorSurat,
    perihal,
    tanggal: tanggalSurat,
    penandatangan: settings.kepalaSekolahNama,
    nip: settings.kepalaSekolahNip || '-',
    verifikasi: 'TTE-BSrE-Kemendagri',
  });

  return (
    <div className={`mt-6 flex ${align === 'right' ? 'justify-end' : 'justify-center'}`}>
      <div className="w-[270px] text-[11pt] leading-[1.38] text-black">
        {showTempatTanggal && (
          <div className="mb-1">
            {settings.kota}, {formatTanggalIndonesia(tanggalSurat)}
          </div>
        )}
        <div className="font-normal">{jabatanPenandatangan}</div>

        {modeTtd === 'tte' ? (
          <div className="my-2.5 flex items-center gap-2.5">
            <div className="p-1 bg-white border border-slate-400 shrink-0">
              <QRCodeSVG value={qrPayload} size={64} level="M" />
            </div>
            <div className="text-[7.5pt] leading-tight text-slate-700">
              <div className="font-semibold text-black">Ditandatangani secara elektronik oleh:</div>
              <div className="mt-0.5">Kepala {settings.namaSekolah}</div>
              <div className="mt-0.5 font-mono text-[7pt]">TTE-SPBE 2026</div>
            </div>
          </div>
        ) : (
          <div className="h-[68px]" />
        )}

        <div className="font-bold underline decoration-1 underline-offset-2">
          {settings.kepalaSekolahNama}
        </div>
        {settings.kepalaSekolahPangkat && (
          <div className="text-[10.5pt]">{settings.kepalaSekolahPangkat}</div>
        )}
        {settings.kepalaSekolahNip && (
          <div className="text-[10.5pt]">NIP. {settings.kepalaSekolahNip}</div>
        )}
      </div>
    </div>
  );
};
