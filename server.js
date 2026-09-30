require("dotenv").config();
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data", "songs.json");
const AUDIO = path.join(ROOT, "uploads", "audio");
const COVERS = path.join(ROOT, "uploads", "covers");

for (const dir of [path.dirname(DATA), AUDIO, COVERS]) fs.mkdirSync(dir, {recursive:true});
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, "[]");

const audioExt = new Set([".mp3",".wav",".m4a",".aac",".ogg",".flac",".opus"]);
const imageExt = new Set([".jpg",".jpeg",".png",".webp"]);

function loadSongs(){ try { return JSON.parse(fs.readFileSync(DATA,"utf8")); } catch(e){ return []; } }
function saveSongs(songs){ fs.writeFileSync(DATA, JSON.stringify(songs,null,2)); }
function safeName(name){ return name.replace(/[^a-zA-Z0-9._-]/g,"_"); }
function isAdmin(req,res,next){ if(req.session && req.session.admin) return next(); return res.status(401).json({error:"Não autorizado"}); }
function removeFile(rel){
  if(!rel) return;
  const full = path.join(ROOT, rel.replace(/^\/+/,""));
  if(fs.existsSync(full)) try { fs.unlinkSync(full); } catch(e){}
}

const storage = multer.diskStorage({
  destination:(req,file,cb)=> cb(null, file.fieldname==="audio" ? AUDIO : COVERS),
  filename:(req,file,cb)=>{
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + "_" + safeName(path.basename(file.originalname,ext)).slice(0,60) + ext);
  }
});
const upload = multer({
  storage,
  limits:{fileSize:250*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    if(file.fieldname==="audio" && audioExt.has(ext)) return cb(null,true);
    if(file.fieldname==="cover" && imageExt.has(ext)) return cb(null,true);
    cb(new Error("Formato de ficheiro não suportado"));
  }
});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret:process.env.SESSION_SECRET || "change-me",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true, sameSite:"lax", secure:false, maxAge:1000*60*60*24*7}
}));
app.use(express.static(ROOT));
app.use("/uploads", express.static(path.join(ROOT,"uploads")));

app.get("/api/me",(req,res)=>res.json({admin:!!(req.session && req.session.admin)}));

app.post("/api/login",(req,res)=>{
  const password=String(req.body.password||"");
  const expected=process.env.ADMIN_PASSWORD || "change-this-password";
  if(password && password===expected){
    req.session.admin=true;
    return res.json({ok:true});
  }
  res.status(401).json({error:"Palavra-passe incorreta"});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/songs",(req,res)=>{
  const songs=loadSongs().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  res.json(songs.map(s=>({...s, audioUrl:"/uploads/audio/"+s.audioFile, coverUrl:s.coverFile?"/uploads/covers/"+s.coverFile:null})));
});

app.post("/api/songs", isAdmin, upload.fields([{name:"audio",maxCount:1},{name:"cover",maxCount:1}]), (req,res)=>{
  try{
    const audio=req.files?.audio?.[0], cover=req.files?.cover?.[0];
    if(!audio) return res.status(400).json({error:"Escolhe um ficheiro de música."});
    const song={
      id:crypto.randomUUID(),
      title:String(req.body.title||"Sem título").trim(),
      artist:String(req.body.artist||"DJ BlackBurn").trim(),
      genre:String(req.body.genre||"Afro House").trim(),
      year:String(req.body.year||"").trim(),
      description:String(req.body.description||"").trim(),
      audioFile:audio.filename,
      coverFile:cover?cover.filename:null,
      createdAt:new Date().toISOString()
    };
    const songs=loadSongs(); songs.push(song); saveSongs(songs);
    res.json({ok:true,song});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.put("/api/songs/:id", isAdmin, upload.fields([{name:"audio",maxCount:1},{name:"cover",maxCount:1}]), (req,res)=>{
  try{
    const songs=loadSongs(), i=songs.findIndex(s=>s.id===req.params.id);
    if(i<0) return res.status(404).json({error:"Música não encontrada"});
    const old=songs[i], audio=req.files?.audio?.[0], cover=req.files?.cover?.[0];
    const updated={...old,
      title:String(req.body.title??old.title).trim(),
      artist:String(req.body.artist??old.artist).trim(),
      genre:String(req.body.genre??old.genre).trim(),
      year:String(req.body.year??old.year).trim(),
      description:String(req.body.description??old.description).trim()
    };
    if(audio){ removeFile("/uploads/audio/"+old.audioFile); updated.audioFile=audio.filename; }
    if(cover){ removeFile("/uploads/covers/"+old.coverFile); updated.coverFile=cover.filename; }
    songs[i]=updated; saveSongs(songs);
    res.json({ok:true,song:updated});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.delete("/api/songs/:id", isAdmin, (req,res)=>{
  const songs=loadSongs(), i=songs.findIndex(s=>s.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Música não encontrada"});
  const [song]=songs.splice(i,1);
  removeFile("/uploads/audio/"+song.audioFile);
  removeFile("/uploads/covers/"+song.coverFile);
  saveSongs(songs);
  res.json({ok:true});
});

app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));

app.use((err,req,res,next)=>{
  res.status(400).json({error:err.message||"Erro no servidor"});
});

app.listen(PORT,()=>console.log(`DJ BlackBurn site: http://localhost:${PORT}`));
