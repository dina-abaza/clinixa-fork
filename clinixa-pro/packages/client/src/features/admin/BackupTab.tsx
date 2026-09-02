import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BACKUP_DESTINATION, type BackupDestination } from '@clinixa/shared';
import { getBackupHistory, restoreBackup, runBackup, setBackupDestination } from '../../lib/api/backup';
import { useAuthStore } from '../../lib/store/authStore';
import { hasPermission } from '../../lib/permissions';

/** تبويب النسخ الاحتياطي — الموديول الوحيد اللي الباك إند بتاعه شغّال فعليًا في المرحلة الرابعة لحد دلوقتي. */
export function BackupTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.employee?.permissions);
  const canEdit = hasPermission(permissions, 'admin.edit');

  const [destination, setDestination] = useState<BackupDestination>('local_device');
  const [restoreBackupId, setRestoreBackupId] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const historyQuery = useQuery({ queryKey: ['backup-history'], queryFn: getBackupHistory });
  const items = historyQuery.data?.ok ? historyQuery.data.data.items : [];
  const isLoading = historyQuery.isLoading;
  const isEmpty = !isLoading && items.length === 0;
  const okBackups = items.filter((b) => b.status === 'ok');

  const runMutation = useMutation({
    mutationFn: () => runBackup({ destination, kind: 'manual' }),
    onSuccess: (res) => {
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      setToast(res.data.status === 'ok' ? t('admin.backup.toasts.backupOk') : t('admin.backup.toasts.backupFailed'));
    },
  });

  const destinationMutation = useMutation({
    mutationFn: () => setBackupDestination(destination),
    onSuccess: (res) => {
      if (res.ok) setToast(t('admin.backup.toasts.destinationSaved'));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreBackup({ confirmation_text: confirmText, backup_id: restoreBackupId || undefined }),
    onSuccess: (res) => {
      if (res.ok) setRestoreNotice(true);
    },
  });

  const restoreError = restoreMutation.data && !restoreMutation.data.ok ? restoreMutation.data.error.message : null;
  const runError = runMutation.data && !runMutation.data.ok ? runMutation.data.error.message : null;

  return (
    <>
      {canEdit && (
        <div className="detail-card glass" style={{ marginBottom: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.tabs.backup')}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="bk-destination">{t('admin.backup.destinationLabel')}</label>
              <div className="input-wrap no-icon">
                <select id="bk-destination" value={destination} onChange={(e) => setDestination(e.target.value as BackupDestination)}>
                  {BACKUP_DESTINATION.map((d) => (
                    <option key={d} value={d}>{t(`admin.backup.destinations.${d}`)}</option>
                  ))}
                </select>
                <span className="chev"><svg width={16} height={16} aria-hidden="true"><use href="#i-chevron-down" /></svg></span>
              </div>
            </div>
          </div>

          <div className={`form-error${runError ? ' on' : ''}`} role="alert">
            <svg width={18} height={18} aria-hidden="true"><use href="#i-alert-circle" /></svg>
            <span>{runError}</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={`btn btn-primary btn-inline${runMutation.isPending ? ' loading' : ''}`}
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate()}
            >
              <svg className="spinner" width={18} height={18} aria-hidden="true"><use href="#i-loader" /></svg>
              <svg width={18} height={18} aria-hidden="true"><use href="#i-database" /></svg>
              <span>{t('admin.backup.runNow')}</span>
            </button>
            <button
              type="button"
              className={`btn btn-secondary btn-inline${destinationMutation.isPending ? ' loading' : ''}`}
              disabled={destinationMutation.isPending}
              onClick={() => destinationMutation.mutate()}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      <div className="table-card glass" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-head" style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
          <h2 style={{ margin: '0 0 var(--space-4)' }}>{t('admin.backup.historyTitle')}</h2>
        </div>
        {isEmpty ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg width={24} height={24}><use href="#i-database" /></svg>
            </div>
            <h2 className="empty-title">{t('admin.backup.emptyTitle')}</h2>
            <p className="empty-text">{t('admin.backup.emptyText')}</p>
          </div>
        ) : (
          <table className="data-table" aria-label={t('admin.backup.historyTitle')}>
            <thead>
              <tr>
                <th scope="col">{t('admin.backup.columns.date')}</th>
                <th scope="col">{t('admin.backup.columns.time')}</th>
                <th scope="col" className="c-status">{t('admin.backup.columns.status')}</th>
                <th scope="col">{t('admin.backup.columns.reason')}</th>
                <th scope="col">{t('admin.backup.columns.size')}</th>
                <th scope="col">{t('admin.backup.columns.kind')}</th>
                <th scope="col">{t('admin.backup.columns.destination')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7}><span className="skel" style={{ width: '90%' }} /></td>
                    </tr>
                  ))
                : items.map((record) => (
                    <tr key={record.id}>
                      <td className="num">{record.date}</td>
                      <td className="num">{record.time}</td>
                      <td className="c-status">
                        {record.status === 'ok' ? (
                          <span className="badge badge-success">{t('admin.backup.statusOk')}</span>
                        ) : (
                          <span className="badge badge-error">{t('admin.backup.statusFail')}</span>
                        )}
                      </td>
                      <td>{record.fail_reason ? t(`admin.backup.failReasons.${record.fail_reason}`) : '—'}</td>
                      <td className="num">{record.size_mb !== null ? `${record.size_mb} MB` : '—'}</td>
                      <td>{record.kind === 'manual' ? t('admin.backup.kindManual') : t('admin.backup.kindAuto')}</td>
                      <td>{t(`admin.backup.destinations.${record.destination}`)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && (
      <div className="detail-card glass">
        <h2 style={{ marginTop: 0 }}>{t('admin.backup.restoreSection')}</h2>
        <p className="modal-sub" style={{ margin: '0 0 var(--space-4)' }}>{t('admin.backup.restoreHint')}</p>

        {restoreNotice ? (
          <p className="form-ok on" role="status">
            <svg width={18} height={18} aria-hidden="true"><use href="#i-check-circle" /></svg>
            <span>{t('admin.backup.restoringNotice')}</span>
          </p>
        ) : (
          <>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="bk-restore-select">{t('admin.backup.restoreSelectLabel')}</label>
                <div className="input-wrap no-icon">
                  <select id="bk-restore-select" value={restoreBackupId} onChange={(e) => setRestoreBackupId(e.target.value)}>
                    <option value="">{t('admin.backup.restoreLatestOk')}</option>
                    {okBackups.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.date} {b.time} — {t(`admin.backup.destinations.${b.destination}`)}
                      </option>
                    ))}
                  </select>
                  <span className="chev"><svg width={16} height={16} aria-hidden="true"><use href="#i-chevron-down" /></svg></span>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="bk-confirm">{t('admin.backup.confirmLabel')}</label>
                <div className="input-wrap no-icon">
                  <input
                    id="bk-confirm"
                    type="text"
                    placeholder={t('admin.backup.confirmPlaceholder')}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={`form-error${restoreError ? ' on' : ''}`} role="alert">
              <svg width={18} height={18} aria-hidden="true"><use href="#i-alert-circle" /></svg>
              <span>{restoreError}</span>
            </div>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className={`btn btn-primary btn-inline${restoreMutation.isPending ? ' loading' : ''}`}
                disabled={confirmText.trim().length === 0 || restoreMutation.isPending}
                style={{ background: 'var(--color-status-error-text)' }}
                onClick={() => restoreMutation.mutate()}
              >
                <svg className="spinner" width={18} height={18} aria-hidden="true"><use href="#i-loader" /></svg>
                <span>{t('admin.backup.restoreSubmit')}</span>
              </button>
            </div>
          </>
        )}
      </div>
      )}

      <div className={`ok-toast${toast ? ' on' : ''}`} role="status">
        <svg width={18} height={18} aria-hidden="true"><use href="#i-check-circle" /></svg>
        <span>{toast}</span>
      </div>
    </>
  );
}
