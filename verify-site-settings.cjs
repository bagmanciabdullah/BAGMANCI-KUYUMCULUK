const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
async function themeTest(rows, expected) {
  let changed;
  const hero = { src:'original.jpg',getAttribute(){return this.src;},parentElement:{style:{}},style:{} };
  const body = {dataset:{theme:'day'},style:{setProperty(){}}};
  const context = {URL,console,window:{BAGMANCI_SUPABASE:{url:'https://example.test',anonKey:'test'},supabase:{createClient:()=>({from:()=>({select:async()=>({data:rows})})})}},
    document:{body,querySelector:()=>hero},MutationObserver:class{constructor(fn){changed=fn;} observe(){}}};
  await vm.runInNewContext(fs.readFileSync(__dirname+'/site-media.js','utf8'),context);
  assert.equal(hero.src,expected[0]);
  body.dataset.theme='night'; changed(); assert.equal(hero.src,expected[1]);
  body.dataset.theme='day'; changed(); assert.equal(hero.src,expected[0]);
}
(async()=>{
  await themeTest([{key:'hero:day',url:'https://example.test/day.jpg'},{key:'hero:night',url:'https://example.test/night.jpg'}],['https://example.test/day.jpg','https://example.test/night.jpg']);
  await themeTest([{key:'hero:main',url:'https://example.test/old.jpg'},{key:'hero:day',url:'https://example.test/day.jpg'}],['https://example.test/day.jpg','https://example.test/old.jpg']);
  await themeTest([],['original.jpg','original.jpg']);
  const html=fs.readFileSync(__dirname+'/admin.html','utf8');
  assert.match(html,/<form[^>]+id="login-panel"[^>]+onsubmit=/);
  assert.match(html,/<form[^>]+id="mfa-panel"[^>]+onsubmit=/);
  const handler=html.slice(html.indexOf('    async function submitAdminAuth('),html.indexOf('    async function login()'));
  let calls=0, complete;
  const form={dataset:{},querySelector:()=>submit},submit={disabled:false};
  const c=vm.createContext({login:()=>{calls++;return new Promise(r=>complete=r);},verifyMfa:async()=>{calls++;},setStatus(){}});
  vm.runInContext(handler,c);
  const event={preventDefault(){},currentTarget:form};
  const pending=c.submitAdminAuth(event,'login');
  await c.submitAdminAuth(event,'login'); assert.equal(calls,1); assert.equal(submit.disabled,true);
  complete(); await pending; assert.equal(submit.disabled,false);
  await c.submitAdminAuth(event,'mfa'); assert.equal(calls,2);
  console.log('PASS: day/night switching, legacy hero fallback, login and MFA submission, duplicate submission guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
