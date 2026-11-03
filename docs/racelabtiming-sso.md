# CheerSpot Admin sign-in from Race Lab Timing

Staff who are signed in to racelabtiming.20fit.id can open CheerSpot Admin without typing a password.
Race Lab Timing asks CheerSpot for a one-time sign-in link and sends the staff member to it.

## What Race Lab Timing does

1. Show a **CheerSpot Admin** button, only to staff who may moderate cheers.
2. When the button is clicked, the Race Lab Timing **server** calls the API below.
3. The server redirects the browser to the `url` that comes back, or opens it in a new tab.

```
POST https://cpvzwqptzcxnwzfzgrmt.supabase.co/functions/v1/cheerspot-sso
x-cheerspot-sso-key: <CHEERSPOT_SSO_KEY>
```

Response `200`:

```json
{ "url": "https://cheerspot.20fit.id/admin#sso=..." }
```

Example (Node.js, server side):

```js
const res = await fetch('https://cpvzwqptzcxnwzfzgrmt.supabase.co/functions/v1/cheerspot-sso', {
  method: 'POST',
  headers: { 'x-cheerspot-sso-key': process.env.CHEERSPOT_SSO_KEY },
})
if (!res.ok) throw new Error(`CheerSpot sign-in failed: ${res.status}`)
const { url } = await res.json()
// redirect the staff member to url
```

## Rules

- **The key stays on the server.** Do not put it in browser code, an HTML page, or a URL. Store it as a
  server environment variable.
- **Ask for a new link on every click.** A link works once and expires after a short time. Do not save
  or reuse it.
- **Only staff get the button.** Anyone who receives a link is signed in as the CheerSpot superadmin.
- The CheerSpot session ends when the browser tab closes.

## Errors

| Status | Meaning |
| --- | --- |
| 401 | Wrong or missing `x-cheerspot-sso-key`. |
| 503 | CheerSpot has not finished setting up the key or the account. |
| 502 | The link could not be created. Try again. |

If a link has already been used or has expired, CheerSpot shows its sign-in page with a message. Clicking
the button in Race Lab Timing again fixes it.

## Turning access off

Change `CHEERSPOT_SSO_KEY` in Supabase Secrets. The old key stops working right away. Then give the new
key to the Race Lab Timing team privately.
