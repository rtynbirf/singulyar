'use strict';
(function(root){
// Registry entries describe capability honestly. None is a network transport.
const adapters=[
 {id:'local-draft',label:'Локальный черновик / экспорт',kind:'local',status:'available',enabled:true,transport:false,supportedIntents:['message','talk','share','gather','publish','value','access','find'],supportedFrom:['text','image','file','speech','sign-manual','tactile','value-transfer'],supportedTo:['text','speech','audio','braille','tactile','aac','file','image','video','value-transfer'],privacy:'local-only',description:'Сохранение в браузере и экспорт файла; ничего не отправляет.'},
 {id:'system-tts',label:'Системное озвучивание',kind:'device-api',status:'capability-check-required',enabled:true,transport:false,supportedIntents:['message','access'],supportedFrom:['text'],supportedTo:['speech','audio'],privacy:'device-local',description:'Только после проверки наличия SpeechSynthesis; не является доставкой адресату.'},
 {id:'matrix',label:'Matrix (проектируемый адаптер)',kind:'federated-messaging',status:'not-connected',enabled:false,transport:false,supportedIntents:['message','talk','gather','share'],supportedFrom:['text','image','file','audio'],supportedTo:['text','audio','image','file'],privacy:'unknown',description:'Не подключён; не может отправлять.'},
 {id:'activitypub',label:'ActivityPub (проектируемый адаптер)',kind:'federated-social',status:'not-connected',enabled:false,transport:false,supportedIntents:['publish'],supportedFrom:['text','image','video','file'],supportedTo:['text','image','video'],privacy:'unknown',description:'Не подключён; не может публиковать.'},
 {id:'payment-link',label:'Внешний платёжный переход (проектируемый)',kind:'external-value-provider',status:'not-connected',enabled:false,transport:false,supportedIntents:['value'],supportedFrom:['value-transfer'],supportedTo:['value-transfer'],privacy:'unknown',description:'Нет платёжной интеграции; перевод не выполняется.'}
];
const api={list:()=>adapters.map(x=>({...x})),get:id=>adapters.find(x=>x.id===id)||null};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SingulyarAdapters=api;
})(typeof globalThis!=='undefined'?globalThis:this);
