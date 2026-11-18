import React, { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Save, Trash2, Upload } from 'lucide-react';
import { AuthMode, saveSchoolSettings } from '../services/dataService';
import { PolaPenomoran, SchoolSettings } from '../types/surat';
import { compressLogoFile } from '../utils/kemendagriFormat';
import { KopSurat } from './print/KopSurat';

interface SettingsAndLogoProps {
  authMode: AuthMode;
  userId: string;
  settings: SchoolSettings;
  hasExistingSettings: boolean;
  onSaved?: () => void;
}

export const SettingsAndLogo: React.FC<SettingsAndLogoProps> = ({
  authMode,
  userId,
  settings,
  hasExistingSettings,
  onSaved,
}) => {
  const [form, setForm] = useState<SchoolSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const logoDaerahInputRef = useRef<HTMLInputElement>(null);
  const logoSekolahInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logoDaerahDataUrl' | 'logoSekolahDataUrl'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    try {
      const dataUrl = await compressLogoFile(file);
      setForm((prev) => ({
        ...prev,
        [target]: dataUrl,
        ...(target === 'logoSekolahDataUrl' ? { tampilkanLogoKanan: true } : {}),
      }));
      setNotice('Logo berhasil dimuat ke pratinjau. Klik Simpan Pengaturan untuk menyimpan permanen.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses logo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setErrorMsg(null);

    try {
      const mutableFields = {
        pemerintahDaerah: form.pemerintahDaerah.trim().slice(0, 150),
        dinasPendidikan: form.dinasPendidikan.trim().slice(0, 150),
        namaSekolah: form.namaSekolah.trim().slice(0, 150),
        npsn: (form.npsn || '').trim().slice(0, 20),
        alamat: form.alamat.trim().slice(0, 250),
        kota: form.kota.trim().slice(0, 100),
        kodePos: (form.kodePos || '').trim().slice(0, 15),
        telepon: (form.telepon || '').trim().slice(0, 40),
        email: (form.email || '').trim().slice(0, 120),
        website: (form.website || '').trim().slice(0, 120),
        kodeUnitSurat: form.kodeUnitSurat.trim().slice(0, 60),
        kepalaSekolahNama: form.kepalaSekolahNama.trim().slice(0, 120),
        kepalaSekolahNip: (form.kepalaSekolahNip || '').trim().slice(0, 40),
        kepalaSekolahPangkat: (form.kepalaSekolahPangkat || '').trim().slice(0, 80),
        logoDaerahDataUrl: form.logoDaerahDataUrl || '',
        logoSekolahDataUrl: form.logoSekolahDataUrl || '',
        tampilkanLogoKanan: Boolean(form.tampilkanLogoKanan),
        polaPenomoran: form.polaPenomoran,
      };

      await saveSchoolSettings(authMode, userId, hasExistingSettings, mutableFields);
      setNotice('Profil instansi dan logo kop surat berhasil disimpan.');
      onSaved?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {notice && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Live Preview Kop Surat */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Pratinjau Kop Naskah Dinas (Standar Permendagri No. 1 Tahun 2023)
            </h2>
            <p className="text-xs text-slate-500">
              Tampilan kop surat ini akan diterapkan otomatis pada seluruh surat tugas, SPPD, keterangan, mutasi, undangan, dan panggilan.
            </p>
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-6 bg-white overflow-x-auto">
          <div className="min-w-[600px]">
            <KopSurat settings={form} />
          </div>
        </div>
      </div>

      {/* Form Upload Logo & Identitas */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Menu Upload Logo */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
            Upload Logo Instansi &amp; Sekolah
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Pemda (Kiri) */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Logo Pemerintah Daerah (Kiri)
                  </div>
                  <div className="text-xs text-slate-500">
                    Lambang Kabupaten/Kota/Provinsi sesuai Permendagri 1/2023. Format PNG/JPG/SVG.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logoDaerahDataUrl ? (
                    <img
                      src={form.logoDaerahDataUrl}
                      alt="Logo Daerah"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoDaerahInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleUploadLogo(e, 'logoDaerahDataUrl')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoDaerahInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo Pemda
                  </button>
                  {form.logoDaerahDataUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoDaerahDataUrl: '' })}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Sekolah (Kanan Opsional) */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Logo Sekolah / Tut Wuri (Kanan — Opsional)
                  </div>
                  <div className="text-xs text-slate-500">
                    Aktifkan jika Perbup/Perwali setempat menggunakan dua logo pada kop satuan pendidikan.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logoSekolahDataUrl ? (
                    <img
                      src={form.logoSekolahDataUrl}
                      alt="Logo Sekolah"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoSekolahInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleUploadLogo(e, 'logoSekolahDataUrl')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoSekolahInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo Sekolah
                  </button>
                  {form.logoSekolahDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, logoSekolahDataUrl: '', tampilkanLogoKanan: false })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.tampilkanLogoKanan}
                  onChange={(e) => setForm({ ...form, tampilkanLogoKanan: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-sky-800"
                />
                <span className="text-xs font-medium text-slate-700">
                  Tampilkan logo kanan pada kop surat
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Profil Instansi & Kepala Sekolah */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
            Identitas Instansi, Kepala Sekolah &amp; Penomoran Surat
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pemerintah Daerah (Baris 1 Kop) *
              </label>
              <input
                required
                type="text"
                value={form.pemerintahDaerah}
                onChange={(e) => setForm({ ...form, pemerintahDaerah: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dinas Pendidikan / Induk (Baris 2 Kop) *
              </label>
              <input
                required
                type="text"
                value={form.dinasPendidikan}
                onChange={(e) => setForm({ ...form, dinasPendidikan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Satuan Pendidikan / Sekolah (Baris 3 Kop) *
              </label>
              <input
                required
                type="text"
                value={form.namaSekolah}
                onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NPSN</label>
              <input
                type="text"
                value={form.npsn || ''}
                onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Lengkap Sekolah *
              </label>
              <input
                required
                type="text"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kota / Kabupaten Penetapan Surat *
              </label>
              <input
                required
                type="text"
                value={form.kota}
                onChange={(e) => setForm({ ...form, kota: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kode Pos</label>
              <input
                type="text"
                value={form.kodePos || ''}
                onChange={(e) => setForm({ ...form, kodePos: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
              <input
                type="text"
                value={form.telepon || ''}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pos-el (Email)</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Laman (Website)
              </label>
              <input
                type="text"
                value={form.website || ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kode Unit pada Nomor Surat *
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: SMPN1.PWT"
                value={form.kodeUnitSurat}
                onChange={(e) => setForm({ ...form, kodeUnitSurat: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Format Penomoran Surat (Kemendagri)
              </label>
              <select
                value={form.polaPenomoran}
                onChange={(e) =>
                  setForm({ ...form, polaPenomoran: e.target.value as PolaPenomoran })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="kemendagri_2023">
                  Permendagri 1/2023 (Kode/Urut/Unit/Tahun)
                </option>
                <option value="kemendagri_bulan_romawi">
                  Dengan Bulan Romawi (Kode/Urut/Unit/XI/Tahun)
                </option>
                <option value="kemendagri_bulan_angka">
                  Dengan Bulan Angka (Kode/Urut/Unit/11/Tahun)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Kepala Sekolah *
              </label>
              <input
                required
                type="text"
                value={form.kepalaSekolahNama}
                onChange={(e) => setForm({ ...form, kepalaSekolahNama: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={form.kepalaSekolahNip || ''}
                onChange={(e) => setForm({ ...form, kepalaSekolahNip: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pangkat / Golongan Kepala Sekolah
              </label>
              <input
                type="text"
                value={form.kepalaSekolahPangkat || ''}
                onChange={(e) => setForm({ ...form, kepalaSekolahPangkat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan & Logo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
