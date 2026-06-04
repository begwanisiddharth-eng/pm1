import { useState } from "react";
import { changePassword } from "@/lib/api";

type Props = {
  onClose: () => void;
};

export const ChangePasswordModal = ({ onClose }: Props) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          Change password
        </h2>
        {success ? (
          <p className="mt-4 text-sm text-green-600">Password changed successfully.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="cp-current"
                className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]"
              >
                Current password
              </label>
              <input
                id="cp-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                aria-label="Current password"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="cp-new"
                className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]"
              >
                New password
              </label>
              <input
                id="cp-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                aria-label="New password"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="cp-confirm"
                className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]"
              >
                Confirm new password
              </label>
              <input
                id="cp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "Enter") void handleSubmit();
                }}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                aria-label="Confirm new password"
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-600">{error}</p>
            )}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="rounded-lg bg-[var(--primary-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Saving..." : "Change password"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
