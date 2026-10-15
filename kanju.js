/**
 * 看剧AI (kanju.ai) — drpy2 模板格式源
 * 适配: 影视仓 / OK影视 / 猫影视 等使用 drpy2 引擎的 TVBox
 *
 * 说明:
 *  - drpy2 走「模板」格式: 首页/分类/搜索/详情/播放 通过 一级/二级/搜索/lazy 字段驱动,
 *    自定义逻辑用 js: 代码块实现 (结果写入 VODS / VOD / input)
 *  - 元数据接口需 HMAC-SHA256 签名 (密钥从站点 JS 提取)
 *  - 播放两段式: GET /v1/playback/resolve/{token} -> 线路表;
 *      url_kind=resolve_ticket 的线路再 POST /v1/playback/resolve-line {ticket} 取直链;
 *      url_kind=m3u8 的线路直接用 url
 */
var rule = {
    title: '看剧AI',
    host: 'https://kanju.ai',
    homeUrl: '/',
    class_name: '电影&剧集&动漫&综艺&短剧&纪录片&体育',
    class_url: 'movie&series&anime&variety&short_drama&documentary&sports',
    searchUrl: '/',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    },

    // 签名密钥 (从站点 JS 提取; 站点若更换需同步修改)
    SIGN_KEY: '557d0e4ae929f438da6bd84412374e6086b8af09b3fed54bf22601d5bf8c54a0',
    BUILD_VERSION: 'dianyingtiantang-v2026.10.10.2-download-source-entry-aa4983cf2052-web',

    // ========== 预处理: 注入全局签名/请求辅助函数 ==========
    预处理: `js:
var _KK = rule.SIGN_KEY;
var _HOST = rule.host;
var _VER = rule.BUILD_VERSION;
var _UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
var _NL = String.fromCharCode(10);
function _sha(ascii){
  function rr(v,a){ return (v>>>a)|(v<<(32-a)); }
  var mp = Math.pow, mw = mp(2,32), r='', words=[], h=[], k=[], pc=0, comp={};
  var bits = ascii.length*8;
  for(var c=2; pc<64; c++){
    if(!comp[c]){
      for(var i=0;i<313;i+=c) comp[i]=c;
      h[pc]=(mp(c,.5)*mw)|0; k[pc++]=(mp(c,1/3)*mw)|0;
    }
  }
  ascii += String.fromCharCode(128);
  while(ascii.length%64-56) ascii += String.fromCharCode(0);
  for(var i=0;i<ascii.length;i++){
    var j=ascii.charCodeAt(i);
    if(j>>8) return '';
    words[i>>2] |= j << ((3-i)%4)*8;
  }
  words[words.length]=((bits/mw)|0);
  words[words.length]=(bits);
  for(var j2=0;j2<words.length;){
    var w=words.slice(j2,j2+=16), oh=h.slice(0,8);
    for(var i2=0;i2<64;i2++){
      var w15=w[i2-15], w2=w[i2-2];
      var a=h[0], e=h[4];
      var t1=h[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&h[5])^((~e)&h[6]))+k[i2]+(w[i2]=(i2<16)?w[i2]:(w[i2-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i2-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      var t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&h[1])^(a&h[2])^(h[1]&h[2]));
      h=[(t1+t2)|0].concat(h);
      h[4]=(h[4]+t1)|0;
    }
    for(var i3=0;i3<8;i3++) h[i3]=(h[i3]+oh[i3])|0;
  }
  for(var i4=0;i4<8;i4++){
    for(var j4=3;j4+1;j4--){
      var b=(h[i4]>>(j4*8))&255;
      r+=((b<16)?0:'')+b.toString(16);
    }
  }
  return r;
}
function _hmac(key,data){
  var bs=64;
  if(key.length>bs) key=_sha(key);
  function h2b(hex){ var s=''; for(var i=0;i<hex.length;i+=2) s+=String.fromCharCode(parseInt(hex.substr(i,2),16)); return s; }
  var kp='', ip='';
  for(var i=0;i<bs;i++){
    var kc = i<key.length?key.charCodeAt(i):0;
    kp += String.fromCharCode(kc^0x5c);
    ip += String.fromCharCode(kc^0x36);
  }
  return _sha(kp + h2b(_sha(ip + data)));
}
function _sign(method, path){
  var ts = String(Date.now());
  var nonce = '';
  var chars = '0123456789abcdef';
  for(var i=0;i<32;i++) nonce += chars[Math.floor(Math.random()*16)];
  var sig = _hmac(_KK, method.toUpperCase() + _NL + path + _NL + ts + _NL + nonce);
  return {
    'x-ai-movie-timestamp': ts,
    'x-ai-movie-nonce': nonce,
    'x-ai-movie-signature': sig,
    'x-ai-movie-client-name': 'dianyingtiantang-frontend',
    'x-ai-movie-client-version': '1.0.0',
    'x-ai-movie-build-version': _VER,
    'x-ai-movie-protocol-version': '2026-07-05.library-v2.playback-v1',
    'User-Agent': _UA,
    'Referer': _HOST + '/',
    'Accept': 'application/json'
  };
}
function _line(o){ return o.display_label || o.label || o.provider_name || ''; }
globalThis.kjGet = function(path){
  try { return JSON.parse(request(_HOST + path, { headers: _sign('GET', path), method: 'GET' })); }
  catch(e){ return {}; }
};
globalThis.kjPost = function(path, body){
  try {
    var h = _sign('POST', path);
    h['Content-Type'] = 'application/json';
    return JSON.parse(request(_HOST + path, { headers: h, method: 'POST', body: JSON.stringify(body) }));
  } catch(e){ return {}; }
};
globalThis.kjB64 = function(s){ try { return base64Encode(s); } catch(e){ return s; } };
globalThis.kjLine = _line;
globalThis.kjPlay = function(token, flag){
  try {
    var rj = kjGet('/v1/playback/resolve/' + encodeURIComponent(token) + '?view=compact');
    var opts = (rj && rj.line_options) || [];
    var picked = null;
    for(var i=0;i<opts.length;i++){ if(_line(opts[i]) === flag){ picked = opts[i]; break; } }
    if(!picked){ for(var i2=0;i2<opts.length;i2++){ if(opts[i2].selected){ picked = opts[i2]; break; } } }
    if(!picked && opts.length) picked = opts[0];
    if(picked && picked.url){
      var u = String(picked.url);
      if(u.indexOf('resolve://') === 0){
        var rl = kjPost('/v1/playback/resolve-line?view=compact', { ticket: u.replace('resolve://', '') });
        return (rl && rl.line && rl.line.url) || '';
      }
      return u;
    }
  } catch(e){}
  return '';
};
`,

    // ========== 首页推荐 ==========
    推荐: `js:
var j = kjGet('/v1/browse/catalog?intent=latest_catalog&kind=movie');
var d = [];
var cards = (j && j.cards) || [];
for (var i=0;i<cards.length;i++){
  var c = cards[i];
  d.push({ vod_id: c.id, vod_name: c.title, vod_pic: c.poster_url, vod_remarks: ((c.year||'')+' '+(c.remarks||'')).trim() });
}
VODS = d;
`,

    // ========== 分类列表 ==========
    一级: `js:
var tid = MY_CATE || 'movie';
var pg = MY_PAGE || 1;
var j = kjGet('/v1/browse/catalog?intent=latest_catalog&kind=' + encodeURIComponent(tid) + '&page=' + pg);
var d = [];
var cards = (j && j.cards) || [];
for (var i=0;i<cards.length;i++){
  var c = cards[i];
  d.push({ vod_id: c.id, vod_name: c.title, vod_pic: c.poster_url, vod_remarks: ((c.year||'')+' '+(c.remarks||'')).trim() });
}
VODS = d;
`,

    // ========== 搜索 ==========
    搜索: `js:
var kw = KEY || '';
var j = kjGet('/v1/suggest?q=' + encodeURIComponent(kw));
var d = [];
var sugs = (j && j.suggestions) || [];
for (var i=0;i<sugs.length;i++){
  var s = sugs[i];
  if (s.type !== 'title') continue;
  var t = s.target || {};
  if (!t.variant_id) continue;
  d.push({ vod_id: t.variant_id, vod_name: t.title || s.label, vod_pic: '', vod_remarks: s.subtitle || '' });
}
VODS = d;
`,

    // ========== 详情 (含多线路, 剧集 id 用 base64 包裹供播放阶段还原) ==========
    二级: `js:
var id = orId;
var j = kjGet('/v1/catalog/' + encodeURIComponent(id));
var eps = (j && j.episodes) || [];
var lines = [];
if (eps.length){
  var rj = kjGet('/v1/playback/resolve/' + encodeURIComponent(eps[0].token) + '?view=compact');
  var opts = (rj && rj.line_options) || [];
  for (var k=0;k<opts.length;k++){
    var nm = kjLine(opts[k]);
    if (nm && lines.indexOf(nm) < 0) lines.push(nm);
  }
}
if (!lines.length) lines = ['看剧AI'];
var epList = [];
for (var e=0;e<eps.length;e++){
  epList.push((eps[e].title || ('第'+(e+1)+'集')) + '$' + kjB64(eps[e].token));
}
var epStr = epList.join('#');
var froms = [], urls = [];
for (var k2=0;k2<lines.length;k2++){ froms.push(lines[k2]); urls.push(epStr); }
VOD = {
  vod_id: id,
  vod_name: j.title || '',
  vod_pic: j.poster_url || '',
  vod_actor: (j.actors || []).join(','),
  vod_director: (j.directors || []).join(','),
  vod_content: j.description || '',
  vod_play_from: froms.join('$$$'),
  vod_play_url: urls.join('$$$')
};
`,

    // ========== 播放 (免嗅 js: 还原 token 并解析真链) ==========
    play_parse: true,
    lazy: `js:
var _tok = input;
if (typeof _tok === 'object' && _tok) { /* 已是对象 */ }
else {
  var _u = kjPlay(String(_tok||''), flag);
  input = { parse: 0, url: _u, header: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' } };
}
`
};
