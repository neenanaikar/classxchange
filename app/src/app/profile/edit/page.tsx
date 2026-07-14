"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

export default function EditProfilePage() {
  const { address } = useAccount();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteStudio, setFavoriteStudio] = useState("");
  const [favoriteClass, setFavoriteClass] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    fetch(`/api/users/${address}`)
      .then((r) => r.json())
      .then((data) => {
        setUsername(data.username ?? "");
        setDisplayName(data.displayName ?? "");
        setFavoriteStudio(data.favoriteStudio ?? "");
        setFavoriteClass(data.favoriteClass ?? "");
        setProfileImageUrl(data.profileImageUrl ?? null);
      })
      .finally(() => setLoading(false));
  }, [address]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address) {
      setError("Sign in first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uploadedImageUrl = profileImageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        uploadedImageUrl = url;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          username,
          displayName,
          profileImageUrl: uploadedImageUrl,
          favoriteStudio,
          favoriteClass,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save profile");
      }

      router.push(`/profile/${address}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Sign in to set up your profile.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        Your profile
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Profile picture">
          <div className="flex items-center gap-4">
            {profileImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profileImageUrl}
                alt=""
                className="h-16 w-16 border border-[color:var(--color-border)] object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[color:var(--color-text-dim)] file:mr-4 file:border file:border-[color:var(--color-border)] file:bg-transparent file:px-4 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.15em] file:text-[color:var(--color-text)]"
            />
          </div>
        </Field>

        <Field label="Username">
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="jane_doe"
            className="input"
          />
          <p className="mt-2 text-xs text-[color:var(--color-text-dim)]">
            3-20 characters: letters, numbers, underscore. This is how
            friends find you.
          </p>
        </Field>

        <Field label="Display name (optional)">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Doe"
            className="input"
          />
        </Field>

        <Field label="Favorite studio (optional)">
          <input
            value={favoriteStudio}
            onChange={(e) => setFavoriteStudio(e.target.value)}
            placeholder="Barry's Bootcamp"
            className="input"
          />
        </Field>

        <Field label="Favorite class (optional)">
          <input
            value={favoriteClass}
            onChange={(e) => setFavoriteClass(e.target.value)}
            placeholder="Full Body 60"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-[color:var(--color-accent)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[color:var(--color-accent)] py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
        {label}
      </span>
      {children}
    </label>
  );
}
