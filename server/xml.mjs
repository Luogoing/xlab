// A bounded XML subset reader for the gateway's Result/Patent documents.
// DTDs and custom entities are rejected; text, CDATA, attributes and nesting are retained.
const fail=()=>{throw Object.assign(Error('专利服务返回了无法解析的 XML'),{code:'INVALID_XML'});};
function decode(s){return s.replace(/&([^;]+);/g,(_,v)=>{const known={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(v in known)return known[v];if(/^#(?:x[0-9a-f]+|\d+)$/i.test(v)){const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1));if(n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff))return String.fromCodePoint(n);}return fail();});}
export function parseXML(xml){
  if(typeof xml!=='string'||Buffer.byteLength(xml)>5*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))return fail();
  const doc={name:'#document',attrs:{},children:[],parts:[]},stack=[doc];let i=0,nodes=0;
  while(i<xml.length){const parent=stack.at(-1);if(xml.startsWith('<!--',i)){const end=xml.indexOf('-->',i+4);if(end<0)return fail();i=end+3;continue;}
    if(xml.startsWith('<![CDATA[',i)){const end=xml.indexOf(']]>',i+9);if(end<0)return fail();parent.parts.push(xml.slice(i+9,end));i=end+3;continue;}
    if(xml.startsWith('<?',i)){const end=xml.indexOf('?>',i+2);if(end<0)return fail();i=end+2;continue;}
    if(xml[i]!=='<'){const end=xml.indexOf('<',i),stop=end<0?xml.length:end;const value=xml.slice(i,stop);if(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(value))return fail();parent.parts.push(decode(value));i=stop;continue;}
    const match=xml.slice(i).match(/^<\s*(\/?)\s*([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/);if(!match)return fail();i+=match[0].length;
    if(match[1]){if(stack.length<2||parent.name!==match[2]||match[3].trim())return fail();stack.pop();continue;}
    const self=/\/\s*$/.test(match[3]),raw=match[3].replace(/\/\s*$/,''),attrs={};let rest=raw;
    while(rest.trim()){const a=rest.match(/^\s+([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/);if(!a||Object.hasOwn(attrs,a[1]))return fail();attrs[a[1]]=decode(a[3]??a[4]);rest=rest.slice(a[0].length);}
    const node={name:match[2],attrs,children:[],parts:[]};parent.children.push(node);parent.parts.push(node);if(++nodes>100000||stack.length>100)return fail();if(!self)stack.push(node);
  }
  if(stack.length!==1||doc.children.length!==1||doc.parts.some(v=>typeof v==='string'&&v.trim()))return fail();return doc.children[0];
}
export function content(node){return node?node.parts.map(v=>typeof v==='string'?v:content(v)).join('').trim():'';}
export function children(node,name){return node?.children.filter(c=>c.name===name)||[];}
export function at(node,path){return path.split('/').reduce((n,k)=>n?.children.find(c=>c.name===k),node);}
export function all(node,name){if(!node)return [];return [...(node.name===name?[node]:[]),...node.children.flatMap(c=>all(c,name))];}
