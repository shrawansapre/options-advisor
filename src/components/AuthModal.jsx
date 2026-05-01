import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail } from "lucide-react";
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
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={e => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}><X size={14} /></button>

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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
