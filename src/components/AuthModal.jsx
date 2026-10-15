import { useState } from "react";
import { Modal } from "@mantine/core";
import { useAuth } from "./AuthContext";

export default function AuthModal({ onClose }) {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    onClose();
  }

  return (
    <Modal
      opened
      onClose={onClose}
      aria-label="Sign in"
      centered
      withCloseButton
      size="sm"
      radius="md"
      classNames={{
        content: 'auth-modal-content',
        header:  'auth-modal-header',
        body:    'auth-modal-body',
      }}
      transitionProps={{ transition: 'fade-up', duration: 200 }}
    >
      <div className="modal-brand">◈</div>
      <h2 className="modal-title">Sign in to Options Brief</h2>
      <p className="modal-sub">Keep your analyses wherever you go</p>

      <form onSubmit={handleSubmit} className="modal-email-form">
        <input
          type="email"
          className="modal-email-input"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <input
          type="password"
          className="modal-email-input"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button type="submit" className="modal-btn modal-btn--email" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {error && <p className="modal-error">{error}</p>}
    </Modal>
  );
}
