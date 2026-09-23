import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Changes, MutationResult, Operation, Revisions, Snapshot } from './domain';

export interface AccountService {
  bootstrap(): Promise<Snapshot>;
  read(known: Partial<Revisions>): Promise<Changes>;
  mutate(operation: Operation): Promise<MutationResult>;
  previewImport(payload: unknown): Promise<ImportPreview>;
  commitImport(id: string, choices: Record<string, boolean>, requestId: string): Promise<MutationResult>;
}
export interface ImportField { key: string; title: string; current: unknown; incoming: unknown; conflict: boolean }
export interface ImportPreview { id: string; fields: ImportField[]; revisions: Revisions }
export class ServiceError extends Error { constructor(message:string,public expired=false){super(message);} }
export function configuredClient(): SupabaseClient | null {
  const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Invalid Supabase project URL');
  if (!key.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key, never a secret or service-role key');
  return createClient(url,key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'vesserith.auth.v1'}});
}
export async function initializeSession(client: SupabaseClient): Promise<Session | null> {
  const url=new URL(window.location.href), code=url.searchParams.get('code'), oauthError=url.searchParams.get('error_description');
  if (code || oauthError) {
    try {
      if (oauthError) throw new Error(oauthError);
      const { error }=await client.auth.exchangeCodeForSession(code!); if(error) throw error;
    } finally {
      // An authorization code must never remain in history or be mixed into hash navigation.
      window.history.replaceState(null,'',import.meta.env.BASE_URL);
    }
  }
  const {data,error}=await client.auth.getSession(); if(error) throw error; return data.session;
}
export function signIn(client: SupabaseClient) {
  return client.auth.signInWithOAuth({provider:'github',options:{redirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).href,scopes:'read:user user:email'}});
}
export function createService(client: SupabaseClient): AccountService {
  async function call<T>(name:string,args?:Record<string,unknown>):Promise<T> {
    const {data,error}=await client.rpc(name,args);
    if(error) throw new ServiceError(error.message,['PGRST301','PGRST302','PGRST303','28000'].includes(error.code));
    return data as T;
  }
  return {
    bootstrap:()=>call<Snapshot>('vesserith_bootstrap'),
    read:known=>call<Changes>('vesserith_read',{known}),
    mutate:op=>op.kind==='mastery_batch'?call<MutationResult>('vesserith_mastery_batch',{request_id:op.requestId,payload:op.payload}):call<MutationResult>('vesserith_mutate',{request_id:op.requestId,kind:op.kind,expected:op.expected,payload:op.payload}),
    previewImport:payload=>call<ImportPreview>('vesserith_preview_import',{payload}),
    commitImport:(id,choices,requestId)=>call<MutationResult>('vesserith_commit_import',{preview_id:id,choices,request_id:requestId}),
  };
}
