"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type {
  CreatePublicInquiryBody,
  PublicInquiryResponse,
} from "@/lib/types";
import { Package2 } from "lucide-react";

export default function ContactPage() {
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
      setError("Provide at least a phone number or email");
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

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[var(--frappe-bg)] px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg border-[var(--frappe-border)] shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--frappe-text)]">
            <Package2 className="size-5" />
            <span className="font-semibold tracking-tight">Stock</span>
          </div>
          <CardTitle>Contact us</CardTitle>
          <CardDescription>
            Send a product question or quote request. We will follow up shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Your name</Label>
              <Input
                id="contact-name"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0911…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {success}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Submit inquiry"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Staff?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
