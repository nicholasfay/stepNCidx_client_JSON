/* $RCSfile: DataLoader.js,v $
 * $Revision: 1.6 $ $Date: 2012/08/14 18:58:30 $
 * Auth: Jochen Fritz (jfritz@steptools.com)
 * 
 * Copyright (c) 1991-2012 by STEP Tools Inc. 
 * All Rights Reserved.
 * 
 * Permission to use, copy, modify, and distribute this software and
 * its documentation is hereby granted, provided that this copyright
 * notice and license appear on all copies of the software.
 * 
 * STEP TOOLS MAKES NO REPRESENTATIONS OR WARRANTIES ABOUT THE
 * SUITABILITY OF THE SOFTWARE, EITHER EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. STEP TOOLS
 * SHALL NOT BE LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE AS A
 * RESULT OF USING, MODIFYING OR DISTRIBUTING THIS SOFTWARE OR ITS
 * DERIVATIVES.
 */


"use strict";

var TEST_COUNT=0;

function DataLoader (stat_el)
{
    this.load_queue = [];  // The queue of requests to load 
    this.loading = [];     // Items currently getting loaded

    this.post_queue = [];  // The queue of post-loading jobs to perform
    
    // The number of concurrent downloads to perform.  Firefox limits the
    // number of requests to a single site to 4 by default, so we keep this
    // below that number in case the user has another window open on the site.
    this.jobs = 3;

    // If true, the queue will be automatically started whenever a job is added.
    // 
    this.autorun = true;

}

STATIC(DataLoader, {
    getRank : function (f) {
	if (!f)
	    return null;
	
	if (typeof f == "function") {
	    var r = f();
	    return r;
	}

	throw new Error ("getRank: unimplemented case");
    }
});

