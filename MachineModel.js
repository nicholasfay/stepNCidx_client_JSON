/* $RCSfile: MachineModel.js,v $
 * $Revision: 1.5 $ $Date: 2012/08/03 17:00:47 $
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
 */

"use strict";

function MachineModel(root_el, gl, url)
{
    var builder = new ShapeBuilder(root_el);

    this.description = root_el.getAttribute("description");
    this.name = root_el.getAttribute ("name");
    this.algorithm = root_el.getAttribute ("algorithm");

    var unit = root_el.getAttribute("unit").split(" ");
    this.unit_name = unit[0];
    this.unit_cvt = get_float(unit[1]);

    console.log ("Have unit: "+this.unit_name+ " "+this.unit_cvt);
    
    this.bbox = new BoundingBox();
    this.driver = MachineDriver(this);

    console.log ("Making frame");
    
    var frame = root_el.getElementsByTagName("frame")[0];
    if (!frame)
	throw new Error ("No frame");

    console.log ("Have frame");

    var loadables = [];
    
    this.frame = new MachineGeometry(loadables, builder, this.bbox, frame);

    var chains = root_el.getElementsByTagName("chain");
    if (chains.length > 2) 
	throw new Error ("too many chain elements");

    this.axes = {};
    
    for (var i=0; i<chains.length; i++) {
	var chain = chains[i];
	var ch_name = chain.getAttribute("name");

	var ax_list = [];
	var rev;

	var loc = parse_float_vec(chain.getAttribute("location"));
	console.log ("Location="+loc);
	
	if (ch_name == "workpiece") {
	    this.workpiece_chain = ax_list;
	    this.workpiece_loc = loc;
	    rev = true;
	}
	else if (ch_name == "tool") {
	    this.tool_chain = ax_list;
	    this.tool_loc = loc;
	    rev = false;
	}
	else
	    throw new Error ("Have unexpected chain");
	
	var axes = chain.getElementsByTagName("axis");
	for (var j=0; j<axes.length; j++) {
	    var ax = axes[j];
	    var ax_name = ax.getAttribute("name");
//	    console.log ("Have axis "+ax_name);

	    var ax_geom = new MachineAxis(loadables, builder, this.bbox, ax, rev);
	    this.axes[ax_name] = ax_geom;
	    ax_list.push(ax_geom);
	}	
    }
    
    /* Get the default tool transform */
    var def_axis = [0.,0.,1.];
    var tool_xform = mat4.create();
    mat4.identity(tool_xform);
    
    for (i=0; i<this.tool_chain.length; i++) {
	var ax = this.tool_chain[i];
	console.log ("Updated matrix: "+ax.name+ " "+ax.home);
	ax.setOffset(0);
	ax.updateTransform(tool_xform);
    }

    console.log ("Tool orig="+mat4.str(tool_xform));

    mat4.inverse(tool_xform);
    tool_xform = mat4.toRotationMat(tool_xform);

    console.log ("Tool rot matrix="+mat4.str(tool_xform));
    
    this.tool_rot = tool_xform;

    if (url)
	LOADER.setRequestBase(url);
    
    // We may be better off not loading the stuff until it gets drawn
    for (var i=0; i<loadables.length; i++) {
	loadables[i].loadData(null, gl);
    }
}

METHODS (MachineModel, {
    getName : function() {
	return this.name;	
    },
    
    getBoundingBox : function() {
	return this.bbox;
    },

    getWorkpieceTransform : function() {
	var xform = mat4.create();
	mat4.identity(xform);

	var chain = this.workpiece_chain;
	
	for (var i=0; i<chain.length; i++) {
	    chain[i].updateTransform(xform);
	}

	mat4.translate(xform, this.workpiece_loc);
	return xform;
    },

    getToolTransform : function() {
	var xform = mat4.create();
	mat4.identity(xform);

	var chain = this.tool_chain;
	
	for (var i=0; i<chain.length; i++) {
	    chain[i].updateTransform(xform);
	}

	mat4.translate(xform, this.tool_loc);
	return xform;
    },
    
    draw : function(gl) {
	this.frame.draw(gl);

	this.drawChain(gl, this.workpiece_chain);
	this.drawChain(gl, this.tool_chain);
    },

    drawChain : function(gl, chain) {
	var saved = gl.saveTransform();

	var xform = mat4.create();
	mat4.identity(xform);
	
	for (var i=0; i<chain.length; i++) {
	    chain[i].updateTransform(xform);
	    
	    gl.applyTransform(xform);
	    gl.flushTransform();
	    chain[i].geom.draw(gl);
	    gl.restoreTransform(saved);
	}

    },

    hasAxis : function(ax) {
	if (this.axes[ax])
	    return true;
	return false;
    },
    
    setAxis : function(ax, val) {
	this.axes[ax].setOffset(val);
    },

    getAxis : function(ax) {
	var ret = this.axes[ax].getOffset();
	
	return ret;
    },

    getAxisObject : function(ax) {
	return this.axes[ax];
    },
    
    getAxisNames : function() {
	var ret = [];
	for (var kw in this.axes) {
	    ret.push(kw);
	}
	ret.sort();
	return ret;
    },

    getAxisMin : function(ax) {
	return this.axes[ax].min;
    },
    
    getAxisMax : function(ax) {
	return this.axes[ax].max;
    }
});


