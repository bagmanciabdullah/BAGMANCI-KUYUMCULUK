const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
for (const file of ['index.html','product.html','admin.html']) {
  const html = fs.readFileSync(__dirname + '/' + file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1], { filename: file });
}
for (const file of ['admin-media.js','site-media.js']) new vm.Script(fs.readFileSync(__dirname + '/' + file, 'utf8'), { filename: file });

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.value = ''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {} before() {} replaceWith() {}
  getContext() { return { fillRect() {}, drawImage() {} }; }
  toBlob(callback) { callback({ type: 'image/webp' }); }
}
const nodes = new Map();
const document = { head: new Element('head'), createElement: tag => new Element(tag), getElementById: id => {
  if (!nodes.has(id)) nodes.set(id, new Element('div'));
  return nodes.get(id);
} };
let uploads = 0, status;
const context = vm.createContext({ document, console, crypto: require('node:crypto').webcrypto, savingProduct: false,
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  Image: class { naturalWidth = 1200; naturalHeight = 800; set src(v) { this.onload?.(); } },
  setStatus: (...args) => status = args,
  supabaseClient: { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }),
    storage: { from: () => ({ upload: async () => { uploads++; return { error: null }; }, getPublicUrl: path => ({ data: { publicUrl: 'https://example.test/' + path } }) }) } }
});
vm.runInContext(fs.readFileSync(__dirname + '/admin-media.js','utf8') + '\nglobalThis.api = MediaAdmin;', context);
(async () => {
  const api = context.api;
  // Landscape crop and portrait contain must stay centered without distortion.
  const r = api.geometry(1200,800,600,600,{fit:'cover',zoom:1,x:50,y:50});
  assert.equal(r.w,900); assert.equal(r.x,-150); assert.equal(r.h,600);
  const p = api.geometry(800,1200,600,600,{fit:'contain',zoom:1,x:50,y:50});
  assert.equal(p.w,400); assert.equal(p.x,100); assert.equal(p.h,600);
  api.edit({ images: ['https://example.test/old.jpg'] });
  await api.add({ files: [{ name:'new.jpg',type:'image/jpeg',size:1000 },{ name:'movie.mp4',type:'video/mp4',size:1000 }],value:'' });
  let saved = await api.save('test');
  assert.equal(saved.length,3); assert.equal(saved[0].url,'https://example.test/old.jpg');
  assert.equal(saved[1].type,'image'); assert.equal(saved[2].type,'video');
  assert.equal(uploads,3); // Original image + crop + video.
  assert.ok(saved[1].original_url !== saved[1].url);
  await api.save('test'); assert.equal(uploads,3, 'Retry must reuse uploaded files');
  const root = document.getElementById('product-media-editor');
  root.children[2].children[2].children[0].onclick(); // Move video before the new image.
  saved = await api.save('test'); assert.equal(saved[1].type,'video');
  document.getElementById('product-media-editor').children[0].children[2].children[2].onclick();
  saved = await api.save('test'); assert.equal(saved.length,2); assert.equal(saved[0].type,'video');
  await api.add({ files:[{type:'text/html',size:100}],value:'' });
  assert.equal(status[2],'err'); assert.equal((await api.save('test')).length,2);
  api.reset(); assert.equal((await api.save('test')).length,0);
  api.edit({media:[{url:'https://example.test/crop.webp',original_url:'https://example.test/original.jpg',type:'image',crop:{fit:'cover',zoom:2,x:25,y:75}}]});
  saved=await api.save('test'); assert.equal(saved[0].crop.zoom,2); assert.equal(saved[0].original_url,'https://example.test/original.jpg');
  console.log('PASS: HTML/JS syntax; crop geometry; old photo preservation; multiple photos/video; reorder/remove; invalid uploads; retry reuse; existing crop restore.');
})().catch(error => { console.error(error); process.exitCode=1; });
