import React, { useState } from 'react';
import {
  LetterCategory,
  SchoolSettings,
  SignatureMode,
  SuratKeteranganPayload,
  SuratMutasiPayload,
  SuratPanggilanPayload,
  SuratPenerimaanMutasiPayload,
  SuratTugasSppdPayload,
  SuratUndanganPayload,
} from '../../types/surat';
import {
  angkaKeTerbilangHari,
  formatHariTanggalIndonesia,
  formatTanggalIndonesia,
  hitungLamaHari,
} from '../../utils/kemendagriFormat';
import { KopSurat } from './KopSurat';
import { TandaTanganBlock } from './TandaTanganBlock';

interface LetterPreviewA4Props {
  settings: SchoolSettings;
  kategori: LetterCategory;
  nomorSurat: string;
  tanggalSurat: string;
  perihal: string;
  modeTtd: SignatureMode;
  payload: Record<string, unknown>;
  paperSize?: 'a4' | 'f4';
  marginPreset?: 'normal' | 'kemendagri';
  forceShowAllSheets?: boolean;
}

export const LetterPreviewA4: React.FC<LetterPreviewA4Props> = ({
  settings,
  kategori,
  nomorSurat,
  tanggalSurat,
  perihal,
  modeTtd,
  payload,
  paperSize = 'a4',
  marginPreset = 'normal',
  forceShowAllSheets = false,
}) => {
  const [activeSheet, setActiveSheet] = useState<'all' | '1' | '2' | '3'>('all');
  const pageStyleClasses = `${paperSize === 'f4' ? 'paper-f4' : ''} ${
    marginPreset === 'kemendagri' ? 'margin-kemendagri' : 'margin-normal'
  }`;

  const renderTteFooter = () =>
    modeTtd === 'tte' ? (
      <div className="mt-auto pt-4 border-t border-slate-300 text-[7.5pt] text-slate-600 flex items-center justify-between gap-4">
        <span>
          UU ITE No. 11 Tahun 2008 Pasal 5 Ayat 1: Informasi Elektronik dan/atau Dokumen Elektronik merupakan alat bukti hukum yang sah.
        </span>
        <span className="font-mono shrink-0">BSrE / TTE</span>
      </div>
    ) : null;

  // 1. SURAT TUGAS + SPPD
  if (kategori === 'surat_tugas_sppd') {
    const p = payload as unknown as SuratTugasSppdPayload;
    const lamaHari = hitungLamaHari(p.tanggalBerangkat, p.tanggalKembali);
    const petugas = Array.isArray(p.petugas) && p.petugas.length > 0
      ? p.petugas
      : [{ nama: '-', nip: '-', pangkatGolongan: '-', jabatan: '-' }];
    const primaryPerson = petugas[0];

    const showSt = forceShowAllSheets || activeSheet === 'all' || activeSheet === '1';
    const showSppd1 =
      p.sertakanSppd && (forceShowAllSheets || activeSheet === 'all' || activeSheet === '2');
    const showSppd2 =
      p.sertakanSppd && (forceShowAllSheets || activeSheet === 'all' || activeSheet === '3');

    return (
      <div className="space-y-4">
        {p.sertakanSppd && !forceShowAllSheets && (
          <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {[
              { id: 'all', label: 'Semua Lembar (3 Hal)' },
              { id: '1', label: '1. Surat Tugas' },
              { id: '2', label: '2. SPPD Hal. 1' },
              { id: '3', label: '3. SPPD Hal. 2' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id as 'all' | '1' | '2' | '3')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSheet === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="print-only-root space-y-6">
          {/* LEMBAR 1: SURAT TUGAS */}
          {showSt && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-bookman text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="bookman" />

              <div className="text-center mt-2 mb-4">
                <div className="text-[12.5pt] font-bold tracking-[0.06em] underline underline-offset-4">
                  SURAT TUGAS
                </div>
                <div className="text-[11pt] mt-1">NOMOR : {nomorSurat}</div>
              </div>

              <table className="w-full text-[11pt] border-collapse">
                <tbody>
                  <tr className="align-top">
                    <td className="w-[100px] py-1">Dasar</td>
                    <td className="w-[18px] py-1">:</td>
                    <td className="py-1 whitespace-pre-line text-justify">
                      {p.dasarPenugasan || 'Program Kerja Sekolah Tahun Anggaran berjalan.'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center font-bold tracking-[0.08em] my-3">
                MEMERINTAHKAN :
              </div>

              <table className="w-full text-[11pt] border-collapse">
                <tbody>
                  <tr className="align-top">
                    <td className="w-[100px] py-1">Kepada</td>
                    <td className="w-[18px] py-1">:</td>
                    <td className="py-1">
                      <div className="space-y-2.5">
                        {petugas.map((org, idx) => (
                          <table key={idx} className="w-full border-collapse text-[10.5pt]">
                            <tbody>
                              <tr>
                                <td className="w-[22px] align-top">{petugas.length > 1 ? `${idx + 1}.` : ''}</td>
                                <td className="w-[140px] align-top">Nama</td>
                                <td className="w-[14px] align-top">:</td>
                                <td className="font-semibold">{org.nama || '-'}</td>
                              </tr>
                              <tr>
                                <td />
                                <td className="align-top">NIP</td>
                                <td className="align-top">:</td>
                                <td>{org.nip || '-'}</td>
                              </tr>
                              <tr>
                                <td />
                                <td className="align-top">Pangkat / Golongan</td>
                                <td className="align-top">:</td>
                                <td>{org.pangkatGolongan || '-'}</td>
                              </tr>
                              <tr>
                                <td />
                                <td className="align-top">Jabatan</td>
                                <td className="align-top">:</td>
                                <td>{org.jabatan || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        ))}
                      </div>
                    </td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-2">Untuk</td>
                    <td className="py-2">:</td>
                    <td className="py-2 text-justify">
                      <div>{p.uraianTugas || 'Melaksanakan tugas kedinasan.'}</div>
                      <div className="mt-2 space-y-0.5 text-[10.5pt]">
                        <div>
                          Hari / Tanggal :{' '}
                          {p.tanggalBerangkat === p.tanggalKembali
                            ? formatHariTanggalIndonesia(p.tanggalBerangkat)
                            : `${formatHariTanggalIndonesia(p.tanggalBerangkat)} s.d. ${formatHariTanggalIndonesia(p.tanggalKembali)}`}
                        </div>
                        <div>Tempat Tujuan : {p.tempatTujuan || '-'}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-3 text-justify">
                Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan melaporkan hasilnya setelah selesai melaksanakan tugas.
              </p>

              <TandaTanganBlock
                settings={settings}
                tanggalSurat={tanggalSurat}
                nomorSurat={nomorSurat}
                perihal={perihal}
                modeTtd={modeTtd}
              />

              {renderTteFooter()}
            </div>
          )}

          {/* LEMBAR 2: SPPD HALAMAN DEPAN */}
          {showSppd1 && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-bookman text-[10pt] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="bookman" />

              <div className="flex justify-end text-[9.5pt] mb-2">
                <table className="border-collapse">
                  <tbody>
                    <tr>
                      <td className="pr-3">Lembar ke</td>
                      <td className="pr-2">:</td>
                      <td>I (Pertama)</td>
                    </tr>
                    <tr>
                      <td className="pr-3">Kode No.</td>
                      <td className="pr-2">:</td>
                      <td>{p.bebanAkun || '000.1.2.3'}</td>
                    </tr>
                    <tr>
                      <td className="pr-3">Nomor</td>
                      <td className="pr-2">:</td>
                      <td>{p.nomorSppd || nomorSurat}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center font-bold text-[11.5pt] underline underline-offset-4 mb-3">
                SURAT PERJALANAN DINAS (SPPD)
              </div>

              <table className="w-full border-collapse border border-black text-[9.8pt]">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 w-[28px] text-center align-top">1.</td>
                    <td className="border border-black p-1.5 w-[44%] align-top">
                      Pejabat Pembuat Komitmen / Kuasa Pengguna Anggaran
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      Kepala {settings.namaSekolah}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">2.</td>
                    <td className="border border-black p-1.5 align-top">
                      Nama / NIP Pegawai yang melaksanakan perjalanan dinas
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      <div className="font-semibold">{primaryPerson.nama}</div>
                      <div>NIP. {primaryPerson.nip || '-'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">3.</td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. Pangkat dan Golongan</div>
                      <div>b. Jabatan / Instansi</div>
                      <div>c. Tingkat Biaya Perjalanan Dinas</div>
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. {primaryPerson.pangkatGolongan || '-'}</div>
                      <div>b. {primaryPerson.jabatan || '-'} / {settings.namaSekolah}</div>
                      <div>c. {p.tingkatBiaya || 'Tingkat C'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">4.</td>
                    <td className="border border-black p-1.5 align-top">Maksud Perjalanan Dinas</td>
                    <td className="border border-black p-1.5 align-top">{p.uraianTugas || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">5.</td>
                    <td className="border border-black p-1.5 align-top">Alat angkut yang dipergunakan</td>
                    <td className="border border-black p-1.5 align-top">{p.alatAngkut || 'Kendaraan Dinas / Umum'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">6.</td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. Tempat berangkat</div>
                      <div>b. Tempat tujuan</div>
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. {p.tempatBerangkat || settings.kota}</div>
                      <div>b. {p.tempatTujuan || '-'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">7.</td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. Lamanya Perjalanan Dinas</div>
                      <div>b. Tanggal berangkat</div>
                      <div>c. Tanggal harus kembali / tiba di tempat baru</div>
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      <div>a. {angkaKeTerbilangHari(lamaHari)}</div>
                      <div>b. {formatTanggalIndonesia(p.tanggalBerangkat)}</div>
                      <div>c. {formatTanggalIndonesia(p.tanggalKembali)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">8.</td>
                    <td className="border border-black p-1.5 align-top">Pengikut : Nama</td>
                    <td className="border border-black p-1.5 align-top">
                      {petugas.length > 1
                        ? petugas
                            .slice(1)
                            .map((o, i) => `${i + 1}. ${o.nama} (${o.nip || '-'})`)
                            .join('; ')
                        : p.pengikut || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">9.</td>
                    <td className="border border-black p-1.5 align-top">
                      <div>Pembebanan Anggaran</div>
                      <div>a. Instansi</div>
                      <div>b. Akun / Kode Rekening</div>
                    </td>
                    <td className="border border-black p-1.5 align-top">
                      <div>&nbsp;</div>
                      <div>a. {p.bebanInstansi || settings.namaSekolah}</div>
                      <div>b. {p.bebanAkun || 'Dana BOS / APBD'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-center align-top">10.</td>
                    <td className="border border-black p-1.5 align-top">Keterangan lain-lain</td>
                    <td className="border border-black p-1.5 align-top">
                      {p.keteranganLain || `Sesuai Surat Tugas Nomor: ${nomorSurat}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <div className="w-[270px] text-[10pt]">
                  <div>Dikeluarkan di : {settings.kota}</div>
                  <div>Tanggal : {formatTanggalIndonesia(tanggalSurat)}</div>
                  <TandaTanganBlock
                    settings={settings}
                    tanggalSurat={tanggalSurat}
                    nomorSurat={p.nomorSppd || nomorSurat}
                    perihal={`SPPD: ${perihal}`}
                    modeTtd={modeTtd}
                    jabatanPenandatangan="Pejabat Pembuat Komitmen / Kepala Sekolah,"
                    showTempatTanggal={false}
                  />
                </div>
              </div>

              {renderTteFooter()}
            </div>
          )}

          {/* LEMBAR 3: SPPD HALAMAN BELAKANG */}
          {showSppd2 && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-bookman text-[9pt] flex flex-col border border-slate-200 shadow-sm`}>
              <table className="w-full border-collapse border border-black">
                <tbody>
                  {/* I */}
                  <tr>
                    <td className="border border-black p-1.5 w-1/2 align-top" />
                    <td className="border border-black p-1.5 w-1/2 align-top leading-snug">
                      <div>I. Berangkat dari : {p.tempatBerangkat || settings.kota}</div>
                      <div className="pl-3">(Tempat Kedudukan)</div>
                      <div className="pl-3">Ke : {p.tempatTujuan || '-'}</div>
                      <div className="pl-3">Pada Tanggal : {formatTanggalIndonesia(p.tanggalBerangkat)}</div>
                      <div className="mt-1.5 pl-3">Kepala {settings.namaSekolah},</div>
                      <div className="h-[38px]" />
                      <div className="pl-3 font-bold underline">{settings.kepalaSekolahNama}</div>
                      <div className="pl-3">NIP. {settings.kepalaSekolahNip || '-'}</div>
                    </td>
                  </tr>

                  {/* II */}
                  <tr>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>II. Tiba di : {p.tempatTujuan || '-'}</div>
                      <div className="pl-4">Pada Tanggal : {formatTanggalIndonesia(p.tanggalBerangkat)}</div>
                      <div className="pl-4 mt-1">
                        {p.pejabatTujuanJabatan || 'Kepala Instansi Tujuan,'}
                      </div>
                      <div className="h-[38px]" />
                      <div className="pl-4 font-bold underline">
                        {p.pejabatTujuanNama || '( ........................................ )'}
                      </div>
                      <div className="pl-4">NIP. {p.pejabatTujuanNip || '..............................'}</div>
                    </td>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>Berangkat dari : {p.tempatTujuan || '-'}</div>
                      <div>Ke : {p.tempatBerangkat || settings.kota}</div>
                      <div>Pada Tanggal : {formatTanggalIndonesia(p.tanggalKembali)}</div>
                      <div className="mt-1">
                        {p.pejabatTujuanJabatan || 'Kepala Instansi Tujuan,'}
                      </div>
                      <div className="h-[38px]" />
                      <div className="font-bold underline">
                        {p.pejabatTujuanNama || '( ........................................ )'}
                      </div>
                      <div>NIP. {p.pejabatTujuanNip || '..............................'}</div>
                    </td>
                  </tr>

                  {/* III */}
                  <tr>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>III. Tiba di :</div>
                      <div className="pl-5">Pada Tanggal :</div>
                      <div className="pl-5 mt-1">Kepala,</div>
                      <div className="h-[36px]" />
                      <div className="pl-5">( ........................................ )</div>
                      <div className="pl-5">NIP.</div>
                    </td>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>Berangkat dari :</div>
                      <div>Ke :</div>
                      <div>Pada Tanggal :</div>
                      <div className="mt-1">Kepala,</div>
                      <div className="h-[36px]" />
                      <div>( ........................................ )</div>
                      <div>NIP.</div>
                    </td>
                  </tr>

                  {/* IV */}
                  <tr>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>IV. Tiba di :</div>
                      <div className="pl-5">Pada Tanggal :</div>
                      <div className="pl-5 mt-1">Kepala,</div>
                      <div className="h-[36px]" />
                      <div className="pl-5">( ........................................ )</div>
                      <div className="pl-5">NIP.</div>
                    </td>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>Berangkat dari :</div>
                      <div>Ke :</div>
                      <div>Pada Tanggal :</div>
                      <div className="mt-1">Kepala,</div>
                      <div className="h-[36px]" />
                      <div>( ........................................ )</div>
                      <div>NIP.</div>
                    </td>
                  </tr>

                  {/* V */}
                  <tr>
                    <td className="border border-black p-1.5 align-top leading-snug">
                      <div>V. Tiba di : {p.tempatBerangkat || settings.kota}</div>
                      <div className="pl-4">(Tempat Kedudukan)</div>
                      <div className="pl-4">Pada Tanggal : {formatTanggalIndonesia(p.tanggalKembali)}</div>
                      <div className="mt-1.5 pl-4">Kepala {settings.namaSekolah},</div>
                      <div className="h-[36px]" />
                      <div className="pl-4 font-bold underline">{settings.kepalaSekolahNama}</div>
                      <div className="pl-4">NIP. {settings.kepalaSekolahNip || '-'}</div>
                    </td>
                    <td className="border border-black p-1.5 align-top leading-snug text-justify">
                      Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
                      <div className="mt-2">Pejabat Pembuat Komitmen / Kepala Sekolah,</div>
                      <div className="h-[34px]" />
                      <div className="font-bold underline">{settings.kepalaSekolahNama}</div>
                      <div>NIP. {settings.kepalaSekolahNip || '-'}</div>
                    </td>
                  </tr>

                  {/* VI */}
                  <tr>
                    <td colSpan={2} className="border border-black p-1.5 align-top">
                      VI. Catatan Lain-Lain :
                    </td>
                  </tr>

                  {/* VII */}
                  <tr>
                    <td colSpan={2} className="border border-black p-1.5 align-top text-justify leading-snug">
                      <div className="font-bold">VII. PERHATIAN :</div>
                      PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.
                    </td>
                  </tr>
                </tbody>
              </table>

              {renderTteFooter()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. SURAT KETERANGAN PEGAWAI & SISWA
  if (kategori === 'surat_keterangan') {
    const p = payload as unknown as SuratKeteranganPayload;
    const isPegawai = p.jenisSubjek === 'pegawai';

    return (
      <div className="print-only-root">
        <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
          <KopSurat settings={settings} fontVariant="arial" />

          <div className="text-center mt-2 mb-5">
            <div className="text-[12.5pt] font-bold tracking-[0.05em] underline underline-offset-4">
              SURAT KETERANGAN
            </div>
            <div className="text-[11pt] mt-1">NOMOR : {nomorSurat}</div>
          </div>

          <p className="mb-3 text-justify">
            Yang bertanda tangan di bawah ini, Kepala {settings.namaSekolah} {settings.dinasPendidikan} {settings.pemerintahDaerah}, menerangkan dengan sesungguhnya bahwa:
          </p>

          <table className="w-full text-[11pt] border-collapse ml-4 mb-4">
            <tbody>
              <tr>
                <td className="w-[180px] py-1 align-top">Nama Lengkap</td>
                <td className="w-[16px] py-1 align-top">:</td>
                <td className="py-1 font-semibold">{p.namaSubjek || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 align-top">{isPegawai ? 'NIP / NUPTK' : 'NIS / NISN'}</td>
                <td className="py-1 align-top">:</td>
                <td className="py-1">{p.identitasNomor || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 align-top">
                  {isPegawai ? 'Pangkat / Golongan' : 'Tempat, Tanggal Lahir'}
                </td>
                <td className="py-1 align-top">:</td>
                <td className="py-1">{p.pangkatAtauTtl || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 align-top">{isPegawai ? 'Jabatan' : 'Kelas / Rombel'}</td>
                <td className="py-1 align-top">:</td>
                <td className="py-1">{p.jabatanAtauKelas || '-'}</td>
              </tr>
              {!isPegawai && (
                <tr>
                  <td className="py-1 align-top">Nama Orang Tua / Wali</td>
                  <td className="py-1 align-top">:</td>
                  <td className="py-1">{p.namaOrangTua || '-'}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 align-top">Alamat</td>
                <td className="py-1 align-top">:</td>
                <td className="py-1">{p.alamat || '-'}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-3 text-justify leading-relaxed whitespace-pre-line">
            {p.isiKeterangan}
          </p>

          {p.keperluan && (
            <p className="mb-3 text-justify leading-relaxed">
              Surat keterangan ini diberikan untuk keperluan: <span className="font-semibold">{p.keperluan}</span>.
            </p>
          )}

          <p className="mb-4 text-justify leading-relaxed">
            Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.
          </p>

          <TandaTanganBlock
            settings={settings}
            tanggalSurat={tanggalSurat}
            nomorSurat={nomorSurat}
            perihal={perihal}
            modeTtd={modeTtd}
          />

          {renderTteFooter()}
        </div>
      </div>
    );
  }

  // 3. SURAT MUTASI MASUK & KELUAR + SURAT PERMOHONAN ORANG TUA
  if (kategori === 'surat_mutasi') {
    const p = payload as unknown as SuratMutasiPayload;
    const isKeluar = p.jenisMutasi === 'keluar';

    const showMutasi = forceShowAllSheets || activeSheet === 'all' || activeSheet === '1';
    const showPermohonan =
      p.sertakanPermohonanOrtu && (forceShowAllSheets || activeSheet === 'all' || activeSheet === '2');

    return (
      <div className="space-y-4">
        {p.sertakanPermohonanOrtu && !forceShowAllSheets && (
          <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {[
              { id: 'all', label: 'Semua Lembar (2 Hal)' },
              { id: '1', label: isKeluar ? '1. Surat Mutasi Keluar' : '1. Surat Mutasi Masuk' },
              { id: '2', label: '2. Permohonan Orang Tua' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id as 'all' | '1' | '2')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSheet === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="print-only-root space-y-6">
          {showMutasi && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="arial" />

              <div className="text-center mt-2 mb-5">
                <div className="text-[12pt] font-bold tracking-[0.04em] underline underline-offset-4">
                  {isKeluar
                    ? 'SURAT KETERANGAN PINDAH SEKOLAH'
                    : 'SURAT KETERANGAN MENERIMA PINDAH SEKOLAH'}
                </div>
                <div className="text-[11pt] mt-1">NOMOR : {nomorSurat}</div>
              </div>

              <p className="mb-3 text-justify">
                Yang bertanda tangan di bawah ini, Kepala {settings.namaSekolah} {settings.kota}, menerangkan bahwa:
              </p>

              <table className="w-full text-[11pt] border-collapse ml-4 mb-4">
                <tbody>
                  <tr>
                    <td className="w-[195px] py-1 align-top">Nama Peserta Didik</td>
                    <td className="w-[16px] py-1 align-top">:</td>
                    <td className="py-1 font-semibold">{p.namaSiswa || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Tempat, Tanggal Lahir</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.tempatTanggalLahir || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Jenis Kelamin</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.jenisKelamin}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">NIS / NISN</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">
                      {p.nis || '-'} / {p.nisn || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Kelas</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.kelasSaatIni || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Nama Orang Tua / Wali</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.namaOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Pekerjaan Orang Tua / Wali</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.pekerjaanOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Alamat</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.alamatOrangTua || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {isKeluar ? (
                <div className="space-y-3 text-justify">
                  <p>
                    Sesuai dengan permohonan orang tua/wali peserta didik tertanggal{' '}
                    {formatTanggalIndonesia(p.tanggalPermohonanOrtu || tanggalSurat)}, peserta didik tersebut di atas terhitung mulai tanggal{' '}
                    <span className="font-semibold">{formatTanggalIndonesia(p.tanggalEfektif || tanggalSurat)}</span>{' '}
                    dinyatakan pindah dari {settings.namaSekolah} ke:
                  </p>
                  <div className="ml-6">
                    <div>
                      Sekolah Tujuan : <span className="font-semibold">{p.sekolahAsalAtauTujuan || '-'}</span>
                    </div>
                    <div>Kabupaten / Kota : {p.kotaSekolahAsalAtauTujuan || '-'}</div>
                    <div>Alasan Pindah : {p.alasanPindah || '-'}</div>
                  </div>
                  <p>
                    Bersama ini turut disertakan buku laporan hasil belajar (rapor) serta proses pemindahan data peserta didik pada sistem Dapodik sekolah.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-justify">
                  <p>
                    Berdasarkan permohonan orang tua/wali peserta didik dan mempertimbangkan ketersediaan daya tampung rombongan belajar pada kelas{' '}
                    <span className="font-semibold">{p.kelasSaatIni}</span>, dengan ini {settings.namaSekolah} menyatakan{' '}
                    <span className="font-semibold">BERSEDIA MENERIMA</span> perpindahan (mutasi masuk) peserta didik tersebut dari sekolah asal:
                  </p>
                  <div className="ml-6">
                    <div>
                      Sekolah Asal : <span className="font-semibold">{p.sekolahAsalAtauTujuan || '-'}</span>
                    </div>
                    <div>Kabupaten / Kota : {p.kotaSekolahAsalAtauTujuan || '-'}</div>
                    <div>Alasan Pindah : {p.alasanPindah || '-'}</div>
                    <div>Terhitung Efektif : {formatTanggalIndonesia(p.tanggalEfektif || tanggalSurat)}</div>
                  </div>
                  <p>
                    Surat keterangan ini berlaku sebagai rekomendasi penerimaan dengan ketentuan melengkapi Surat Keterangan Pindah dari sekolah asal, rapor asli, dan dokumen mutasi Dapodik.
                  </p>
                </div>
              )}

              <p className="mt-3 text-justify">
                Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
              </p>

              <TandaTanganBlock
                settings={settings}
                tanggalSurat={tanggalSurat}
                nomorSurat={nomorSurat}
                perihal={perihal}
                modeTtd={modeTtd}
              />

              {renderTteFooter()}
            </div>
          )}

          {/* LEMBAR 2: SURAT PERMOHONAN DARI ORANG TUA */}
          {showPermohonan && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
              <div className="text-right mb-6">
                {settings.kota}, {formatTanggalIndonesia(p.tanggalPermohonanOrtu || tanggalSurat)}
              </div>

              <table className="w-full text-[11pt] border-collapse mb-4">
                <tbody>
                  <tr>
                    <td className="w-[80px] align-top">Perihal</td>
                    <td className="w-[14px] align-top">:</td>
                    <td className="font-semibold">
                      {isKeluar
                        ? 'Permohonan Pindah Sekolah (Mutasi Keluar)'
                        : 'Permohonan Pindah Sekolah (Mutasi Masuk)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="align-top">Lampiran</td>
                    <td className="align-top">:</td>
                    <td>1 (satu) berkas</td>
                  </tr>
                </tbody>
              </table>

              <div className="mb-5">
                <div>Yth. Kepala {settings.namaSekolah}</div>
                <div>di {settings.kota}</div>
              </div>

              <p className="mb-3">Dengan hormat,</p>
              <p className="mb-3 text-justify">
                Yang bertanda tangan di bawah ini, orang tua/wali dari peserta didik:
              </p>

              <table className="w-full text-[11pt] border-collapse ml-4 mb-3">
                <tbody>
                  <tr>
                    <td className="w-[190px] py-0.5 align-top">Nama Orang Tua / Wali</td>
                    <td className="w-[14px] py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{p.namaOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Pekerjaan</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.pekerjaanOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Alamat</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.alamatOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Nomor Telepon / HP</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.teleponOrangTua || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-2 text-justify">
                Dengan ini mengajukan permohonan pindah sekolah bagi anak kami:
              </p>

              <table className="w-full text-[11pt] border-collapse ml-4 mb-4">
                <tbody>
                  <tr>
                    <td className="w-[190px] py-0.5 align-top">Nama Peserta Didik</td>
                    <td className="w-[14px] py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{p.namaSiswa || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">NIS / NISN</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.nis || '-'} / {p.nisn || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Kelas</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.kelasSaatIni || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">
                      {isKeluar ? 'Sekolah Tujuan' : 'Sekolah Asal'}
                    </td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.sekolahAsalAtauTujuan || '-'}{' '}
                      {p.kotaSekolahAsalAtauTujuan ? `(${p.kotaSekolahAsalAtauTujuan})` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Alasan Kepindahan</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.alasanPindah || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-6 text-justify">
                Demikian surat permohonan ini kami sampaikan. Atas perhatian dan persetujuan Bapak/Ibu Kepala Sekolah, kami ucapkan terima kasih.
              </p>

              <div className="flex justify-between items-start mt-4">
                <div className="w-[240px]">
                  <div>Mengetahui / Menyetujui,</div>
                  <div>Kepala {settings.namaSekolah}</div>
                  <div className="h-[72px]" />
                  <div className="font-bold underline">{settings.kepalaSekolahNama}</div>
                  {settings.kepalaSekolahNip && <div>NIP. {settings.kepalaSekolahNip}</div>}
                </div>

                <div className="w-[240px]">
                  <div>Pemohon,</div>
                  <div>Orang Tua / Wali Siswa</div>
                  <div className="h-[72px] flex items-center">
                    {p.pakaiMaterai && (
                      <div className="border border-dashed border-slate-500 px-3 py-1.5 text-[8pt] text-slate-600">
                        Materai Rp10.000
                      </div>
                    )}
                  </div>
                  <div className="font-bold underline">{p.namaOrangTua || '( ............................... )'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3B. SURAT PENERIMAAN MUTASI MASUK SISWA BARU + DAFTAR PERSYARATAN
  if (kategori === 'surat_penerimaan_mutasi') {
    const p = payload as unknown as SuratPenerimaanMutasiPayload;
    const persyaratanList = Array.isArray(p.persyaratanChecklist) ? p.persyaratanChecklist : [];
    const showSurat = forceShowAllSheets || activeSheet === 'all' || activeSheet === '1';
    const showChecklist =
      p.sertakanLembarChecklist &&
      (forceShowAllSheets || activeSheet === 'all' || activeSheet === '2');

    return (
      <div className="space-y-4">
        {p.sertakanLembarChecklist && !forceShowAllSheets && (
          <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {[
              { id: 'all', label: 'Semua Lembar (2 Hal)' },
              { id: '1', label: '1. Surat Penerimaan Mutasi' },
              { id: '2', label: '2. Ceklis Persyaratan Berkas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id as 'all' | '1' | '2')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSheet === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="print-only-root space-y-6">
          {showSurat && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[10pt] leading-[1.35] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="arial" />

              <div className="text-center mt-1 mb-3">
                <div className="text-[11.5pt] font-bold tracking-[0.03em] underline underline-offset-4">
                  SURAT KETERANGAN PENERIMAAN MUTASI MASUK SISWA
                </div>
                <div className="text-[10.5pt] mt-0.5">NOMOR : {nomorSurat}</div>
              </div>

              <p className="mb-2 text-justify">
                Yang bertanda tangan di bawah ini, Kepala {settings.namaSekolah} {settings.kota}, menerangkan bahwa berdasarkan permohonan orang tua/wali serta hasil verifikasi daya tampung rombongan belajar Tahun Pelajaran{' '}
                <span className="font-semibold">{p.tahunPelajaran || '2025/2026'}</span>, pada prinsipnya{' '}
                <span className="font-semibold">BERSEDIA MENERIMA</span> calon peserta didik pindahan (mutasi masuk):
              </p>

              <table className="w-full text-[10pt] border-collapse ml-3 mb-2.5">
                <tbody>
                  <tr>
                    <td className="w-[185px] py-0.5 align-top">Nama Peserta Didik</td>
                    <td className="w-[14px] py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{p.namaSiswa || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Tempat, Tanggal Lahir</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.tempatTanggalLahir || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Jenis Kelamin / Agama</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.jenisKelamin} / {p.agama || 'Islam'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">NIS / NISN</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.nis || '-'} / {p.nisn || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Sekolah Asal</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">
                      {p.asalSekolah || '-'}
                      {p.npsnAsalSekolah ? ` (NPSN: ${p.npsnAsalSekolah})` : ''}
                      {p.kotaAsalSekolah ? `, ${p.kotaAsalSekolah}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Diterima di Kelas</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">
                      {p.kelasDiterima || '-'} (Efektif mulai {formatTanggalIndonesia(p.tanggalEfektifMasuk || tanggalSurat)})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Nama Orang Tua / Wali</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.namaOrangTua || '-'}
                      {p.pekerjaanOrangTua ? ` (${p.pekerjaanOrangTua})` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Alamat &amp; No. Telepon</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">
                      {p.alamatOrangTua || '-'}
                      {p.teleponOrangTua ? ` · Telp/HP: ${p.teleponOrangTua}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              {p.dayaTampungCatatan && (
                <p className="mb-2 text-justify">
                  Keterangan ketersediaan kelas: {p.dayaTampungCatatan}.
                </p>
              )}

              <div className="mb-2.5">
                <div className="font-semibold mb-1">
                  Persyaratan Administrasi yang Wajib Dilengkapi oleh Orang Tua/Wali:
                </div>
                <ol className="list-decimal pl-5 space-y-0.5 text-[9.5pt] text-justify">
                  {persyaratanList.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                  {p.persyaratanTambahan && (
                    <li>{p.persyaratanTambahan}</li>
                  )}
                </ol>
              </div>

              <p className="mb-2 text-justify">
                Seluruh berkas persyaratan asli dan salinannya wajib diserahkan ke bagian Tata Usaha / Panitia Mutasi {settings.namaSekolah} paling lambat tanggal{' '}
                <span className="font-semibold">
                  {formatTanggalIndonesia(p.batasLaporUlang || p.tanggalEfektifMasuk || tanggalSurat)}
                </span>
                . Apabila hingga batas waktu tersebut persyaratan belum dipenuhi, maka surat penerimaan ini dinyatakan batal.
              </p>

              <p className="mb-2 text-justify">
                Demikian surat keterangan penerimaan mutasi masuk ini dibuat agar dapat dipergunakan sebagai dasar penerbitan surat pindah dari sekolah asal serta pengurusan mutasi Dapodik.
              </p>

              <TandaTanganBlock
                settings={settings}
                tanggalSurat={tanggalSurat}
                nomorSurat={nomorSurat}
                perihal={perihal}
                modeTtd={modeTtd}
              />

              {renderTteFooter()}
            </div>
          )}

          {showChecklist && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[10pt] leading-snug flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="arial" />

              <div className="text-center mt-1 mb-3">
                <div className="text-[11.5pt] font-bold underline underline-offset-4">
                  LEMBAR VERIFIKASI PERSYARATAN MUTASI MASUK SISWA BARU
                </div>
                <div className="text-[10pt] mt-0.5">
                  Lampiran Surat Nomor : {nomorSurat} · Tahun Pelajaran {p.tahunPelajaran || '2025/2026'}
                </div>
              </div>

              <table className="w-full text-[9.8pt] border-collapse mb-3">
                <tbody>
                  <tr>
                    <td className="w-[155px] py-0.5">Nama Calon Siswa</td>
                    <td className="w-[12px] py-0.5">:</td>
                    <td className="py-0.5 font-semibold">{p.namaSiswa || '-'}</td>
                    <td className="w-[120px] py-0.5">Diterima di Kelas</td>
                    <td className="w-[12px] py-0.5">:</td>
                    <td className="py-0.5 font-semibold">{p.kelasDiterima || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">NIS / NISN</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{p.nis || '-'} / {p.nisn || '-'}</td>
                    <td className="py-0.5">Batas Lapor Ulang</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{formatTanggalIndonesia(p.batasLaporUlang || tanggalSurat)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Sekolah Asal</td>
                    <td className="py-0.5">:</td>
                    <td colSpan={4} className="py-0.5">
                      {p.asalSekolah || '-'} {p.kotaAsalSekolah ? `(${p.kotaAsalSekolah})` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black text-[9.5pt] mb-4">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-1.5 w-[34px] text-center">No</th>
                    <th className="border border-black p-1.5 text-left">Uraian Berkas Persyaratan</th>
                    <th className="border border-black p-1.5 w-[125px] text-center">Status Berkas</th>
                    <th className="border border-black p-1.5 w-[135px] text-center">Catatan Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {persyaratanList.map((req, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-1.5 text-center align-top">{idx + 1}.</td>
                      <td className="border border-black p-1.5 align-top">{req}</td>
                      <td className="border border-black p-1.5 text-center align-top whitespace-nowrap">
                        [ &nbsp; ] Ada &nbsp; [ &nbsp; ] Belum
                      </td>
                      <td className="border border-black p-1.5 align-top" />
                    </tr>
                  ))}
                  {p.persyaratanTambahan && (
                    <tr>
                      <td className="border border-black p-1.5 text-center align-top">
                        {persyaratanList.length + 1}.
                      </td>
                      <td className="border border-black p-1.5 align-top">{p.persyaratanTambahan}</td>
                      <td className="border border-black p-1.5 text-center align-top whitespace-nowrap">
                        [ &nbsp; ] Ada &nbsp; [ &nbsp; ] Belum
                      </td>
                      <td className="border border-black p-1.5 align-top" />
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="border border-black p-2.5 text-[9.3pt] mb-5">
                <span className="font-semibold">Hasil Verifikasi Akhir:</span>{' '}
                [ &nbsp; ] Diterima Penuh (Berkas Lengkap &amp; Siap Tarik Dapodik) &nbsp;&nbsp;
                [ &nbsp; ] Diterima Bersyarat (Melengkapi kekurangan berkas s.d. tanggal {formatTanggalIndonesia(p.batasLaporUlang || tanggalSurat)})
              </div>

              <div className="flex justify-between items-start mt-2 text-[10pt]">
                <div className="w-[240px]">
                  <div>Orang Tua / Wali Penyerah Berkas,</div>
                  <div className="h-[64px]" />
                  <div className="font-bold underline">{p.namaOrangTua || '( ............................... )'}</div>
                  {p.teleponOrangTua && <div>HP: {p.teleponOrangTua}</div>}
                </div>

                <div className="w-[260px]">
                  <div>{settings.kota}, {formatTanggalIndonesia(tanggalSurat)}</div>
                  <div>Petugas Verifikator / Tata Usaha,</div>
                  <div className="h-[52px]" />
                  <div className="font-bold underline">( ........................................ )</div>
                  <div>NIP. ...................................</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. SURAT UNDANGAN RAPAT (ORANG TUA & PEGAWAI) — FORMAT PERMENDAGRI 1/2023 (Yth. DI KIRI!)
  if (kategori === 'surat_undangan') {
    const p = payload as unknown as SuratUndanganPayload;
    const showUndangan = forceShowAllSheets || activeSheet === 'all' || activeSheet === '1';
    const showDaftarHadir =
      p.sertakanDaftarHadir && (forceShowAllSheets || activeSheet === 'all' || activeSheet === '2');

    return (
      <div className="space-y-4">
        {p.sertakanDaftarHadir && !forceShowAllSheets && (
          <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {[
              { id: 'all', label: 'Semua Lembar (2 Hal)' },
              { id: '1', label: '1. Surat Undangan' },
              { id: '2', label: '2. Daftar Hadir Rapat' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id as 'all' | '1' | '2')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSheet === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="print-only-root space-y-6">
          {showUndangan && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="arial" />

              {/* Tanggal di Kanan Atas */}
              <div className="text-right mb-3">
                {settings.kota}, {formatTanggalIndonesia(tanggalSurat)}
              </div>

              {/* Nomor, Sifat, Lampiran, Hal di Kiri */}
              <table className="w-full text-[11pt] border-collapse mb-4">
                <tbody>
                  <tr>
                    <td className="w-[88px] py-0.5 align-top">Nomor</td>
                    <td className="w-[14px] py-0.5 align-top">:</td>
                    <td className="py-0.5">{nomorSurat}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Sifat</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.sifat || 'Penting'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Lampiran</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5">{p.lampiran || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Hal</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{perihal}</td>
                  </tr>
                </tbody>
              </table>

              {/* PERMENDAGRI 1/2023: Alamat Tujuan Yth. diletakkan di KIRI sejajar Nomor/Hal */}
              <div className="mb-5 leading-snug">
                <div>Yth. {p.tujuanYth || 'Bapak/Ibu Orang Tua/Wali Peserta Didik'}</div>
                <div>di {p.diTempat || 'Tempat'}</div>
              </div>

              <p className="mb-3 text-justify leading-relaxed">
                {p.kalimatPembuka ||
                  'Dengan hormat, mengharap kehadiran Bapak/Ibu pada acara rapat koordinasi yang akan diselenggarakan pada:'}
              </p>

              <table className="w-full text-[11pt] border-collapse ml-6 mb-4">
                <tbody>
                  <tr>
                    <td className="w-[130px] py-1 align-top">Hari / Tanggal</td>
                    <td className="w-[14px] py-1 align-top">:</td>
                    <td className="py-1 font-semibold">
                      {formatHariTanggalIndonesia(p.hariTanggalAcara)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Waktu</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.waktuAcara || 'Pukul 08.30 WIB s.d. selesai'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Tempat</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1">{p.tempatAcara || `Aula ${settings.namaSekolah}`}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top">Acara</td>
                    <td className="py-1 align-top">:</td>
                    <td className="py-1 whitespace-pre-line">{p.agendaAcara || perihal}</td>
                  </tr>
                  {p.pakaianCatatan && (
                    <tr>
                      <td className="py-1 align-top">Catatan</td>
                      <td className="py-1 align-top">:</td>
                      <td className="py-1">{p.pakaianCatatan}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p className="mb-4 text-justify leading-relaxed">
                Mengingat pentingnya acara tersebut, dimohon kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.
              </p>

              <TandaTanganBlock
                settings={settings}
                tanggalSurat={tanggalSurat}
                nomorSurat={nomorSurat}
                perihal={perihal}
                modeTtd={modeTtd}
                showTempatTanggal={false}
              />

              {renderTteFooter()}
            </div>
          )}

          {showDaftarHadir && (
            <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[10pt] flex flex-col border border-slate-200 shadow-sm`}>
              <KopSurat settings={settings} fontVariant="arial" />
              <div className="text-center font-bold text-[12pt] underline underline-offset-4 mb-3">
                DAFTAR HADIR RAPAT
              </div>
              <table className="w-full text-[10pt] mb-3">
                <tbody>
                  <tr>
                    <td className="w-[120px]">Acara</td>
                    <td className="w-[12px]">:</td>
                    <td className="font-semibold">{p.agendaAcara || perihal}</td>
                  </tr>
                  <tr>
                    <td>Hari / Tanggal</td>
                    <td>:</td>
                    <td>{formatHariTanggalIndonesia(p.hariTanggalAcara)}</td>
                  </tr>
                  <tr>
                    <td>Tempat</td>
                    <td>:</td>
                    <td>{p.tempatAcara || `Aula ${settings.namaSekolah}`}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-1.5 w-[36px] text-center">No</th>
                    <th className="border border-black p-1.5 text-left">Nama Lengkap</th>
                    <th className="border border-black p-1.5 w-[180px] text-left">
                      {p.jenisUndangan === 'rapat_pegawai' ? 'Jabatan / Unit' : 'Orang Tua dari / Kelas'}
                    </th>
                    <th className="border border-black p-1.5 w-[150px] text-center">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 15 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-1.5 text-center">{idx + 1}.</td>
                      <td className="border border-black p-1.5" />
                      <td className="border border-black p-1.5" />
                      <td className="border border-black p-1.5 text-[8.5pt] text-slate-500">
                        {idx % 2 === 0 ? `${idx + 1}.` : `          ${idx + 1}.`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. SURAT PANGGILAN ORANG TUA (FORMAT PERMENDAGRI 1/2023)
  const p = payload as unknown as SuratPanggilanPayload;
  return (
    <div className="print-only-root">
      <div className={`a4-page ${pageStyleClasses} font-kemendagri-arial text-[11pt] flex flex-col border border-slate-200 shadow-sm`}>
        <KopSurat settings={settings} fontVariant="arial" />

        <div className="text-right mb-3">
          {settings.kota}, {formatTanggalIndonesia(tanggalSurat)}
        </div>

        <table className="w-full text-[11pt] border-collapse mb-4">
          <tbody>
            <tr>
              <td className="w-[88px] py-0.5 align-top">Nomor</td>
              <td className="w-[14px] py-0.5 align-top">:</td>
              <td className="py-0.5">{nomorSurat}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">Sifat</td>
              <td className="py-0.5 align-top">:</td>
              <td className="py-0.5 font-semibold">{p.sifat || 'Penting'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">Lampiran</td>
              <td className="py-0.5 align-top">:</td>
              <td className="py-0.5">{p.lampiran || '-'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">Hal</td>
              <td className="py-0.5 align-top">:</td>
              <td className="py-0.5 font-semibold">{perihal}</td>
            </tr>
          </tbody>
        </table>

        {/* Tujuan Yth. di sisi kiri */}
        <div className="mb-5 leading-snug">
          <div>Yth. Bapak/Ibu {p.namaOrangTua || 'Orang Tua/Wali Peserta Didik'}</div>
          <div>Orang Tua/Wali dari <span className="font-semibold">{p.namaSiswa || '-'}</span> (Kelas {p.kelas || '-'})</div>
          <div>di {p.alamatOrangTua || 'Tempat'}</div>
        </div>

        <p className="mb-3 text-justify leading-relaxed">
          Dengan hormat, sehubungan dengan perlu adanya komunikasi dan pembinaan terkait peserta didik kami:
        </p>

        <table className="w-full text-[11pt] border-collapse ml-6 mb-3">
          <tbody>
            <tr>
              <td className="w-[140px] py-0.5 align-top">Nama Siswa</td>
              <td className="w-[14px] py-0.5 align-top">:</td>
              <td className="py-0.5 font-semibold">{p.namaSiswa || '-'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">NISN</td>
              <td className="py-0.5 align-top">:</td>
              <td className="py-0.5">{p.nisn || '-'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">Kelas</td>
              <td className="py-0.5 align-top">:</td>
              <td className="py-0.5">{p.kelas || '-'}</td>
            </tr>
          </tbody>
        </table>

        <p className="mb-3 text-justify leading-relaxed whitespace-pre-line">
          {p.alasanPanggilan ||
            'Kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali peserta didik di sekolah guna berkonsultasi mengenai perkembangan belajar dan tata tertib sekolah pada:'}
        </p>

        <table className="w-full text-[11pt] border-collapse ml-6 mb-4">
          <tbody>
            <tr>
              <td className="w-[140px] py-1 align-top">Hari / Tanggal</td>
              <td className="w-[14px] py-1 align-top">:</td>
              <td className="py-1 font-semibold">{formatHariTanggalIndonesia(p.hariTanggalHadir)}</td>
            </tr>
            <tr>
              <td className="py-1 align-top">Waktu</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1">{p.waktuHadir || 'Pukul 09.00 WIB'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top">Tempat</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1">{p.tempatHadir || `Ruang Bimbingan Konseling ${settings.namaSekolah}`}</td>
            </tr>
            <tr>
              <td className="py-1 align-top">Menghadap</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1">{p.menghadapKe || 'Guru BK / Wali Kelas'}</td>
            </tr>
          </tbody>
        </table>

        {p.catatanTambahan && (
          <p className="mb-3 text-justify text-[10.5pt] italic">{p.catatanTambahan}</p>
        )}

        <p className="mb-4 text-justify leading-relaxed">
          Mengingat pentingnya hal tersebut demi kebaikan dan kelancaran pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
        </p>

        <TandaTanganBlock
          settings={settings}
          tanggalSurat={tanggalSurat}
          nomorSurat={nomorSurat}
          perihal={perihal}
          modeTtd={modeTtd}
          showTempatTanggal={false}
        />

        {renderTteFooter()}
      </div>
    </div>
  );
};
