import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { openStore,parsePushEnvelope,parseReply,verifyPushJwt,validateReadToken } from './core.mjs';
import { gmailClient,reviewReply } from './gmail.mjs';

const fail=(status,msg)=>Object.assign(new Error(msg),{status});
const jsonReply=(res,status,data)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff'});
  res.end(JSON.stringify(data));
};
async function readJson(req){
  let raw='',size=0;
  for await(const chunk of req){size+=chunk.length;if(size>32768)throw fail(413,'Payload too large');raw+=chunk.toString();}
  try{return JSON.parse(raw);}catch{throw fail(400,'Malformed JSON');}
}
export function createBridge({
  store,gmail,config,fetchFn=fetch,tokenVerifier=verifyPushJwt,reviewer=reviewReply
}){
  const required=['mailbox','pubsubSubscription','pubsubAudience','pubsubServiceAccount','readToken'];
  for(const key of required)if(!config[key])throw Error('Missing bridge setting: '+key);
  if(config.readToken.length<32)throw Error('Read API token must be >= 32 characters');
  if(config.notificationUrl){
    const u=new URL(config.notificationUrl);
    if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('Notification URL must be HTTPS without embedded credentials');
    if((config.notificationSecret??'').length<32)throw Error('HMAC notification secret must be >= 32 characters');
  }
  let processing=Promise.resolve();
  async function flushNotifications(){
    if(!config.notificationUrl)return; // Persist; do not claim notification delivered.
    for(const task of store.pendingNotifications()){
      const body=JSON.stringify({event:'instinct.reply.received',mission_id:task.mission_id,
        gmail_id:task.gmail_id,received_at:task.received_at,
        receipt_sha256:task.content_sha256});
      const sig='sha256='+createHmac('sha256',config.notificationSecret).update(body).digest('hex');
      try{
        const r=await fetchFn(config.notificationUrl,{
          method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
          headers:{'content-type':'application/json','x-cc-signature':sig,'x-cc-event-id':task.gmail_id},
          body
        });
        if(!r.ok)throw Error('Notification endpoint HTTP '+r.status);
        store.notificationResult(task.gmail_id,{delivered:true});
      }catch(e){
        store.notificationResult(task.gmail_id,{delivered:false,error:e.message});
        throw Error('NOTIFICATION_RETRY_REQUIRED');
      }
    }
  }
  async function sync(){
    const cursor=store.getState('gmail_history_cursor');
    if(!cursor)throw Error('WATCH_NOT_INITIALIZED: run watch before receiving pushes');
    const changes=await gmail.changes(cursor);
    if(changes.ids.length>500)throw Error('TOO_MANY_HISTORY_MESSAGES: manual reconciliation required');
    let accepted=0;
    for(const id of changes.ids){
      if(store.hasMessage(id))continue;
      let msg;
      try { msg=await gmail.message(id); }
      catch(error) {
        // A permanently deleted unrelated message must not poison the history
        // cursor and prevent later valid Instinct replies being processed.
        if(error?.code==='GMAIL_MESSAGE_GONE')continue;
        throw error;
      }
      const parsed=parseReply(msg,{sender:config.sender,recipient:config.mailbox});
      if(!parsed || !store.getMission(parsed.missionId))continue;
      const mission=store.getMission(parsed.missionId);
      if(mission.gmail_thread!==parsed.threadId)continue;
      // The message is untrusted information. No tools, commands, or owner approvals
      // are executed on content. Optional OpenAI is a summarizer ONLY.
      let analysis=null;
      if(config.openaiKey && config.openaiEnabled){
        try{analysis=await reviewer(parsed.body,{apiKey:config.openaiKey,model:config.openaiModel,fetchFn});}
        catch(e){analysis='REVIEW_UNAVAILABLE: '+e.message.slice(0,120);}
      }
      if(store.saveReply({gmailId:parsed.gmailId,missionId:parsed.missionId,
        threadId:parsed.threadId,body:parsed.body,analysis}))accepted++;
    }
    // Cursor advancement occurs only after all messages are fetched and stored.
    if(BigInt(changes.historyId)>BigInt(cursor))store.setState('gmail_history_cursor',changes.historyId);
    await flushNotifications();
    return {accepted,latestHistoryId:changes.historyId};
  }
  async function receive(req,res){
    if(req.method==='GET' && req.url==='/health')
      return jsonReply(res,200,{ok:true,service:'cc-instinct-gmail-push',mode:'read-only',
        watch_initialized:!!store.getState('gmail_history_cursor'),
        notifications_configured:!!config.notificationUrl});
    if(req.method==='POST' && req.url==='/internal/pubsub'){
      const claim=await tokenVerifier(req.headers.authorization,{
        audience:config.pubsubAudience,serviceAccount:config.pubsubServiceAccount,fetchFn});
      if(!claim)throw fail(403,'Invalid Pub/Sub authentication');
      const event=parsePushEnvelope(await readJson(req),{
        mailbox:config.mailbox,subscription:config.pubsubSubscription});
      // Serialize concurrent push deliveries: Gmail history cursor must advance monotonically.
      const task=processing.then(()=>sync());
      processing=task.catch(()=>{});
      await task;
      return jsonReply(res,200,{ok:true,eventId:event.messageId});
    }
    const auth=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if(!validateReadToken(auth,config.readToken))throw fail(401,'Authentication required');
    if(req.method==='GET' && req.url==='/v1/tasks')
      return jsonReply(res,200,{tasks:store.list()});
    const task=req.url?.match(/^\/v1\/tasks\/(CC-A2A-[A-Z0-9-]{3,70})$/);
    if(req.method==='GET' && task){
      const mission=store.getMission(task[1]);
      if(!mission)return jsonReply(res,404,{error:'Unknown mission'});
      return jsonReply(res,200,{mission,results:store.results(task[1])});
    }
    throw fail(404,'Route not found');
  }
  return {
    handler(req,res){
      receive(req,res).catch(err=>{
        const status=err.status??(err.message.startsWith('Unauthenticated')||err.message.startsWith('Unauthorized')||err.message.startsWith('Invalid Pub/Sub')||err.message.startsWith('Mailbox mismatch')?403:503);
        // Never put mail, OAuth tokens, signing material or stacktraces in responses.
        jsonReply(res,status,{error:status>=500?'Bridge temporarily unavailable':'Request denied'});
      });
    },sync,flushNotifications
  };
}
export function environmentConfig(env=process.env){
  return {
    mailbox:env.CC_GMAIL_MAILBOX??'executiveusa@gmail.com',
    sender:env.CC_INSTINCT_SENDER??'cityops@mail.instinct.com',
    pubsubSubscription:env.CC_PUBSUB_SUBSCRIPTION,
    pubsubAudience:env.CC_PUBSUB_AUDIENCE,
    pubsubServiceAccount:env.CC_PUBSUB_SERVICE_ACCOUNT,
    readToken:env.CC_BRIDGE_READ_TOKEN,
    notificationUrl:env.CC_RESULT_WEBHOOK_URL,
    notificationSecret:env.CC_RESULT_WEBHOOK_SECRET,
    openaiEnabled:env.CC_OPENAI_REVIEW_ENABLED==='yes',
    openaiKey:env.OPENAI_API_KEY,
    openaiModel:env.CC_OPENAI_MODEL??'gpt-6-luna'
  };
}
export function startServer(env=process.env){
  const store=openStore(env.CC_BRIDGE_DB_FILE);
  const gmail=gmailClient({clientId:env.CC_GMAIL_CLIENT_ID,
    clientSecret:env.CC_GMAIL_CLIENT_SECRET,refreshToken:env.CC_GMAIL_REFRESH_TOKEN});
  const bridge=createBridge({store,gmail,config:environmentConfig(env)});
  const server=createServer(bridge.handler);
  server.listen(Number(env.PORT??8918),env.HOST??'127.0.0.1');
  return {server,store,bridge};
}
if(process.argv[1] && new URL(import.meta.url).pathname===process.argv[1])startServer();
