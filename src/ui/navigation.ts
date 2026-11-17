import { useEffect, useState, useRef } from "react";
let guard: (() => Promise<void>) | undefined;
export function appHref(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base + path;
}
export function routePath() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = location.pathname;
  if (base && (path === base || path.startsWith(base + "/")))
    return path.slice(base.length) || "/";
  return path;
}
export function setNavigationGuard(next: () => Promise<void>) {
  guard = next;
  return () => {
    if (guard === next) guard = undefined;
  };
}
export async function navigate(path: string, replace = false) {
  try {
    await guard?.();
  } catch {
    return false;
  }
  history[replace ? "replaceState" : "pushState"]({}, "", appHref(path));
  window.dispatchEvent(new Event("compasso:navigate"));
  return true;
}
export function replaceRoute(path: string) {
  history.replaceState({}, "", appHref(path));
  window.dispatchEvent(new Event("compasso:navigate"));
}
export function useRoute() {
  const [path, setPath] = useState(routePath());
  const previous = useRef(path);
  useEffect(() => {
    const change = async () => {
      const target = routePath();
      try {
        await guard?.();
        previous.current = target;
        setPath(target);
      } catch {
        history.replaceState({}, "", appHref(previous.current));
      }
    };
    const direct = () => {
      previous.current = routePath();
      setPath(routePath());
    };
    window.addEventListener("popstate", change);
    window.addEventListener("compasso:navigate", direct);
    return () => {
      window.removeEventListener("popstate", change);
      window.removeEventListener("compasso:navigate", direct);
    };
  }, []);
  return path;
}
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title + " · Cifra Club Helper";
    for (const [name, content] of [
      ["description", description],
      ["og:title", title],
      ["og:description", description],
    ]) {
      const attribute = name.startsWith("og:") ? "property" : "name";
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${name}"]`,
      );
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.content = content;
    }
  }, [title, description]);
}
