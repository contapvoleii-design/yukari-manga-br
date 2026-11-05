const http = require("node:http");
const PORT = process.env.PORT || 10000;
const ALLOWED_ORIGINS = new Set(["https://contapvoleii-design.github.io"]);
const send = (res, status, data) => { res.writeHead(status, {"content-type":"application/json; charset=utf-8","access-control-allow-origin":"https://contapvoleii-design.github.io","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Content-Type","cache-control":"no-store"}); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req,res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, {"access-control-allow-origin":"https://contapvoleii-design.github.io","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Content-Type"}); return res.end(); }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") return send(res,200,{ok:true,service:"Yukari Manga BR API",chapterFetch:"experimental",translation:"not_configured"});
  if (url.pathname !== "/api/chapter") return send(res,404,{error:"Rota não encontrada"});
  let target;
  try { target = new URL(url.searchParams.get("url")); } catch { return send(res,400,{error:"Informe um link de capítulo válido."}); }
  if (target.protocol !== "https:" || !["mangafire.to","www.mangafire.to"].includes(target.hostname) || !target.pathname.includes("/chapter/")) return send(res,400,{error:"Por enquanto, somente links de capítulos do MangaFire são aceitos."});
  try {
    const upstream = await fetch(target.href,{headers:{"user-agent":"Mozilla/5.0 (compatible; YukariMangaBR/1.0)","accept":"text/html,application/xhtml+xml"} ,signal:AbortSignal.timeout(15000),redirect:"follow"});
    if (!upstream.ok) return send(res,502,{error:"O MangaFire recusou ou bloqueou a consulta ("+upstream.status+"). Não tentamos contornar a proteção do site.",blocked:true});
    const html = await upstream.text();
    const title = (html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)||[])[1]?.replace(/<[^>]+>/g,"").trim() || "Capítulo";
    const imageMatches = [...html.matchAll(/<img\\b[^>]*(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).filter(s=>/^https:\\/\\//i.test(s));
    const images = [...new Set(imageMatches)].filter(s=>{try{return ["mangafire.to","www.mangafire.to"].includes(new URL(s).hostname) || new URL(s).hostname.endsWith(".mangafire.to")}catch{return false}});
    return send(res,200,{title,images,count:images.length,translation:"not_configured",message:images.length?"Páginas encontradas; tradução OCR ainda precisa ser conectada.":"A página abriu, mas não foram identificadas imagens públicas no HTML."});
  } catch (e) { return send(res,502,{error:"Não foi possível acessar o capítulo: "+e.message,blocked:true}); }
});
server.listen(PORT,"0.0.0.0",()=>console.log("Yukari API listening on "+PORT));
