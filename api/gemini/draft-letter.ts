import { GoogleGenAI, Type } from '@google/genai';

interface VercelReq {
  method?: string;
  body?: {
    kategori?: string;
    instruksi?: string;
    namaSekolah?: string;
    kota?: string;
  };
}

interface VercelRes {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metode tidak diizinkan.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi pada Environment Variables Vercel.',
    });
    return;
  }

  const { kategori, instruksi, namaSekolah, kota } = req.body || {};
  if (!instruksi || typeof instruksi !== 'string' || instruksi.trim().length < 4) {
    res.status(400).json({ error: 'Mohon tulis instruksi singkat isi surat minimal 4 karakter.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction =
      'Anda adalah Sekretaris / Kepala Tata Usaha sekolah negeri di Indonesia yang ahli menyusun naskah dinas sesuai Permendagri Nomor 1 Tahun 2023 dan Kode Klasifikasi Arsip Permendagri Nomor 83 Tahun 2022. Gunakan bahasa Indonesia baku, resmi, singkat, jelas, dan santun (EYD V). Selalu keluarkan JSON sesuai skema.';

    const prompt = `
Jenis naskah dinas: ${String(kategori || 'surat_tugas_sppd')}
Nama sekolah: ${String(namaSekolah || 'SMP Negeri 1')}
Kota/Kabupaten: ${String(kota || 'Indonesia')}
Permintaan operator: ${instruksi.trim()}

Hasilkan draf kolom surat resmi dalam Bahasa Indonesia baku sesuai kategori tersebut. Untuk tanggal gunakan format YYYY-MM-DD jika disebutkan, atau biarkan string kosong jika tidak disebutkan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            perihal: { type: Type.STRING, description: 'Perihal surat yang ringkas dan resmi' },
            kodeKlasifikasi: {
              type: Type.STRING,
              description:
                'Kode klasifikasi arsip Kemendagri misal 000.1.2.3, 400.3.5, 400.3.5.1, 400.3.8, 800.1.10',
            },
            dasarPenugasan: { type: Type.STRING, description: 'Untuk surat tugas: kalimat dasar penugasan' },
            uraianTugas: { type: Type.STRING, description: 'Untuk surat tugas/SPPD: uraian maksud tugas' },
            tempatTujuan: { type: Type.STRING, description: 'Untuk surat tugas/SPPD: lokasi tujuan' },
            tanggalBerangkat: { type: Type.STRING, description: 'YYYY-MM-DD jika ada, atau kosong' },
            tanggalKembali: { type: Type.STRING, description: 'YYYY-MM-DD jika ada, atau kosong' },
            isiKeterangan: { type: Type.STRING, description: 'Untuk surat keterangan: paragraf isi keterangan' },
            keperluan: { type: Type.STRING, description: 'Untuk surat keterangan: keperluan surat' },
            alasanPindah: { type: Type.STRING, description: 'Untuk surat mutasi: alasan kepindahan' },
            dayaTampungCatatan: {
              type: Type.STRING,
              description: 'Untuk surat penerimaan mutasi masuk: keterangan ketersediaan daya tampung rombel/kelas',
            },
            persyaratanTambahan: {
              type: Type.STRING,
              description: 'Untuk surat penerimaan mutasi masuk: persyaratan tambahan atau instruksi pelaporan berkas',
            },
            tujuanYth: { type: Type.STRING, description: 'Untuk undangan: pihak yang diundang' },
            kalimatPembuka: { type: Type.STRING, description: 'Untuk undangan: kalimat pembuka resmi' },
            agendaAcara: { type: Type.STRING, description: 'Untuk undangan: daftar acara/agenda' },
            waktuAcara: { type: Type.STRING, description: 'Jam pelaksanaan acara misal Pukul 09.00 WIB s.d. selesai' },
            tempatAcara: { type: Type.STRING, description: 'Ruang/tempat pelaksanaan acara' },
            alasanPanggilan: { type: Type.STRING, description: 'Untuk surat panggilan ortu: uraian alasan panggilan' },
            menghadapKe: { type: Type.STRING, description: 'Untuk surat panggilan ortu: pejabat/guru yang ditemui' },
          },
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.status(200).json({ draft: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menghubungi layanan Gemini AI.';
    res.status(500).json({ error: msg });
  }
}
