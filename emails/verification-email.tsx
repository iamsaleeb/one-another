import * as React from "react";

interface VerificationEmailProps {
  name: string;
  otp: string;
}

export function VerificationEmail({ name, otp }: VerificationEmailProps) {
  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        padding: "40px 24px",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        1Another
      </h1>
      <p style={{ fontSize: 16, color: "#444", marginBottom: 32 }}>
        Hi {name}, verify your email address to activate your account.
      </p>
      <div
        style={{
          background: "#f4f4f5",
          borderRadius: 12,
          padding: "24px 32px",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <p style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
          Your verification code
        </p>
        <p
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 8,
            color: "#111",
            margin: 0,
          }}
        >
          {otp}
        </p>
      </div>
      <p style={{ fontSize: 14, color: "#888" }}>
        This code expires in 15 minutes. If you didn&apos;t create a 1Another
        account, you can safely ignore this email.
      </p>
    </div>
  );
}
