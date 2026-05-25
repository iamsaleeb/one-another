import { Resend } from "resend";

let _resend: Resend | null = null;

// Lazily instantiated so the Resend constructor never runs at build time
export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
      throw new Error("RESEND_API_KEY environment variable is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}
