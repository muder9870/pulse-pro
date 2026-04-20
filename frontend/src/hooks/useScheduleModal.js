import { useState } from 'react';
import { apiFetch } from '../api/client';

/**
 * useScheduleModal - Hook for managing schedule modal state and operations
 * 
 * Handles schedule configuration loading, saving, and UI state management.
 * Extracted from App.jsx as part of T9 refactoring.
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when schedule is saved successfully
 * @param {Function} options.onError - Callback when schedule operations fail
 * @returns {Object} Schedule state and control functions
 */
export function useScheduleModal({ onSuccess, onError } = {}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('11:00');
  const [scheduleDays, setScheduleDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [scheduleNextRun, setScheduleNextRun] = useState(null);
  const [scheduleServerTime, setScheduleServerTime] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

  const openSchedule = async () => {
    setScheduleOpen(true);
    setScheduleError(null);
    try {
      const res = await apiFetch('/schedule');
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      const sched = data.schedule || {};
      setScheduleEnabled(Boolean(sched.enabled));
      setScheduleTime(sched.time || '11:00');
      setScheduleDays(Array.isArray(sched.days) ? sched.days : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      setScheduleNextRun(data.next_run_time || null);
      setScheduleServerTime(data.server_time || null);
    } catch (e) {
      console.error(e);
      const errorMsg = String(e.message || e);
      setScheduleError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const saveSchedule = async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await apiFetch('/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          time: scheduleTime,
          days: scheduleDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule');
      const info = data.info || {};
      setScheduleNextRun(info.next_run_time || null);
      setScheduleServerTime(info.server_time || null);
      setScheduleOpen(false);
      onSuccess?.('Schedule saved successfully');
    } catch (e) {
      console.error(e);
      const errorMsg = String(e.message || e);
      setScheduleError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleDay = (dayKey) => {
    setScheduleDays((prev) => {
      if (prev.includes(dayKey)) return prev.filter((d) => d !== dayKey);
      return [...prev, dayKey];
    });
  };

  return {
    scheduleOpen,
    setScheduleOpen,
    scheduleLoading,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleTime,
    setScheduleTime,
    scheduleDays,
    setScheduleDays,
    scheduleNextRun,
    scheduleServerTime,
    scheduleError,
    openSchedule,
    saveSchedule,
    toggleDay,
  };
}

export default useScheduleModal;
