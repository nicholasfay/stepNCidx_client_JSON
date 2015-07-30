/* $RCSfile: Menu.js,v $
 * $Revision: 1.6 $ $Date: 2012/08/15 19:08:06 $
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

function Menu(menu_el, win) {
    this.menu_el = menu_el;
    this.selections = {};
    
    var self = this;
    menu_el.addEventListener("click", this, false);
    menu_el.addEventListener("contextmenu", this, false);

    this.emsize = Number(getComputedStyle(menu_el, "")
			 .fontSize.match(/(\d+)px/)[1]);
}


METHODS(Menu, {
    addOption : function(cls, fn) {
	this.selections[cls] = fn;
    },

    isUp : function() {
//	return this.targ != null;
	return this.menu_el.classList.contains("menu-visible");
    },

    popupAt : function(x,y) {
	this.popupX = x;
	this.popupY = y;
	
	this.menu_el.classList.add("menu-visible");

	var win = this.menu_el.ownerDocument.defaultView;
	
	this.menu_el.style.left = x + win.scrollX + (this.emsize / 4);
	this.menu_el.style.top  = y  + win.scrollY + (this.emsize / 4);

	var menu_bbox = this.menu_el.getBoundingClientRect();

	var wh = window.innerHeight;
	var ww = window.innerWidth;
	
	if (menu_bbox.bottom > wh) {
	    
	    if (menu_bbox.height > wh)
		this.menu_el.style.top = win.scrollY;
	    else {
		this.menu_el.style.top = wh -menu_bbox.height +win.scrollY;
	    }	    
	}

	if (menu_bbox.right > ww) {

	    if (menu_bbox.width > ww)
		this.menu_el.style.left = win.scrollX;
	    else {
		this.menu_el.style.left = ww -menu_bbox.width +win.scrollX;
	    }	    
	    
	}
    },
    
    popup : function(el) {	
	this.popdown();
	
	this.targ = el;
	this.targ.classList.add("menu-target");
	
	var rect = el.getBoundingClientRect();

	this.popupAt(rect.left, rect.top);
	
    },

    
    popdown : function() {
	if (this.targ) {
	    this.targ.classList.remove("menu-target");	
	}

	this.menu_el.classList.remove("menu-visible");
	this.targ = null;
    },
    
    setStepFile : function(stp) {
    	var doc = this.menu_el.ownerDocument;
    	var dl = doc.getElementById("menu_download");
    	if (stp && 0) 
    	    dl.style.display = "list-item"
    	else 
    	    delete dl.style.display;
    	dl.innerHTML="<a href='" +stp+"'>Download STEP File</a>" ;
    },
    
    handleEvent : function(ev) {
	var targ = this.targ;
	this.popdown();
	ev.preventDefault();

	var el = ev.target;

	while (el && el != this.menu_el) {
	    var fn = this.getOption(el.classList);
	    if (fn)
		fn(targ, ev);

	    el = el.parentNode;
	}	
    },

    
    getOption : function(cl) {
	
	for (var i=0; i<cl.length; i++) {
	    var it = cl.item(i);
	    
	    if (this.selections[it])
		return this.selections[it];
	}

	return null;
    },
});
