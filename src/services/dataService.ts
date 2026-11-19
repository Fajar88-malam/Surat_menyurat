import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Employee,
  LetterCategory,
  LetterRecord,
  SchoolSettings,
  Student,
} from '../types/surat';
import { createDefaultSchoolSettings } from '../utils/kemendagriFormat';

export type AuthMode = 'admin' | 'google';

const SESSION_KEY = 'esurat_admin_token';
const LOCAL_WORKSPACE_KEY = 'esurat_local_workspace_v1';

interface LocalWorkspaceStore {
  settings: SchoolSettings;
  employees: Employee[];
  students: Student[];
  letters: LetterRecord[];
}

function generateLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocalWorkspace(): LocalWorkspaceStore {
  const fallback: LocalWorkspaceStore = {
    settings: createDefaultSchoolSettings('admin'),
    employees: [],
    students: [],
    letters: [],
  };
  try {
    const raw = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceStore>;
    return {
      settings: parsed.settings
        ? { ...fallback.settings, ...parsed.settings, ownerId: 'admin' }
        : fallback.settings,
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      students: Array.isArray(parsed.students) ? parsed.students : [],
      letters: Array.isArray(parsed.letters) ? parsed.letters : [],
    };
  } catch {
    return fallback;
  }
}

function saveLocalWorkspace(store: LocalWorkspaceStore): void {
  try {
    localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(store));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error(
        'Kapasitas penyimpanan browser penuh. Gunakan gambar logo berukuran lebih kecil atau hubungkan Sinkron Cloud Google.'
      );
    }
    throw new Error('Gagal menyimpan data ke penyimpanan browser.');
  }
}

async function tryApiJson<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; serverError?: string }> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: res.status };
    }
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      // 404/405 means static hosting (e.g. Vercel) has no Express workspace backend -> fallback cleanly
      if (res.status === 404 || res.status === 405) {
        return { ok: false, status: res.status };
      }
      return { ok: false, status: res.status, serverError: data.error };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage restriction
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const adminToken = getAdminToken();
  if (adminToken) {
    headers.Authorization = `Bearer admin-session:${adminToken}`;
    return headers;
  }
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers.Authorization = `Bearer firebase:${idToken}`;
    } catch {
      // ignore
    }
  }
  return headers;
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ authenticated: boolean; username: string; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login gagal.');
  }
  setAdminToken(data.token || null);
  return data;
}

export async function checkAdminSession(): Promise<{
  authenticated: boolean;
  username?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function logoutAdmin(): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  setAdminToken(null);
}

