import { describe, expect, it } from 'vitest';
import { activeNodes,englishCode, gateState,reorderNode, validateGraph, type Graph, type TrailNode } from '../frontend/domain';
const node = (id:string,kind:TrailNode['kind']='stage'):TrailNode => ({id,kind,origin:null,code:null,title:id,content:{},order:0,x:50,y:50,placed:true,archived:false,threshold:'practicing',prerequisites:[]});
describe('Personal trail rules',()=>{
  it('requires every signal of every prerequisite at the configured threshold',()=>{
    const stage=node('stage'),gate={...node('gate','gate'),prerequisites:['stage']};
    const graph:Graph={nodes:[stage,gate],edges:[{source:stage.id,target:gate.id}]};
    const learning={notes:{},mastery:{stage:{understand:{value:'independent' as const,revision:1},execute:{value:'practicing' as const,revision:1},explain:{value:'practicing' as const,revision:1}}}};
    expect(gateState(gate,graph,learning).ready).toBe(true);
    gate.threshold='independent';expect(gateState(gate,graph,learning).ready).toBe(false);
    expect(gateState(gate,graph,{...learning,mastery:{stage:{understand:{value:'independent',revision:1},execute:{value:'independent',revision:1},explain:{value:'independent',revision:1}}}}).ready).toBe(true);
  });
  it('moves a node deterministically without tied order values or changing IDs and route codes',()=>{
    const graph:Graph={nodes:[node('a'),{...node('b'),order:1},{...node('c','route'),order:2,code:'D'}],edges:[]};
    const moved=reorderNode(graph,'b',-1);
    expect(activeNodes(moved).map(n=>n.id)).toEqual(['b','a','c']);
    expect(moved.nodes.find(n=>n.id==='c')?.code).toBe('D');
    expect(activeNodes(reorderNode(moved,'b',1)).map(n=>n.id)).toEqual(['a','b','c']);
  });
  it('keeps prerequisite paths through an archived stage while showing the gate unavailable',()=>{
    const first=node('first'),middle=node('middle'),gate={...node('gate','gate'),prerequisites:['first','middle']};
    const graph:Graph={nodes:[first,middle,gate],edges:[{source:'first',target:'middle'},{source:'middle',target:'gate'}]};
    middle.archived=true;
    expect(validateGraph(graph)).toBeNull();
    expect(gateState(gate,graph,{mastery:{},notes:{}})).toEqual({ready:false,label:'Prerequisite unavailable'});
    middle.archived=false;expect(validateGraph(graph)).toBeNull();
  });
  it('rejects genuinely disconnected prerequisites and active cycles',()=>{
    const graph:Graph={nodes:[node('first'),{...node('gate','gate'),prerequisites:['first']}],edges:[]};
    expect(validateGraph(graph)).toMatch(/upstream/);
    graph.edges=[{source:'first',target:'gate'},{source:'gate',target:'first'}];
    expect(validateGraph(graph)).toMatch(/cycle/);
  });
  it('assigns English codes beyond Z without Greek letters or reuse',()=>{
    expect([1,4,5,26,27,52,53,200].map(englishCode)).toEqual(['A','D','E','Z','AA','AZ','BA','GR']);
  });
});
