import { supabase } from './supabase'

/**
 * logActivity — fire-and-forget insert into activity_feed.
 * Callers don't await; failures are swallowed with a console warning
 * so a broken activity log never blocks the primary mutation.
 */
export function logActivity({ business_id, division_slug, event_type, title, subtitle, entity_type, entity_id, actor_id, actor_name, metadata }) {
  if (!business_id || !event_type || !title) return Promise.resolve()
  return supabase.from('activity_feed').insert({
    business_id,
    division_slug: division_slug ?? null,
    event_type,
    title,
    subtitle: subtitle ?? null,
    entity_type: entity_type ?? null,
    entity_id: entity_id ?? null,
    actor_id: actor_id ?? null,
    actor_name: actor_name ?? null,
    metadata: metadata ?? {},
  }).then(({ error }) => {
    if (error) console.warn('[logActivity]', error.message)
  })
}
