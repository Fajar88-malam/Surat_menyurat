import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
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

export type AuthMode = 'admin' | 'google';

const SESSION_KEY = 'esurat_admin_token';

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
  const res = await fetch('/api/workspace', {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memuat workspace.');
  }
  return data;
}

export async function saveSchoolSettings(
  mode: AuthMode,
  userId: string,
  hasExistingSettings: boolean,
  mutableFields: Record<string, unknown>
): Promise<void> {
  if (mode === 'admin') {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/workspace/settings', {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(mutableFields),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menyimpan pengaturan.');
    }
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
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menyimpan data pegawai.');
    }
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
    const res = await fetch('/api/workspace/employees/batch', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal mengimpor data pegawai.');
    }
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
    const res = await fetch(`/api/workspace/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Gagal menghapus pegawai.');
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
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menyimpan data siswa.');
    }
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
    const res = await fetch('/api/workspace/students/batch', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal mengimpor data siswa.');
    }
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
    const res = await fetch(`/api/workspace/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Gagal menghapus siswa.');
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
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menyimpan naskah dinas.');
    }
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
    const res = await fetch(`/api/workspace/letters/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'arsip' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal mengunci arsip.');
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
    const res = await fetch(`/api/workspace/letters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menghapus surat.');
    }
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyusun draf surat dengan Gemini AI.');
  }
  return data.draft || {};
}
