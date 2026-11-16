import {MongoClient} from 'mongodb';
export async function connectMongo(uri,{MongoClientClass=MongoClient}={}){
 if(!uri)throw new Error('MONGODB_URI em falta.');
 const client=new MongoClientClass(uri);await client.connect();
 const db=client.db('worktoyou');
 try{
  await db.collection('users').createIndex({email:1},{unique:true,name:'unique_email'});
  await db.collection('users').createIndex({id:1},{unique:true,name:'unique_user_id'});
  await db.collection('sessions').createIndex({tokenHash:1},{unique:true,name:'unique_session_token'});
  await db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0,name:'expired_sessions'});
  await db.collection('records').createIndex({empresaId:1,id:1},{unique:true,name:'unique_tenant_record'});
  return {client,db};
 }catch(e){await client.close();throw e}
}
