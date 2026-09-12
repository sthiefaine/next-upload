/** Sources Atlas privées : volume persistant requis, aucun accès via public/uploads. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { checkAuthFromToken } from '@/lib/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const MAX=150*1024*1024, REV=/^[a-f0-9]{64}$/;
type Ctx={params:Promise<{id:string}>};
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function contexte(req:Request,ctx:Ctx){
  if(!checkAuthFromToken(req.headers.get('authorization')))return json({error:'unauthorized'},401);
  const {id}=await ctx.params;
  if(!/^(batiment|unite|kit|terrain|decor|commandant|effet)_[a-z0-9_]{1,160}$/.test(id))return json({error:'invalid_asset'},400);
  const root=process.env.ATLAS_SOURCES_DIR;
  if(!root||!path.isAbsolute(root))return json({error:'storage_not_configured'},503);
  return path.join(root,id);
}
export async function GET(req:Request,ctx:Ctx){
  const dir=await contexte(req,ctx);if(dir instanceof Response)return dir;
  const revision=new URL(req.url).searchParams.get('revision');
  try{
    if(revision){if(!REV.test(revision))return json({error:'invalid_revision'},400);
      const b=await fs.readFile(path.join(dir,revision+'.glb'));
      return new Response(new Uint8Array(b),{headers:{'Content-Type':'model/gltf-binary','Cache-Control':'no-store','Content-Disposition':'attachment; filename="source.glb"','X-Content-Type-Options':'nosniff'}});}
    const names=await fs.readdir(dir);
    const sources=await Promise.all(names.filter(n=>n.endsWith('.glb')&&REV.test(n.slice(0,-4))).map(async n=>{const s=await fs.stat(path.join(dir,n));return{revision:n.slice(0,-4),octets:s.size,date:s.mtime.toISOString()};}));
    return json({sources:sources.sort((a,b)=>b.date.localeCompare(a.date))});
  }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return revision?json({error:'not_found'},404):json({sources:[]});return json({error:'storage_error'},500);}
}
export async function POST(req:Request,ctx:Ctx){
  const dir=await contexte(req,ctx);if(dir instanceof Response)return dir;
  if(req.headers.get('content-type')!=='model/gltf-binary')return json({error:'invalid_type'},415);
  if(Number(req.headers.get('content-length'))>MAX)return json({error:'too_large'},413);
  const reader=req.body?.getReader();if(!reader)return json({error:'empty'},400);
  const parts:Uint8Array[]=[];let size=0;let temporary:string|undefined;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();return json({error:'too_large'},413);}parts.push(value);}
    const b=Buffer.concat(parts,size);
    if(size<20||b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==size||b.readUInt32LE(16)!==0x4e4f534a)return json({error:'invalid_glb'},422);
    const len=b.readUInt32LE(12);if(len>size-20)return json({error:'invalid_glb'},422);
    const doc=JSON.parse(b.subarray(20,20+len).toString('utf8'));
    if(doc.asset?.version!=='2.0'||!Array.isArray(doc.meshes)||!doc.meshes.length)return json({error:'invalid_glb'},422);
    for(const obj of [...(doc.images??[]),...(doc.buffers??[])])if(obj.uri&&!obj.uri.startsWith('data:'))return json({error:'external_reference'},422);
    const revision=createHash('sha256').update(b).digest('hex');
    await fs.mkdir(dir,{recursive:true});temporary=path.join(dir,randomUUID()+'.tmp');
    await fs.writeFile(temporary,b,{flag:'wx'});await fs.rename(temporary,path.join(dir,revision+'.glb'));temporary=undefined;
    return json({source:{revision,octets:size}},201);
  }catch(e){return json({error:(e as NodeJS.ErrnoException).code?'storage_error':'invalid_glb'},(e as NodeJS.ErrnoException).code?500:422);}
  finally{if(temporary)await fs.unlink(temporary).catch(()=>{});}
}
