import { useLayoutEffect, useRef, useState } from "react";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import html2canvas from "html2canvas-pro";
import { Copy, Download, Share2 } from "lucide-react";
import { formatTradeAsMarkdown } from "../../utils";

export default function ShareMenu({ trade, analysedAt, marketContext, snapshotRef }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [dropPos, setDropPos] = useState(null);
  const [previewPos, setPreviewPos] = useState(null);
  const shareRef = useRef(null);
  const btnRef = useRef(null);
  const previewRef = useRef(null);

  useOutsideClick(shareRef, () => setShareOpen(false), shareOpen);

  useLayoutEffect(() => {
    if (!previewPos || !snapshotRef.current || !previewRef.current) return;
    const clone = snapshotRef.current.cloneNode(true);
    clone.style.position = "relative";
    clone.style.left = "auto";
    clone.style.top = "auto";
    previewRef.current.replaceChildren(clone);
  }, [previewPos]);

  function handleToggle() {
    const next = !shareOpen;
    if (next && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuWidth = 182;
      if (r.right >= menuWidth) {
        setDropPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
      } else {
        setDropPos({ top: r.bottom + 6, left: r.left });
      }
    }
    setShareOpen(next);
  }

  function handleCopyMarkdown() {
    setShareOpen(false);
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
  }

  function handleDownloadEnter() {
    if (window.innerWidth < 900 || !btnRef.current || !snapshotRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPreviewPos({ top: r.bottom + 6, right: window.innerWidth - r.right + 190 });
  }

  async function captureCanvas() {
    const el = snapshotRef.current;
    const bg = window.getComputedStyle(el).backgroundColor || "#ffffff";
    return html2canvas(el, {
      scale: Math.max(3, window.devicePixelRatio || 3),
      useCORS: true,
      logging: false,
      backgroundColor: bg,
      onclone: (_doc, clonedEl) => {
        clonedEl.style.position = "relative";
        clonedEl.style.left = "auto";
        clonedEl.style.top = "auto";
      },
    });
  }

  async function handleDownloadImage() {
    setShareOpen(false);
    setPreviewPos(null);
    if (!snapshotRef.current) return;
    setImgLoading(true);
    try {
      const dataUrl = (await captureCanvas()).toDataURL("image/png");
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
      let file = null;
      if (snapshotRef.current) {
        const canvas = await captureCanvas();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        file = new File([blob], `${trade.ticker}-analysis.png`, { type: "image/png" });
      }
      const title = `${trade.ticker} Options Analysis`;
      const text = trade.summary?.headline ?? "";
      if (file) {
        const payload = { title, text, files: [file] };
        if (navigator.canShare?.(payload)) { await navigator.share(payload); return; }
      }
      await navigator.share({ title, text, url: "https://options-advisor-sepia.vercel.app" });
    } catch (_) {}
  }

  return (
    <div className="share-menu-wrap" ref={shareRef}>
      <button
        ref={btnRef}
        className={`share-trigger-btn${shareOpen ? " share-trigger-btn--open" : ""}`}
        onClick={handleToggle}
        aria-label="Share"
      >
        <Share2 size={13} />
      </button>

      {shareOpen && dropPos && (
        <div className="share-menu" style={{ top: dropPos.top, ...(dropPos.right != null ? { right: dropPos.right } : { left: dropPos.left }) }}>
          <button className="share-menu-item" onClick={handleCopyMarkdown}>
            <Copy size={14} />
            Copy markdown
          </button>
          <button
            className="share-menu-item"
            onClick={handleDownloadImage}
            disabled={imgLoading}
            onMouseEnter={handleDownloadEnter}
            onMouseLeave={() => setPreviewPos(null)}
          >
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

      {previewPos && (
        <div
          className="share-preview-popup"
          style={{ top: previewPos.top, right: previewPos.right }}
        >
          <div ref={previewRef} />
        </div>
      )}
    </div>
  );
}
