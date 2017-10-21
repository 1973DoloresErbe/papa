(function() {
  'use strict';
  // Your code here...
  setTimeout(function(){
    crawl();
  }, 3*1000);

  addBtn('autoreload', '当页爬', function(){
    minuteReload();
  });

})();

function crawl(){

  var data = {};
  data.url = location.href;
  data.title = document.querySelector('#productTitle').innerText;
  data.review_count = document.querySelector('.totalReviewCount').innerText.replace(',','');
  data.rating = document.querySelector('.arp-rating-out-of-text').innerText.replace(' out of 5 stars','');
  data.price = document.querySelector('.a-spacing-none .a-color-price').innerText.replace(/\s/g, '');
  var per = document.querySelectorAll('#histogramTable .a-text-right .a-size-base');
  data.percentage = {
    '5': per[0].innerText, 
    '4': per[1].innerText,
    '3': per[2].innerText, 
    '2': per[3].innerText, 
    '1': per[4].innerText
  };
  data.salesrank = (document.querySelector('#SalesRank'))?document.querySelector('#SalesRank').innerText:'';
  data.category = document.querySelector('#wayfinding-breadcrumbs_feature_div').innerText;
  console.log(data);

  chrome.runtime.sendMessage({ 'msgtype': 'amazon.com.product', 'content': data}, function (response) {
    console.log(response);
  });

}
