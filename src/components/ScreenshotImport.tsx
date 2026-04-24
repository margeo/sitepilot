import { useEffect, useRef, useState } from "react";
import { extractListings } from "../lib/api";
import type { BusinessBasic } from "../types";

interface Props {
  locationHint?: string;
  onImported: (businesses: BusinessBasic[], extractedNames: string[]) => void;
  onError: (msg: string) => void;
}

export function ScreenshotImport({ locationHint, onImported, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(file: File | Blob) {
    if (loading) return;
    setLoading(true);
    setLastNote(null);
    try {
      const dataUrl = await blobToDataUrl(file);
      const res = await extractListings(dataUrl, locationHint);
      onImported(res.businesses, res.extractedNames);
      if (res.businesses.length === 0) {
        setLastNote(res.note ?? "No businesses extracted from this screenshot.");
      } else {
        setLastNote(
          `Extracted ${res.extractedNames.length} name${res.extractedNames.length === 1 ? "" : "s"}, ${res.businesses.length} resolved in Google Places.`,
        );
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImage(file);
            return;
          }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationHint]);

  return (
    <div
      className="import-zone"
      data-drag={dragOver ? "1" : "0"}
      data-loading={loading ? "1" : "0"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) handleImage(file);
      }}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImage(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      {loading ? (
        <>
          <span className="spinner" /> Reading screenshot…
        </>
      ) : (
        <>
          <strong>Drop, paste, or click</strong> to import a Google Maps screenshot
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Extracts business names via Gemini → searches each in Google Places
          </div>
        </>
      )}
      {lastNote && !loading && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{lastNote}</div>
      )}
    </div>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
