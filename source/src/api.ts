import { createClient } from '@supabase/supabase-js';
import type { Entry, ReportEntry } from './domain';
export const ADMIN_EMAIL='rapha11novais@gmail.com';
const settings=(window as Window & { RSVP_CONFIG?:{supabaseUrl?:string;supabasePublishableKey?:string} }).RSVP_CONFIG;
export const SUPABASE_URL=settings?.supabaseUrl||'';
export const configured=!!settings?.supabaseUrl&&!!settings?.supabasePublishableKey;
export const supabase=configured?createClient(settings!.supabaseUrl!,settings!.supabasePublishableKey!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const tokenKey='vacation_4p_2027_edit';
let activeToken:string|null=null;
try{activeToken=localStorage.getItem(tokenKey);}catch{}
export function remember(token:string|null){activeToken=token;try{if(token)localStorage.setItem(tokenKey,token);else localStorage.removeItem(tokenKey);}catch{}}
export function resetPersonalSession(){remember(null);}
function client(){if(!supabase)throw new Error('O formulário ainda está sendo conectado ao banco de dados. Tente novamente após a liberação pela organização.');return supabase;}
export async function request(path:string,options?:RequestInit):Promise<{entry:Entry|null;editToken:string;error?:string}>{
  const db=client();
  if(path==='/api/session'){
    const token=JSON.parse(String(options?.body)).token;
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Link pessoal inválido.');
    const {data,error}=await db.rpc('vacation_4p_load',{p_token:token});if(error)throw new Error(error.message);if(!data)throw new Error('Este link pessoal não foi encontrado. Procure a organização.');remember(token);return {entry:data,editToken:token};
  }
  if(options?.method==='PUT'){
    const entry=JSON.parse(String(options.body)) as Entry;
    if(!activeToken){if(entry.version>0)throw new Error('Abra o seu link pessoal para atualizar esta resposta.');remember([...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join(''));}
    const {data,error}=await db.rpc('vacation_4p_save',{p_entry:entry,p_token:activeToken});if(error)throw new Error(error.message);return {entry:data as Entry,editToken:activeToken!};
  }
  if(!activeToken)return {entry:null,editToken:''};
  const {data,error}=await db.rpc('vacation_4p_load',{p_token:activeToken});if(error)throw new Error(error.message);if(!data){remember(null);return {entry:null,editToken:''};}return {entry:data as Entry,editToken:activeToken};
}
export async function readAdmin(){
  const db=client();const {data:{user},error:authError}=await db.auth.getUser();if(authError||user?.email?.toLowerCase()!==ADMIN_EMAIL)throw new Error('O painel é exclusivo do organizador autorizado.');
  let start=0;const rows:ReportEntry[]=[];
  while(true){const {data,error}=await db.from('vacation_4p_2027').select('id,registration,name,first_month,second_month,third_month,version,created_at,updated_at').order('name').order('id').range(start,start+499);if(error)throw new Error(error.message);rows.push(...data.map(r=>({id:r.id,name:r.name,registration:r.registration,firstMonth:r.first_month,secondMonth:r.second_month,thirdMonth:r.third_month,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at}) as ReportEntry));if(data.length<500)break;start+=500;}
  return {entries:rows,refreshedAt:new Date().toISOString()};
}

