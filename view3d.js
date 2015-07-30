/* $RCSfile: view3d.js,v $
 * $Revision: 1.7 $ $Date: 2012/08/03 17:00:48 $
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
 * 
 * 		----------------------------------------
 * 
 * General utility functions for 3d viewer interface to control frame
 */

"use strict";

var VIEWER;
//var MSTATE;

function resize_canvas(c) {
    var w = Math.floor(window.innerWidth);
    var h = Math.floor(window.innerHeight);
    
    c.width = w;
    c.height = h;
}

function zoom_view(e) {
    var zoom = parseFloat(e.form.zoom.value);
    if (isNaN(zoom))
	throw new Error ("Could not parse zoom as number: " +zoom);
    VIEWER.scene.setZoom(zoom);
    VIEWER.draw();
}

function zoom_in(e) {
    var zoom = VIEWER.scene.getZoom() * 1.5;
    VIEWER.scene.setZoom(zoom);
    
    e.form.zoom.value = zoom;
    
    VIEWER.draw();
}

function zoom_out(e) {
    var zoom = VIEWER.scene.getZoom() / 1.5;
    VIEWER.scene.setZoom(zoom);
    
    e.form.zoom.value = zoom;
    
    VIEWER.draw();
}

function mode_change(m) {
    VIEWER.setMouseMode(m);
}

// function setMachine(url) {
//     console.log ("using machine:" +url);
//     MSTATE.setMachine(url);
// }


function getGeomView() {return VIEWER;}

function draw() {VIEWER.draw();}
