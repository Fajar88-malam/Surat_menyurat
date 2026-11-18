import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  Archive,
  Building2,
  Database,
  FilePlus2,
  KeyRound,
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
  checkAdminSession,
  fetchAdminWorkspace,
  loginAdmin,
  logoutAdmin,
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

function MainWorkspace() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('');
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

  const authMode: AuthMode | null = adminUser
    ? 'admin'
    : firebaseUser
    ? 'google'
    : null;

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
    let firebaseChecked = false;
    let adminChecked = false;

    const finishIfBoth = () => {
      if (firebaseChecked && adminChecked) {
        setAuthReady(true);
      }
    };

    void checkAdminSession()
      .then((res) => {
        if (res.authenticated && res.username) {
          setAdminUser(res.username);
        }
      })
      .finally(() => {
        adminChecked = true;
        finishIfBoth();
      });

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      firebaseChecked = true;
      finishIfBoth();
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
      setDataLoading(true);
      setSettings(createDefaultSchoolSettings(firebaseUser.uid));

      const settingsRef = doc(db, 'schoolSettings', firebaseUser.uid);
      const unsubSettings = onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            setSettings(snap.data() as SchoolSettings);
            setHasExistingSettings(true);
          } else {
            setSettings(createDefaultSchoolSettings(firebaseUser.uid));
            setHasExistingSettings(false);
          }
          setDataLoading(false);
        },
        (err) =>
          handleFirestoreError(err, OperationType.GET, `schoolSettings/${firebaseUser.uid}`)
      );

      const empQ = query(
        collection(db, 'employees'),
        where('ownerId', '==', firebaseUser.uid)
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
        where('ownerId', '==', firebaseUser.uid)
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
        where('ownerId', '==', firebaseUser.uid)
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
  }, [authReady, authMode, firebaseUser, loadAdminWorkspace]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoginBusy(true);
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      setAdminUser(res.username);
      setPasswordInput('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setLoginBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setAdminUser(null);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.'
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (adminUser) {
      await logoutAdmin();
      setAdminUser(null);
    }
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Memuat sesi aplikasi...</div>
      </div>
    );
  }

  if (!authMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-7 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-sky-800">
              Tata Naskah Dinas Pemerintah · Kemendagri
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              E-Surat Sekolah
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Aplikasi pengelolaan surat tugas &amp; SPPD, surat keterangan pegawai/siswa, mutasi, undangan rapat, dan panggilan orang tua sesuai aturan Kemendagri.
            </p>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                required
                type="text"
                autoComplete="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700"
              />
            </div>

            {authError && (
              <div className="px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-800 rounded-lg hover:bg-sky-900 transition-colors disabled:opacity-50"
            >
              {loginBusy ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Akses Operator: user <span className="font-mono font-semibold text-slate-700">admin</span> · password <span className="font-mono font-semibold text-slate-700">admin123</span>
              </span>
            </div>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 text-xs text-slate-400">atau</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={loginBusy}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-sky-800 shrink-0" />
              Masuk dengan Akun Google (Cloud Firestore)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeUserId = authMode === 'admin' ? 'admin' : firebaseUser!.uid;
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

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">
              {activeSettings.namaSekolah}
            </div>
            <div className="text-slate-500 truncate">
              {authMode === 'admin'
                ? `Operator: ${adminUser}`
                : firebaseUser?.email || 'Cloud Firestore'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
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
