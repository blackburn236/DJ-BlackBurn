require("dotenv").config();
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "music";

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SECRET_KEY nas Environment Variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TMP = path.join(ROOT, "tmp");
fs.mkdirSync(TMP, { recursive: true });

const audioExt = new Set([".mp3",".wav",".m4a",".aac",".ogg",".flac",".opus"]);
const imageExt = new Set([".jpg",".jpeg",".png",".webp"]);

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
function isAdmin(req,res,next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({error:"Não autorizado"});
}
function publicUrl(filePath) {
  if (!filePath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}
async function removeStorage(filePath) {
  if (!filePath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) console.error("Erro ao apagar ficheiro:", error.message);
}

const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, TMP),
  filename: (req,file,cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + "_" + safeName(path.basename(file.originalname, ext)) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req,file,cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === "audio" && audioExt.has(ext)) return cb(null,true);
    if (file.fieldname === "cover" && imageExt.has(ext)) return cb(null,true);
    cb(new Error("Formato de ficheiro não suportado."));
  }
});

async function uploadToSupabase(file, folder) {
  const ext = path.extname(file.originalname).toLowerCase();
  const storagePath = `${folder}/${crypto.randomUUID()}${ext}`;
  const buffer = fs.readFileSync(file.path);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false
    });

  try { fs.unlinkSync(file.path); } catch {}
  if (error) throw error;
  return storagePath;
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SESSION_SECRET || "change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 1000*60*60*24*7
  }
}));

app.use(express.static(ROOT));
app.get("/uploads/*", (req,res)=>res.status(404).json({error:"Os ficheiros agora estão no armazenamento online."}));

app.get("/api/me",(req,res)=>res.json({admin:!!(req.session && req.session.admin)}));

app.post("/api/login",(req,res)=>{
  const password = String(req.body.password || "");
  const expected = process.env.ADMIN_PASSWORD || "";
  if (password && expected && password === expected) {
    req.session.admin = true;
    return res.json({ok:true});
  }
  res.status(401).json({error:"Palavra-passe incorreta"});
});

app.post("/api/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/songs", async (req,res)=>{
  try {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", {ascending:false});
    if (error) throw error;

    res.json((data || []).map(s => ({
      ...s,
      audioFile: s.audio_path,
      coverFile: s.cover_path,
      audioUrl: publicUrl(s.audio_path),
      coverUrl: publicUrl(s.cover_path)
    })));
  } catch(e) {
    console.error(e);
    res.status(500).json({error:"Não foi possível carregar as músicas."});
  }
});

app.post("/api/songs", isAdmin,
  upload.fields([{name:"audio",maxCount:1},{name:"cover",maxCount:1}]),
  async (req,res)=>{
    let audioPath = null, coverPath = null;
    try {
      const audio = req.files?.audio?.[0];
      const cover = req.files?.cover?.[0];
      if (!audio) return res.status(400).json({error:"Escolhe um ficheiro de música."});

      audioPath = await uploadToSupabase(audio, "audio");
      if (cover) coverPath = await uploadToSupabase(cover, "covers");

      const song = {
        title: String(req.body.title || "Sem título").trim(),
        artist: String(req.body.artist || "DJ BlackBurn").trim(),
        genre: String(req.body.genre || "Afro House").trim(),
        year: String(req.body.year || "").trim(),
        description: String(req.body.description || "").trim(),
        audio_path: audioPath,
        cover_path: coverPath
      };

      const { data, error } = await supabase.from("songs").insert(song).select().single();
      if (error) throw error;

      res.json({ok:true, song:data});
    } catch(e) {
      if (audioPath) await removeStorage(audioPath);
      if (coverPath) await removeStorage(coverPath);
      console.error(e);
      res.status(500).json({error:e.message || "Erro ao guardar a música."});
    }
  }
);

app.put("/api/songs/:id", isAdmin,
  upload.fields([{name:"audio",maxCount:1},{name:"cover",maxCount:1}]),
  async (req,res)=>{
    let newAudio = null, newCover = null;
    try {
      const { data: old, error: findError } = await supabase
        .from("songs").select("*").eq("id", req.params.id).single();
      if (findError || !old) return res.status(404).json({error:"Música não encontrada."});

      const audio = req.files?.audio?.[0];
      const cover = req.files?.cover?.[0];

      if (audio) newAudio = await uploadToSupabase(audio, "audio");
      if (cover) newCover = await uploadToSupabase(cover, "covers");

      const update = {
        title: String(req.body.title ?? old.title).trim(),
        artist: String(req.body.artist ?? old.artist).trim(),
        genre: String(req.body.genre ?? old.genre).trim(),
        year: String(req.body.year ?? old.year).trim(),
        description: String(req.body.description ?? old.description).trim()
      };
      if (newAudio) update.audio_path = newAudio;
      if (newCover) update.cover_path = newCover;

      const { data, error } = await supabase
        .from("songs").update(update).eq("id", req.params.id).select().single();
      if (error) throw error;

      if (newAudio && old.audio_path) await removeStorage(old.audio_path);
      if (newCover && old.cover_path) await removeStorage(old.cover_path);

      res.json({ok:true, song:data});
    } catch(e) {
      if (newAudio) await removeStorage(newAudio);
      if (newCover) await removeStorage(newCover);
      console.error(e);
      res.status(500).json({error:e.message || "Erro ao editar a música."});
    }
  }
);

app.delete("/api/songs/:id", isAdmin, async (req,res)=>{
  try {
    const { data: old, error: findError } = await supabase
      .from("songs").select("*").eq("id", req.params.id).single();
    if (findError || !old) return res.status(404).json({error:"Música não encontrada."});

    const { error } = await supabase.from("songs").delete().eq("id", req.params.id);
    if (error) throw error;

    await removeStorage(old.audio_path);
    await removeStorage(old.cover_path);

    res.json({ok:true});
  } catch(e) {
    console.error(e);
    res.status(500).json({error:"Erro ao apagar a música."});
  }
});

app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(400).json({error:err.message || "Erro no servidor"});
});

app.listen(PORT,()=>console.log(`DJ BlackBurn online na porta ${PORT}`));
