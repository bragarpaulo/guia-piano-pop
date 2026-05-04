const PREFIX = "/guia-piano-pop";
const ORIGIN = "https://guia-piano-pop.pages.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === PREFIX) {
      return Response.redirect(url.origin + PREFIX + "/" + url.search, 301);
    }

    if (!url.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = new URL(ORIGIN);
    upstream.pathname = url.pathname.slice(PREFIX.length) || "/";
    upstream.search = url.search;

    const upstreamReq = new Request(upstream.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });

    return fetch(upstreamReq);
  },
};
