from pathlib import Path
import json
p=Path('docs/required-match-2026-11-01');results=[]
for kind in ['company','worker','technical']:
 for width in [390,1440]:
  before=json.loads((p/f'before-{kind}-{width}.json').read_text());after=json.loads((p/f'after-{kind}-{width}.json').read_text());lookup={}
  for row in after:lookup.setdefault((row['tag'],row['id'],row['text']),[]).append(row)
  compared=0;legends=[]
  for row in before:
   key=(row['tag'],row['id'],row['text']);assert key in lookup,(kind,width,key)
   target=lookup[key].pop(0);compared+=1
   for field in ['x','y','width','height']:
    if row['tag']=='LEGEND' and field=='width':
     if abs(target[field]-row[field])>.1:legends.append({'title':row['text'],'widthDelta':round(target[field]-row[field],3)})
     continue
    assert abs(target[field]-row[field])<.1,(kind,width,key,field,row[field],target[field])
  results.append({'screen':kind,'viewportWidth':width,'originalElementsCompared':compared,'inputPositionsAndSizesUnchanged':True,'originalTitleHeightsUnchanged':True,'legendWidthOnlyChanges':legends})
(p/'layout-comparison.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
for r in results:print(f"PASS {r['screen']} {r['viewportWidth']}px: {r['originalElementsCompared']} existing elements unchanged (legend width extension only)")
