import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2, Bell } from 'lucide-react';

const PRESET_TIMERS = [
  { id: 'rice', name: 'Rice Timer', duration: 900 }, // 15 mins
  { id: 'dal', name: 'Dal Timer', duration: 1200 }, // 20 mins
  { id: 'tea', name: 'Tea Timer', duration: 300 },   // 5 mins
  { id: 'maggi', name: 'Maggi Timer', duration: 180 }, // 3 mins
  { id: 'test', name: 'Quick Test', duration: 5 }     // 5 secs
];

export default function Timers() {
  const [activeTimers, setActiveTimers] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  
  // Refs for tracking active countdown intervals
  const intervalsRef = useRef({});

  // Web Audio API chime synthesizer for zero-dependency reliable alarm sound
  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Play a dual-tone alarm chord (harmonious and high-pitch)
      const playBeep = (time, freq, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, time);
        osc.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, time);
        // Exponential decay
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      // Play a triple beep sequence
      playBeep(now, 880, 0.3);
      playBeep(now + 0.1, 1046.5, 0.3);
      
      playBeep(now + 0.5, 880, 0.3);
      playBeep(now + 0.6, 1046.5, 0.3);
      
      playBeep(now + 1.0, 880, 0.5);
      playBeep(now + 1.1, 1200, 0.5);
    } catch (e) {
      console.error('Failed to synthesize audio:', e);
    }
  };

  // HTML5 Web Notifications API trigger
  const triggerPushNotification = (timerName) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🍳 Cooking Alarm Alert!', {
          body: `Your ${timerName} is completed! Turn off the burner.`,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>⏰</text></svg>'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            triggerPushNotification(timerName);
          }
        });
      }
    }
  };

  // Request notification permissions early
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Cleanup intervals on unmount
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const handleStart = (id) => {
    // If timer is already running, do nothing
    const timer = activeTimers.find(t => t.id === id);
    if (!timer || timer.status === 'running') return;

    // Update state to running
    setActiveTimers(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'running' };
      }
      return t;
    }));

    // Start interval
    intervalsRef.current[id] = setInterval(() => {
      setActiveTimers(prev => {
        const currentTimer = prev.find(t => t.id === id);
        if (!currentTimer) {
          clearInterval(intervalsRef.current[id]);
          return prev;
        }

        if (currentTimer.timeLeft <= 1) {
          // Finished!
          clearInterval(intervalsRef.current[id]);
          playAlarmSound();
          triggerPushNotification(currentTimer.name);
          
          return prev.map(t => {
            if (t.id === id) {
              return { ...t, timeLeft: 0, status: 'finished' };
            }
            return t;
          });
        }

        return prev.map(t => {
          if (t.id === id) {
            return { ...t, timeLeft: t.timeLeft - 1 };
          }
          return t;
        });
      });
    }, 1000);
  };

  const handlePause = (id) => {
    const timer = activeTimers.find(t => t.id === id);
    if (!timer || timer.status !== 'running') return;

    // Clear interval
    clearInterval(intervalsRef.current[id]);
    delete intervalsRef.current[id];

    // Update status
    setActiveTimers(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'paused' };
      }
      return t;
    }));
  };

  const handleReset = (id) => {
    // Clear interval
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }

    setActiveTimers(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, timeLeft: t.duration, status: 'idle' };
      }
      return t;
    }));
  };

  const handleRemove = (id) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }
    setActiveTimers(prev => prev.filter(t => t.id !== id));
  };

  const addPreset = (preset) => {
    // Check if preset is already in active lists
    const existing = activeTimers.find(t => t.id === preset.id);
    if (existing) {
      handleReset(preset.id);
      return;
    }

    const newTimer = {
      id: preset.id,
      name: preset.name,
      duration: preset.duration,
      timeLeft: preset.duration,
      status: 'idle'
    };

    setActiveTimers(prev => [...prev, newTimer]);
  };

  const createCustomTimer = (e) => {
    e.preventDefault();
    const name = customName.trim() || 'Custom Timer';
    const mins = parseInt(customMinutes) || 0;
    const secs = parseInt(customSeconds) || 0;
    const totalSecs = mins * 60 + secs;

    if (totalSecs <= 0) {
      alert('Please enter a valid duration.');
      return;
    }

    const uniqueId = `custom_${Date.now()}`;
    const newTimer = {
      id: uniqueId,
      name,
      duration: totalSecs,
      timeLeft: totalSecs,
      status: 'idle'
    };

    setActiveTimers(prev => [...prev, newTimer]);
    setCustomName('');
    setCustomMinutes('');
    setCustomSeconds('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Kitchen Timers</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Set alarms for cooking. Supports multi-timer tracking with custom synthesized alarms and desktop push notifications.</p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* Preset selectors and custom adder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Preset Buttons Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={18} /> Predefined Timers
            </h3>
            <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
              {PRESET_TIMERS.map(preset => (
                <button
                  key={preset.id}
                  className="btn btn-secondary"
                  style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0.5rem', borderRadius: '12px', alignItems: 'center' }}
                  onClick={() => addPreset(preset)}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{preset.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {preset.duration >= 60 ? `${preset.duration / 60} min` : `${preset.duration} sec`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Add custom timer card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={18} /> Setup Custom Timer
            </h3>
            
            <form onSubmit={createCustomTimer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dish Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Rice Pudding, Soup" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Minutes</label>
                  <input 
                    type="number" 
                    min="0"
                    max="180"
                    className="form-input" 
                    placeholder="Min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Seconds</label>
                  <input 
                    type="number" 
                    min="0"
                    max="59"
                    className="form-input" 
                    placeholder="Sec"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Alarm
              </button>
            </form>
          </div>

          {/* Audio Chime test trigger card */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <Volume2 size={20} />
              <span style={{ fontSize: '0.85rem' }}>Test Alarm Speaker Sound</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={playAlarmSound}>
              Play Beep Chime
            </button>
          </div>

        </div>

        {/* Active Timers List Display Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '380px' }}>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Active Kitchen Alarms ({activeTimers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            {activeTimers.length > 0 ? (
              activeTimers.map(timer => (
                <div 
                  key={timer.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    padding: '1.5rem', 
                    borderRadius: '16px', 
                    background: timer.status === 'finished' ? 'var(--accent-danger-glow)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${timer.status === 'finished' ? 'var(--accent-danger)' : 'var(--border-color)'}`,
                    position: 'relative'
                  }}
                >
                  {/* Remove Button */}
                  <button 
                    style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
                    onClick={() => handleRemove(timer.id)}
                  >
                    ✕
                  </button>

                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: timer.status === 'finished' ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                    {timer.name}
                  </h4>

                  {/* Circular Timer Visual Indicator */}
                  <div className={`timer-dial ${timer.status === 'running' ? 'running' : timer.status === 'finished' ? 'finished' : ''}`}>
                    <span className="timer-time">{formatTime(timer.timeLeft)}</span>
                    <span className="timer-label">{timer.status}</span>
                  </div>

                  {/* Control Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                    {timer.status !== 'running' && timer.status !== 'finished' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStart(timer.id)}>
                        <Play size={14} /> Start
                      </button>
                    )}
                    
                    {timer.status === 'running' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePause(timer.id)}>
                        <Pause size={14} /> Pause
                      </button>
                    )}

                    {timer.status === 'finished' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-danger)', fontWeight: 600, animation: 'pulse 1s infinite' }}>
                          ⏰ Cooking Done! Turn off heat.
                        </span>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReset(timer.id)}>
                          <RotateCcw size={14} /> Reset Timer
                        </button>
                      </div>
                    )}

                    {timer.status !== 'finished' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReset(timer.id)}>
                        <RotateCcw size={14} /> Reset
                      </button>
                    )}
                  </div>

                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
                <Clock size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <p>No active kitchen alarms. Click on a preset or set custom values to begin cooking coordinate timers.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
