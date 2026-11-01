// Expand collapsed ancestors through their visible summary before editing a field.
// Initial collapsed-state behavior remains covered by optional/progressive suites.
module.exports=function optionalControls(page){
 const fill=page.fill.bind(page),focus=page.focus.bind(page),click=page.click.bind(page);
 async function reveal(selector){
  const field=page.locator(selector);if(!await field.count())return;
  const indices=await field.evaluate(el=>{const all=[...document.querySelectorAll('details')],indices=[];for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')indices.unshift(all.indexOf(p));return indices;});
  for(const index of indices){const panel=page.locator('details').nth(index);if(!await panel.evaluate(el=>el.open))await panel.locator(':scope > summary').click();}
 }
 page.fill=async(selector,...args)=>{await reveal(selector);return fill(selector,...args);};
 page.focus=async(selector,...args)=>{await reveal(selector);return focus(selector,...args);};
 page.click=async(selector,...args)=>{await reveal(selector);return click(selector,...args);};
};
