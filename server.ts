import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`esurat-kemendagri-${process.env.APP_URL || 'local'}-${ADMIN_USERNAME}`)
    .digest('hex');

const COOKIE_NAME = 'esurat_session';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'workspace.json');

interface WorkspaceStore {
  settings: Record<string, unknown>;
  employees: Record<string, unknown>[];
  students: Record<string, unknown>[];
  letters: Record<string, unknown>[];
}

function getDefaultSettings(): Record<string, unknown> {
  return {
    ownerId: 'admin',
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

function ensureStore(): WorkspaceStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: WorkspaceStore = {
      settings: getDefaultSettings(),
      employees: [],
      students: [],
      letters: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<WorkspaceStore>;
    return {
      settings: parsed.settings || getDefaultSettings(),
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      students: Array.isArray(parsed.students) ? parsed.students : [],
      letters: Array.isArray(parsed.letters) ? parsed.letters : [],
    };
  } catch {
    return {
      settings: getDefaultSettings(),
      employees: [],
      students: [],
      letters: [],
    };
  }
}

function saveStore(store: WorkspaceStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function signSessionToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): { sub: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!decoded.sub || !decoded.exp || decoded.exp < Date.now()) {
      return null;
    }
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      result[k] = decodeURIComponent(v);
    }
  }
  return result;
}

function extractAdminToken(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer admin-session:')) {
    return authHeader.slice('Bearer admin-session:'.length).trim();
  }
  return undefined;
}

async function verifyFirebaseIdTokenIfPresent(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer firebase:')) return false;
  const idToken = authHeader.slice('Bearer firebase:'.length).trim();
  if (!idToken) return false;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return false;
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { apiKey?: string };
    if (!cfg.apiKey) return false;

    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    return resp.ok;
  } catch {
    return false;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(extractAdminToken(req));
  if (!session) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir. Silakan login kembali.' });
    return;
  }
  next();
}

