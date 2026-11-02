// An explicit local return URL survives reload and works independently of browser history.
const value=new URLSearchParams(location.search).get('catalog');
if(value) {
 try {
  const target=new URL(value,location.origin);
  if(target.origin===location.origin && target.pathname==='/research/catalog/') {
   document.querySelectorAll<HTMLAnchorElement>('[data-return-catalog]').forEach(link=>link.href=target.pathname+target.search);
  }
 } catch { /* An invalid return URL leaves the complete local catalog link intact. */ }
}
