import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import { ArrowRight, X } from 'lucide-react'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (error) throw error
        if (data.session) onClose()
        else setMessage('Account created. Check your email to confirm your address, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onClose()
      }
    } catch (error) {
      setMessage(error.message || 'Could not authenticate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-backdrop" onClick={onClose}>
    <section className="auth-panel" onClick={(event) => event.stopPropagation()}>
      <button className="auth-close icon-button" onClick={onClose} aria-label="Close"><X /></button>
      <p className="eyebrow">WELCOME TO YOUR UNIVERSE</p>
      <h2>{mode === 'signup' ? 'CREATE YOUR ACCOUNT.' : 'GOOD TO HAVE YOU BACK.'}</h2>
      <p className="auth-description">Save your pieces and keep your personal rotation.</p>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label>DISPLAY NAME<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required placeholder="Your name" /></label>}
        <label>EMAIL ADDRESS<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
        <label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required placeholder="At least 6 characters" /></label>
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="button button-light full-button" type="submit" disabled={busy}>{busy ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'} <ArrowRight size={16} /></button>
      </form>
      <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to DRIPVERSE?'} <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'SIGN IN' : 'CREATE ACCOUNT'}</button></p>
    </section>
  </div>
}
