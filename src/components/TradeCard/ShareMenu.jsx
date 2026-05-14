import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ChevronDown, Download, ExternalLink, Share2 } from "lucide-react";
import { formatTradeAsMarkdown } from "../../utils";

export default function ShareMenu({ trade, analysedAt, marketContext, snapshotRef }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    if (!shareOpen) return;
    function onOutsideClick(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [shareOpen]);

  function handleOpenInClaude() {
    setShareOpen(false);
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
    const MAX = 8000;
    const prompt = md.length > MAX
      ? md.slice(0, MAX) + "\n\n[Full analysis copied to clipboard — paste it here to continue]"
      : md;
    const url = "https://claude.ai/new?q=" + encodeURIComponent(prompt);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) window.location.href = url;
    else window.open(url, "_blank", "noopener");
  }

  async function handleDownloadImage() {
    setShareOpen(false);
    if (!snapshotRef.current) return;
    setImgLoading(true);
    try {
      const dataUrl = await toPng(snapshotRef.current, { pixelRatio: 2, skipFonts: true });
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        window.open(dataUrl, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${trade.ticker}-options-analysis.png`;
        a.click();
      }
    } catch {
      alert("Couldn't generate image — try the Share… option instead.");
    } finally {
      setImgLoading(false);
    }
  }

  function handleShareX() {
    setShareOpen(false);
    const text = `$${trade.ticker} ${trade.strategy} — ${trade.summary?.headline ?? ""}\n\nConviction: ${trade.summary?.conviction ?? "—"} · Risk: ${trade.riskLevel ?? "—"}/5\n\nvia Options Brief`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text + "\n\nhttps://options-advisor-sepia.vercel.app")}`, "_blank", "noopener");
  }

  async function handleNativeShare() {
    setShareOpen(false);
    try {
      const dataUrl = snapshotRef.current
        ? await toPng(snapshotRef.current, { pixelRatio: 2, skipFonts: false })
        : null;
      const title = `${trade.ticker} Options Analysis`;
      const text = trade.summary?.headline ?? "";
      if (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${trade.ticker}-analysis.png`, { type: "image/png" });
        const payload = { title, text, files: [file] };
        if (navigator.canShare?.(payload)) { await navigator.share(payload); return; }
      }
      await navigator.share({ title, text, url: "https://options-advisor-sepia.vercel.app" });
    } catch (_) {}
  }

  return (
    <div className="share-menu-wrap" ref={shareRef}>
      <button
        className={`share-trigger-btn${shareOpen ? " share-trigger-btn--open" : ""}`}
        onClick={() => setShareOpen(v => !v)}
      >
        <Share2 size={13} />
        Share
        <ChevronDown size={11} />
      </button>
      {shareOpen && (
        <div className="share-menu">
          <button className="share-menu-item" onClick={handleOpenInClaude}>
            <ExternalLink size={14} />
            Open in Claude
          </button>
          <button className="share-menu-item" onClick={handleDownloadImage} disabled={imgLoading}>
            <Download size={14} />
            {imgLoading ? "Generating…" : "Download image"}
          </button>
          <button className="share-menu-item" onClick={handleShareX}>
            <span className="x-logo-icon">𝕏</span>
            Share on X
          </button>
          {typeof navigator.share === "function" && (
            <button className="share-menu-item" onClick={handleNativeShare}>
              <Share2 size={14} />
              Share…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
