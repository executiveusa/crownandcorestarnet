// Operator CLI: setup and recovery only. No email sends or autonomous tasks.
import {openStore,parseReply} from './core.mjs';
import {gmailClient} from './gmail.mjs';
import {environmentConfig} from './server.mjs';

export async function run(command,args,{env=process.env,logger=console.log}={}){
  const store=openStore(env.CC_BRIDGE_DB_FILE);
  try{
    if(command==='register'){
      const [mission,thread]=args;
      store.register(mission,thread);
      logger(JSON.stringify({registered:true,mission_id:mission,thread_id:thread}));
      return;
    }
    const gmail=gmailClient({clientId:env.CC_GMAIL_CLIENT_ID,
      clientSecret:env.CC_GMAIL_CLIENT_SECRET,refreshToken:env.CC_GMAIL_REFRESH_TOKEN});
    if(command==='watch'){
      if(!env.CC_PUBSUB_TOPIC)throw Error('CC_PUBSUB_TOPIC required');
      const result=await gmail.watch(env.CC_PUBSUB_TOPIC);
      if(!/^\d+$/.test(result.historyId??'')||!/^\d+$/.test(result.expiration??''))
        throw Error('Invalid Gmail watch response');
      // Renewal must NEVER overwrite an existing lower cursor: that would skip mail.
      if(!store.getState('gmail_history_cursor'))
        store.setState('gmail_history_cursor',result.historyId);
      store.setState('gmail_watch_expiration',result.expiration);
      logger(JSON.stringify({watch_active:true,expires_at:new Date(Number(result.expiration)).toISOString(),
        history_cursor_initialized:!!store.getState('gmail_history_cursor')}));
      return;
    }
    if(command==='bootstrap'){
      const [missionId]=args;
      const mission=store.getMission(missionId);
      if(!mission)throw Error('Register the mission and Gmail thread first');
      const thread=await gmail.thread(mission.gmail_thread);
      let stored=0;
      for(const msg of thread.messages??[]){
        if(store.hasMessage(msg.id))continue;
        const reply=parseReply(msg,{sender:env.CC_INSTINCT_SENDER??'cityops@mail.instinct.com',
          recipient:env.CC_GMAIL_MAILBOX??'executiveusa@gmail.com'});
        if(reply?.missionId===missionId && reply.threadId===mission.gmail_thread){
          if(store.saveReply({gmailId:reply.gmailId,missionId,
            threadId:reply.threadId,body:reply.body}))stored++;
        }
      }
      logger(JSON.stringify({mission_id:missionId,stored,reply_count:store.results(missionId).length}));
      return;
    }
    if(command==='status'){
      logger(JSON.stringify({watch_initialized:!!store.getState('gmail_history_cursor'),
        watch_expiration:store.getState('gmail_watch_expiration'),
        missions:store.list(),notifications_pending:store.pendingNotifications().length}));
      return;
    }
    throw Error('Usage: node src/cli.mjs register MISSION_ID GMAIL_THREAD | watch | bootstrap MISSION_ID | status');
  } finally {store.close();}
}
if(process.argv[1] && new URL(import.meta.url).pathname===process.argv[1]){
  run(process.argv[2],process.argv.slice(3)).catch(e=>{
    console.error(e.message);process.exitCode=1;
  });
}
