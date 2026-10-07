// Optional compatibility check; Python is used only to produce the reference data.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {expand}=require('../engine/native');
const rows=JSON.parse(fs.readFileSync(0,'utf8'));let matched=0,unsupported=0;
for(const row of rows) {
  const actual=expand(row.request);
  assert.deepEqual(actual,row.error?null:row.expected,JSON.stringify(row.request));
  if(row.error)unsupported++;else matched++;
}
console.log(`${matched} reference results match; ${unsupported} unsupported inputs safely return null.`);
