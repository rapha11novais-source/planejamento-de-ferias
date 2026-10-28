import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ClipboardCheck, Copy, Info, LoaderCircle, Pencil } from 'lucide-react';
import { EventSidebar, Summary } from './components';
import { DISCLAIMER, MONTHS, responseSchema, type Entry } from './domain';
import { request, resetPersonalSession } from './api';
const empty:Entry={name:'',registration:'',firstMonth:0,secondMonth:0,thirdMonth:0,version:0};

export default function RSVP(){
  const [draft,setDraft]=useState<Entry>(empty),[review,setReview]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState<Entry|null>(null),[editToken,setEditToken]=useState(''),[copied,setCopied]=useState(false);
  const title=useRef<HTMLHeadingElement>(null),draftRef=useRef(draft),receiptRef=useRef(receipt);
  draftRef.current=draft;receiptRef.current=receipt;
  async function load(){setLoading(true);setError('');try{
    const hash=new URLSearchParams(window.location.hash.slice(1)),token=hash.get('ferias');
    if(token){await request('/api/session',{method:'POST',body:JSON.stringify({token})});window.history.replaceState(null,'',window.location.pathname);}
    const data=await request('/api/me');if(data.entry){setDraft(data.entry);setReceipt(data.entry);setEditToken(data.editToken);}
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar sua resposta.');}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  useEffect(()=>{if(!loading)title.current?.focus();},[review,receipt,loading]);
  useEffect(()=>{
    const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
    try{void Promise.resolve(context.registerTool({name:'read_vacation_preferences',title:'Consultar preferências de férias',description:'Lê o rascunho ou a resposta de férias visível, sem enviar nem alterar dados.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Não informe parâmetros.');return {saved:!!receiptRef.current,year:2027,...(receiptRef.current||draftRef.current)};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}return()=>lifecycle.abort();
  },[]);
  function revise(){const parsed=responseSchema.safeParse(draft);if(!parsed.success){setError(parsed.error.issues[0].message);return;}setDraft(parsed.data);setError('');setReview(true);}
  async function save(){if(busy)return;const parsed=responseSchema.safeParse(draft);if(!parsed.success){setError(parsed.error.issues[0].message);return;}setBusy(true);setError('');try{const data=await request('/api/me',{method:'PUT',body:JSON.stringify(parsed.data)});if(!data.entry)throw new Error('Não foi possível confirmar o registro.');setReceipt(data.entry);setDraft(data.entry);setEditToken(data.editToken);}catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar suas preferências.');}finally{setBusy(false);}}
  const personalLink=()=>`${window.location.origin}${window.location.pathname}#ferias=${editToken}`;
  async function copy(){try{await navigator.clipboard.writeText(personalLink());setCopied(true);setTimeout(()=>setCopied(false),3000);}catch{setError('Copie seu link pessoal no campo abaixo.');}}
  const selections=[{key:'firstMonth',label:'1ª opção',note:'Sua maior preferência'},{key:'secondMonth',label:'2ª opção',note:'Sua segunda preferência'},{key:'thirdMonth',label:'3ª opção',note:'Sua terceira preferência'}] as const;
  return <div className="app-shell"><EventSidebar/><main className="form-main"><header className="topbar"><span>PLANEJAMENTO DE FÉRIAS · 2027</span><span className="open-badge">Consulta aberta</span></header><div className="form-container vacation-form">
    {loading?<div className="loading" role="status"><LoaderCircle className="spin"/>Carregando o formulário…</div>:receipt?<>
      <div className="success-icon"><CheckCircle2 size={34}/></div><span className="eyebrow">PREFERÊNCIAS REGISTRADAS</span><h2 ref={title} tabIndex={-1}>Sua indicação foi recebida.</h2><p className="lead">A organização avaliará os meses informados para a escala de férias de 2027.</p>
      <section className="form-card"><div className="card-title"><ClipboardCheck size={22}/><h3>Suas preferências</h3></div><Summary entry={receipt}/><p className="receipt-date">Atualizada em {new Date(receipt.updatedAt!).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p></section>
      <p className="vacation-notice"><Info size={19}/><span>{DISCLAIMER}</span></p>
      <section className="link-card"><h3>Guarde seu link pessoal</h3><p>Use este link para atualizar sua indicação, sem login. Ele permite editar somente a sua resposta; não o compartilhe.</p><div className="copy-row"><input aria-label="Link pessoal de atualização" readOnly value={personalLink()}/><button className="secondary" type="button" onClick={()=>void copy()}><Copy size={17}/>{copied?'Copiado':'Copiar'}</button></div></section>
      {error&&<div role="alert" className="error">{error}</div>}<div className="export-actions"><button className="primary" onClick={()=>{setReceipt(null);setReview(false);setError('');}}><Pencil size={17}/>Atualizar minhas opções</button><button className="secondary" onClick={()=>{resetPersonalSession();setReceipt(null);setDraft(empty);setEditToken('');setReview(false);setError('');}}>Preencher para outro policial</button></div>
    </>:<>
      <span className="eyebrow">4º PELOTÃO · FÉRIAS 2027</span><h2 ref={title} tabIndex={-1}>{review?'Confira suas preferências':draft.version?'Atualize suas preferências':'Indique seus meses de preferência'}</h2>
      <p className="lead">Senhores policiais do 4º Pelotão,<br/>Para a elaboração da escala de férias de 2027, solicito que cada policial indique <strong>três meses distintos, em ordem de preferência</strong>.</p>
      <ol className="steps vacation-steps" aria-label="Etapas do formulário"><li className={review?'done':'active'} aria-current={!review?'step':undefined}><span className="step-circle">{review?<Check size={17}/>:1}</span><span>Suas opções</span></li><li className={review?'active':''} aria-current={review?'step':undefined}><span className="step-circle">2</span><span>Conferência</span></li></ol>
      <form className="form-card" onSubmit={event=>{event.preventDefault();review?void save():revise();}}>
        <div className="card-title">{review?<ClipboardCheck size={22}/>:<CalendarDays size={22}/>}<h3>{review?'Revise antes de enviar':'Identificação e preferências'}</h3></div>
        {review?<Summary entry={draft}/>:<>
          <label className="field" htmlFor="name">Nome completo do policial <span>*</span><input id="name" autoComplete="name" required minLength={3} maxLength={160} placeholder="Digite seu nome completo" value={draft.name} onChange={event=>setDraft(d=>({...d,name:event.target.value}))}/></label>
          <label className="field" htmlFor="registration">Matrícula <span>*</span><input id="registration" inputMode="numeric" pattern="[0-9]{4,20}" maxLength={20} required readOnly={draft.version>0} placeholder="Somente números" value={draft.registration} onChange={event=>setDraft(d=>({...d,registration:event.target.value.replace(/\D/g,'')}))}/></label>
          <fieldset className="month-preferences"><legend>Meses de preferência <span>*</span></legend><p className="field-note">Escolha três meses diferentes, de janeiro a dezembro.</p><div className="month-grid">{selections.map(({key,label,note})=><label className="field" key={key} htmlFor={key}>{label}<select id={key} value={draft[key]||''} required onChange={event=>{setDraft(d=>({...d,[key]:Number(event.target.value)}));setError('');}}><option value="" disabled>Selecione o mês</option>{MONTHS.map((month,i)=><option key={month} value={i+1} disabled={selections.some(option=>option.key!==key&&draft[option.key]===i+1)}>{month}</option>)}</select><small>{note}</small></label>)}</div></fieldset>
        </>}
        <p className="vacation-notice"><Info size={19}/><span>{DISCLAIMER}</span></p>
        {error&&<div role="alert" className="error">{error}</div>}<div className="form-actions">{review?<button type="button" className="secondary" disabled={busy} onClick={()=>{setReview(false);setError('');}}>Voltar</button>:<span className="required-note">* Campos obrigatórios</span>}<button className="primary" type="submit" disabled={busy}>{busy?<><LoaderCircle size={17} className="spin"/>Registrando…</>:review?<><Check size={17}/>Confirmar preferências</>:'Revisar preferências'}</button></div>
      </form><p className="privacy-note">Uma resposta por matrícula. Após o envio, guarde seu link pessoal para fazer alterações.</p>
      {error&&<button className="text-button" type="button" onClick={()=>void load()}>Recarregar minha resposta</button>}
    </>}
    <footer className="form-footer"><span>4º Pelotão · Planejamento de férias</span><span>Exercício 2027</span></footer>
  </div></main></div>;
}
