export function humanize(value:string){return value.toLowerCase().replaceAll("_"," ").replace(/\b\w/g,(l)=>l.toUpperCase());}
export function shortId(id:string){return `FF-${id.slice(0,6).toUpperCase()}`;}
export function dateTime(value:string|Date){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}
export function elapsed(value:string|Date,now=Date.now()){const mins=Math.max(0,Math.floor((now-new Date(value).getTime())/60000));if(mins<60)return `${mins}m`;if(mins<1440)return `${Math.floor(mins/60)}h ${mins%60}m`;return `${Math.floor(mins/1440)}d`;}
