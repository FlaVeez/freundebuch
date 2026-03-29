import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const QUESTIONS = [
  { emoji: '🌟', text: 'Was schätzt du an unserer Freundschaft am meisten?' },
  { emoji: '💭', text: 'Was ist deine schönste Erinnerung mit mir?' },
  { emoji: '🗺️', text: 'Welches Abenteuer sollten wir noch zusammen erleben?' },
  { emoji: '🎁', text: 'Was würdest du mir schenken, wenn Geld keine Rolle spielt?' },
  { emoji: '💌', text: 'Was möchtest du mir sagen, was du noch nie gesagt hast?' },
];

const PALETTE = [
  { color_bg: '#FFF0E6', color_accent: '#D4622A' },
  { color_bg: '#E8F4F0', color_accent: '#2A7A5B' },
  { color_bg: '#EEF0FA', color_accent: '#3A4AB5' },
  { color_bg: '#F9EEF5', color_accent: '#8A2A7A' },
  { color_bg: '#FDFAE6', color_accent: '#8A7200' },
  { color_bg: '#F0F6FF', color_accent: '#1A5FAD' },
];

const S = {
  page: {
    minHeight: '100vh',
    background: '#FDF6EE',
    fontFamily: "'Lora', Georgia, serif",
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  h1: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: 900,
    color: '#1A0A00',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
    textAlign: 'center',
  },
  label: {
    fontWeight: 500,
    color: '#6B4C30',
    fontSize: 14,
    display: 'block',
    marginBottom: 6,
    fontFamily: "'Lora', serif",
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1.5px solid #E0C9A8',
    fontSize: 15,
    boxSizing: 'border-box',
    fontFamily: "'Lora', serif",
    background: '#FFFBF5',
    outline: 'none',
    color: '#1A0A00',
    lineHeight: 1.6,
  },
  primaryBtn: {
    background: '#1A0A00',
    color: '#FDF6EE',
    border: 'none',
    borderRadius: 18,
    padding: '16px 0',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Playfair Display', serif",
    width: '100%',
    boxShadow: '0 6px 24px rgba(26,10,0,.25)',
    transition: 'transform .15s, box-shadow .15s',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    background: 'transparent',
    color: '#1A0A00',
    border: '1.5px solid #D4A97A',
    borderRadius: 18,
    padding: '15px 0',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    width: '100%',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#9C7B5E',
    fontSize: 15,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 24,
    fontFamily: "'Lora', serif",
    alignSelf: 'flex-start',
  },
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [form, setForm] = useState({
    name: '',
    answers: Array(5).fill(''),
    photo: null,
    audio: null,
  });
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [error, setError] = useState('');

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const appUrl = window.location.href.split('?')[0];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=1A0A00&bgcolor=FDF6EE&data=${encodeURIComponent(appUrl)}`;

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEntries(data);
    setLoading(false);
  }

  // ── Photo ────────────────────────────────────────────────────────────
  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    // Resize before upload
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let { width, height } = img;
      if (width > max) { height = (height * max) / width; width = max; }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      setForm(f => ({ ...f, photo: canvas.toDataURL('image/jpeg', 0.75) }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // ── Audio ────────────────────────────────────────────────────────────
  async function startRec() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = ev => setForm(f => ({ ...f, audio: ev.target.result }));
        reader.readAsDataURL(blob);
      };
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds(s => {
          if (s >= 29) { stopRec(); return 30; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.');
    }
  }

  function stopRec() {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  // ── Submit ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    const pal = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const { error: err } = await supabase.from('entries').insert([{
      name: form.name.trim(),
      answers: form.answers,
      photo: form.photo,
      audio: form.audio,
      color_bg: pal.color_bg,
      color_accent: pal.color_accent,
    }]);
    setSaving(false);
    if (err) {
      setError('Fehler beim Speichern. Bitte versuche es nochmal.');
      return;
    }
    setSubmitted(true);
    fetchEntries();
  }

  function resetForm() {
    setForm({ name: '', answers: Array(5).fill(''), photo: null, audio: null });
    setSubmitted(false);
    setRecSeconds(0);
    setError('');
    setScreen('home');
  }

  // ════════════════════════════════════ HOME ════════════════════════════════════
  if (screen === 'home') return (
    <div style={{ ...S.page, justifyContent: 'center' }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -100, right: -100, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, #FFD9B0 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, #C8E6D4 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 8, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.12))' }}>📖</div>
        <h1 style={S.h1}>Mein Freundebuch</h1>
        <p style={{ color: '#9C7B5E', fontSize: 16, textAlign: 'center', maxWidth: 300, lineHeight: 1.8, marginBottom: 44, fontStyle: 'italic' }}>
          Hinterlasse eine Nachricht, ein Selfie & eine Sprachnachricht. Für immer. 💛
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <button
            style={S.primaryBtn}
            onClick={() => setScreen('form')}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(26,10,0,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(26,10,0,.25)'; }}
          >✏️ Eintrag hinterlassen</button>

          <button style={S.ghostBtn} onClick={() => setScreen('gallery')}>
            🖼️ Alle Einträge lesen {!loading && `(${entries.length})`}
          </button>

          <button
            onClick={() => setShowQr(true)}
            style={{ background: 'none', border: 'none', color: '#B08060', fontSize: 14, cursor: 'pointer', fontFamily: "'Lora', serif", textDecoration: 'underline', marginTop: 4 }}
          >🔗 Link & QR-Code teilen</button>
        </div>
      </div>

      {/* QR Modal */}
      {showQr && (
        <div onClick={() => setShowQr(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FDF6EE', borderRadius: 28, padding: '36px 32px', textAlign: 'center', maxWidth: 340, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}>
            <h3 style={{ ...S.h1, fontSize: 24, marginBottom: 6 }}>Freundebuch teilen</h3>
            <p style={{ color: '#9C7B5E', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>QR-Code scannen oder den Link kopieren und weiterleiten!</p>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
              <img src={qrUrl} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
            <div style={{ background: '#F5EDE0', borderRadius: 12, padding: '10px 14px', margin: '16px 0', fontSize: 12, color: '#6B4C30', wordBreak: 'break-all', fontFamily: 'monospace', textAlign: 'left' }}>{appUrl}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(appUrl); }}
              style={{ ...S.ghostBtn, width: 'auto', padding: '10px 24px', marginBottom: 10, fontSize: 14 }}
            >📋 Link kopieren</button>
            <br />
            <button onClick={() => setShowQr(false)} style={{ ...S.primaryBtn, width: 'auto', padding: '12px 32px', fontSize: 15 }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════ FORM ════════════════════════════════════
  if (screen === 'form') return (
    <div style={S.page}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <button style={S.backBtn} onClick={resetForm}>← Zurück</button>

        {submitted ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 80 }}>🎉</div>
            <h2 style={{ ...S.h1, fontSize: 28 }}>Danke!</h2>
            <p style={{ color: '#9C7B5E', lineHeight: 1.8, fontStyle: 'italic' }}>Dein Eintrag ist jetzt für immer in diesem Freundebuch. 💛</p>
            <button style={{ ...S.primaryBtn, width: 'auto', padding: '14px 36px', marginTop: 16 }} onClick={resetForm}>Zur Startseite</button>
          </div>
        ) : (
          <>
            <h2 style={{ ...S.h1, textAlign: 'left', fontSize: 26, marginBottom: 28 }}>✏️ Dein Eintrag</h2>

            {/* Name */}
            <div style={{ marginBottom: 22 }}>
              <label style={S.label}>Dein Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Laura"
                style={S.input}
              />
            </div>

            {/* Photo */}
            <div style={{ marginBottom: 22 }}>
              <label style={S.label}>📷 Selfie oder Foto (optional)</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ borderRadius: 16, border: '2px dashed #D4A97A', minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#FFFBF5', transition: 'border-color .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#A0724A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#D4A97A'}
              >
                {form.photo
                  ? <img src={form.photo} alt="Vorschau" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                  : <span style={{ color: '#C4956A', fontSize: 15, fontStyle: 'italic' }}>Tippe hier, um ein Foto hinzuzufügen</span>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>

            {/* Audio */}
            <div style={{ marginBottom: 22 }}>
              <label style={S.label}>🎤 Sprachnachricht (max. 30 Sek.)</label>
              <div style={{ background: '#FFFBF5', borderRadius: 16, border: '1.5px solid #E0C9A8', padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {form.audio ? (
                  <div style={{ width: '100%' }}>
                    <audio controls src={form.audio} style={{ width: '100%', borderRadius: 10 }} />
                    <button onClick={() => setForm(f => ({ ...f, audio: null }))} style={{ background: 'none', border: 'none', color: '#C4956A', cursor: 'pointer', fontSize: 13, fontFamily: "'Lora', serif", marginTop: 6 }}>✕ Aufnahme löschen</button>
                  </div>
                ) : recording ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C0392B', fontWeight: 700, fontSize: 16 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C0392B', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      Aufnahme… {recSeconds}s / 30s
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#E0C9A8', borderRadius: 3 }}>
                      <div style={{ width: `${(recSeconds / 30) * 100}%`, height: '100%', background: '#C0392B', borderRadius: 3, transition: 'width 1s linear' }} />
                    </div>
                    <button onClick={stopRec} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontSize: 15, cursor: 'pointer', fontFamily: "'Lora', serif" }}>⏹ Stoppen</button>
                  </div>
                ) : (
                  <button onClick={startRec} style={{ ...S.primaryBtn, width: 'auto', padding: '12px 30px', fontSize: 15 }}>🎙️ Aufnahme starten</button>
                )}
              </div>
            </div>

            {/* Questions */}
            {QUESTIONS.map((q, i) => (
              <div key={i} style={{ marginBottom: 22 }}>
                <label style={S.label}>{q.emoji} {q.text}</label>
                <textarea
                  value={form.answers[i]}
                  onChange={e => { const a = [...form.answers]; a[i] = e.target.value; setForm(f => ({ ...f, answers: a })); }}
                  rows={2}
                  placeholder="Deine Antwort…"
                  style={{ ...S.input, resize: 'vertical' }}
                />
              </div>
            ))}

            {error && <p style={{ color: '#C0392B', fontSize: 14, marginBottom: 12 }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!form.name.trim() || saving}
              style={{ ...S.primaryBtn, opacity: (!form.name.trim() || saving) ? 0.45 : 1, cursor: (!form.name.trim() || saving) ? 'default' : 'pointer', marginBottom: 40 }}
            >
              {saving ? '⏳ Wird gespeichert…' : '💾 Eintrag speichern'}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }`}</style>
    </div>
  );

  // ════════════════════════════════════ GALLERY ════════════════════════════════════
  return (
    <div style={S.page}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        <button style={S.backBtn} onClick={() => setScreen('home')}>← Zurück</button>
        <h2 style={{ ...S.h1, textAlign: 'left', fontSize: 26, marginBottom: 28 }}>🖼️ Alle Einträge</h2>

        {loading ? (
          <p style={{ color: '#9C7B5E', textAlign: 'center', fontStyle: 'italic' }}>Lädt…</p>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: '#C4956A' }}>
            <div style={{ fontSize: 56 }}>🌸</div>
            <p style={{ fontStyle: 'italic' }}>Noch keine Einträge.<br />Schick den Link an deine Freunde!</p>
          </div>
        ) : entries.map(e => (
          <div key={e.id} style={{ background: e.color_bg, borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,.07)', borderLeft: `5px solid ${e.color_accent}` }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              {e.photo
                ? <img src={e.photo} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${e.color_accent}`, flexShrink: 0 }} />
                : <div style={{ width: 64, height: 64, borderRadius: '50%', background: e.color_accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, color: '#fff' }}>😊</div>
              }
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 21, color: '#1A0A00' }}>{e.name}</div>
                <div style={{ fontSize: 12, color: '#9C7B5E', marginTop: 2 }}>
                  {e.created_at ? new Date(e.created_at).toLocaleDateString('de-DE') : ''}
                </div>
              </div>
            </div>

            {/* Audio */}
            {e.audio && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9C7B5E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>🎤 Sprachnachricht</div>
                <audio controls src={e.audio} style={{ width: '100%', borderRadius: 10 }} />
              </div>
            )}

            {/* Answers */}
            {Array.isArray(e.answers) && QUESTIONS.map((q, i) => e.answers[i] && (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9C7B5E', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{q.emoji} {q.text}</div>
                <div style={{ fontSize: 15, color: '#2A1500', lineHeight: 1.7, fontStyle: 'italic' }}>„{e.answers[i]}"</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
