import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

const PLATFORMS = [
  { value: 'twitter',   label: 'Twitter / X' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'reddit',    label: 'Reddit' },
  { value: 'threads',   label: 'Threads' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'medium',    label: 'Medium / Blog' },
];

// Quick time presets
const getPresets = () => {
  const now = new Date();
  const presets = [];
  // Next hour
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  presets.push({ label: 'Next hour', date: nextHour });
  // Tomorrow 9am
  const tomorrow9 = new Date(now);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);
  presets.push({ label: 'Tomorrow 9am', date: tomorrow9 });
  // Tomorrow 12pm
  const tomorrow12 = new Date(now);
  tomorrow12.setDate(tomorrow12.getDate() + 1);
  tomorrow12.setHours(12, 0, 0, 0);
  presets.push({ label: 'Tomorrow noon', date: tomorrow12 });
  // In 2 days 9am
  const in2days = new Date(now);
  in2days.setDate(in2days.getDate() + 2);
  in2days.setHours(9, 0, 0, 0);
  presets.push({ label: 'In 2 days', date: in2days });
  return presets;
};

const toLocalDatetimeValue = (date) => {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const BulkScheduleModal = ({ open, onClose, onSchedule, selectedCount }) => {
  const [platform, setPlatform] = useState('twitter');
  const [scheduleTime, setScheduleTime] = useState('');
  const [error, setError] = useState('');
  const [preselectedPlatform, setPreselectedPlatform] = useState(null);

  // Listen for schedule modal events to get preselected platform
  React.useEffect(() => {
    const handleScheduleEvent = (e) => {
      const { platform: eventPlatform } = e.detail || {};
      if (eventPlatform) {
        setPreselectedPlatform(eventPlatform);
        setPlatform(eventPlatform);
      } else {
        setPreselectedPlatform(null);
      }
    };
    
    window.addEventListener('open-schedule-modal', handleScheduleEvent);
    return () => window.removeEventListener('open-schedule-modal', handleScheduleEvent);
  }, []);

  if (!open) return null;

  const presets = getPresets();
  const isPlatformLocked = Boolean(preselectedPlatform);

  const handlePreset = (date) => {
    setScheduleTime(toLocalDatetimeValue(date));
    setError('');
  };

  const handleSubmit = () => {
    if (!scheduleTime) { setError('Please select a date and time'); return; }
    const dt = new Date(scheduleTime);
    if (dt <= new Date()) { setError('Schedule time must be in the future'); return; }
    onSchedule({ time: scheduleTime, platform });
    setPlatform('twitter');
    setScheduleTime('');
    setError('');
    setPreselectedPlatform(null);
  };

  const handleClose = () => {
    setPlatform('twitter');
    setScheduleTime('');
    setError('');
    setPreselectedPlatform(null);
    onClose();
  };

  const sel = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Schedule {selectedCount} {selectedCount === 1 ? 'Article' : 'Articles'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Choose platform and time</div>
          </div>
          <button onClick={handleClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Platform - Only show if not locked */}
          {!isPlatformLocked && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Platform
              </label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} style={sel}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}
          
          {/* Platform - Show as locked/readonly if preselected */}
          {isPlatformLocked && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Platform
              </label>
              <div style={{ ...sel, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-glow)', border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 600 }}>
                <span style={{ textTransform: 'capitalize' }}>{PLATFORMS.find(p => p.value === platform)?.label || platform}</span>
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Quick Select
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p.date)}
                  style={{
                    padding: '7px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    border: scheduleTime === toLocalDatetimeValue(p.date) ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: scheduleTime === toLocalDatetimeValue(p.date) ? 'var(--accent-glow)' : 'var(--surface2)',
                    color: scheduleTime === toLocalDatetimeValue(p.date) ? 'var(--accent)' : 'var(--text2)',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                    {p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {p.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom date/time */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Custom Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={e => { setScheduleTime(e.target.value); setError(''); }}
              min={toLocalDatetimeValue(new Date())}
              style={{ ...sel, colorScheme: 'dark' }}
            />
          </div>

          {/* Selected time display */}
          {scheduleTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 8 }}>
              <Clock style={{ width: 13, height: 13, color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                {selectedCount} article{selectedCount !== 1 ? 's' : ''} → <strong style={{ textTransform: 'capitalize' }}>{PLATFORMS.find(p => p.value === platform)?.label}</strong> · {new Date(scheduleTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: '6px 10px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleClose} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!scheduleTime}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: !scheduleTime ? 'var(--surface2)' : 'var(--accent)', color: !scheduleTime ? 'var(--text3)' : '#fff', fontSize: 12, fontWeight: 500, cursor: !scheduleTime ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
          >
            <Calendar style={{ width: 13, height: 13 }} />
            Schedule {selectedCount > 1 ? `All ${selectedCount}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduleModal;
