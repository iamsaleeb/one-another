import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — 1Another",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Effective date: 1 April 2025</p>

      <p>
        This Privacy Policy explains how <strong>1Another</strong> collects,
        uses, and protects your personal information when you use our app.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Information We Collect</h2>
      <p>We collect the following information when you use 1Another:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Account information:</strong> your name and email address,
          provided when you register
        </li>
        <li>
          <strong>Profile image:</strong> if you choose to add one
        </li>
        <li>
          <strong>Event activity:</strong> events you register for, attend, or
          create, and churches or series you follow
        </li>
        <li>
          <strong>Device token:</strong> a push notification token generated
          by your device so we can send you event reminders and updates — this
          is processed by Google Firebase Cloud Messaging
        </li>
        <li>
          <strong>Usage data:</strong> basic app usage information to help us
          improve the service
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Create and manage your account</li>
        <li>Display events, churches, and series relevant to you</li>
        <li>
          Send push notifications about events you have registered for
          (reminders, cancellations, changes) — you can manage these in your
          profile settings
        </li>
        <li>Allow organisers to see who has registered for their events</li>
        <li>Improve and maintain the app</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. How We Share Your Information</h2>
      <p>We do not sell your personal data. We share it only in these circumstances:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Event organisers:</strong> your name may be visible to
          organisers of events you register for
        </li>
        <li>
          <strong>Google Firebase:</strong> your device push token is
          transmitted to Google Firebase Cloud Messaging to deliver
          notifications, subject to{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Google&apos;s Privacy Policy
          </a>
        </li>
        <li>
          <strong>Legal requirements:</strong> if required by law or to
          protect our rights
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Data Retention</h2>
      <p>
        We retain your account data for as long as your account is active. If
        you request account deletion, we will remove your personal data within
        30 days, except where we are required to retain it by law.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and associated data</li>
        <li>Opt out of push notifications at any time via your profile settings</li>
      </ul>
      <p className="mt-2">
        To exercise these rights, contact us at{" "}
        <a
          href="mailto:support@oneanother.app"
          className="underline underline-offset-4 hover:text-primary"
        >
          support@oneanother.app
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">6. Children</h2>
      <p>
        1Another is not directed at children under 13. We do not knowingly
        collect personal information from children under 13. If you believe a
        child has provided us with their data, please contact us and we will
        delete it promptly.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">7. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including
        encrypted passwords and secure HTTPS connections. No method of
        transmission over the internet is completely secure, but we take
        reasonable steps to protect your information.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">8. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. We will notify you of
        significant changes via the app. The effective date at the top of this
        page will reflect when the policy was last updated.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">9. Contact</h2>
      <p>
        Questions or concerns about your privacy? Contact us at{" "}
        <a
          href="mailto:support@oneanother.app"
          className="underline underline-offset-4 hover:text-primary"
        >
          support@oneanother.app
        </a>
        .
      </p>
    </article>
  );
}
