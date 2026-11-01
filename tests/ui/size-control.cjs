// Exercise the visible control for both catalog checklists and legacy single inputs.
module.exports=async function chooseSize(page,value){
 if(await page.locator('#size').isVisible())return page.selectOption('#size',value);
 for(const input of await page.locator('#sizeChecks input:checked').all())await input.uncheck();
 if(value)await page.locator('#sizeChecks input[value='+JSON.stringify(value)+']').check();
};
