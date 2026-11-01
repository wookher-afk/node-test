import test from 'node:test';
import assert from 'node:assert/strict';
import '../ui/03-2/money.js';
const {toWon,fromWon,display}=globalThis.NODE_MONEY;
test('worker and company share 만원 conversion while keeping integer KRW',()=>{
 for(const [input,won] of [['20',200000],['350',3500000],['25.5',255000],['0.0001',1],['20.0001',200001],['10000',100000000]]){assert.equal(toWon(input),won);assert.equal(toWon(fromWon(won)),won);assert.equal(display(input),fromWon(won)+'만원');}
});
test('money rejects malformed, over-precise and unsafe values without guessing units',()=>{
 for(const value of ['', '-20','20만원','200,000','1e2','20.00001','NaN','9007199254740991'])assert.throws(()=>toWon(value));
});
