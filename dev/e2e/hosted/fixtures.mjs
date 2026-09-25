const quote=JSON.stringify;
const primaryAudit=`const site=await client.site.find();\nconst environments=await client.environments.list();\nconst models=await client.itemTypes.list();\nconst uploads=await client.uploads.list({page:{limit:1}});`;
export const prepareSource=(site,environment)=>`${primaryAudit}\nif(site.id!==${quote(site)})throw Error('Wrong site');\nif(environments.length!==1||!environments[0].meta.primary||environments[0].id!=='main'||models.length||uploads.length||JSON.stringify(site.locales)!=='["en"]')throw Error('Project must have an empty primary environment');\nconst sandbox=await client.environments.fork('main',{id:${quote(environment)}});\nconsole.log(JSON.stringify({environment:sandbox.id,baseline:{locales:site.locales,models:models.length,uploads:uploads.length,environments:environments.map(e=>e.id)}}));`;
export const schemaSource=()=>`await client.site.update({locales:['en','it']});
const image=await client.itemTypes.create({name:'Hosted Image',api_key:'hosted_image',modular_block:true});
await client.fields.create(image.id,{label:'Caption',api_key:'caption',field_type:'string'});
await client.fields.create(image.id,{label:'Image',api_key:'image',field_type:'file'});
const article=await client.itemTypes.create({name:'Hosted Article',api_key:'hosted_article',draft_mode_active:true});
await client.fields.create(article.id,{label:'Title',api_key:'title',field_type:'string'});
await client.fields.create(article.id,{label:'Untouched',api_key:'untouched',field_type:'string'});
await client.fields.create(article.id,{label:'Body',api_key:'body',field_type:'structured_text',localized:true,validators:{structured_text_blocks:{item_types:[image.id]},structured_text_links:{item_types:[]}}});
console.log(JSON.stringify({image:image.id,article:article.id}));`;
export const uploadSource=()=>`const upload=await client.uploads.createFromUrl({url:'https://picsum.photos/seed/datocms-hosted-e2e/64/64'});\nconsole.log(JSON.stringify({id:upload.id}));`;
export const seedSource=(schema,uploaded)=>`import {buildBlockRecord} from '@datocms/cma-client-node';
const image=(caption:string)=>({type:'block' as const,item:buildBlockRecord<Schema.HostedImage>({item_type:{type:'item_type',id:${quote(schema.image)}},caption,image:{upload_id:${quote(uploaded.id)},alt:'Original alt',title:null,custom_data:{source:'archive'},focal_point:{x:0.25,y:0.75}}})});
const records=[];
for(const kind of ['simple','localized','published'] as const){
 let record=await client.items.create<Schema.HostedArticle>({item_type:{type:'item_type',id:${quote(schema.article)}},title:'Original title',untouched:'Keep this value',body:{
  en:{schema:'dast',document:{type:'root',children:[{type:'paragraph',children:[{type:'span',value:'Hello reader',marks:['strong','emphasis']},{type:'span',value:' — '},{type:'link',url:'https://example.test/help',meta:[{id:'rel',value:'nofollow'}],children:[{type:'span',value:'Help'}]}]},image('Keep the caption'),...(kind==='published'?[image('Keep the second caption')]:[])]}},
  it:{schema:'dast',document:{type:'root',children:[{type:'paragraph',children:[{type:'span',value:'Contenuto invariato'}]},{type:'code',language:'js',code:'  keep()\\n\\nnext();  '}]}}
 }});
 if(kind==='published'){await client.items.publish(record.id);record=await client.items.update<Schema.HostedArticle>(record.id,{untouched:'0 — preserve this exact value'});}
 records.push({kind,id:record.id});
}
console.log(JSON.stringify({records}));`;
export const observationSource=ids=>`const records=[];\nfor(const target of ${quote(ids)}){\nconst current=await client.items.find<Schema.HostedArticle>(target.id,{nested:true});\nconst versions=await client.itemVersions.list(target.id);\nconst published=current.meta.published_at?await client.items.find<Schema.HostedArticle>(target.id,{nested:true,version:'published'}):null;\nrecords.push({kind:target.kind,current,published,versions:versions.length});\n}\nconsole.log(JSON.stringify({records}));`;
export const cleanupSource=(site,environment)=>`const existing=await client.environments.list();\nif(existing.some(e=>e.id===${quote(environment)})){await client.environments.destroy(${quote(environment)});}\n${primaryAudit}\nif(site.id!==${quote(site)}||environments.some(e=>e.id===${quote(environment)})||models.length||uploads.length||JSON.stringify(site.locales)!=='["en"]')throw Error('Cleanup or primary preservation failed');\nconsole.log(JSON.stringify({clean:true,locales:site.locales,modelCount:models.length,uploadCount:uploads.length,environments:environments.map(e=>({id:e.id,primary:e.meta.primary}))}));`;
