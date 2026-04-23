# Edge Functions

Server-side Deno functions run by Supabase. Wired into the UI via
`supabase.functions.invoke('name', { body })`.

## Functions

| name | trigger | purpose |
|---|---|---|
| `send-quote` | QuoteBuilder "Save & mark as sent" | email client with the public accept link, flip quote.status to sent, log activity |
| `complete-job-report` | NewJobReport submit | email client + owner with the completed report, photo grid, task list, log activity |

## Deploy

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli). Install
once, then:

```bash
supabase login                           # opens a browser to authorise
supabase link --project-ref ssnzebudcbrtpiwilroo

# Set the secrets the functions rely on (one-time)
supabase secrets set \
  RESEND_API_KEY="re_..." \
  RESEND_FROM_EMAIL="noreply@awcgroup.co.uk" \
  APP_URL="https://app.awcgroup.co.uk"

# Deploy
supabase functions deploy send-quote
supabase functions deploy complete-job-report
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-populated by the
Supabase runtime — don't override them.

## Verifying a domain in Resend

Before `RESEND_FROM_EMAIL` can send from `@awcgroup.co.uk`, add the domain
in [Resend dashboard → Domains](https://resend.com/domains) and paste the
DNS records into Cloudflare. Until then, use Resend's shared domain
(`onboarding@resend.dev`) for testing.

## Graceful fallback

The client-side calls to `supabase.functions.invoke` fall back to direct
row updates if a function returns an error or isn't deployed yet, so the
UI stays usable while functions land.