export async function fetchAdminWorkspace(): Promise<{
  settings: SchoolSettings;
  employees: Employee[];
  students: Student[];
  letters: LetterRecord[];
}> {
  const headers = await getAuthHeaders();
  const result = await tryApiJson<LocalWorkspaceStore>('/api/workspace', {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (result.ok) {
    const store: LocalWorkspaceStore = {
      settings: result.data.settings || createDefaultSchoolSettings('admin'),
      employees: Array.isArray(result.data.employees) ? result.data.employees : [],
      students: Array.isArray(result.data.students) ? result.data.students : [],
      letters: Array.isArray(result.data.letters) ? result.data.letters : [],
    };
    try {
      saveLocalWorkspace(store);
    } catch {
      // Ignore quota mirror warning on read
    }
    return store;
  }

  return loadLocalWorkspace();
}

export async function saveSchoolSettings(
  mode: AuthMode,
  userId: string,
  hasExistingSettings: boolean,
  mutableFields: Record<string, unknown>
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const apiRes = await tryApiJson<{ settings: SchoolSettings }>('/api/workspace/settings', {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(mutableFields),
    });

    const local = loadLocalWorkspace();
    local.settings = {
      ...local.settings,
      ...(apiRes.ok ? apiRes.data.settings : mutableFields),
      ownerId: 'admin',
    } as SchoolSettings;
    saveLocalWorkspace(local);
    return;
  }

  try {
    const docRef = doc(db, 'schoolSettings', userId);
    if (hasExistingSettings) {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ownerId: userId,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `schoolSettings/${userId}`);
  }
}

export async function saveEmployeeRecord(
  mode: AuthMode,
  userId: string,
  editingId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const url = editingId
      ? `/api/workspace/employees/${encodeURIComponent(editingId)}`
      : '/api/workspace/employees';
    const apiRes = await tryApiJson<{ item: Employee }>(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok && apiRes.serverError && apiRes.status >= 400 && apiRes.status < 500) {
      throw new Error(apiRes.serverError);
    }

    const local = loadLocalWorkspace();
    if (editingId) {
      const idx = local.employees.findIndex((e) => e.id === editingId);
      const updated = (
        apiRes.ok
          ? apiRes.data.item
          : { ...(local.employees[idx] || {}), ...payload, id: editingId, ownerId: 'admin' }
      ) as Employee;
      if (idx >= 0) local.employees[idx] = updated;
      else local.employees.push(updated);
    } else {
      const created = (
        apiRes.ok
          ? apiRes.data.item
          : { ...payload, id: generateLocalId('emp'), ownerId: 'admin' }
      ) as Employee;
      local.employees.push(created);
    }
    saveLocalWorkspace(local);
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'employees', editingId), {
        ...payload,
        ownerId: userId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'employees'), {
        ...payload,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      editingId ? OperationType.UPDATE : OperationType.CREATE,
      'employees'
    );
  }
}

export async function batchInsertEmployees(
  mode: AuthMode,
  userId: string,
  items: Record<string, unknown>[]
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    await tryApiJson<{ count: number }>('/api/workspace/employees/batch', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ items }),
    });

    const local = loadLocalWorkspace();
    const created = items.slice(0, 400).map((item) => ({
      ...item,
      id: generateLocalId('emp'),
      ownerId: 'admin',
    })) as Employee[];
    local.employees.push(...created);
    saveLocalWorkspace(local);
    return;
  }

  try {
    const batch = writeBatch(db);
    for (const item of items.slice(0, 400)) {
      const ref = doc(collection(db, 'employees'));
      batch.set(ref, {
        ...item,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'employees');
  }
}

export async function deleteEmployeeRecord(
  mode: AuthMode,
  id: string
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    await tryApiJson<{ ok: boolean }>(`/api/workspace/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    const local = loadLocalWorkspace();
    local.employees = local.employees.filter((e) => e.id !== id);
    saveLocalWorkspace(local);
    return;
  }

  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
  }
}

export async function saveStudentRecord(
  mode: AuthMode,
  userId: string,
  editingId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const url = editingId
      ? `/api/workspace/students/${encodeURIComponent(editingId)}`
      : '/api/workspace/students';
    const apiRes = await tryApiJson<{ item: Student }>(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok && apiRes.serverError && apiRes.status >= 400 && apiRes.status < 500) {
      throw new Error(apiRes.serverError);
    }

    const local = loadLocalWorkspace();
    if (editingId) {
      const idx = local.students.findIndex((s) => s.id === editingId);
      const updated = (
        apiRes.ok
          ? apiRes.data.item
          : { ...(local.students[idx] || {}), ...payload, id: editingId, ownerId: 'admin' }
      ) as Student;
      if (idx >= 0) local.students[idx] = updated;
      else local.students.push(updated);
    } else {
      const created = (
        apiRes.ok
          ? apiRes.data.item
          : { ...payload, id: generateLocalId('stu'), ownerId: 'admin' }
      ) as Student;
      local.students.push(created);
    }
    saveLocalWorkspace(local);
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'students', editingId), {
        ...payload,
        ownerId: userId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'students'), {
        ...payload,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      editingId ? OperationType.UPDATE : OperationType.CREATE,
      'students'
    );
  }
}

export async function batchInsertStudents(
  mode: AuthMode,
  userId: string,
  items: Record<string, unknown>[]
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    await tryApiJson<{ count: number }>('/api/workspace/students/batch', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ items }),
    });

    const local = loadLocalWorkspace();
    const created = items.slice(0, 400).map((item) => ({
      ...item,
      id: generateLocalId('stu'),
      ownerId: 'admin',
    })) as Student[];
    local.students.push(...created);
    saveLocalWorkspace(local);
    return;
  }

  try {
    const batch = writeBatch(db);
    for (const item of items.slice(0, 400)) {
      const ref = doc(collection(db, 'students'));
      batch.set(ref, {
        ...item,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'students');
  }
}

export async function deleteStudentRecord(mode: AuthMode, id: string): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    await tryApiJson<{ ok: boolean }>(`/api/workspace/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    const local = loadLocalWorkspace();
    local.students = local.students.filter((s) => s.id !== id);
    saveLocalWorkspace(local);
    return;
  }

  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
  }
}

