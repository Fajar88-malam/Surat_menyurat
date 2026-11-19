import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Archive,
  Building2,
  Database,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { ArchiveAgenda } from './components/ArchiveAgenda';
import { DashboardOverview } from './components/DashboardOverview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LetterComposer } from './components/LetterComposer';
import { MasterDataManager } from './components/MasterDataManager';
import { SettingsAndLogo } from './components/SettingsAndLogo';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AuthMode,
  fetchAdminWorkspace,
  syncLocalWorkspaceToCloudIfEmpty,
} from './services/dataService';
import {
  Employee,
  LetterCategory,
  LetterRecord,
  SchoolSettings,
  Student,
} from './types/surat';
import { createDefaultSchoolSettings } from './utils/kemendagriFormat';

type NavView = 'dashboard' | 'compose' | 'archive' | 'master' | 'settings';
type SidebarMenuId = NavView | 'mutasi_masuk';

const NAV_ITEMS: {
  id: SidebarMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'compose', label: 'Buat Surat Dinas', icon: FilePlus2 },
  { id: 'mutasi_masuk', label: 'Penerimaan Mutasi Masuk', icon: UserPlus },
  { id: 'archive', label: 'Buku Agenda & Arsip', icon: Archive },
  { id: 'master', label: 'Pegawai & Siswa', icon: Database },
  { id: 'settings', label: 'Kop Surat & Logo', icon: Building2 },
];

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Ringkasan Administrasi',
  compose: 'Buat Naskah Dinas',
  archive: 'Buku Agenda & Arsip Surat',
  master: 'Master Data Pegawai & Siswa',
  settings: 'Profil Instansi & Upload Logo',
};

const SHARED_SCHOOL_WORKSPACE_ID = 'smpnegeripacet_shared';
const SHARED_SCHOOL_OPERATORS = new Set([
  'sangpujangga.malam88@gmail.com',
  'smpnegeripacet@gmail.com',
]);

function resolveCloudWorkspaceId(user: User | null): string {
  if (!user) return 'admin';
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  if (user.emailVerified && SHARED_SCHOOL_OPERATORS.has(normalizedEmail)) {
    return SHARED_SCHOOL_WORKSPACE_ID;
  }
  return user.uid;
}

