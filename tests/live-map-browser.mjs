import assert from 'node:assert/strict';
import {Store} from '../server/store.mjs';
import {makeObject} from '../src/model.mjs';

export async function testLiveMap(page, root) {
  const saved = () => page.waitForFunction(() => document.querySelector('.app-shell').dataset.saveState === 'Saved');
  await saved();
  const store = new Store(root), original = await store.read('map');
  const pizza = {...makeObject(original.data, 'Pizza'), description:'A builder intention with no code yet.'};
  await store.write('map', {...original.data, objects:[...original.data.objects, pizza]}, original.revision);
  await page.locator('[data-object-id="obj:pizza"]').waitFor({state:'attached'});
  assert.equal(await page.getByRole('button', {name:'Undo (⌘Z)',exact:true}).isDisabled(),true,'An old undo snapshot cannot overwrite an external agent update');
  await page.getByRole('button',{name:'Find an object (⌘K)'}).click();
  await page.getByRole('textbox',{name:'Find an object',exact:true}).fill('City');
  await page.locator('.canvas-search').getByRole('button',{name:'City',exact:true}).click();
  const city=page.locator('[data-object-id="obj:city"]');
  await city.getByRole('button',{name:'Select Country',exact:true}).dblclick();
  const draft=city.getByRole('textbox',{name:'Country',exact:true});
  await draft.fill('An unfinished edit');
  const current=await store.read('map');
  const planet=makeObject(current.data,'Planet');
  await store.write('map',{...current.data,objects:[...current.data.objects,planet]},current.revision);
  await page.waitForTimeout(2400);
  assert.equal(await draft.inputValue(),'An unfinished edit','Polling does not replace an active builder draft');
  await draft.press('Escape');
  await page.locator('[data-object-id="obj:planet"]').waitFor({state:'attached'});
  await saved();
  const latest=await store.read('map');
  await store.write('map',original.data,latest.revision);
  await page.locator('[data-object-id="obj:pizza"]').waitFor({state:'detached'});
  console.log('Live map passed: external agent writes appear, intended concepts survive, active drafts are preserved, and obsolete undo history is cleared.');
}
