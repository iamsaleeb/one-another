// The push token this device registered, kept so signing out can withdraw it.
// Storage can be missing or blocked; then there is nothing to withdraw.

const KEY = "push-token";

export function rememberDeviceToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Not stored: sign-out cannot withdraw it, the next sign-in reassigns it.
  }
}

// Returns the stored token and forgets it.
export function takeDeviceToken(): string | undefined {
  try {
    const token = localStorage.getItem(KEY) ?? undefined;
    localStorage.removeItem(KEY);
    return token;
  } catch {
    return undefined;
  }
}
