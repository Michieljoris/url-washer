url_washer
-----------------

    var wash =require('path/to/wash.js');


    var promise = wash('someurl', someOptions);


wash returns a vow that promises to deliver html rendered by phantomjs
after browsing someUrl.

If phantomjs is not on the path, you can pass in the path in options:

    someOptions = 
    { phantomPath: 'path/to/phantomjs', 
	  seoServer: 'seoServerUrl'}

You can also do

    npm install phantomjs 
	
in the url_washer dir.

Or uncomment the phantomjs dependency in package.js, then:

    node package.js
	npm install
	
If wash can't find a phantomjs executable it will ask the seoServer if
the url has been set in options.

It will do an ajax call to http://seoServerUrl?url=someUrl, and expect
html to be returned.




