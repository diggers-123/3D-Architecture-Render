"use client";

import { useEffect } from "react";
import { MARKUP } from "./markup";

export default function Studio() {
  useEffect(() => {
    let cancelled = false;
    // three.js, jsPDF and JSZip touch browser APIs, so the engine loads on the client only.
    import("./studio.js").then((m) => {
      if (!cancelled) m.boot();
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return <div id="app" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}
