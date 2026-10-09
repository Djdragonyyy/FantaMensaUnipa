import test from 'node:test';
import assert from 'node:assert/strict';
import {matchMenu} from '../src/menu-matching.js';
import {readMenuPhoto} from '../src/ocr.js';
import {createWorker} from 'tesseract.js';
const catalog=[
 {id:'pasta',category:'first',it:'Pasta al pomodoro',en:'Pasta with tomato sauce',aliases:['pasta al sugo'],active:true},
 {id:'pollo',category:'main',it:'Pollo arrosto',en:'Roast chicken',aliases:['pollo al forno'],active:true},
 {id:'frittata',category:'main',it:'Frittata',en:'Omelette',aliases:[],active:true},
 {id:'patate',category:'side',it:'Patate al forno',en:'Roast potatoes',aliases:[],active:true},
 {id:'pesca',category:'juice',it:'Pesca',en:'Peach',aliases:[],active:true},
 {id:'pera',category:'juice',it:'Pera',en:'Pear',aliases:[],active:true},
 {id:'old',category:'first',it:'Pasta al pesto',en:'Pasta with pesto',aliases:[],active:false}
];
test('OCR suggestions respect headings, aliases, unique IDs and inactive catalog entries',()=>{
 const result=matchMenu('PRIMI\nPASTA AL SUGO\nPasta al pomodoro\nPasta al pesto\nSECONDI\nPollo al forno\nFrittata\nCONTORNI\nPatate al forno\nSUCCHI\nPesca - Pera',catalog);
 assert.deepEqual(result.choices,{first:['pasta'],main:['pollo','frittata'],side:['patate'],juice:['pesca','pera']});
 assert.ok(result.unmatched.includes('Pasta al pesto'));
});
test('No guesses for unknown, unavailable, substring or fruit in a different course',()=>{
 const result=matchMenu('Primi\nRiso con pesca\nPasta al pomodoro esaurito\nSecondi\nFrittatata\nTorta misteriosa\nContorni\nPollo arrosto',catalog);
 assert.deepEqual(result.choices,{first:[],main:[],side:[],juice:[]});assert.equal(result.unmatched.length,5);
});
test('Malformed and oversized photos rejected before decoding',async()=>{
 for(const f of [null,{type:'image/gif',size:100},{type:'image/jpeg',size:4*1024*1024},{type:'image/png',size:0}])await assert.rejects(readMenuPhoto(f),/OCR_FILE/);
});
test('Real Italian OCR reads a menu image and produces a complete draft', {timeout:60000},async()=>{
 const worker=await createWorker('ita',1,{langPath:'public/ocr',cacheMethod:'none'});
 try{const {data}=await worker.recognize('tests/fixtures/menu.png');const draft=matchMenu(data.text,catalog);assert.deepEqual(draft.choices,{first:['pasta'],main:['pollo','frittata'],side:['patate'],juice:['pesca','pera']});}finally{await worker.terminate();}
});
