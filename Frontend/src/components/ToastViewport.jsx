import { useEffect, useState } from "react";
import { useTranslate } from "../i18n.jsx";
import { subscribeToToasts } from "../utils/toast.js";

export default function ToastViewport() {
  const t = useTranslate();
  const [toast, setToast] = useState(null);

  useEffect(() => subscribeToToasts((next) => setToast(next)), []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div
      className={`app-toast app-toast-${toast.variant}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <span>{t(toast.message)}</span>
      <button
        type="button"
        aria-label={t("Dismiss message")}
        onClick={() => setToast(null)}
      >
        ×
      </button>
    </div>
  );
}
