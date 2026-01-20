---
paths: src/**/*.{ts,tsx}
---

# Supabase Realtime

## Core Rules

### Do

- Use `broadcast` for all realtime events (database changes, messaging, notifications)
- Use `presence` sparingly for user state tracking only
- Create indexes for columns used in RLS policies
- Use topic names: `scope:entity` (e.g., `room:123:messages`)
- Use snake_case event names: `entity_action` (e.g., `message_created`)
- Include unsubscribe/cleanup logic in all implementations
- Set `private: true` for channels using database triggers or RLS

### Don't

- Use `postgres_changes` for new applications (doesn't scale)
- Create multiple subscriptions without cleanup
- Use generic event names like "update" or "change"
- Subscribe directly in render functions

## Function Selection

| Use Case                       | Recommended                       |
| ------------------------------ | --------------------------------- |
| Custom payloads                | `broadcast`                       |
| Database change notifications  | `broadcast` via database triggers |
| High-frequency updates         | `broadcast` with minimal payload  |
| User presence/status           | `presence` (sparingly)            |
| Client to client communication | `broadcast` without triggers      |

## React Pattern

```javascript
const channelRef = useRef(null);

useEffect(() => {
  if (channelRef.current?.state === 'subscribed') return;

  const channel = supabase.channel('room:123:messages', {
    config: { private: true }
  });
  channelRef.current = channel;

  await supabase.realtime.setAuth();

  channel
    .on('broadcast', { event: 'message_created' }, handleMessage)
    .subscribe();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [roomId]);
```

## Database Trigger Pattern

```sql
CREATE OR REPLACE FUNCTION room_messages_broadcast_trigger()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'room:' || COALESCE(NEW.room_id, OLD.room_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

## Authorization

```sql
-- RLS policy for private channels
CREATE POLICY "room_members_can_read" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'room:%' AND
  EXISTS (
    SELECT 1 FROM room_members
    WHERE user_id = auth.uid()
    AND room_id = SPLIT_PART(topic, ':', 2)::uuid
  )
);

-- Required index
CREATE INDEX idx_room_members_user_room
ON room_members(user_id, room_id);
```

## Checklist

- ✅ Favor `broadcast` over `postgres_changes`
- ✅ Check channel state before subscribing
- ✅ Include cleanup/unsubscribe logic
- ✅ Use consistent naming conventions
- ✅ Set `private: true` for database triggers
- ✅ Add indexes for RLS policies
