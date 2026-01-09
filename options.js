document.addEventListener("DOMContentLoaded", function(){
  restoreOptions();
  document.getElementById("SaveButton").addEventListener('click', saveOptions, false);
});

var selectReqInterval;
var radioBackgroundTabs;

function initVariables() {
  selectReqInterval = document.getElementById("RequestInterval");
  radioBackgroundTabs = document.getElementsByName("BackgroundTabs");
}

function restoreOptions() {
  initVariables();
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['HN.RequestInterval','HN.BackgroundTabs'], function(items){
      var reqInterval = items['HN.RequestInterval'] || localStorage["HN.RequestInterval"];
      for (var i=0; i<selectReqInterval.children.length; i++) {
        if (selectReqInterval[i].value == reqInterval) {
          selectReqInterval[i].selected = "true";
          break;
        }
      }
      var backgroundTabs = (items['HN.BackgroundTabs'] != null ? String(items['HN.BackgroundTabs']) : localStorage["HN.BackgroundTabs"]);
      for (var j=0; j<radioBackgroundTabs.length; j++) {
        if (radioBackgroundTabs[j].value == backgroundTabs) {
          radioBackgroundTabs[j].checked = "true";
        }
      }
    });
  } else {
    var reqInterval = localStorage["HN.RequestInterval"];
    for (var i=0; i<selectReqInterval.children.length; i++) {
      if (selectReqInterval[i].value == reqInterval) {
        selectReqInterval[i].selected = "true";
        break;
      }
    }
    var backgroundTabs = localStorage["HN.BackgroundTabs"];
    for (var k=0; k<radioBackgroundTabs.length; k++) {
      if (radioBackgroundTabs[k].value == backgroundTabs) {
        radioBackgroundTabs[k].checked = "true";
      }
    }
  }
}

function saveOptions() {
  var interval = selectReqInterval.children[selectReqInterval.selectedIndex].value;
  localStorage["HN.RequestInterval"] = interval;
  var bgVal = null;
  for (var i=0; i<radioBackgroundTabs.length; i++) {
    if (radioBackgroundTabs[i].checked) {
      localStorage["HN.BackgroundTabs"] = radioBackgroundTabs[i].value;
      bgVal = radioBackgroundTabs[i].value;
      break;
    }
  }
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      'HN.RequestInterval': parseInt(interval, 10),
      'HN.BackgroundTabs': bgVal
    });
  }
}

