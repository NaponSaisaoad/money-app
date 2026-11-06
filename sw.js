var C="money-app-v1";
var FILES=["./","index.html","manifest.json","icon-192.png","icon-512.png","icon-180.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(FILES)}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==C}).map(function(n){return caches.delete(n)}))}));self.clients.claim()});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(function(r){
    if(r.ok&&(new URL(e.request.url).origin===location.origin||e.request.url.indexOf("fonts.")>-1)){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)})}
    return r;
  }).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match("index.html")})}));
});