/******************************************/

function MachineGeometry(loadables, builder, bbox, el)
{
    var els = el.getElementsByTagName("geom");

    this.geom = [];
    this.xforms = [];
    
    for (var i=0; i<els.length; i++) {
	var geom = els[i];

	var m = mat4.create(geom.getAttribute("xform").split(" "));

	var shell_ids = geom.getAttribute("shell").split(" ");
	for (var j=0; j<shell_ids.length; j++) {
	    var shell = new Shell(builder, shell_ids[j]);
	    this.xforms.push(m);
	    this.geom.push(shell);
	    bbox.updateFrom(shell.bbox, m);
	    shell.incrCount(loadables);
	}	
    }
}

METHODS (MachineGeometry, {
    draw : function (gl) {
	for (var i=0; i<this.geom.length; i++) {

	    var saved = gl.saveTransform();
	    
	    gl.applyTransform(this.xforms[i]);
	    gl.flushTransform();
	    this.geom[i].draw(gl);
	    gl.restoreTransform(saved);
	}
    },
});

/******************************************/

function MachineAxis(loadables, builder, bbox, el, rev)
{
    this.name = el.getAttribute("name");
    this.min = el.getAttribute("min");
    this.max = el.getAttribute("max");

    var home = el.getAttribute("home");

    this.home = home ? get_float(home) : 0.;
    
    var loc = el.getAttribute("location");
    if (loc) {
	this.loc = parse_float_vec(loc, 3);
    }

    var dir = el.getAttribute("dir");
    if (dir) {
	this.dir = parse_float_vec(dir, 3);
	if (!rev)
	    vec3.scale(this.dir, -1.);
    }
    else {
	var rev_el = el.getAttribute("reverse");
	if (rev_el)
	    this.reversed = Boolean(rev_el);
	else {
	    if (this.name == "x" || this.name == "y" || this.name=="z")
		this.reversed = rev;
	    else
		this.reversed = !rev;
	    
	    console.log ("Setting axis "+this.name+" as reversed="+this.reversed);
	    
	    if (this.reversed) 
		this.home = -this.home;
	    
	}
    }

    this.geom = new MachineGeometry(loadables, builder, bbox, el);
    this.setOffset(0.);

    console.log ("Axis: "+this.name+" rev="+this.reversed);
}

METHODS(MachineAxis, {

    getName: function() {return this.name;},

    setOffset : function(val) {

	if (val < this.min)
	    val = this.min;
	else if (val > this.max)
	    val = this.max;

//	console.log ("Set offset: "+this.name+"="+val);
	
	this.offset = val;	
    },    
    
    getOffset : function(val) {
	return this.offset;
    },

    /* Update the given parent transform to reflect the movement of the axis.
     */
    updateTransform : function(xform) {
	
	var val = this.offset;

//	console.log ("Axis "+this.name+" updateTransform "+val);
	
	if (this.reversed) val = -val;

	val += this.home;

//	console.log ("  after adjust "+val);

	var dir;	
	
	switch (this.name) {

	case "x":
	    mat4.translate(xform, [val, 0., 0.]);
	    return;

	case "y":
	    mat4.translate(xform, [0., val, 0.]);
	    return;

	case "z":
	    mat4.translate(xform, [0., 0., val]);
	    return;
	}

	if (this.dir)
	    dir = this.dir;
	
	else switch (this.name) {
	
	case "a":
	    dir = [1, 0, 0];
	    break;
	    
	case "b":
	    dir = [0, 1, 0];
	    break;
	    
	case "c":
	    dir = [0, 0, 1];
	    break;
	    
	default:
	    throw new Error ("setOffset for axis unimplemented: "+this.name);
	}

	var loc = this.loc;
	if (!loc)
	    throw new Error ("Have rotational axis w/o loc");

	var xpt = transform_pt(xform, loc);
	var xdir = vec3.create();;
	transform_dir(xdir, xform, dir);
	
	var xlate =mat4.create();
	mat4.identity(xlate);
	mat4.translate(xlate, xpt);

	var inv_xlate =	mat4.create();
	mat4.inverse(xlate, inv_xlate);
	
	var rot =mat4.create();
	mat4.identity(rot);
	mat4.rotate(rot, val * Math.PI / 180, xdir);

	var xf = mat4.create();
	mat4.multiply(xlate, rot, xf);
	mat4.multiply(xf, inv_xlate);
	
	mat4.multiply (xf, xform);
	mat4.set (xf, xform);
    },
});
