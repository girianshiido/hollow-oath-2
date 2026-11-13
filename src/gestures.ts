/** Requested game controls: fixed zoom and no accidental text selection. */
const editing=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,[contenteditable="true"]'));
document.addEventListener('selectstart',event=>{if(!editing(event.target))event.preventDefault();});
document.addEventListener('dblclick',event=>{if(!editing(event.target))event.preventDefault();},{passive:false});
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>event.preventDefault(),{passive:false});
document.addEventListener('touchstart',event=>{if(event.touches.length>1)event.preventDefault();},{passive:false});
document.addEventListener('touchmove',event=>{if(event.touches.length>1)event.preventDefault();},{passive:false});
