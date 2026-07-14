import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { deleteOnboarding, listOnboardings } from "../api/client";
import type { OnboardingRecord } from "../api/types";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { IconButton } from "../components/IconButton";
import { Spinner } from "../components/Spinner";
import { TrashIcon } from "../components/TrashIcon";

export function OnboardingListPage() {
  const [records, setRecords] = useState<OnboardingRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listOnboardings()
      .then(setRecords)
      .catch((err) => setError(err.message));
  }, []);

  async function handleDelete(e: MouseEvent, id: string, employeeName: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete the onboarding for ${employeeName}? This can't be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteOnboarding(id);
      setRecords((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <Card tint="error">{error}</Card>
      </div>
    );
  }

  if (records === null) {
    return <Spinner label="Loading onboardings..." />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-headline-small font-medium text-on-surface">Onboardings</h1>

      {records.length === 0 ? (
        <Card className="text-on-surface-variant">
          No onboardings yet. Click &ldquo;New onboarding&rdquo; to create one.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r) => (
            <Link key={r.id} to={`/onboardings/${r.id}`} className="no-underline">
              <Card className="flex items-center justify-between gap-4 hover:shadow-elevation-2">
                <div>
                  <p className="text-title-medium font-medium text-on-surface">{r.employeeName}</p>
                  <p className="text-body-medium text-on-surface-variant">
                    {r.employeeEmail} &middot; {r.profile.name} &middot; {r.project.name}
                  </p>
                  <p className="text-body-medium text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Chip tone={r.status === "approved" ? "primary" : "secondary"}>{r.status}</Chip>
                  <IconButton
                    tone="error"
                    aria-label={`Delete onboarding for ${r.employeeName}`}
                    title="Delete onboarding"
                    disabled={deletingId === r.id}
                    onClick={(e) => handleDelete(e, r.id, r.employeeName)}
                  >
                    <TrashIcon className={`h-5 w-5 ${deletingId === r.id ? "animate-pulse" : ""}`} />
                  </IconButton>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