function MainWorkspace() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [loginBusy, setLoginBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [composeCategory, setComposeCategory] = useState<LetterCategory>('surat_tugas_sppd');
  const [editingLetter, setEditingLetter] = useState<LetterRecord | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [letters, setLetters] = useState<LetterRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const authMode: AuthMode = firebaseUser ? 'google' : 'admin';
  const cloudWorkspaceId = resolveCloudWorkspaceId(firebaseUser);
  const isSharedSchoolCloud =
    authMode === 'google' && cloudWorkspaceId === SHARED_SCHOOL_WORKSPACE_ID;

  const loadAdminWorkspace = useCallback(async () => {
    try {
      const data = await fetchAdminWorkspace();
      setSettings(data.settings || createDefaultSchoolSettings('admin'));
      setHasExistingSettings(true);
      setEmployees(
        (data.employees || []).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      );
      setStudents(
        (data.students || []).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      );
      setLetters(data.letters || []);
    } catch (err) {
      console.error('Load workspace error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (authMode === 'admin') {
      setDataLoading(true);
      void loadAdminWorkspace();
      return;
    }

    if (authMode === 'google' && firebaseUser) {
      let cancelled = false;
      let migrationChecked = false;
      setDataLoading(true);
      setSettings(createDefaultSchoolSettings(cloudWorkspaceId));

      const migrateLegacyPersonalWorkspaceIfNeeded = async () => {
        if (
          migrationChecked ||
          cloudWorkspaceId !== SHARED_SCHOOL_WORKSPACE_ID ||
          firebaseUser.uid === SHARED_SCHOOL_WORKSPACE_ID
        ) {
          return;
        }
        migrationChecked = true;
        try {
          const oldSettingsRef = doc(db, 'schoolSettings', firebaseUser.uid);
          const [oldSettingsSnap, oldEmpSnap, oldStuSnap, oldLetSnap] =
            await Promise.all([
              getDoc(oldSettingsRef),
              getDocs(
                query(
                  collection(db, 'employees'),
                  where('ownerId', '==', firebaseUser.uid)
                )
              ),
              getDocs(
                query(
                  collection(db, 'students'),
                  where('ownerId', '==', firebaseUser.uid)
                )
              ),
              getDocs(
                query(
                  collection(db, 'letters'),
                  where('ownerId', '==', firebaseUser.uid)
                )
              ),
            ]);

          if (
            !cancelled &&
            !oldSettingsSnap.exists() &&
            oldEmpSnap.empty &&
            oldStuSnap.empty &&
            oldLetSnap.empty
          ) {
            await syncLocalWorkspaceToCloudIfEmpty(cloudWorkspaceId);
            return;
          }

          if (cancelled) {
            return;
          }

          const batch = writeBatch(db);
          let ops = 0;

          if (oldSettingsSnap.exists()) {
            const raw = oldSettingsSnap.data();
            batch.set(doc(db, 'schoolSettings', SHARED_SCHOOL_WORKSPACE_ID), {
              ...raw,
              ownerId: SHARED_SCHOOL_WORKSPACE_ID,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          }

          for (const d of oldEmpSnap.docs) {
            if (ops >= 450) break;
            batch.set(doc(collection(db, 'employees')), {
              ...d.data(),
              ownerId: SHARED_SCHOOL_WORKSPACE_ID,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          }

          for (const d of oldStuSnap.docs) {
            if (ops >= 450) break;
            batch.set(doc(collection(db, 'students')), {
              ...d.data(),
              ownerId: SHARED_SCHOOL_WORKSPACE_ID,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          }

          for (const d of oldLetSnap.docs) {
            if (ops >= 450) break;
            batch.set(doc(collection(db, 'letters')), {
              ...d.data(),
              ownerId: SHARED_SCHOOL_WORKSPACE_ID,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          }

          if (ops > 0 && !cancelled) {
            await batch.commit();
          } else if (!cancelled) {
            await syncLocalWorkspaceToCloudIfEmpty(cloudWorkspaceId);
          }
        } catch {
          if (!cancelled) {
            await syncLocalWorkspaceToCloudIfEmpty(cloudWorkspaceId);
          }
        }
      };

      const settingsRef = doc(db, 'schoolSettings', cloudWorkspaceId);
      const unsubSettings = onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            setSettings(snap.data() as SchoolSettings);
            setHasExistingSettings(true);
          } else {
            setSettings(createDefaultSchoolSettings(cloudWorkspaceId));
            setHasExistingSettings(false);
            if (
              cloudWorkspaceId === SHARED_SCHOOL_WORKSPACE_ID &&
              firebaseUser.uid !== SHARED_SCHOOL_WORKSPACE_ID
            ) {
              void migrateLegacyPersonalWorkspaceIfNeeded();
            } else {
              void syncLocalWorkspaceToCloudIfEmpty(cloudWorkspaceId);
            }
          }
          setDataLoading(false);
        },
        (err) =>
          handleFirestoreError(
            err,
            OperationType.GET,
            `schoolSettings/${cloudWorkspaceId}`
          )
      );

      const empQ = query(
        collection(db, 'employees'),
        where('ownerId', '==', cloudWorkspaceId)
      );
      const unsubEmp = onSnapshot(
        empQ,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Employee, 'id'>) }))
            .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          setEmployees(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
      );

      const stuQ = query(
        collection(db, 'students'),
        where('ownerId', '==', cloudWorkspaceId)
      );
      const unsubStu = onSnapshot(
        stuQ,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }))
            .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          setStudents(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'students')
      );

      const letQ = query(
        collection(db, 'letters'),
        where('ownerId', '==', cloudWorkspaceId)
      );
      const unsubLet = onSnapshot(
        letQ,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<LetterRecord, 'id'>) }))
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() || 0;
              const tb = b.createdAt?.toMillis?.() || 0;
              return tb - ta;
            });
          setLetters(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'letters')
      );

      return () => {
        cancelled = true;
        unsubSettings();
        unsubEmp();
        unsubStu();
        unsubLet();
      };
    }

    setSettings(null);
    setEmployees([]);
    setStudents([]);
    setLetters([]);
    setDataLoading(false);
  }, [authReady, authMode, firebaseUser, cloudWorkspaceId, loadAdminWorkspace]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setLoginBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'domain-vercel-anda';
        setAuthError(
          `Domain "${host}" belum didaftarkan di Firebase Console (Authentication → Settings → Authorized domains). Data tetap tersimpan otomatis di browser.`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Popup login diblokir browser. Izinkan popup untuk situs ini lalu klik Sinkron Cloud Google kembali.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum selesai.');
      } else {
        setAuthError(
          err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.'
        );
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Memuat aplikasi E-Surat Sekolah...</div>
      </div>
    );
  }

  const activeUserId = authMode === 'admin' ? 'admin' : cloudWorkspaceId;
  const activeSettings = settings || createDefaultSchoolSettings(activeUserId);

  const openComposerWithCategory = (cat: LetterCategory) => {
    setEditingLetter(null);
    setComposeCategory(cat);
    setActiveView('compose');
    setSidebarOpen(false);
  };

  const openEditLetter = (letter: LetterRecord) => {
    setEditingLetter(letter);
    setComposeCategory(letter.kategori);
    setActiveView('compose');
    setSidebarOpen(false);
  };

  const refreshIfAdmin = () => {
    if (authMode === 'admin') {
      void loadAdminWorkspace();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-40 w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              E-Surat Sekolah
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === 'mutasi_masuk'
                  ? activeView === 'compose' && composeCategory === 'surat_penerimaan_mutasi'
                  : item.id === 'compose'
                  ? activeView === 'compose' && composeCategory !== 'surat_penerimaan_mutasi'
                  : activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'mutasi_masuk') {
                      openComposerWithCategory('surat_penerimaan_mutasi');
                      return;
                    }
                    if (item.id === 'compose') {
                      setEditingLetter(null);
                      if (composeCategory === 'surat_penerimaan_mutasi') {
                        setComposeCategory('surat_tugas_sppd');
                      }
                    }
                    setActiveView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-50 text-sky-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-sky-800' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">
              {activeSettings.namaSekolah}
            </div>
            <div className="text-slate-500 truncate">
              {authMode === 'google'
                ? firebaseUser?.email || 'Cloud Firestore'
                : 'Operator Tata Usaha'}
            </div>
            {isSharedSchoolCloud && (
              <div className="text-[11px] text-sky-800 font-medium truncate mt-0.5">
                Cloud Sekolah Bersama
              </div>
            )}
          </div>
          {authError && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              {authError}
            </div>
          )}
          {authMode === 'google' ? (
            <button
              type="button"
              onClick={handleDisconnectGoogle}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Putuskan Cloud Google
            </button>
          ) : (
            <button
              type="button"
              disabled={loginBusy}
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-800 shrink-0" />
              {loginBusy ? 'Menghubungkan...' : 'Sinkron Cloud Google'}
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">Tata Naskah Dinas / </span>
              <span className="font-semibold text-slate-900">
                {activeView === 'compose' && composeCategory === 'surat_penerimaan_mutasi'
                  ? 'Surat Penerimaan Mutasi Masuk Siswa Baru'
                  : VIEW_TITLES[activeView]}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openComposerWithCategory('surat_tugas_sppd')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-800 rounded-lg hover:bg-sky-900 transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4" />
              Buat Surat Baru
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-6 max-w-[1440px] w-full mx-auto">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardOverview
                  settings={activeSettings}
                  employees={employees}
                  students={students}
                  letters={letters}
                  onCompose={openComposerWithCategory}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'compose' && (
                <LetterComposer
                  key={editingLetter ? editingLetter.id : composeCategory}
                  authMode={authMode}
                  userId={activeUserId}
                  settings={activeSettings}
                  employees={employees}
                  students={students}
                  letters={letters}
                  initialCategory={composeCategory}
                  editingLetter={editingLetter}
                  onSaved={() => {
                    setEditingLetter(null);
                    refreshIfAdmin();
                  }}
                  onStudentAdded={refreshIfAdmin}
                  onCancelEdit={() => {
                    setEditingLetter(null);
                    setActiveView('archive');
                  }}
                />
              )}

              {activeView === 'archive' && (
                <ArchiveAgenda
                  authMode={authMode}
                  letters={letters}
                  settings={activeSettings}
                  onEditLetter={openEditLetter}
                  onCreateNew={() => openComposerWithCategory('surat_tugas_sppd')}
                  onRefresh={refreshIfAdmin}
                />
              )}

              {activeView === 'master' && (
                <MasterDataManager
                  authMode={authMode}
                  userId={activeUserId}
                  employees={employees}
                  students={students}
                  onRefresh={refreshIfAdmin}
                />
              )}

              {activeView === 'settings' && (
                <SettingsAndLogo
                  authMode={authMode}
                  userId={activeUserId}
                  settings={activeSettings}
                  hasExistingSettings={hasExistingSettings}
                  onSaved={refreshIfAdmin}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainWorkspace />
    </ErrorBoundary>
  );
}
