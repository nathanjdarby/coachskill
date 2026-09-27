import { sendClientMessage } from "@/app/actions/portal";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { MessageComposer, MessageThread } from "@/components/portal/MessageThread";
import { requireClient } from "@/lib/dal";
import { listMessages, markMessagesRead } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function PortalMessagesPage() {
  const user = await requireClient();
  await markMessagesRead(user.clientId, "client");
  const thread = await listMessages(user.clientId);

  return (
    <div className="pt-page pt-narrow pt-messages-page">
      <AutoRefresh seconds={20} />
      <div className="pt-page-head">
        <h1>Messages</h1>
        <p className="pt-muted">A private conversation between you and Monika.</p>
      </div>
      <section className="pt-card pt-messages-card">
        <MessageThread
          emptyText="No messages yet. Say hello, or ask anything between sessions."
          messages={thread.map((m) => ({
            id: m.message.id,
            body: m.message.body,
            mine: m.message.senderId === user.id,
            senderName: m.senderName,
            sentAt: formatDateTime(m.message.createdAt),
          }))}
        />
        <MessageComposer action={sendClientMessage} placeholder="Message Monika…" />
      </section>
    </div>
  );
}
