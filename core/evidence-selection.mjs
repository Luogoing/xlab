import {AppError} from './engine.mjs';
export function planEvidenceBatches(records,pins=[]){
  if(records.length>20)throw new AppError('ANALYSIS_LIMIT','单次最多分析20篇');
  const batches=[];
  for(let i=0;i<records.length;i+=5){
    const group=records.slice(i,i+5),budget=Math.floor(24000/group.length),items=[];let characters=0,omitted=0;
    for(const r of group){const priority=[...r.evidence.filter(e=>pins.includes(e.evidence_id)),...['abstract_excerpt','claims','description'].map(field=>r.evidence.find(e=>e.field===field&&(field!=='claims'||e.independent))||r.evidence.find(e=>e.field===field)).filter(Boolean),...r.evidence],seen=new Set(),selected=[];let used=0;
      for(const e of priority){if(seen.has(e.evidence_id))continue;seen.add(e.evidence_id);if(used+e.text.length>budget)continue;if(selected.length>=12&&!pins.includes(e.evidence_id)&&selected.some(x=>x.field===e.field))continue;selected.push(e);used+=e.text.length;}
      if(!selected.length)throw new AppError('EVIDENCE_BUDGET','所选正文片段超过分析预算，请选择较短的可定位片段');
      if(r.evidence.some(e=>pins.includes(e.evidence_id)&&!selected.includes(e)))throw new AppError('PIN_BUDGET','钉选证据超过当前批次预算，请减少选中记录或钉选片段');
      items.push({record_id:r.record_id,publication_number:r.publication_number,title:r.title,evidence:selected});characters+=used;omitted+=r.evidence.length-selected.length;
    }
    batches.push({batch_id:'batch-'+(batches.length+1),status:'queued',record_ids:items.map(r=>r.record_id),records:items,evidence_ids:items.flatMap(r=>r.evidence.map(e=>e.evidence_id)),characters,omitted});
  }
  return batches;
}
