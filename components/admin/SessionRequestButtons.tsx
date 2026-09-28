import { approveSession, declineSession } from "@/app/actions/booking";
import { ConfirmSubmit } from "@/components/admin/ClientForms";

/** Approve or decline a client's booking request. */
export function SessionRequestButtons({ sessionId, label }: { sessionId: number; label: string }) {
  return (
    <div className="pt-request-actions">
      <form action={approveSession.bind(null, sessionId)}>
        <button type="submit" className="pt-btn pt-btn-primary">
          Approve
        </button>
      </form>
      <form action={declineSession.bind(null, sessionId)}>
        <ConfirmSubmit
          label="Decline"
          confirmText={`Decline ${label}? The client is emailed and the session goes back into their package.`}
        />
      </form>
    </div>
  );
}
