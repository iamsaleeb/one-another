import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — 1Another",
};

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Effective date: 1 April 2025</p>

      <p>
        Welcome to <strong>1Another</strong>, a platform that helps people
        discover and connect with church events and communities. By creating an
        account or using the 1Another app, you agree to these Terms of Service.
        Please read them carefully.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
      <p>
        By accessing or using 1Another you confirm that you are at least 13
        years old, that you have read and understood these terms, and that you
        agree to be bound by them. If you do not agree, do not use the app.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. Your Account</h2>
      <p>
        You are responsible for keeping your login credentials secure and for
        all activity that occurs under your account. Provide accurate
        information when registering and keep it up to date. Notify us
        immediately if you suspect unauthorised access to your account.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. Acceptable Use</h2>
      <p>When using 1Another you agree not to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Post false, misleading, or offensive content</li>
        <li>Harass, threaten, or harm other users or church communities</li>
        <li>Use the platform for spam, advertising, or commercial solicitation</li>
        <li>Attempt to gain unauthorised access to other accounts or our systems</li>
        <li>Violate any applicable law or regulation</li>
      </ul>
      <p className="mt-2">
        We reserve the right to suspend or remove accounts that violate these
        rules.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Event Bookings</h2>
      <p>
        When you register to attend an event you are making a commitment to the
        organising church or group. If you can no longer attend, please cancel
        your registration as early as possible so the spot can be offered to
        others. Repeated no-shows may result in restrictions on your account.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Organiser Responsibilities</h2>
      <p>
        If you create or manage events on 1Another you are responsible for
        providing accurate event details (date, time, location, capacity) and
        for communicating any changes or cancellations to attendees in a timely
        manner. You must ensure your events comply with applicable laws and the
        rules of any venue or organisation involved.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">6. Intellectual Property</h2>
      <p>
        The 1Another name, logo, and app design are our property. You retain
        ownership of any content you post, but you grant us a licence to
        display it within the app to provide the service.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">7. Disclaimers</h2>
      <p>
        1Another is provided &ldquo;as is&rdquo;. We do not guarantee that the
        app will always be available, error-free, or that event information
        posted by organisers is accurate. We are not responsible for the
        conduct of users, organisers, or events listed on the platform.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, 1Another and its operators
        will not be liable for any indirect, incidental, or consequential
        damages arising from your use of the app.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">9. Changes to These Terms</h2>
      <p>
        We may update these terms from time to time. We will notify you of
        significant changes via the app. Continued use after changes take
        effect constitutes acceptance of the updated terms.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">10. Contact</h2>
      <p>
        Questions about these terms? Reach us at{" "}
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
