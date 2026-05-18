import { useState } from "react";
import { Mail } from "lucide-react";
import { Modal } from "@mantine/core";
import { useAuth } from "./AuthContext";

export default function AuthModal({ onClose }) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoogle() {
    setError(null);
    await signInWithGoogle();
  }

  async function handleEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <Modal
      opened
      onClose={onClose}
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
      <h2 className="modal-title">Sign in</h2>
      <p className="modal-sub">Sync your analyses across devices</p>

      {sent ? (
        <div className="modal-sent">
          <Mail size={20} />
          <p>Check your inbox — we sent a magic link to <strong>{email}</strong></p>
        </div>
      ) : (
        <>
          <button className="modal-btn modal-btn--google" onClick={handleGoogle}>
            Continue with Google
          </button>

          <div className="modal-divider"><span>or</span></div>

          <form onSubmit={handleEmail} className="modal-email-form">
            <input
              type="email"
              className="modal-email-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            <button type="submit" className="modal-btn modal-btn--email" disabled={loading}>
              {loading ? "Sending…" : <><Mail size={14} /> Send magic link</>}
            </button>
          </form>

          {error && <p className="modal-error">{error}</p>}
        </>
      )}
    </Modal>
  );
}
