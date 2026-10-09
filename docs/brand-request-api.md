# Brand-use request: backend contract

The Brand kit page posts a request here when `BRAND_REQUEST_ENDPOINT` is set (build environment variable `LAB_BRAND_ENDPOINT`). Without it the page says requests open soon and points to Discord.

`POST` with `content-type: application/json`:

| field | rules |
|---|---|
| `name` | required, plain text |
| `email` | required, a valid address |
| `discord` | optional |
| `uses` | array, at least one of `video`, `article`, `list`, `social`, `event`, `merch`, `other` |
| `files` | one of `logo`, `animated`, `discord`, `seasonal`, `many` |
| `link` | required, `https` only |
| `description` | required, plain text, at most 600 characters |
| `agree` | must be `true` |

The browser checks these rules for friendly errors. **The server must check them again** and must:

- reject non-`https` links and over-long text, and never render a submitted value as HTML;
- rate limit per address, and run a bot check (the form also has a hidden field named `site`; a request with it filled in is a bot);
- store each request with its fields, the time and a status (`new`, `approved`, `declined`);
- notify the team on Discord;
- never approve automatically: a person replies;
- keep the data only to answer the request, and delete it on request.

Respond `2xx` on success. Any other status makes the page show a "could not send" message.
