import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Download, Share2 } from "lucide-react";
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

  function handleCopyMarkdown() {
    setShareOpen(false);
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
  }

  function snapshotOptions() {
    const bg = window.getComputedStyle(snapshotRef.current).backgroundColor;
    return { pixelRatio: 2, skipFonts: true, backgroundColor: bg, cacheBust: true };
  }

  async function handleDownloadImage() {
    setShareOpen(false);
    if (!snapshotRef.current) return;
    setImgLoading(true);
    try {
      const dataUrl = await toPng(snapshotRef.current, snapshotOptions());
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

  async function handleNativeShare() {
    setShareOpen(false);
    try {
      const dataUrl = snapshotRef.current
        ? await toPng(snapshotRef.current, snapshotOptions())
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
        aria-label="Share"
      >
        <Share2 size={13} />
      </button>
      {shareOpen && (
        <div className="share-menu">
          <button className="share-menu-item" onClick={handleCopyMarkdown}>
            <Copy size={14} />
            Copy markdown
          </button>
          <button className="share-menu-item" onClick={handleDownloadImage} disabled={imgLoading}>
            <Download size={14} />
            {imgLoading ? "Generating…" : "Download image"}
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
