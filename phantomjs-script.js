/*global phantom:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 
var page = require('webpage').create();
page.viewportSize = { width: 1900, height: 1200};
page.settings.loadImages = false;
// page.settings.javascriptEnabled = false;

var system = require('system');
var lastReceived = new Date().getTime() + 100000;
var requestCount = 0;
var responseCount = 0;
var requestIds = [];
var minResponses = 0;
var debug = true;
//TODO use system.env to set some variables, but for now:
var delay = 1000;

// var initialRequest = null; //not used
var initialResponse = null;
var startTime = new Date().getTime();

page.onResourceRequested = function (request) {
    // console.log('Request (#' + request.id + '): ' + JSON.stringify(request));
  // initialRequest = initialRequest || request;
  if(requestIds.indexOf(request.id) === -1) {
    requestIds.push(request.id);
    requestCount++;
  }
};
page.onResourceReceived = function (response) {
  initialResponse = initialResponse || response;
  if(requestIds.indexOf(response.id) !== -1) {
      if (responseCount === 1) { // second response
          minResponses = requestCount;
      }
    lastReceived = new Date().getTime();
    responseCount++;
    requestIds[requestIds.indexOf(response.id)] = null;
  }
};

page.open(system.args[1]);

var checkComplete = function () {
    var timeDiff = new Date().getTime() - lastReceived;
    if(timeDiff > delay)
        if (responseCount >= minResponses &&
            requestCount === responseCount ||
            new Date().getTime() - startTime > 30000)  {
            clearInterval(checkCompleteInterval);
            // console.log(JSON.stringify(initialResponse) + "\n\n");
            var body;
            if(initialResponse && initialResponse.contentType === "text/plain") {
                body = page.plainText;
                // console.log(page.plainText);
            } else {
                // console.log(page.content);
                body = page.content;
                var anchors = page.evaluate(function() {
                    var nodes = document.getElementsByTagName('a');
                    var urls = [];
                    Object.keys(nodes).forEach(function(n) {
                        if (nodes[n].href) urls.push(nodes[n].href);
                    });
                    return urls;
                }); 
                console.log(JSON.stringify({
                    headers: initialResponse,
                    body: body
                    ,anchors: anchors
                }));
                phantom.exit();
            }
        } else {
            if (debug) {
                console.error(
                    'requestCount: ' + requestCount +
                        ' !== responseCount: ' + responseCount + '.' +
                        ' \nYou might have a synchronous ajax call that is NOT being captured by onResourceReceived.' +
                        ' \nSee: https://github.com/ariya/phantomjs/issues/11284' +
                        ' \nOr the server is just plain not responding to a resource request... ' +
                        ' \nWhatever the case, this process will time out within 30 seconds, and return what it has anyway'
                );
                // console.error('FORCED EXIT STATUS 10. Incomplete in ' + timeDiff/1000 + ' seconds.');
            }
            // phantom.exit(10);
        }
};

var checkCompleteInterval = setInterval(checkComplete, 100);


