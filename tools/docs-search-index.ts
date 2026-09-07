// Authored docs only: normalize text and add stable heading targets at build time.
export type SearchEntry = { title: string; page: string; group: string; url: string; description: string; text: string; keywords: string };
const aliases: Record<string, string> = {
  sidebar: 'mobile menu drawer app navigation', header: 'mobile menu navbar top navigation',
  'navigation-menu': 'mobile menu nested dropdown navigation', skeleton: 'loading placeholder pending',
  progress: 'loading upload progress pending', field: 'form error validation invalid',
  tokens: 'round corners radius colors theme spacing typography',
  'theme-builder': 'round corners radius colors theme customize',
  dialog: 'modal confirmation popup', combobox: 'search autocomplete select',
  callout: 'alert notice warning error', list: 'feed collection rows',
};
export function plain(html: string): string {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
      if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
      return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[entity.toLowerCase()];
    }).replace(/\s+/g, ' ').trim();
}
export function indexPage(body: string, page: {slug:string;title:string;lead:string;group:string}) {
  const url = page.slug === 'index' ? 'index.html' : `docs/${page.slug}.html`;
  const ids = new Set([...body.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]));
  const html = body.replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (whole, level, attrs, content) => {
    let id = /\bid=["']([^"']+)["']/.exec(attrs)?.[1];
    if (!id) {
      const stem = plain(content).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
      id=stem;let count=2;while(ids.has(id))id=`${stem}-${count++}`;ids.add(id);
      attrs += ` id="${id}"`;
    }
    return `<h${level}${attrs}>${content}</h${level}>`;
  });
  const matches=[...html.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)];
  const keywords=aliases[page.slug] ?? '';
  const entries: SearchEntry[]=[{title:page.title,page:page.title,group:page.group,url,description:page.lead,text:plain(html),keywords}];
  for(let i=0;i<matches.length;i++){
    const match=matches[i];const id=/\bid=["']([^"']+)["']/.exec(match[2])![1];
    const text=plain(html.slice(match.index!+match[0].length,matches[i+1]?.index ?? html.length));
    entries.push({title:plain(match[3]),page:page.title,group:page.group,url:`${url}#${id}`,description:text.slice(0,180),text,keywords:''});
  }
  return {html,entries};
}
