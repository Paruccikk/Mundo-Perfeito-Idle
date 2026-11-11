import type { CharacterGender, ProfessionId } from '@mundo-perfeito/shared';
export interface CharacterCreatorOptions { onCreate:(input:{name:string;gender:CharacterGender;professionId:ProfessionId})=>Promise<void>; onBack?:()=>void; }
const JOBS:Array<{id:ProfessionId;name:string;desc:string;icon:string}>=[
{id:'animal_caretaker',name:'Cuidador de Animais',desc:'Cria, alimenta e cuida dos animais.',icon:'🐄'},
{id:'lumberjack',name:'Lenhador',desc:'Trabalha com árvores e madeira.',icon:'🪓'},
{id:'fisher',name:'Pescador',desc:'Pesca em rios, lagos e águas do reino.',icon:'🎣'},
{id:'farmer',name:'Agricultor',desc:'Planta, irriga e colhe culturas.',icon:'🌾'}];
export function renderCharacterCreator(root:HTMLElement,o:CharacterCreatorOptions):void{
const screen=el('section','creator'),panel=el('div','creator__panel'),header=el('header','creator__header');
header.append(el('p','eyebrow','Mundo Perfeito'),el('h1','creator__title','Comece sua nova vida'),el('p','creator__subtitle','Crie seu único personagem. Escolha sua aparência e uma profissão principal.'));
if(o.onBack){const back=el('button','creator__back','← Voltar') as HTMLButtonElement;back.type='button';back.onclick=o.onBack;header.prepend(back);}
const form=el('form','creator__form');form.noValidate=true;const field=el('label','field');field.append(el('span','field__label','Nome do personagem'));
const name=el('input','field__input') as HTMLInputElement;name.maxLength=16;name.minLength=3;name.placeholder='Ex.: Kael';name.required=true;field.append(name,el('small','field__hint','De 3 a 16 caracteres.'));
const genderField=el('fieldset','class-fieldset');genderField.append(el('legend','field__label','Aparência'));const genderGrid=el('div','class-grid');let gender:CharacterGender='male';
for(const [id,label,emoji] of [['male','Homem','👨'],['female','Mulher','👩']] as const){const b=el('button','class-card',emoji+' '+label) as HTMLButtonElement;b.type='button';b.classList.toggle('class-card--active',id===gender);b.onclick=()=>{gender=id;Array.from(genderGrid.children).forEach((x,i)=>x.classList.toggle('class-card--active',i===(id==='male'?0:1)));};genderGrid.append(b);}genderField.append(genderGrid);
const jobField=el('fieldset','class-fieldset');jobField.append(el('legend','field__label','Profissão principal'));const jobs=el('div','class-grid');let professionId:ProfessionId='animal_caretaker';
for(const job of JOBS){const b=el('button','class-card');b.type='button';b.classList.toggle('class-card--active',job.id===professionId);b.append(el('strong','class-card__name',job.icon+' '+job.name),el('p','class-card__description',job.desc));b.onclick=()=>{professionId=job.id;Array.from(jobs.children).forEach(x=>x.classList.toggle('class-card--active',x===b));};jobs.append(b);}jobField.append(jobs);
const error=el('p','form-error');const submit=el('button','primary-button','Criar personagem') as HTMLButtonElement;submit.type='submit';form.append(field,genderField,jobField,error,submit);panel.append(header,form);screen.append(panel);root.replaceChildren(screen);
form.onsubmit=e=>{e.preventDefault();const clean=name.value.trim().replace(/\s+/g,' ');if(clean.length<3||clean.length>16){error.textContent='O nome deve ter de 3 a 16 caracteres.';return;}submit.disabled=true;submit.textContent='Criando…';o.onCreate({name:clean,gender,professionId}).catch(err=>{error.textContent=err instanceof Error?err.message:'Não foi possível criar o personagem.';submit.disabled=false;submit.textContent='Criar personagem';});};
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,txt?:string):HTMLElementTagNameMap[K]{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
