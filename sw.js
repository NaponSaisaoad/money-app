var C="money-app-v5";
var FILES=["./","index.html","manifest.json","icon-192.png","icon-512.png","icon-180.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(FILES)}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==C}).map(function(n){return caches.delete(n)}))}));self.clients.claim()});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET")return;
  var u=new URL(e.request.url);
  // ปล่อยคำขอของ Firebase (ล็อกอิน/ฐานข้อมูล) ผ่านไปตรงๆ
  if(u.pathname.indexOf("/__/")===0||/googleapis\.com$|firebaseapp\.com$/.test(u.hostname))return;
  var cacheable=u.origin===location.origin||u.hostname==="www.gstatic.com"||u.hostname.indexOf("fonts.")===0;
  e.respondWith(fetch(e.request).then(function(r){
    if(r.ok&&cacheable){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)})}
    return r;
  }).catch(function(){return caches.match(e.request).then(function(m){return m||(e.request.mode==="navigate"?caches.match("index.html"):Response.error())})}));
});