async function requireAnyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminSession = verifySessionToken(extractAdminToken(req));
  if (adminSession) {
    next();
    return;
  }
  const hasFirebase = await verifyFirebaseIdTokenIfPresent(req);
  if (hasFirebase) {
    next();
    return;
  }
  res.status(401).json({ error: 'Silakan login terlebih dahulu untuk menggunakan fitur asisten AI.' });
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi. Silakan periksa panel Settings > Secrets di AI Studio.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // --- Auth Endpoints (user: admin / password: admin123) ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    const token = signSessionToken(username);
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: Boolean(isHttps),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ authenticated: true, username, token });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const session = verifySessionToken(extractAdminToken(req));
    if (!session) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, username: session.sub });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: Boolean(isHttps),
      path: '/',
    });
    res.json({ ok: true });
  });

  // --- Workspace Data Endpoints (for Admin session) ---
  app.get('/api/workspace', requireAdminAuth, (_req: Request, res: Response) => {
    const store = ensureStore();
    res.json(store);
  });

  app.put('/api/workspace/settings', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    store.settings = {
      ...store.settings,
      ...(req.body || {}),
      ownerId: 'admin',
      updatedAtMs: Date.now(),
    };
    saveStore(store);
    res.json({ settings: store.settings });
  });

  app.post('/api/workspace/employees', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const id = `emp_${crypto.randomUUID().slice(0, 12)}`;
    const record = {
      ...(req.body || {}),
      id,
      ownerId: 'admin',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    store.employees.push(record);
    saveStore(store);
    res.json({ item: record });
  });

  app.post('/api/workspace/employees/batch', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const created = items.slice(0, 400).map((item: Record<string, unknown>) => ({
      ...item,
      id: `emp_${crypto.randomUUID().slice(0, 12)}`,
      ownerId: 'admin',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    }));
    store.employees.push(...created);
    saveStore(store);
    res.json({ count: created.length });
  });

  app.put('/api/workspace/employees/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const idx = store.employees.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data pegawai tidak ditemukan.' });
      return;
    }
    store.employees[idx] = {
      ...store.employees[idx],
      ...(req.body || {}),
      id: req.params.id,
      ownerId: 'admin',
      updatedAtMs: Date.now(),
    };
    saveStore(store);
    res.json({ item: store.employees[idx] });
  });

  app.delete('/api/workspace/employees/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    store.employees = store.employees.filter((e) => e.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  });

  app.post('/api/workspace/students', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const id = `stu_${crypto.randomUUID().slice(0, 12)}`;
    const record = {
      ...(req.body || {}),
      id,
      ownerId: 'admin',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    store.students.push(record);
    saveStore(store);
    res.json({ item: record });
  });

  app.post('/api/workspace/students/batch', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const created = items.slice(0, 400).map((item: Record<string, unknown>) => ({
      ...item,
      id: `stu_${crypto.randomUUID().slice(0, 12)}`,
      ownerId: 'admin',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    }));
    store.students.push(...created);
    saveStore(store);
    res.json({ count: created.length });
  });

  app.put('/api/workspace/students/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const idx = store.students.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
      return;
    }
    store.students[idx] = {
      ...store.students[idx],
      ...(req.body || {}),
      id: req.params.id,
      ownerId: 'admin',
      updatedAtMs: Date.now(),
    };
    saveStore(store);
    res.json({ item: store.students[idx] });
  });

  app.delete('/api/workspace/students/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    store.students = store.students.filter((s) => s.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  });

  app.post('/api/workspace/letters', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const id = `let_${crypto.randomUUID().slice(0, 12)}`;
    const now = Date.now();
    const record = {
      ...(req.body || {}),
      id,
      ownerId: 'admin',
      createdAtMs: now,
      updatedAtMs: now,
    };
    store.letters.unshift(record);
    saveStore(store);
    res.json({ item: record });
  });

  app.put('/api/workspace/letters/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const idx = store.letters.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Naskah dinas tidak ditemukan.' });
      return;
    }
    if (store.letters[idx].status === 'arsip') {
      res.status(403).json({ error: 'Naskah berstatus Arsip Final terkunci dan tidak dapat diubah.' });
      return;
    }
    store.letters[idx] = {
      ...store.letters[idx],
      ...(req.body || {}),
      id: req.params.id,
      ownerId: 'admin',
      updatedAtMs: Date.now(),
    };
    saveStore(store);
    res.json({ item: store.letters[idx] });
  });

  app.delete('/api/workspace/letters/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const target = store.letters.find((l) => l.id === req.params.id);
    if (target && target.status === 'arsip') {
      res.status(403).json({ error: 'Naskah berstatus Arsip Final tidak dapat dihapus.' });
      return;
    }
    store.letters = store.letters.filter((l) => l.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  });

  // --- Server-side Gemini AI Endpoint (GEMINI_API_KEY) ---
  app.post('/api/gemini/draft-letter', requireAnyAuth, async (req: Request, res: Response) => {
    try {
      const { kategori, instruksi, namaSekolah, kota } = req.body || {};
      if (!instruksi || typeof instruksi !== 'string' || instruksi.trim().length < 4) {
        res.status(400).json({ error: 'Mohon tulis instruksi singkat isi surat minimal 4 karakter.' });
        return;
      }

      const ai = getGeminiClient();
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
                description: 'Kode klasifikasi arsip Kemendagri misal 000.1.2.3, 400.3.5, 400.3.5.1, 400.3.8, 800.1.10',
              },
              dasarPenugasan: { type: Type.STRING, description: 'Untuk surat tugas: kalimat dasar penugasan' },
              uraianTugas: { type: Type.STRING, description: 'Untuk surat tugas/SPPD: uraian maksud tugas' },
              tempatTujuan: { type: Type.STRING, description: 'Untuk surat tugas/SPPD: lokasi tujuan' },
              tanggalBerangkat: { type: Type.STRING, description: 'YYYY-MM-DD jika ada, atau kosong' },
              tanggalKembali: { type: Type.STRING, description: 'YYYY-MM-DD jika ada, atau kosong' },
              isiKeterangan: { type: Type.STRING, description: 'Untuk surat keterangan: paragraf isi keterangan' },
              keperluan: { type: Type.STRING, description: 'Untuk surat keterangan: keperluan surat' },
              alasanPindah: { type: Type.STRING, description: 'Untuk surat mutasi: alasan kepindahan' },
              dayaTampungCatatan: { type: Type.STRING, description: 'Untuk surat penerimaan mutasi masuk: keterangan ketersediaan daya tampung rombel/kelas' },
              persyaratanTambahan: { type: Type.STRING, description: 'Untuk surat penerimaan mutasi masuk: persyaratan tambahan atau instruksi pelaporan berkas' },
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
      res.json({ draft: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi layanan Gemini AI.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'));
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`E-Surat Sekolah server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
