/*global module:false __dirname:false module:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

//Code is based on https://github.com/moviepilot/seoserver which is
//again based on https://github.com/apiengine/seoserver

//TODO we need a server to talk to, and a script in the browser that does the same as phantom.

var spawn = require('child_process').spawn,
    Path = require('path'),
    VOW = require('dougs_vow'),
    Which = require('which'),
    request = require('request'),
    extend = require('extend')
    ;

var phantomPath;

var log = [];

var options = {
    verbose: false
    ,die: 30000
    // ,phantomPath: 'bla'
    // ,seoServer: 'http://seoserver.axion5.net'
};


function debug() {
    if (options.verbose) console.log.apply(console, arguments);
    log.push(arguments);
}

try {
    phantomPath = require('phantomjs').path;
} catch(e) {
    debug(e); } 

function initPhantom() {
    var vow = VOW.make();
    var path = options.phantomPath || phantomPath;
    Which(path, function(err, path) {
        // debug(path);
        if (!err) {
            vow.keep(path);   
        }
        else vow.breek(err);
    });
    return vow.promise;
}

function removeScriptTags(content) {
    return content.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function render(url, phantomPath) {
    var vow = VOW.make(); 
    var childArgs = [
        Path.join(__dirname, 'phantomjs-script.js'), url
    ];
    var html = "";
    var err = [];
    
    var phantom = spawn(phantomPath, childArgs);
    
    var timeout = setTimeout(function() {
        phantom.kill();
        vow.breek('Timed out');
    }, options.die);
    
    // var headers = {};
    phantom.stdout.setEncoding('utf8');
    phantom.stdout.on('data', function (data) {
        data = data.toString();
        // var responseHeaders;
        // var match = data.match(/(\{.*?\})\n\n/);
        // if (match) {
        //     try {
        //         responseHeaders = JSON.parse(match[1]);
        //         if (responseHeaders.status) {
        //             headers.status = responseHeaders.status;
        //         }
        //         if (responseHeaders.status === 301) {
        //             headers.location = responseHeaders.redirectURL;
        //         }
        //         headers.contentType = responseHeaders.contentType;
        //         data = data.replace(/(.*?)\n\n/, '');
        //         debug(responseHeaders);
        //     } catch(e) { console.log(e); } 
        // }
        // if (data.match(/^\w*error/i)) {
        //     headers.status = 503;
        //     debug("js error: " + data.toString());
        // }
        // else
        html += data;
    });

    phantom.stderr.on('data', function (data) {
        err.push(data.toString());
        
    });

    // phantom.on('close', function (code) {
    //     if (code) {
    //         vow.breek(code);
    //         return;
    //     }
    //     vow.keep({ html: html, err: err });
    // });
    
    phantom.on('exit', function(code) {
        clearTimeout(timeout);
        if (code) {
            debug('Error on PhantomJS process');
            vow.breek(code);
        } else {
            //  We chose to remove all script tags,
            //  otherwise if/when google bot will start to parse js
            //  it will lead to duplicate renderings of the page.
            var data;
            try { data = JSON.parse(html);  } catch(e) {  }
            if (data) {
                if (data.headers.status === 301) {
                    data.headers.location = data.headers.redirectURL;
                }
                // debug('Body length:' + data.body.length, data.headers, data.links);
                vow.keep({ html: removeScriptTags(data.body), headers: data.headers, links: data.links, err: err });
            }
            else vow.breek('Prerender error, no data');
        }
    });
    return vow.promise;   
}

function wash(url, someOptions) {
    var vow = VOW.make();
    options = extend(options, someOptions);
    initPhantom()
        .when(
            function(phantomPath) {
                return render(url, phantomPath);
            })
        .when(
            function(result) {
                vow.keep(result);
            }
            ,function(err) {
                if (options.seoServer) {
                    debug("Not able to use native phantomjs. Trying options.seoServer", err);
                    request({ uri: options.seoServer
                              ,qs: {
                                  url: url
                              }
                            }, function (error, response, body) {
                                if (!error && response.statusCode === 200) {
                                    vow.keep(body);
                                }
                                else {
                                    vow.breek('Not able to render ' + url + ' code: ' + error.toString());   
                                }
                            });
                } 
                else {
                    vow.breek('Not able to render ' + url + ' code: ' + err);   
                }
            }
        );
    return vow.promise;
}

module.exports = wash;

// render('http://localhost:6001', 'phantomjs' ).when(
//     function(data) { console.log("RESULT:", data, data.headers.headers);}
//     ,function(data) { console.log('error', data);}
// );
