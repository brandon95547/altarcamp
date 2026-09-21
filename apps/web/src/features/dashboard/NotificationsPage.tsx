import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { EmptyState, PageHeader, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDateTime } from '../../lib/format.js';
import { useMutation, useQuery } from '../../lib/useApi.js';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Spec §32 — in-app delivery. Email and push read the same rows in a later phase. */
export function NotificationsPage() {
  const { data, loading, reload } = useQuery<{ notifications: Notification[] }>(
    '/artists/me/notifications',
  );
  const markRead = useMutation(async () => api.post('/artists/me/notifications/read', {}));

  const unread = data?.notifications.filter((item) => !item.read_at).length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Notifications"
        title="What has happened"
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await markRead.run(undefined);
                reload();
              }}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      {loading ? <Spinner /> : null}

      {data && data.notifications.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="Split approvals, agreements and payments appear here."
        />
      ) : null}

      <ul className="grid gap-2">
        {data?.notifications.map((notification) => {
          const content = (
            <Card
              className={cn(
                'transition-colors',
                !notification.read_at && 'border-ember-300 bg-ember-50/40',
              )}
            >
              <CardBody className="flex items-start gap-3">
                <Bell
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    notification.read_at ? 'text-ink-400' : 'text-ember-600',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-950">{notification.title}</p>
                  {notification.body ? (
                    <p className="text-sm text-ink-700">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-600">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
          return (
            <li key={notification.id}>
              {notification.link ? <Link to={notification.link}>{content}</Link> : content}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
