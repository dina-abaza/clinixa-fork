import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginResponseData } from '../api/auth';
import { setAuthToken } from '../api/client';

/** بيانات الفرع النشط — نفس `active_branch` في `LoginResponseData`/`SessionResponseData` */
export type ActiveBranch = LoginResponseData['active_branch'];
/** بيانات الموظف زي ما بترجع من Login/Session — بدون `created_at`/`updated_at` (مش موجودين في الاستجابة) */
export type SessionEmployee = LoginResponseData['employee'];

type SessionStatus = 'idle' | 'restoring' | 'authenticated' | 'unauthenticated';

interface AuthState {
  token: string | null;
  employee: SessionEmployee | null;
  activeBranch: ActiveBranch | null;
  status: SessionStatus;
  setSession: (session: {
    token: string;
    employee: SessionEmployee;
    activeBranch: ActiveBranch;
  }) => void;
  setStatus: (status: SessionStatus) => void;
  clearSession: () => void;
}

/**
 * جلسة المستخدم — التوكن **بس** هو اللي بيتخزّن محليًا (localStorage عن
 * طريق `persist`)، وباقي بيانات الجلسة (الموظف والفرع) بترجع تاني من
 * `GET /api/auth/session` عند فتح التطبيق (راجع `SessionBoundary`) عشان
 * تفضل مطابقة لآخر حالة فعلية في الباك (صلاحيات اتغيّرت، حساب اتعطّل، ...).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      employee: null,
      activeBranch: null,
      status: 'idle',
      setSession: ({ token, employee, activeBranch }) => {
        setAuthToken(token);
        set({ token, employee, activeBranch, status: 'authenticated' });
      },
      setStatus: (status) => set({ status }),
      clearSession: () => {
        setAuthToken(null);
        set({ token: null, employee: null, activeBranch: null, status: 'unauthenticated' });
      },
    }),
    {
      name: 'clinixa.auth',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