METHODS(DataLoader, {

    // Set the base URL for furure requests from the given URL
    setRequestBase : function(url) {

	if (!url)
	    this.base = null;
	
	var pattern = new RegExp("^(.*)/.*$");

	var m = pattern.exec(url);
	if (!m) {
	    return;
	}
	    	    
	var base = m[1];

	if (base == ".")
	    return;

	if (!base.match(/\/$/))
	    base += "/";
//	console.log ("Set base old="+this.base+" new "+base);
	
	if (!this.base)
	    this.base = base;
	
	else if (base.match(/^\//))
	    this.base = base;
	
	else if (base.length > 0)
	    this.base += base + "/";
	else
	    this.base = "";

//	console.log ("Target="+this.base);
    },

    // getRequestBase : function() {	
    // },
    
    addRequest : function(url, fn, sort) {

	url = resolve_url(url, this.base, "index.JSON");
	
	var req = {url: url, targ: fn, sort: sort};

	this.load_queue.push(req);

	if (this.autorun)
	    this.runLoadQueue();	
    },

    sortQueue : function() {
	this.load_queue.sort(function(a,b) {
	    var va = DataLoader.getRank(a.sort);
	    var vb = DataLoader.getRank(b.sort);

	    if (va == vb) return 0;

	    // items w/o a sort function come first
	    if (va == null) return -1;
	    if (vb == null) return +1;

	    return vb-va;
	});
    },

    queueLength : function() {
	return this.load_queue.length + +this.loading.length + this.post_queue.length;
    },
    
    runLoadQueue : function() {
	if (this.loading.length >= this.jobs) return;

	if (this.load_queue.length <= 0) return;

	var req;

	var serial = VIEWER.gl.draw_serial;
	
	// We may want a better method to select the next thing to download
	for (var i=0; i<this.load_queue.length; i++) {
	    req = this.load_queue[i];
	    var targ = req.targ;
	    if (typeof targ != "function"
		&& targ.getLastDraw) {

		if (targ.getLastDraw() != serial) {
//		    console.log ("Skipping: " + serial);
		    continue;
		}
		
		this.load_queue.splice(i, 1);
		this.initRequest(req);
		return;
	    }
	}
	
	req = this.load_queue.shift();
	this.initRequest(req);
    },

    // Update the overlay in the viewer window to tell how many object
    // still need to be loaded.
    displayStatus : function() {
//	console.log ("Display status");
	
	if (!this.status_element)
	    return;
	var count = this.queueLength();

	var msg = "";
	if (count)
            msg = "Loading: "+count;

	this.status_element.innerHTML = msg;
    },
    
    initRequest : function(req) {
	
	if (this.loading.length > this.jobs)
	    throw new Error("DataLoader internal error");
	
	this.loading.push(req);
	this.displayStatus();
	
	var xr = new XMLHttpRequest();
	var t = this;
	xr.addEventListener("load", function() {t.loadComplete(xr, req);})
	xr.addEventListener("loadend", function() {t.requestComplete(req);})

	xr.open("GET", req.url, true);
	try {
	    xr.send();
	} catch (ex) {
	    console.log ("Error loading file: "+req.url);
	    this.requestComplete(req);
	    this.displayStatus();
	    
	}
    },

    // Called when a download completes sucessfully.  This function pushed the
    // results on the post queue, and arranges for them to run.
    loadComplete : function(xr, req) {
	var self = this;

        var jsonResponse = JSON.parse(xr.responseText);
	req.JSON = jsonResponse;

	this.post_queue.push(req);
	this.runPostQueue();

    },

    // Called when an AJAX request is finished for any reason.  This will insure
    // that the next item in the queue is loaded.
    requestComplete : function(req) {
	for (var i=0; i<this.loading.length; i++) 
	    if (this.loading[i] == req) {
		this.loading.splice(i, 1);
		break;
	    }

	this.runLoadQueue();
    },

    // Schedule the first item on the post precessing queue.
    runPostQueue : function() {
	
	if (this.active) {
	    this.displayStatus();
	    return;
	}
	
	var self = this;
	var req;

	var serial = VIEWER.gl.draw_serial;
	
	for (var i=0; i<this.post_queue.length; i++) {
	    var treq = this.post_queue[i];
	    var targ = treq.targ;
	    if (typeof targ != "function"
		&& targ.getLastDraw) {

		if (targ.getLastDraw() != serial) {
		    continue;
		}

		req = treq;
		this.post_queue.splice(i, 1);
		break;
	    }
	}

	if (!req)
	    req = this.post_queue.shift();

	this.active = req;
	if (!req)
	    throw new Error ("runPostQueue: nothing shifted");

	this.displayStatus();
	
	// Run the actual post function in a timeout.  This way, we will 
	// return to the UI immediately.  Some time later, the function will
	// wake up, and then it will initialize the data.
	window.setTimeout(function() {
	    self.updatePost(function() {
		var targ = req.targ;
		if (typeof targ == "function")
		    return targ(req.JSON);
		else
		    return targ.load(req.JSON);
	    })
	}, 0);
    },


    // run a request's post-processing function.
    updatePost : function(fn) {
	if (!this.active)
	    throw new Error ("Nothing active");
	
	var self = this;
	
	var next = fn();
 
	if (next) {
	    // The request is not yet complete, so we schedule another call
	    // and bail out
	    window.setTimeout(function() {
		self.updatePost(next)
	    }, 0);
	    return;
	}

	this.active = null;
	if (this.post_queue.length > 0)
	    this.runPostQueue();
	
	// If we still have items to be loaded, schedule 1 redraw per second.
	// If we are done, to an immediate redraw.
	if (this.queueLength() == 0) {
	    this.displayStatus();

	    self.updateDisplay();
	    if (self.timeout) {
		window.clearTimeout(self.timeout);
		self.timeout = null;
	    }
	}
	else {
	    if (!self.timeout)
		self.timeout = setTimeout(
		    function() {
			self.updateDisplay();
			self.timeout = null;
		    },
		    1000);
	}	
    },

    updateDisplay : function() {
	if (this.onComplete) 
	    this.onComplete();
	VIEWER.draw();
    },
    
});


function resolve_url(url, base, def)
{
    if (url.match(/\/$/))
	url += def;

    if (!base || url.match(/^\w+:/) || url.match(/^\//))
	return url;
    
    return base + url;
}
