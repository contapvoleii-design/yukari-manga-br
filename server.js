const http = require("node:http");
const PORT = process.env.PORT || 10000;
const send = (res, status, data) => {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","access-control-allow-origin":"https://contapvoleii-design.github.io","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Content-Type","cache-control":"no-store"});
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req,res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, {"access-control-allow-origin":"https://contapvoleii-design.github.io","access-control-allow-methods":"GET, OPTIONS"}); return res.end(); }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") return send(res,200,{ok:true,service:"Yukari Manga BR API",chapterFetch:"experimental",translation:"not_configured"});
  if (url.pathname !== "/api/chapter") return send(res,404,{error:"Rota não encontrada"});
  let target;
  try { target = new URL(url.searchParams.get("url")); } catch { return send(res,400,{error:"Informe um link de capítulo válido."}); }
  if (target.protocol !== "https:" || target.hostname !== "mangafire.to" || !target.pathname.includes("/chapter/")) return send(res,400,{error:"Somente links de capítulos do MangaFire são aceitos."});
  try {
    const upstream = await fetch(target.href,{headers:{"user-agent":"Mozilla/5.0","accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(15000)});
    if (!upstream.ok) return send(res,502,{error:"MangaFire respondeu com status "+upstream.status+". O site pode estar bloqueando o acesso.",blocked:true});
    const html = await upstream.text();
    const titleStart = html.toLowerCase().indexOf("<title");
    const titleOpen = titleStart >= 0 ? html.indexOf(">", titleStart) : -1;
    const titleEnd = titleOpen >= 0 ? html.toLowerCase().indexOf("</title>", titleOpen) : -1;
    const title = titleEnd > titleOpen ? html.slice(titleOpen + 1, titleEnd).trim() : "Capítulo";
    const found = [];
    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      const m = tag.match(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i);
      if (m) { try { const imageUrl = new URL(m[1],target); if (imageUrl.protocol === "https:" && imageUrl.hostname.endsWith("mangafire.to")) found.push(imageUrl.href); } catch {} }
    }
    const images = [...new Set(found)];
    return send(res,200,{title,images,count:images.length,translation:"not_configured",message:images.length?"Páginas encontradas; OCR e tradução ainda não estão conectados.":"Nenhuma imagem pública foi identificada. O site pode carregar as páginas por API protegida."});
  } catch (e) { return send(res,502,{error:"Falha ao consultar capítulo: "+e.message,blocked:true}); }
});
server.listen(PORT,"0.0.0.0",()=>console.log("Yukari API listening on "+PORT));
