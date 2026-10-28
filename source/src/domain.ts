import { z } from 'zod';
export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const DISCLAIMER = 'As opções informadas serão avaliadas conforme a disponibilidade de vagas e a necessidade do serviço. Portanto, a indicação dos meses não garante a concessão das férias nos períodos solicitados.';
export const monthName = (value:number) => MONTHS[value-1] || '—';
export const responseSchema = z.object({
  name:z.string().trim().min(3,'Informe o nome completo do policial.').max(160),
  registration:z.string().trim().regex(/^\d{4,20}$/,'Informe sua matrícula com 4 a 20 dígitos.'),
  firstMonth:z.number().int().min(1,'Selecione a 1ª opção.').max(12),
  secondMonth:z.number().int().min(1,'Selecione a 2ª opção.').max(12),
  thirdMonth:z.number().int().min(1,'Selecione a 3ª opção.').max(12),
  version:z.number().int().nonnegative(),
}).strict().superRefine((value,ctx)=>{
  if(new Set([value.firstMonth,value.secondMonth,value.thirdMonth]).size!==3)ctx.addIssue({code:'custom',path:['thirdMonth'],message:'Escolha três meses distintos, em ordem de preferência.'});
});
export type Entry=z.infer<typeof responseSchema>&{updatedAt?:string};
export type ReportEntry=Entry&{id:string;createdAt:string};
export function monthTotals(rows:Entry[]){return MONTHS.map((month,i)=>({month,first:rows.filter(r=>r.firstMonth===i+1).length,second:rows.filter(r=>r.secondMonth===i+1).length,third:rows.filter(r=>r.thirdMonth===i+1).length}));}
