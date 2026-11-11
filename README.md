# SufTTY site

The site is a static export with Vercel Functions for the public CA display and a private developer panel.

## One-time Vercel setup

1. Import this project into Vercel and connect a **private** Vercel Blob store to it. This supplies the Blob credentials to the server functions.
2. Set `ADMIN_PASSWORD` to a random password with at least 32 characters.
3. Set `SESSION_SECRET` to a random secret with at least 32 characters.
4. Deploy the project. Open `/developer`, sign in, and paste the CA. The public homepage then shows the saved CA and lets visitors copy it.

Keep all environment values in Vercel Project Settings. Never put them in the HTML, JavaScript, or a public repository. If testing outside Vercel, use a local `.env` file and do not commit it.

The CA is stored in a private Blob store; only the public CA value is returned by `/api/ca`. Admin updates do not require another deployment.
