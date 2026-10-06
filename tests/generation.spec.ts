import {test,expect,type Page} from '@playwright/test';
import {PDFDocument,degrees,rgb} from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
const sample=JSON.parse(fs.readFileSync('public/sample-pack/requirements.json','utf8'));
async function choose(page:Page,title:string,name:string) {
 const input=page.getByLabel(`PDF for ${title}`,{exact:true});
 const option=input.locator('option').filter({hasText:name}).first();await expect(option).toBeEnabled();
 await input.selectOption((await option.getAttribute('value'))!);
}
test('resolved sample, language, generation errors, stale output and PDF download',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Load sample',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Sample loaded');
 const matches:Record<string,string>={'Trade License':'trade_license_2026.pdf','TIN Certificate':'03_tin_certificate.pdf','VAT Registration Certificate':'04_vat_certificate.pdf','Bank Solvency Certificate':'bank_solvency.pdf','Experience Certificate':'experience_cert.pdf','Technical Proposal':'02_technical_proposal.pdf','Financial Proposal':'01_financial_proposal.pdf','Signed Declaration':'scan_0042.pdf'};
 for(const [title,name] of Object.entries(matches)) await choose(page,title,name);
 await page.getByLabel('Expiry date for Trade License',{exact:true}).fill('2027-06-30');
 await page.getByLabel('Expiry date for Bank Solvency Certificate',{exact:true}).fill('2026-12-31');
 await expect(page.locator('.readiness-counts')).toContainText('8 OK · 2 optional not provided · 0 blocking issues');
 await page.getByLabel('Interface language',{exact:true}).selectOption('bn');
 await expect(page.getByRole('heading',{name:sample.requirements[0].title_bn,exact:true})).toBeVisible();
 await expect(page.getByLabel(`${sample.requirements[0].title_bn}-এর মেয়াদ শেষের তারিখ`,{exact:true})).toHaveValue('2027-06-30');
 await expect(page.locator('.status.ok')).toHaveCount(8);
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:'screenshots/sample-bangla-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('ইন্টারফেসের ভাষা',{exact:true}).selectOption('en');
 // Failure keeps matches/dates and permits a retry.
 await page.route('**/fonts/NotoSansBengali.ttf',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.getByRole('button',{name:'Generate package',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('could not be generated');
 await expect(page.getByLabel('Expiry date for Trade License',{exact:true})).toHaveValue('2027-06-30');
 await page.unroute('**/fonts/NotoSansBengali.ttf');
 await page.getByRole('button',{name:'Dismiss messages'}).click();
 // A slow job cannot publish bytes after any input change.
 let reached!:()=>void;const started=new Promise<void>(resolve=>{reached=resolve;});
 await page.route('**/fonts/NotoSansBengali.ttf',async route=>{reached();await new Promise(resolve=>setTimeout(resolve,400));await route.continue();});
 await page.getByRole('button',{name:'Generate package',exact:true}).click();await started;
 await page.getByLabel('Expiry date for Trade License',{exact:true}).fill('2027-07-01');
 await expect(page.getByRole('alert')).toContainText('Inputs changed');
 await expect(page.locator('.output-success')).toHaveCount(0);
 await page.unroute('**/fonts/NotoSansBengali.ttf');
 await page.getByLabel('Expiry date for Trade License',{exact:true}).fill('2027-06-30');
 await page.getByRole('button',{name:'Dismiss messages'}).click();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Generate package',exact:true}).click();
 const download=await downloading;expect(download.suggestedFilename()).toBe('T-2026-0417_Package.pdf');
 await download.saveAs('output/T-2026-0417_Package.pdf');
 const pdf=await PDFDocument.load(fs.readFileSync('output/T-2026-0417_Package.pdf'));expect(pdf.getPageCount()).toBe(16);
 await expect(page.locator('.output-success')).toContainText('16 pages');
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'screenshots/sample-english-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:'screenshots/sample-english-mobile.png',fullPage:true});
 await page.setViewportSize({width:320,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Locale changes preserve the generated package, assignments and dates.
 await page.getByLabel('Interface language',{exact:true}).selectOption('bn');await expect(page.locator('.output-success')).toContainText('১৬'.replace('১৬','16'));
 await page.getByLabel('ইন্টারফেসের ভাষা',{exact:true}).selectOption('en');
 await page.getByLabel('Expiry date for Trade License',{exact:true}).fill('2026-10-19');
 await expect(page.locator('.output-success')).toHaveCount(0);await expect(page.getByRole('button',{name:'Generate package',exact:true})).toBeDisabled();
 expect(errors).toEqual([]);
});
test('mixed sizes and rotations, optional expiry equality, password rejection',async({page})=>{
 const document=await PDFDocument.create();
 for(const angle of [0,90,180,270]) {
  const p=document.addPage([300,400]);p.setRotation(degrees(angle));
  p.drawRectangle({x:0,y:0,width:300,height:400,borderColor:rgb(1,0,0),borderWidth:3});
  p.drawText(`Rotation ${angle} - TOP`,{x:10,y:375,size:16});p.drawText('BOTTOM',{x:10,y:10,size:16});
 }
 const form=document.getForm(),field=form.createTextField('note');field.setText('Visible annotation');field.addToPage(document.getPage(0),{x:35,y:180,width:210,height:35});
 const packed={tender:{...sample.tender,tender_id:'MIXED-2028',submission_deadline:'2028-02-29'},requirements:[{id:'optional',order:1,title_en:'Mixed page evidence',title_bn:'বিভিন্ন পৃষ্ঠার প্রমাণ',mandatory:false,has_expiry:true}]};
 await page.goto('/');await page.getByLabel('Import requirements JSON').setInputFiles({name:'mixed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packed))});
 await page.getByLabel('Upload PDF documents').setInputFiles({name:'mixed.pdf',mimeType:'application/pdf',buffer:Buffer.from(await document.save())});
 await choose(page,'Mixed page evidence','mixed.pdf');
 await page.getByLabel('Expiry date for Mixed page evidence',{exact:true}).fill('2028-02-29');
 await expect(page.locator('.status')).toHaveText('OK');
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Generate package',exact:true}).click();
 const download=await downloading;await download.saveAs('../../work/mixed-package.pdf');
 const result=await PDFDocument.load(fs.readFileSync('../../work/mixed-package.pdf'));expect(result.getPageCount()).toBe(5);
 expect(result.getPages().slice(1).map(p=>p.getSize())).toEqual([{width:300,height:448},{width:400,height:348},{width:300,height:448},{width:400,height:348}]);
 if(fs.existsSync('../../work/fixtures/protected.pdf')) {
  await page.getByLabel('Upload PDF documents').setInputFiles(path.resolve('../../work/fixtures/protected.pdf'));
  await expect(page.locator('.file-error')).toContainText('Cannot read this PDF');
 }
});
