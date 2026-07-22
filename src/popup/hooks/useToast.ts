export function useToast(): { toast: string; showToast: (message: string) => void } {
  const [toast, setToast] = React.useState("");
  const timerRef = React.useRef(null as number | null);

  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const showToast = React.useCallback((message: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  return { toast, showToast };
}
