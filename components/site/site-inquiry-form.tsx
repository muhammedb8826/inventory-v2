"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type {
  CreatePublicInquiryBody,
  PublicInquiryResponse,
} from "@/lib/types";

export function SiteInquiryForm({
  headingId = "inquire-heading",
}: {
  headingId?: string;
}) {
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone.trim() && !email.trim()) {
      setError("Please include a phone number or email so we can reply.");
      return;
    }

    setLoading(true);
    try {
      const body: CreatePublicInquiryBody = {
        contactName: contactName.trim(),
        subject: subject.trim(),
        message: message.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      };
      const res = await api<PublicInquiryResponse>("/public/inquiries", {
        method: "POST",
        body,
        auth: false,
      });
      setSuccess(res.message || "Inquiry submitted successfully");
      setContactName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-md border border-[var(--site-line)] bg-[var(--site-surface)] px-3.5 py-2.5 text-[15px] text-[var(--site-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--site-ink-soft)]/70 focus:border-[var(--site-accent)] focus:shadow-[0_0_0_3px_var(--site-accent-soft)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      aria-labelledby={headingId}
    >
      <div className="space-y-2">
        <label
          htmlFor="site-name"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Your name
        </label>
        <input
          id="site-name"
          required
          autoComplete="name"
          className={fieldClass}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="site-phone"
            className="block text-sm font-medium text-[var(--site-ink)]"
          >
            Phone
          </label>
          <input
            id="site-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="0911…"
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="site-email"
            className="block text-sm font-medium text-[var(--site-ink)]"
          >
            Email
          </label>
          <input
            id="site-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--site-ink-soft)]">
        Include at least one way for us to reach you — phone or email.
      </p>

      <div className="space-y-2">
        <label
          htmlFor="site-subject"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Subject
        </label>
        <input
          id="site-subject"
          required
          placeholder="Quote for a dining set"
          className={fieldClass}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="site-message"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Message
        </label>
        <textarea
          id="site-message"
          required
          rows={5}
          placeholder="Tell us what you need — size, quantity, timeline…"
          className={`${fieldClass} resize-y min-h-[8rem]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-[#a33a2f]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-md bg-[var(--site-accent-soft)] px-3 py-2.5 text-sm text-[var(--site-accent)]"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--site-accent)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--site-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
