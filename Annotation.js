/* $RCSfile: Annotation.js,v $
 * $Revision: 1.9 $ $Date: 2012/08/14 18:58:30 $
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

function Annotation(builder, id) {
    var ret = builder.make(id, this, "annotation");
    if (ret)
	return ret;

    this.use_count = 0;
    this.id = id;
    var el = builder.getElement(id);

    var polys = el["polyline"];
    if (!polys) {
        polys = [];
    }
    if (polys.length > 0) {
	this.load(el);
	return;
    }

    this.href = el["href"];

    if (el["bbox"]) {
	var bb = el["bbox"];

	this.bbox = new BoundingBox();
	this.bbox.updateX(bb[0]);
	this.bbox.updateY(bb[1]);
	this.bbox.updateZ(bb[2]);
	this.bbox.updateX(bb[3]);
	this.bbox.updateY(bb[4]);
	this.bbox.updateZ(bb[5]);
    }

}

METHODS(Annotation, {

    getName : function() {return "Annotation";},
    
    loadData : function() {
	var self = this;
	LOADER.addRequest(this.href, this);
    },


    unloadData : function(gl) {
	alert ("Annotation unloadData not yet implemted");
    },

    getId : function() {return  this.id;},
    
    incrCount : function(loadables) {
	
	if (this.use_count == 0) {
	    loadables.push(this);
	}
	this.use_count++
    },
    
    load : function(el) {

	this.bbox = new BoundingBox();

	this.polys = [];
	var polys = getObjects(el, "polyline");
	for (var i=0; i<polys.length; i++) {
	    var new_poly = new Polyline(polys[i]);
	    this.polys.push(new_poly);
	    this.bbox.updateFrom(new_poly.bbox);
	}

	return null;
    },

    isLoaded : function() {return this.polys != null;},
    
    
    draw : function(gl) {
	if (!this.polys)
	    return;
	
	for (var i=0; i<this.polys.length; i++)
	    this.polys[i].draw(gl);
    },        
});


/************************************************/

function Polyline(el)
{
    var pts = el.getElementsByTagName("p");

    this.bbox = new BoundingBox();
    
    this.path = new Float32Array(pts.length * 3);
    
    for (var i=0; i<pts.length; i++) {

	var pt = pts[i];
	var coords = pt["l"];

	if (coords.length != 3) {
	    throw new Error("Must have exactly three coordinates in a point");
	}

	for (var j=0; j<3; j++) {
	    var v = parseFloat(coords[j]);
	    if (!isFinite(v))
		throw new Error("Number is not finite");
	    
	    this.bbox.updateI(j, v);
	    this.path[i*3 + j] = v;
	}	
	
    }    
}

METHODS(Polyline, {

    draw : function(gl) {

	if (!this.location_buff) {
	    this.location_buff = gl.createBuffer();
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.location_buff);
	    gl.bufferData(gl.ARRAY_BUFFER, this.path, gl.STATIC_DRAW);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, this.location_buff);
	gl.vertexAttribPointer(gl.pos_loc, 3, gl.FLOAT, false, 0, 0);
	
	/* Force the surface normal to be a constant.
	 * We don't need this since the toolpath is not lit.
	 */
	gl.disableVertexAttribArray(gl.norm_loc);
	gl.vertexAttrib3f(gl.norm_loc, 0,0,1);

	var old_light = gl.getLight();
//	gl.uniform1i(gl.light_on, false);
	gl.setLight(false);

	var old_color = gl.saveColor();
	gl.setColor(.9, .9, .9, 1.);
	
	gl.drawArrays(gl.LINE_STRIP, 0, this.path.length / 3);
	
	gl.setLight(old_light);
	gl.enableVertexAttribArray(gl.norm_loc);

	gl.restoreColor(old_color);
	
    },        
});
