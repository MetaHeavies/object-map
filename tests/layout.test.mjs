import test from 'node:test';
import assert from 'node:assert/strict';
import {arrange, columnOrder, reorderColumns, positionsForOrder} from '../src/layout.mjs';
const map = {objects:['a','b','c'].map(id=>({id,attributes:[],relationships:[],actions:[],states:[]}))};

test('legacy positions retain horizontal order while columns align with 32px gutters',()=>{
  const layout={positions:{a:{x:400,y:80},b:{x:0,y:200},c:{x:800,y:-40}}};
  assert.deepEqual(columnOrder(map,layout),['b','a','c']);
  const result=arrange(map,layout,['a']);
  assert.deepEqual(result.positions,{b:{x:0,y:0},a:{x:282,y:0},c:{x:564,y:0}});
  assert.deepEqual(arrange(map,layout,[],{'a:false':200}).positions,result.positions);
});
test('dragged column tracks freely, preview order equals committed order, and extremes clamp',()=>{
  const order=['a','b','c'];
  const next=reorderColumns(order,'a',500);
  assert.deepEqual(next,['b','c','a']);
  const layout={positions:{}};
  const preview=arrange(map,layout,[],{},{id:'a',order:next,point:{x:500,y:45}});
  assert.deepEqual(preview.positions.a,{x:500,y:45});
  const settled=arrange(map,{positions:positionsForOrder(next)},[]);
  assert.deepEqual(settled.positions.b,preview.positions.b);
  assert.deepEqual(settled.positions.c,preview.positions.c);
  assert.deepEqual(reorderColumns(order,'c',-1000),['c','a','b']);
  assert.deepEqual(reorderColumns(order,'a',10000),['b','c','a']);
  assert.deepEqual(map.objects.map(o=>o.id),order);
});
