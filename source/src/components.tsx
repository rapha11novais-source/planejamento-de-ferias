import { CalendarDays, ListOrdered, LockKeyhole } from 'lucide-react';
import { monthName, type Entry } from './domain';
export function EventSidebar({admin=false}:{admin?:boolean}){
  return <aside className={'event-sidebar vacation-sidebar'+(admin?' compact':'')}>
    <a href="./" className="brand" aria-label="Férias de 2027 do 4º Pelotão"><span className="brand-mark">4<span>º</span></span><span>4º PELOTÃO<small>Planejamento de férias</small></span></a>
    <div className="sidebar-content"><span className="eyebrow gold">ESCALA DE FÉRIAS</span><div className="vacation-year">2027</div><div className="event-details"><p><CalendarDays size={20}/><span>Janeiro a dezembro<small>Indicação dos meses de preferência</small></span></p><p><ListOrdered size={20}/><span>Três opções distintas<small>Da maior para a menor preferência</small></span></p></div><div className="side-note">As preferências serão analisadas conforme a disponibilidade de vagas e a necessidade do serviço.</div></div>
    <a className="admin-link" href={admin?'./':'#admin'}><LockKeyhole size={15}/>{admin?'Voltar ao formulário':'Área dos organizadores'}</a>
  </aside>;
}
export function Summary({entry}:{entry:Entry}){return <div className="summary"><dl><div><dt>Nome completo</dt><dd>{entry.name}</dd></div><div><dt>Matrícula</dt><dd>{entry.registration}</dd></div><div><dt>1ª opção</dt><dd>{monthName(entry.firstMonth)}</dd></div><div><dt>2ª opção</dt><dd>{monthName(entry.secondMonth)}</dd></div><div><dt>3ª opção</dt><dd>{monthName(entry.thirdMonth)}</dd></div></dl></div>;}