export async function saveLetterRecord(
  mode: AuthMode,
  userId: string,
  editingId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const url = editingId
      ? `/api/workspace/letters/${encodeURIComponent(editingId)}`
      : '/api/workspace/letters';
    const apiRes = await tryApiJson<{ item: LetterRecord }>(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok && apiRes.serverError && apiRes.status >= 400 && apiRes.status < 500) {
      throw new Error(apiRes.serverError);
    }

    const local = loadLocalWorkspace();
    if (editingId) {
      const idx = local.letters.findIndex((l) => l.id === editingId);
      if (idx >= 0 && local.letters[idx].status === 'arsip') {
        throw new Error('Naskah berstatus Arsip Final terkunci dan tidak dapat diubah.');
      }
      const updated = (
        apiRes.ok
          ? apiRes.data.item
          : { ...(local.letters[idx] || {}), ...payload, id: editingId, ownerId: 'admin' }
      ) as LetterRecord;
      if (idx >= 0) local.letters[idx] = updated;
      else local.letters.unshift(updated);
    } else {
      const created = (
        apiRes.ok
          ? apiRes.data.item
          : { ...payload, id: generateLocalId('let'), ownerId: 'admin' }
      ) as LetterRecord;
      local.letters.unshift(created);
    }
    saveLocalWorkspace(local);
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'letters', editingId), {
        ...payload,
        ownerId: userId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'letters'), {
        ...payload,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      editingId ? OperationType.UPDATE : OperationType.CREATE,
      'letters'
    );
  }
}

export async function sealLetterAsArchive(mode: AuthMode, id: string): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    await tryApiJson<{ item: LetterRecord }>(`/api/workspace/letters/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'arsip' }),
    });

    const local = loadLocalWorkspace();
    const idx = local.letters.findIndex((l) => l.id === id);
    if (idx >= 0) {
      local.letters[idx] = { ...local.letters[idx], status: 'arsip' };
      saveLocalWorkspace(local);
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'letters', id), {
      status: 'arsip',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `letters/${id}`);
  }
}

export async function deleteLetterRecord(mode: AuthMode, id: string): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const apiRes = await tryApiJson<{ ok: boolean }>(`/api/workspace/letters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!apiRes.ok && apiRes.serverError && apiRes.status >= 400 && apiRes.status < 500) {
      throw new Error(apiRes.serverError);
    }

    const local = loadLocalWorkspace();
    const target = local.letters.find((l) => l.id === id);
    if (target && target.status === 'arsip') {
      throw new Error('Naskah berstatus Arsip Final tidak dapat dihapus.');
    }
    local.letters = local.letters.filter((l) => l.id !== id);
    saveLocalWorkspace(local);
    return;
  }

  try {
    await deleteDoc(doc(db, 'letters', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `letters/${id}`);
  }
}

