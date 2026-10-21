(() => {
const KEY="lectorLibroWeb_v2", $=id=>document.getElementById(id);
let pages=[], worker=null, busy=false, voices=[], timer;
function toast(s){$("toast").textContent=s;$("toast").classList.remove("hide");clearTimeout(timer);timer=setTimeout(()=>$("toast").classList.add("hide"),4200)}
function save(show=false){try{localStorage.setItem(KEY,JSON.stringify({title:$("title").value||"Mi libro",text:$("text").value,pages}));$("words").textContent=( $("text").value.trim().match(/\S+/g)||[]).length+" palabras";if(show)toast("Cambios guardados en este dispositivo.")}catch(e){toast("No hay espacio. Exporta el texto y borra datos innecesarios.")}}
function load(){try{let s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem("lectorLibroWeb_v1")||"null");if(s){$("title").value=s.title||"Mi libro";$("text").value=s.text||"";pages=Array.isArray(s.pages)?s.pages:[]}}catch{}render();count()}
function count(){$("words").textContent=( $("text").value.trim().match(/\S+/g)||[]).length+" palabras"}
function render(){let box=$("pages");box.innerHTML="";if(!pages.length){box.textContent="Todavía no has añadido páginas de fotos. También puedes importar un EPUB.";box.className="pages hint";return}box.className="pages";pages.forEach((p,i)=>{let row=document.createElement("div");row.className="page";let n=document.createElement("b");n.className="num";n.textContent=i+1;let info=document.createElement("div");info.textContent=p.label||"Página "+(i+1);let sub=document.createElement("span");sub.textContent=(p.text.trim().match(/\S+/g)||[]).length+" palabras reconocidas";info.appendChild(sub);let del=document.createElement("button");del.textContent="Eliminar";del.onclick=()=>{if(confirm("¿Eliminar "+(p.label||"página "+(i+1))+"?")){pages.splice(i,1);rebuild();render();save()}};row.append(n,info,del);box.appendChild(row)})}
function rebuild(){if(pages.length)$("text").value=pages.map(p=>p.text).join("\n\n");count();save()}
function progress(p,msg){$("progressWrap").classList.remove("hide");$("bar").style.width=p+"%";$("progressText").textContent=msg}
async function getWorker(){
if(!window.Tesseract)throw Error("No se cargó el OCR. Comprueba Internet y recarga.");
if(!worker){
progress(2,"Preparando el OCR en español; la primera carga puede tardar…");
worker=await Tesseract.createWorker("spa",1,{logger:m=>{if(m.status)progress(Math.round((m.progress||0)*100),"OCR: "+m.status)}});
await worker.setParameters({preserve_interword_spaces:"1",tessedit_pageseg_mode:"6"});
}
return worker;
}
function decodeImage(file){return new Promise((resolve,reject)=>{let url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("No se pudo abrir una de las fotos."))};img.src=url})}
function drawScaled(img){
const maxW=2800,maxH=3800,upscale=1.7;
let scale=Math.min(upscale,maxW/img.width,maxH/img.height);
scale=Math.max(.2,scale);
let w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement("canvas");
c.width=w;c.height=h;
let ctx=c.getContext("2d",{willReadFrequently:true});
ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
ctx.drawImage(img,0,0,w,h);
return c;
}
async function makeOriginal(file){const img=await decodeImage(file);return drawScaled(img)}
async function makeEnhanced(file){
const img=await decodeImage(file),c=drawScaled(img),ctx=c.getContext("2d",{willReadFrequently:true});
const im=ctx.getImageData(0,0,c.width,c.height),d=im.data,w=c.width,h=c.height,n=w*h;
const gray=new Uint8Array(n);
for(let i=0,j=0;i<d.length;i+=4,j++)gray[j]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
// Umbral adaptativo local. Un margen más amplio que el umbral anterior ayuda a
// descartar letras tenues transparentadas desde el reverso y sombras ligeras.
const stride=w+1,integral=new Uint32Array((w+1)*(h+1));
for(let y=1;y<=h;y++){let row=0,base=y*stride,prev=(y-1)*stride;for(let x=1;x<=w;x++){row+=gray[(y-1)*w+x-1];integral[base+x]=integral[prev+x]+row}}
const radius=Math.max(12,Math.min(32,Math.round(Math.min(w,h)*.009)));
for(let y=0;y<h;y++){
 const y0=Math.max(0,y-radius),y1=Math.min(h-1,y+radius);
 for(let x=0;x<w;x++){
  const x0=Math.max(0,x-radius),x1=Math.min(w-1,x+radius),area=(x1-x0+1)*(y1-y0+1);
  const sum=integral[(y1+1)*stride+x1+1]-integral[y0*stride+x1+1]-integral[(y1+1)*stride+x0]+integral[y0*stride+x0];
  const mean=sum/area,threshold=mean-Math.max(16,(mean-128)*.15),idx=y*w+x,v=gray[idx]<threshold?0:255,k=idx*4;
  d[k]=d[k+1]=d[k+2]=v;d[k+3]=255;
 }
}
ctx.putImageData(im,0,0);
return c;
}
function quality(text,confidence){
const t=(text||"").trim();if(!t)return -1;
const letters=(t.match(/\p{L}/gu)||[]).length,odd=(t.match(/[^\p{L}\p{N}\s.,;:!?¡¿'"()\-—…%€$]/gu)||[]).length;
const words=t.match(/[\p{L}\p{N}]+/gu)||[],long=words.filter(x=>x.length>=3).length,one=words.filter(x=>x.length===1).length;
const repeated=(t.match(/([^\s])\1{2,}/g)||[]).join("").length;
const alphabetic=letters/Math.max(1,t.length),wordRate=words.length/Math.max(1,t.length),oddRate=odd/Math.max(1,t.length);
return (confidence*.45)+(alphabetic*35)+(Math.min(.12,wordRate)*100)-(oddRate*120)-(one/Math.max(1,words.length)*8)-(repeated/Math.max(1,t.length)*20)+(long/Math.max(1,words.length)*5);
}
async function scan(list){
let fs=Array.from(list||[]).filter(f=>f.type.startsWith("image/"));if(!fs.length||busy)return;
busy=true;let added=0;
try{
 const w=await getWorker();
 for(let i=0;i<fs.length;i++){
  progress(Math.round(i/fs.length*100),`Preparando y reconociendo foto ${i+1} de ${fs.length}…`);
  const mode=$("ocrMode").value;
  let chosen="",conf=0;
  if(mode==="original"){
   const original=await makeOriginal(fs[i]);const r=await w.recognize(original);chosen=(r.data.text||"").trim();conf=r.data.confidence||0;
  }else{
   const enhanced=await makeEnhanced(fs[i]);
   if(mode==="enhanced"){
    const r=await w.recognize(enhanced);chosen=(r.data.text||"").trim();conf=r.data.confidence||0;
   }else{
    // Secuencial para evitar picos de memoria en móviles; compara texto original
    // con la versión binarizada y puntúa también su estructura lingüística.
    const original=await makeOriginal(fs[i]);
    const a=await w.recognize(original),ta=(a.data.text||"").trim(),ca=a.data.confidence||0;
    const b=await w.recognize(enhanced),tb=(b.data.text||"").trim(),cb=b.data.confidence||0;
    if(quality(tb,cb)>quality(ta,ca)){chosen=tb;conf=cb}else{chosen=ta;conf=ca}
   }
  }
  if(chosen){
   pages.push({text:chosen,label:`Página ${pages.length+1}`});added++;
   let current=$("text").value.trim();$("text").value=current?current+"\n\n"+chosen:chosen;
   render();count();save();
   progress(Math.round((i+1)/fs.length*100),`Página ${i+1}/${fs.length} · confianza OCR aprox. ${Math.round(conf)}%`);
  }else toast("No se detectó texto en la foto "+(i+1));
 }
 progress(100,`${added} página(s) añadida(s). Revisa el texto antes de exportar.`);
 save();if(added)toast(`Añadidas ${added} página(s). Revisa posibles errores del OCR.`);
}catch(e){console.error(e);toast(e.message||"Error OCR");progress(0,"No se pudo completar el reconocimiento.")}
finally{busy=false;setTimeout(()=>$("progressWrap").classList.add("hide"),4500);$("camera").value="";$("gallery").value=""}
}
function populateVoices(){if(!( "speechSynthesis" in window)){ $("playerStatus").textContent="Voz no disponible";$("play").disabled=true;return}voices=speechSynthesis.getVoices();let s=$("voice"),old=s.value;s.innerHTML='<option value="">Voz predeterminada del dispositivo</option>';voices.filter(v=>v.lang.toLowerCase().startsWith("es")).forEach(v=>{let o=document.createElement("option");o.value=String(voices.indexOf(v));o.textContent=`${v.name} (${v.lang})`;s.appendChild(o)});s.value=old}
function chunks(text,max=220){let sentences=text.replace(/\r/g,"").split(/(?<=[.!?…])\s+|\n{2,}/).map(s=>s.trim()).filter(Boolean),out=[];for(let s of sentences){if(s.length<=max){out.push(s);continue}let c="";for(let word of s.split(/\s+/)){if((c+" "+word).trim().length>max&&c){out.push(c);c=word}else c=(c+" "+word).trim()}if(c)out.push(c)}return out}
function play(){if(!( "speechSynthesis" in window))return toast("Este navegador no ofrece voz.");let text=$("text").value.trim();if(!text)return toast("Primero escanea una página o importa un EPUB.");speechSynthesis.cancel();let list=chunks(text),i=0,voice=$("voice").value===""?null:voices[+$("voice").value],rate=+$("rate").value;$("playerStatus").textContent="Preparando…";function next(){if(i>=list.length){$("playerStatus").textContent="Terminado";return}let u=new SpeechSynthesisUtterance(list[i]);u.lang=voice?.lang||"es-ES";if(voice)u.voice=voice;u.rate=rate;u.onstart=()=>$("playerStatus").textContent=`Leyendo ${i+1}/${list.length}`;u.onend=()=>{i++;next()};u.onerror=e=>{if(!["canceled","interrupted"].includes(e.error)){$("playerStatus").textContent="Error de voz";toast("La lectura se ha interrumpido.")}};speechSynthesis.speak(u)}next()}
function download(name,content,type="text/plain;charset=utf-8"){let url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function slug(){return ($( "title").value||"mi-libro").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-_]+/g,"-").toLowerCase()||"mi-libro"}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function paragraphs(text){return text.trim().split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).map(s=>`<p>${esc(s).replace(/\n/g,"<br />")}</p>`).join("\n")}
async function exportEpub(){let text=$("text").value.trim();if(!text)return toast("No hay texto que exportar.");if(!window.JSZip)return toast("No se ha cargado el creador EPUB. Comprueba Internet.");let title=$("title").value.trim()||"Mi libro",id="urn:uuid:"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-lector-libro"),zip=new JSZip();zip.file("mimetype","application/epub+zip",{compression:"STORE"});zip.file("META-INF/container.xml",'<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');zip.file("OEBPS/content.opf",`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="es"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${esc(id)}</dc:identifier><dc:title>${esc(title)}</dc:title><dc:language>es</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/,"Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/><item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="style" href="style.css" media-type="text/css"/></manifest><spine><itemref idref="chapter1"/></spine></package>`);zip.file("OEBPS/nav.xhtml",`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="es"><head><title>Índice</title></head><body><nav epub:type="toc" id="toc"><h1>Índice</h1><ol><li><a href="chapter1.xhtml">${esc(title)}</a></li></ol></nav></body></html>`);zip.file("OEBPS/chapter1.xhtml",`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es"><head><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><h1>${esc(title)}</h1>${paragraphs(text)}</body></html>`);zip.file("OEBPS/style.css","body{font-family:serif;line-height:1.55;margin:5%;}h1{text-align:center;margin-bottom:2em;}p{text-indent:1.2em;margin:0 0 .8em;} ");try{let blob=await zip.generateAsync({type:"blob",mimeType:"application/epub+zip",compression:"DEFLATE",compressionOptions:{level:6}});download(slug()+".epub",blob,"application/epub+zip")}catch(e){console.error(e);toast("No se pudo crear el EPUB.")}}
async function importEpub(file){if(!file)return;if(!window.JSZip)return toast("No se ha cargado el lector EPUB. Comprueba Internet.");try{let zip=await JSZip.loadAsync(file),htmlFiles=Object.keys(zip.files).filter(n=>/\.(xhtml|html|htm)$/i.test(n)&&!zip.files[n].dir),opfName=null,container=zip.file("META-INF/container.xml");if(container){let xml=new DOMParser().parseFromString(await container.async("text"),"application/xml"),root=xml.querySelector("rootfile");if(root)opfName=root.getAttribute("full-path")}let combined="",title=file.name.replace(/\.epub$/i,"");if(opfName&&zip.file(opfName)){let opfText=await zip.file(opfName).async("text"),doc=new DOMParser().parseFromString(opfText,"application/xml"),base=opfName.includes("/")?opfName.slice(0,opfName.lastIndexOf("/")+1):"",titleNode=doc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/","title")[0];if(titleNode?.textContent)title=titleNode.textContent.trim();let manifest={};Array.from(doc.getElementsByTagName("item")).forEach(el=>manifest[el.getAttribute("id")]=el.getAttribute("href"));let spine=Array.from(doc.getElementsByTagName("itemref")).map(el=>manifest[el.getAttribute("idref")]).filter(Boolean);for(let href of spine){let path=(base+href).replace(/\/\.\//g,"/");if(zip.file(path))combined+="\n\n"+htmlToText(await zip.file(path).async("text"))}}if(!combined.trim()){for(let name of htmlFiles.sort()){let source=await zip.file(name).async("text");combined+="\n\n"+htmlToText(source)}}combined=combined.trim();if(!combined)throw Error("No se ha encontrado texto legible en ese EPUB.");if($("text").value.trim()&&!confirm("Importar este EPUB reemplazará el texto que tienes abierto. ¿Continuar?"))return;$("title").value=title;$("text").value=combined;pages=[{text:combined,label:"Texto importado desde EPUB"}];render();count();save();toast("EPUB importado. Ya puedes leerlo o exportar el texto.")}catch(e){console.error(e);toast(e.message||"No se pudo importar ese EPUB.")}finally{$("epubInput").value=""}}
function htmlToText(source){let doc=new DOMParser().parseFromString(source,"text/html");doc.querySelectorAll("script,style,nav,header,footer,noscript").forEach(n=>n.remove());let body=doc.body||doc.documentElement;let blocks=Array.from(body.querySelectorAll("h1,h2,h3,h4,p,blockquote,li,pre,div"));if(!blocks.length)return (body.textContent||"").replace(/[\t ]+/g," ").trim();let result=[],last="";for(let el of blocks){if(Array.from(el.children).some(c=>blocks.includes(c)))continue;let s=(el.innerText||el.textContent||"").replace(/\s+/g," ").trim();if(s&&s!==last){result.push(s);last=s}}return result.join("\n\n")}
$("camera").onchange=e=>scan(e.target.files);$("gallery").onchange=e=>scan(e.target.files);$("epubInput").onchange=e=>importEpub(e.target.files[0]);
$("title").oninput=()=>save();$("text").oninput=()=>{count();$("words").textContent+=" · sin guardar"};$("save").onclick=()=>save(true);$("clear").onclick=()=>{if(confirm("¿Borrar todo el texto y las páginas?")){pages=[];$("text").value="";render();save(true)}};$("new").onclick=()=>{if(confirm("Se reemplazará el libro actual. Exporta una copia si quieres conservarlo. ¿Continuar?")){pages=[];$("title").value="Mi libro";$("text").value="";render();save(true)}};
$("export").onclick=()=>{let t=$("text").value.trim();if(!t)return toast("No hay texto que exportar.");download(slug()+".txt",($("title").value||"Mi libro")+"\n\n"+t)};$("exportEpub").onclick=exportEpub;$("importEpub").onclick=()=>$("epubInput").click();
$("play").onclick=play;$("pause").onclick=()=>{if(!( "speechSynthesis" in window))return;if(speechSynthesis.paused){speechSynthesis.resume();$("playerStatus").textContent="Reproduciendo"}else if(speechSynthesis.speaking){speechSynthesis.pause();$("playerStatus").textContent="Pausado"}else toast("No hay lectura activa.")};$("stop").onclick=()=>{if("speechSynthesis"in window)speechSynthesis.cancel();$("playerStatus").textContent="Detenido"};$("rate").oninput=e=>$("rateLabel").textContent=(+e.target.value).toFixed(1).replace(".",",")+"×";
$("reset").onclick=()=>{if(confirm("Se borrarán los datos guardados por esta app en este navegador. ¿Seguro?")){localStorage.removeItem(KEY);localStorage.removeItem("lectorLibroWeb_v1");pages=[];$("title").value="Mi libro";$("text").value="";render();count();toast("Datos locales borrados.")}};$("install").onclick=()=>toast("En Chrome móvil: menú ⋮ → Instalar aplicación o Añadir a pantalla de inicio.");
load();populateVoices();if("speechSynthesis"in window)speechSynthesis.onvoiceschanged=populateVoices;if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(console.warn);
})();
