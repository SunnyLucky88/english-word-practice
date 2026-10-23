const BOOK_PAGES = [{"page": 2, "image": "../assets/2026-10-23-pep-unit1/images/page2.jpg", "caption": "单元导入页：了解本单元主题。这一页只展示，不设点读区域。", "spots": [], "sequence": []}, {"page": 3, "image": "../assets/2026-10-23-pep-unit1/images/page3.jpg", "caption": "点击思考问题或歌谣中的完整句子听发音。下方只朗读页面实际显示的歌词。", "sequence": [1, 2, 3, 4, 5, 6, 5], "spots": [{"s": 1, "box": [555, 550, 300, 40]}, {"s": 2, "box": [555, 593, 423, 92]}, {"s": 3, "box": [527, 827, 285, 40]}, {"s": 4, "box": [527, 873, 333, 40]}, {"s": 5, "box": [527, 919, 355, 40]}, {"s": 6, "box": [527, 965, 370, 40]}, {"s": 5, "box": [527, 1150, 350, 43]}]}, {"page": 4, "image": "../assets/2026-10-23-pep-unit1/images/page4.jpg", "caption": "点击人物对话、歌词或姓名卡听朗读。同一对话框中的自我介绍完整播放。", "sequence": [7, 8, 5, 9, 10, 11, 12, 13, 5, 14, 3, 3, 22, 23, 24, 25, 26], "spots": [{"s": 7, "box": [72, 279, 276, 124]}, {"s": 8, "box": [722, 297, 240, 121]}, {"s": 5, "box": [128, 503, 207, 118]}, {"s": 9, "box": [699, 514, 258, 123]}, {"s": 10, "box": [162, 872, 261, 43]}, {"s": 11, "box": [162, 922, 301, 43]}, {"s": 12, "box": [162, 972, 333, 43]}, {"s": 13, "box": [162, 1022, 343, 43]}, {"s": 5, "box": [578, 872, 315, 43]}, {"s": 14, "box": [578, 922, 270, 43]}, {"s": 3, "box": [578, 972, 290, 43]}, {"s": 3, "box": [578, 1022, 290, 43]}, {"s": 22, "box": [554, 1110, 183, 61]}, {"s": 23, "box": [754, 1123, 182, 59]}, {"s": 24, "box": [739, 1183, 151, 52]}, {"s": 25, "box": [558, 1194, 185, 73]}, {"s": 26, "box": [711, 1277, 211, 50]}]}, {"page": 5, "image": "../assets/2026-10-23-pep-unit1/images/page5.jpg", "caption": "身体部位单词分别点读；下方每行是一个完整动作表达，可边听边做。", "sequence": [15, 16, "ear", "eye", "mouth", "hand", "arm", 17, 18, 19, 20, 21], "spots": [{"s": 15, "box": [160, 202, 301, 114]}, {"s": 16, "box": [485, 217, 364, 80]}, {"w": "ear", "box": [145, 394, 156, 62]}, {"w": "eye", "box": [826, 335, 157, 62]}, {"w": "mouth", "box": [826, 415, 157, 62]}, {"w": "hand", "box": [145, 654, 156, 61]}, {"w": "arm", "box": [797, 674, 155, 62]}, {"s": 17, "box": [351, 960, 408, 41]}, {"s": 18, "box": [351, 1006, 408, 41]}, {"s": 19, "box": [351, 1052, 421, 41]}, {"s": 20, "box": [351, 1098, 461, 41]}, {"s": 21, "box": [351, 1144, 400, 41]}]}];
let currentPage=0;
function pageItem(ref){return typeof ref==='string'?words.find(w=>w.en===ref):sentences[ref-1]}
function renderBook(){
 stop();const page=BOOK_PAGES[currentPage],canvas=$('book-canvas');
 $('page-label').textContent='第 '+page.page+' 页';
 $('previous-page').disabled=currentPage===0;$('next-page').disabled=currentPage===BOOK_PAGES.length-1;
 $('read-page').disabled=page.sequence.length===0;
 $('book-page').value=String(currentPage);canvas.textContent='';
 const img=document.createElement('img');img.src=page.image;img.alt='人教版 PEP 三年级上册第 '+page.page+' 页';img.draggable=false;canvas.appendChild(img);
 page.spots.forEach(spot=>{const item=pageItem(spot.w||spot.s),b=document.createElement('button');b.className='hotspot';b.type='button';b.dataset.file=item.file;b.setAttribute('aria-label','课本点读：'+item.en);b.title=item.en;const [x,y,w,h]=spot.box;Object.assign(b.style,{left:x/1080*100+'%',top:y/1527*100+'%',width:w/1080*100+'%',height:h/1527*100+'%'});b.onclick=()=>play(item,b);canvas.appendChild(b)});
 $('book-caption').textContent=page.caption;
}
$('previous-page').onclick=()=>{if(currentPage>0){currentPage--;renderBook()}};
$('next-page').onclick=()=>{if(currentPage<BOOK_PAGES.length-1){currentPage++;renderBook()}};
$('book-page').onchange=e=>{currentPage=Number(e.target.value);renderBook()};
$('book-zoom').onchange=e=>{$('book-canvas').style.width=e.target.value+'%'};
$('show-spots').onchange=e=>$('book-canvas').classList.toggle('show-spots',e.target.checked);
$('read-page').onclick=()=>playSequence(BOOK_PAGES[currentPage].sequence.map(pageItem),$('book-canvas'));
renderBook();