export async function generateLetterDraftWithGemini(params: {
  kategori: LetterCategory;
  instruksi: string;
  namaSekolah: string;
  kota: string;
}): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/gemini/draft-letter', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(params),
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Endpoint AI (/api/gemini/draft-letter) belum aktif di server hosting ini. Pastikan GEMINI_API_KEY diatur di Vercel Environment Variables.'
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyusun draf surat dengan Gemini AI.');
  }
  return data.draft || {};
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, maxLen);
}

function clampRequiredStr(val: unknown, minLen: number, maxLen: number, fallback: string): string {
  const s = clampStr(val, maxLen, fallback);
  return s.length >= minLen ? s : fallback.slice(0, maxLen);
}

export async function syncLocalWorkspaceToCloudIfEmpty(workspaceId: string): Promise<boolean> {
  const local = loadLocalWorkspace();
  const defaults = createDefaultSchoolSettings(workspaceId);
  const s = local.settings;

  const hasCustomSettings =
    s.namaSekolah !== defaults.namaSekolah ||
    s.pemerintahDaerah !== defaults.pemerintahDaerah ||
    s.kepalaSekolahNama !== defaults.kepalaSekolahNama ||
    Boolean(s.logoDaerahDataUrl) ||
    Boolean(s.logoSekolahDataUrl);

  if (
    !hasCustomSettings &&
    local.employees.length === 0 &&
    local.students.length === 0 &&
    local.letters.length === 0
  ) {
    return false;
  }

  try {
    const [cloudSettingsSnap, cloudEmpSnap, cloudStuSnap, cloudLetSnap] = await Promise.all([
      getDoc(doc(db, 'schoolSettings', workspaceId)),
      getDocs(query(collection(db, 'employees'), where('ownerId', '==', workspaceId), limit(1))),
      getDocs(query(collection(db, 'students'), where('ownerId', '==', workspaceId), limit(1))),
      getDocs(query(collection(db, 'letters'), where('ownerId', '==', workspaceId), limit(1))),
    ]);

    if (
      cloudSettingsSnap.exists() ||
      !cloudEmpSnap.empty ||
      !cloudStuSnap.empty ||
      !cloudLetSnap.empty
    ) {
      return false;
    }

    const batch = writeBatch(db);
    let ops = 0;

    if (hasCustomSettings) {
      batch.set(doc(db, 'schoolSettings', workspaceId), {
        ownerId: workspaceId,
        pemerintahDaerah: clampRequiredStr(s.pemerintahDaerah, 2, 150, defaults.pemerintahDaerah),
        dinasPendidikan: clampRequiredStr(s.dinasPendidikan, 2, 150, defaults.dinasPendidikan),
        namaSekolah: clampRequiredStr(s.namaSekolah, 2, 150, defaults.namaSekolah),
        npsn: clampStr(s.npsn, 20),
        alamat: clampRequiredStr(s.alamat, 2, 250, defaults.alamat),
        kota: clampRequiredStr(s.kota, 2, 100, defaults.kota),
        kodePos: clampStr(s.kodePos, 15),
        telepon: clampStr(s.telepon, 40),
        email: clampStr(s.email, 120),
        website: clampStr(s.website, 120),
        kodeUnitSurat: clampRequiredStr(s.kodeUnitSurat, 1, 60, defaults.kodeUnitSurat),
        kepalaSekolahNama: clampRequiredStr(s.kepalaSekolahNama, 2, 120, defaults.kepalaSekolahNama),
        kepalaSekolahNip: clampStr(s.kepalaSekolahNip, 40),
        kepalaSekolahPangkat: clampStr(s.kepalaSekolahPangkat, 80),
        logoDaerahDataUrl: clampStr(s.logoDaerahDataUrl, 260000),
        logoSekolahDataUrl: clampStr(s.logoSekolahDataUrl, 260000),
        tampilkanLogoKanan: Boolean(s.tampilkanLogoKanan),
        polaPenomoran:
          s.polaPenomoran === 'kemendagri_bulan_romawi' ||
          s.polaPenomoran === 'kemendagri_bulan_angka'
            ? s.polaPenomoran
            : 'kemendagri_2023',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
    }

    for (const emp of local.employees) {
      if (ops >= 450) break;
      const statusKepeg =
        emp.statusKepegawaian === 'PPPK' ||
        emp.statusKepegawaian === 'Honorer' ||
        emp.statusKepegawaian === 'CPNS'
          ? emp.statusKepegawaian
          : 'PNS';
      batch.set(doc(collection(db, 'employees')), {
        ownerId: workspaceId,
        nama: clampRequiredStr(emp.nama, 2, 140, 'Pegawai'),
        nip: clampStr(emp.nip, 40),
        nuptk: clampStr(emp.nuptk, 40),
        pangkatGolongan: clampStr(emp.pangkatGolongan, 80),
        jabatan: clampRequiredStr(emp.jabatan, 1, 120, 'Guru/Pegawai'),
        statusKepegawaian: statusKepeg,
        unitKerja: clampStr(emp.unitKerja, 120),
        telepon: clampStr(emp.telepon, 30),
        email: clampStr(emp.email, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
    }

    for (const stu of local.students) {
      if (ops >= 450) break;
      const jk = stu.jenisKelamin === 'P' ? 'P' : 'L';
      const statusSiswa =
        stu.status === 'Mutasi Keluar' || stu.status === 'Lulus' ? stu.status : 'Aktif';
      batch.set(doc(collection(db, 'students')), {
        ownerId: workspaceId,
        nama: clampRequiredStr(stu.nama, 2, 140, 'Siswa'),
        nis: clampStr(stu.nis, 30),
        nisn: clampStr(stu.nisn, 30),
        tempatLahir: clampStr(stu.tempatLahir, 80),
        tanggalLahir: clampStr(stu.tanggalLahir, 30),
        jenisKelamin: jk,
        kelas: clampRequiredStr(stu.kelas, 1, 40, '-'),
        namaOrangTua: clampStr(stu.namaOrangTua, 140),
        pekerjaanOrangTua: clampStr(stu.pekerjaanOrangTua, 100),
        alamat: clampStr(stu.alamat, 250),
        teleponOrangTua: clampStr(stu.teleponOrangTua, 30),
        status: statusSiswa,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
    }

    for (const letItem of local.letters) {
      if (ops >= 450) break;
      const payloadObj =
        letItem.payload && typeof letItem.payload === 'object' && !Array.isArray(letItem.payload)
          ? letItem.payload
          : {};
      const payloadEntries = Object.entries(payloadObj).slice(0, 40);
      const safePayload = Object.fromEntries(payloadEntries);

      batch.set(doc(collection(db, 'letters')), {
        ownerId: workspaceId,
        kategori: letItem.kategori,
        subKategori: clampRequiredStr(letItem.subKategori, 1, 60, 'umum'),
        kodeKlasifikasi: clampRequiredStr(letItem.kodeKlasifikasi, 1, 30, '400.3.5'),
        nomorUrut: clampRequiredStr(letItem.nomorUrut, 1, 20, '001'),
        nomorSurat: clampRequiredStr(letItem.nomorSurat, 3, 120, '400.3.5/001'),
        tanggalSurat: clampRequiredStr(letItem.tanggalSurat, 4, 30, '2026-01-01'),
        perihal: clampRequiredStr(letItem.perihal, 2, 220, 'Naskah Dinas'),
        tujuanSurat: clampStr(letItem.tujuanSurat, 200),
        status:
          letItem.status === 'terbit' || letItem.status === 'arsip' ? letItem.status : 'draf',
        modeTtd: letItem.modeTtd === 'tte' ? 'tte' : 'basah',
        payload: safePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
    }

    if (ops === 0) return false;
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}
