// Independent inspection of actual private MP4 files. No video generation in StarNet.
// Caller supplies opaque artifact IDs and vault paths; paths never enter API responses.
import { createHash } from 'node:crypto';
import { createReadStream, realpathSync, lstatSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { StudioError } from './domain.mjs';

function fail(message) { throw new StudioError('VIDEO_QA_FAILED',message,409); }
export function privateArtifactPath(vaultRoot,filename) {
  if(!isAbsolute(vaultRoot)||!isAbsolute(filename))fail('Absolute private vault paths required.');
  const root=realpathSync(resolve(vaultRoot)),target=realpathSync(resolve(filename));
  const rel=relative(root,target);
  if(rel.startsWith('..')||rel===''||isAbsolute(rel))fail('File is outside the private media vault.');
  if(!lstatSync(filename).isFile()||!statSync(target).isFile())fail('Regular non-symlink file required.');
  return target;
}
export async function sha256File(path) {
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path))hash.update(chunk);
  return hash.digest('hex');
}
export function ffprobeFile(path,{command='ffprobe',timeoutMs=20000}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,['-v','error','-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height','-of','json',path],
      {stdio:['ignore','pipe','pipe']});
    let out='',err='',size=0;
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('ffprobe timed out'));},timeoutMs);
    child.stdout.on('data',chunk=>{
      size+=chunk.length;if(size>65536){child.kill('SIGKILL');return;}
      out+=chunk.toString('utf8');
    });
    child.stderr.on('data',chunk=>{if(err.length<1000)err+=chunk.toString('utf8');});
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.on('close',code=>{
      clearTimeout(timer);
      if(code!==0||size>65536)return reject(new Error('ffprobe inspection failed'));
      try{resolve(JSON.parse(out));}catch{reject(new Error('Invalid ffprobe response'));}
    });
  });
}
export async function inspectVideoCuts({vaultRoot,files,probe=ffprobeFile,hashFile=sha256File}={}) {
  if(!Array.isArray(files)||files.length!==2||files[0]?.cut_seconds!==30||files[1]?.cut_seconds!==15)
    fail('Exactly two ordered 30s and 15s cuts required.');
  const cuts=[];
  for(const item of files){
    if(typeof item.artifact_ref!=='string'||!/^[a-z][a-z0-9._:-]{2,119}$/i.test(item.artifact_ref))
      fail('Opaque artifact reference required.');
    const path=privateArtifactPath(vaultRoot,item.path);
    const size_bytes=statSync(path).size;
    if(size_bytes<1024||size_bytes>1024*1024*1024)fail('MP4 size outside allowed range.');
    const metadata=await probe(path);
    const video=(metadata?.streams??[]).filter(s=>s.codec_type==='video');
    if(video.length!==1||video[0].codec_name!=='h264'||
      video[0].width!==1080||video[0].height!==1920)fail('Expected one H.264 1080x1920 video stream.');
    const duration_seconds=Number(metadata?.format?.duration);
    if(!Number.isFinite(duration_seconds)||Math.abs(duration_seconds-item.cut_seconds)>0.6)
      fail('Unexpected video duration.');
    const sha256=await hashFile(path);
    if(!/^[0-9a-f]{64}$/.test(sha256)|| (item.expected_sha256&&sha256!==item.expected_sha256))
      fail('Artifact hash mismatch.');
    cuts.push({cut_seconds:item.cut_seconds,artifact_ref:item.artifact_ref,sha256,
      width:1080,height:1920,duration_seconds,size_bytes});
  }
  if(cuts[0].sha256===cuts[1].sha256)fail('The two cuts must be distinct files.');
  return {verified:true,cuts};
}
