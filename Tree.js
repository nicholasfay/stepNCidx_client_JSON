/* $RCSfile: Tree.js,v $
 * $Revision: 1.3 $ $Date: 2012/08/03 17:00:47 $
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
 * 		----------------------------------------
 *
 * HTML Tree class.  Implemented using nested <ul> elements in plain HTML.
 * After the nested lists are created, call the Tree() fucntion to attach the
 * expand and collapse functions.
 */


"use strict";

function Tree(list, menu)
{
//    this.classes = classtab;
    
    label_nodes(list);
    list.addEventListener("click", tree_click, false);

    if (menu) {
	list.addEventListener("contextmenu", function(ev) {
	    ev.preventDefault();
	},  false);
	
	list.addEventListener("click", function(ev) {
	    return cancel_menu(ev, menu);},
			      true);
	list.addEventListener("contextmenu", function(ev) {
	    return cancel_menu(ev, menu);},
			      true);
	this.menu = menu;
    }
}

function cancel_menu(ev, menu)
{
    if (menu.isUp()) {
	menu.popdown();
	ev.stopPropagation();
	ev.preventDefault();
    }
    
}

function tree_click(ev) {
    var target = ev.target;


    if (target.tagName == "LI") {
	if (target.classList.contains("leaf")) 
	    return;

	toggle(target);
	return;
    }
}

function label_nodes(parent)
{
    var nl = parent.childNodes;
    var found = false;

    for (var i=0; i<nl.length; i++) {
	var n = nl[i];
	
	if (n.nodeType == Node.ELEMENT_NODE) {

	    if (n.tagName == "LI") {
		found = true;
		label_nodes(n);
	    }

	    else if (n.tagName == "UL") {
		found = true;
		label_nodes(n);
	    }
	}
    }
    
    if (!found) {
	parent.classList.add("leaf");
    }
}

function toggle(n)
{
    n.classList.toggle("closed");
}

function expand_all(tree)
{
    var nl = tree.getElementsByTagName("LI");
    for (var i=0; i<nl.length; i++) {
	var n = nl[i];
	n.classList.remove("closed");
    }
}

function collapse_all(tree)
{
    var nl = tree.getElementsByTagName("LI");
    for (var i=0; i<nl.length; i++) {
	var n = nl[i];
	if (n.classList.contains("leaf"))
	    continue;
	n.classList.add("closed");
    }
}
