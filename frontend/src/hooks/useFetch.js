import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../services/api";

export default function useFetch(url, params) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const key = JSON.stringify(params || {});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      setState({ data: res.data, loading: false, error: "" });
    } catch (err) {
      setState({ data: null, loading: false, error: errorMessage(err) });
    }
  }, [url, key]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
