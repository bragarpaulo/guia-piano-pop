# guia-piano-pop-proxy

Cloudflare Worker that proxies `biancaribeiro.art.br/guia-piano-pop/*` to the Pages project `guia-piano-pop.pages.dev`, stripping the `/guia-piano-pop` prefix.

## Deploy

```bash
CLOUDFLARE_ACCOUNT_ID=176e6ac523e7911af8ab5b0e14efafdb npx wrangler@latest deploy
```

Only redeploy when `src/index.js` or routes change. Site content updates flow via Pages auto-deploy on push to `main`.
