export function getErrorMessage(err, fallback = "Request failed") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  const anyErr = err;
  if (typeof anyErr?.message === "string" && anyErr.message) return anyErr.message;
  if (typeof anyErr?.error === "string" && anyErr.error) return anyErr.error;
  if (typeof anyErr?.data?.message === "string" && anyErr.data.message) return anyErr.data.message;
  if (typeof anyErr?.data?.error === "string" && anyErr.data.error) return anyErr.data.error;
  return fallback;
}

