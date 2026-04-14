import { apiUrl } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
  csrfToken?: string;
  error?: string;
}

interface BaseResponse {
  success?: boolean;
  error?: string;
  message?: string;
  csrfToken?: string;
}

interface ProfileResponse extends BaseResponse {
  success: boolean;
  user: AuthUser;
}

let currentCsrfToken = "";

async function parseAuthResponse(response: Response) {
  const responseText = await response.text();
  let payload: AuthResponse = {
    authenticated: false,
    user: null,
  };

  try {
    payload = responseText ? JSON.parse(responseText) : payload;
  } catch {
    payload = {
      authenticated: false,
      user: null,
      error: "The server returned an unexpected response.",
    };
  }

  if (!response.ok) {
    throw new Error(payload.error || "Unable to complete the request.");
  }

  currentCsrfToken = payload.csrfToken || currentCsrfToken;

  return payload;
}

async function parseBaseResponse<T extends BaseResponse>(response: Response) {
  const responseText = await response.text();
  let payload = {} as T;

  try {
    payload = responseText ? (JSON.parse(responseText) as T) : payload;
  } catch {
    payload = {
      error: "The server returned an unexpected response.",
    } as T;
  }

  if (!response.ok) {
    throw new Error(payload.error || "Unable to complete the request.");
  }

  currentCsrfToken = payload.csrfToken || currentCsrfToken;
  return payload;
}

async function ensureCsrfToken() {
  if (currentCsrfToken) {
    return currentCsrfToken;
  }

  await fetchAuthStatus();
  return currentCsrfToken;
}

export async function createSessionHeaders(
  extraHeaders: HeadersInit = {}
): Promise<HeadersInit> {
  const csrfToken = await ensureCsrfToken();

  return {
    ...extraHeaders,
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
  };
}

export async function fetchAuthStatus() {
  const response = await fetch(apiUrl("/auth/status"), {
    credentials: "include",
  });

  return parseAuthResponse(response);
}

export async function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const headers = await createSessionHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}) {
  const headers = await createSessionHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
}

export async function logoutAccount() {
  const headers = await createSessionHeaders();
  const response = await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to sign out right now.");
  }

  currentCsrfToken = "";
}

export async function requestPasswordReset(payload: { email: string }) {
  const headers = await createSessionHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch(apiUrl("/auth/forgot-password"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  return parseBaseResponse<{
    success: boolean;
    message: string;
    csrfToken?: string;
    error?: string;
  }>(response);
}

export async function resetPassword(payload: {
  email: string;
  token: string;
  password: string;
}) {
  const headers = await createSessionHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch(apiUrl("/auth/reset-password"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  return parseBaseResponse<{
    success: boolean;
    message: string;
    csrfToken?: string;
    error?: string;
  }>(response);
}

export async function updateProfile(payload: { name: string }) {
  const headers = await createSessionHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch(apiUrl("/auth/profile"), {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  return parseBaseResponse<ProfileResponse>(response);
}
