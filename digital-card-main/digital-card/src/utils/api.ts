// In-memory token store for iframe compatibility and sandbox environments
let memoryToken: string | null = null;

try {
  if (typeof window !== "undefined" && window.localStorage) {
    memoryToken = window.localStorage.getItem("authToken");
  }
} catch (e) {
  console.warn("localStorage is blocked or disabled in this iframe. Defaulting to safe in-memory session.");
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem("authToken");
      if (stored) {
        memoryToken = stored;
        return stored;
      }
    }
  } catch (e) {
    console.warn("localStorage access blocked.");
  }
  return memoryToken;
}

export function setAuthToken(token: string) {
  memoryToken = token;
  try {
    if (window.localStorage) {
      window.localStorage.setItem("authToken", token);
    }
  } catch (e) {
    console.warn("localStorage set failed. Session retained in-memory only.");
  }
}

export function removeAuthToken() {
  memoryToken = null;
  try {
    if (window.localStorage) {
      window.localStorage.removeItem("authToken");
    }
  } catch (e) {
    console.warn("localStorage clear failed.");
  }
}

// Safe custom fetch wrapper that automatically appends the JWT token to requests
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }
  
  console.log(`[apiFetch] Requesting: ${url}. Has token? ${!!token}`);

  // Intercept and append token only for standard API requests
  if (token && (url.startsWith("/api/") || url.includes("/api/"))) {
    init = init || {};
    
    // اگه body از نوع FormData باشه، Content-Type رو مرورگر خودش ست می‌کنه
    const isFormData = init.body instanceof FormData;
    const headersObj: Record<string, string> = {
      "Authorization": `Bearer ${token}`
    };
    if (!isFormData) {
      // فقط برای JSON content-type اضافه می‌کنیم اگه از قبل نبوده
      if (!init.headers || !(init.headers as any)["Content-Type"]) {
        // نگذاریم اگه کاربر خودش تعریف کرده
      }
    }

    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => { headersObj[key] = value; });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => { headersObj[key] = value; });
      } else {
        Object.assign(headersObj, init.headers);
      }
    }

    // برای FormData هرگز Content-Type ست نکن — مرورگر boundary رو خودش می‌ذاره
    if (isFormData) delete headersObj["Content-Type"];

    init.headers = headersObj;
  }

  return window.fetch(input, init);
}
