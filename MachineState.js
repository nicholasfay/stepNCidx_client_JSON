/* $RCSfile: MachineState.js,v $
 * $Revision: 1.10 $ $Date: 2012/11/07 21:11:12 $
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
 */

"use strict";

function MachineState(el, wp_node, ctl, viewer)
{
    var builder = new ShapeBuilder(el);
    //console.log(builder);
    var proj_el = el["project"];

    if (!proj_el) {
	throw new Error ("No project found");
    }

    this.project = new Project(builder);

    var cx = new SGContext();
    
    this.tree = new SGNode(cx, this);
    var loadables = [];
    this.tree.appendChild(this.project.makeSceneGraph(cx, loadables));
    this.control = ctl;

    var unit = el["unit"].split(" ");
    this.unit_name = unit[0];
    this.unit_cvt = get_float(unit[1]);
    
    this.project.makeProjectTree(wp_node, this.tree.getChild(0));

    /* url->MachineModel mapping */
    this.machine_models = {};

    /* Current machine model */
    this.machine_model = null;
    this.default_view = null;

    this.show_part = true;
    this.show_fixture = true;
    this.show_machine = true;
    this.show_tool = true;    
    this.show_toolpath = true;
    this.show_annotations = true;
    this.tp_speed = 200.;

    // We may be better off not loading the stuff until it gets drawn
    // FIXME
    console.log(this);
    for (var i=0; i<loadables.length; i++) {
//	console.log ("Loading part");
	loadables[i].loadData(null, viewer.gl);
    }
}

METHODS (MachineState, {

    setActive : function(treenode) {
	
	this.active = treenode;
	this.tp_offset = 0.;

	var sg = treenode.sg;

	if (sg.setToolpathPos)
	    sg.setToolpathPos(this.control, treenode, this.tp_offset);
    },

    setToolPos : function(val) {
	this.tp_offset = val;

	var tn = this.active;
	var sg = tn.sg;
	if (sg.setToolpathPos)
	    sg.setToolpathPos(this.control, tn, this.tp_offset);
	
    },

    setSpeed : function(val){
        this.tp_speed = parseFloat(val);
    },

    getSpeed : function(){
        return this.tp_speed;
    },
    
    setViewer : function(v) {
	this.viewer = v;
	this.default_view = new ViewVolume(this.viewer.canvas);
	this.default_view.setViewBbox(this.project.getBoundingBox());	
    },    

    getView : function() {
	if (this.machine_model == null) {
	    return this.default_view;
	}

	return this.machine_model.view;
    },


    setMachine : function(url) {
	
	if (url == null) {
//	    this.machine_model = null;
	    return;
	}
	    
	var mach = this.machine_models[url];

	if (mach) 
	    this.machine_model = mach;

	else {
	    var self = this;
	    LOADER.setRequestBase(null);
	    LOADER.addRequest(url, new MachineModelLoader(this, url, VIEWER.gl));
	}

    },

    setVisiblePart    : function (yn) {this.show_part = yn;},    
    setVisibleFixture : function (yn) {this.show_fixture = yn;},
    setVisibleMachine : function (yn) {this.show_machine = yn;},
    setVisibleTool    : function (yn) {this.show_tool = yn;},    
    setVisibleToolpath: function (yn) {this.show_toolpath = yn;},    
    setVisibleAnnotations: function (yn) {this.show_annotations = yn;},
    
    getFixturePartXform : function() {
	var active = this.active;

	var xform;
	var wp_ref = active.getFixtureWorkpieceRef();
	if (wp_ref) {
	    xform = mat4.create(wp_ref);
	}
	else {
	    xform = mat4.create();
	    mat4.identity(xform);
	}

	var origin = active.getSetupOrigin();
	
	if (origin) {
	    mat4.multiply(xform, origin);
	}

	return xform;
    },

    
    drawPart : function(gl) {
	
	var active = this.active;
	
	if (!active)
	    active = this.tree.getChild(0);

	if (this.show_toolpath)
	    active.draw(gl, true);

	var tobe = active.getTobe();
	if (tobe)
	    if (this.show_part)
		tobe.draw(gl, true);
    },

    drawFixture : function(gl) {
	if (!this.show_fixture) return;

	var active = this.active;
	if (!active)
	    return;

	var fixture = active.getFixture();
	if (!fixture) {
	    return;
	}

	
	var xform = this.getFixturePartXform();
	mat4.inverse(xform);

	var saved = gl.saveTransform();	    
	gl.applyTransform(xform);
	gl.flushTransform();
	
	fixture.draw(gl, true);
	
	gl.restoreTransform(saved);	
    },

    getCurrentToolPosition : function(loc, axis) {
	var active_tn = this.active;
	var ws_xform = active_tn.getXform();	

	var active_sg = active_tn.sg;
	var op = active_sg.getOperation();

	if (!ws_xform) {
	    ws_xform = mat4.create();
	    mat4.identity(ws_xform);
	}
	
	if (op) {
	    var xform = mat4.create(ws_xform);
	    
	    op.getToolPositionByD(loc, axis, this.tp_offset);
	    mat4.multiplyVec3(xform, loc);
	    transform_dir(axis, xform, axis);
	}
    },

    
    getCurrentToolPositionXform : function() {
	var loc = new Float32Array(3);
	var z = new Float32Array(3);

	this.getCurrentToolPosition(loc, z);

	var xform = mat4.create();

	var x = get_normal(z);
	var y = vec3.create();

	
	vec3.cross (z,x,y);

	xform[0] = x[0];
	xform[1] = x[1];
	xform[2] = x[2];
	xform[3] = 0.;

	xform[4] = y[0];
	xform[5] = y[1];
	xform[6] = y[2];
	xform[7] = 0.;
	
	xform[8]  = z[0];
	xform[9]  = z[1];
	xform[10] = z[2];
	xform[11] = 0.;
	
	xform[12] = loc[0];
	xform[13] = loc[1];
	xform[14] = loc[2];
	xform[15] = 1.;

	return xform;	
    },

    hasOperation : function() {
	var active_tn = this.active;
	if (active_tn == null)
	    return false;

	if (!active_tn.sg.getOperation)
	    return false;

	return true;
    },

    
    drawTool : function(gl) {
	if (!this.show_tool) return;
	
	var active_tn = this.active;
	if (active_tn == null)
	    return;
				
	var col = gl.saveColor();

	/* Same color as current location traj in desktop version */
//	gl.setColor(.47, .53, .21, 1.);

	gl.setColor(.70, .70, .25, 1.);
	
	var active_sg = active_tn.sg;
	var op = active_sg.getOperation();
	
	if (op.tool) {
	    op.tool.draw(gl, true);
	}
	
	gl.restoreColor(col);
	
    },

    setMachineAxes : function(scale) {
	var active_tn = this.active;
	if (active_tn == null)
	    return;
	
	if (!active_tn.sg.getOperation)
	    return;

	var mount_xform = mat4.create(active_tn.getFixtureMountRef());
	var fix_xform = mat4.create(this.getFixturePartXform());
	
	var xform = mat4.create(mount_xform);
	mat4.multiply(xform, fix_xform);	

	var loc = vec3.create();
	var axis = vec3.create();

	this.getCurrentToolPosition(loc, axis);
	
	transform_dir(axis, xform, axis);
	mat4.multiplyVec3(xform, loc);
	
	vec3.scale(loc, scale);

	var tool_len = active_tn.sg.getOperation().tool_length;
	this.machine_model.driver.move(tool_len*scale, loc, axis);
    },

    
    setMachineAxesOLD : function(scale, ps_origin) {
	var active_tn = this.active;
	if (active_tn == null)
	    return;

	if (!active_tn.sg.getOperation)
	    return;
	
	var loc = vec3.create();
	var axis = vec3.create();

	this.getCurrentToolPosition(loc, axis);

	vec3.add(loc, ps_origin);
	vec3.scale(loc, scale);

	var tool_len = active_tn.sg.getOperation().tool_length;
	
	this.machine_model.driver.move(tool_len*scale, loc, axis);
    },
    
    draw : function(gl) {

	/* Set the show annotations flag */
	gl.show_annotations = this.show_annotations;
	
	if (this.machine_model) {
	    var active_tn = this.active;

	    var scale = this.unit_cvt / this.machine_model.unit_cvt;

	    if (active_tn) {
		var mount_xform = active_tn.getFixtureMountRef();
		var fix_xform = this.getFixturePartXform();

		if (mount_xform) {
		    this.setMachineAxes(scale);
		}
		else {
		    var bb = this.project.getBoundingBox();
		    var ps_origin = [-(bb.minx + bb.maxx)/2.,
	     			     -(bb.miny*2. + bb.maxy)/3.,
	     			     -bb.minz
	     			    ];
		
		    mount_xform = mat4.create();
		    mat4.identity(mount_xform);
		    mat4.translate(mount_xform, ps_origin);

		    fix_xform = mat4.create();		    
		    mat4.identity(fix_xform);
		    this.setMachineAxesOLD(scale, ps_origin);
		}


		/* Get the transform from the machine to the fixture */
		var mach_fixture = this.machine_model.getWorkpieceTransform();
		mat4.scale(mach_fixture, [scale, scale, scale]);
		mat4.multiply(mach_fixture, mount_xform);

		var saved = gl.saveTransform();
		gl.applyTransform(mach_fixture);
		gl.applyTransform(fix_xform);
		gl.flushTransform();
		this.drawPart(gl);
		this.drawFixture(gl);
		gl.restoreTransform(saved);	    

	    
		if (active_tn.sg.getOperation) {

		    var active_sg = active_tn.sg;	    
		    var tool_len = active_sg.getOperation().tool_length;
		    
		    xform = this.machine_model.getToolTransform()
		    mat4.multiply(xform, this.machine_model.tool_rot);
		    
		    /* Tool length offset */
		    mat4.scale(xform, [scale, scale, scale]);		
		    mat4.translate(xform, [0,0, -tool_len]);
		    gl.applyTransform(xform);
		    gl.flushTransform();
		    var op = active_sg.getOperation();
		    
		    if (op.tool)
			this.drawTool(gl);
		    gl.restoreTransform(saved);
		}
	    }

	    if (!this.show_machine) return;	    
	    this.machine_model.draw(gl);

	}
	else {
	    this.drawPart(gl);
	    this.drawFixture(gl);
	    
	    if (this.hasOperation()) {
		var xform = this.getCurrentToolPositionXform();
		var saved = gl.saveTransform();

		gl.applyTransform(xform);
		gl.flushTransform();

		this.drawTool(gl);

		gl.restoreTransform(saved);
	    }
	}
    }
});



// Add SG Methods
METHODS(SGNode, {
    
    // Set active executable
    setActive : function() {
	var proj = this.getRoot();

	this.getRoot().setActive(this);
    },

    getTobe : function() {
	var ret = this.sg.getTobe();
	if (ret) return ret;

	if (this.parent)
	    return this.parent.getTobe();

	return null;
    },

    getFixture : function() {

	var ret;
	if (this.sg.getFixture) {
	    ret = this.sg.getFixture();
	    if (ret) return ret;
	}

	if (this.parent)
	    return this.parent.getFixture();

	return null;
    },


    getFixtureWorkpieceRef : function() {

	var ret = mat4.create();
	mat4.identity(ret);
	
	if (this.sg.getFixtureWorkpieceRef) {
	    var mat = this.sg.getFixtureWorkpieceRef();
	    if (mat)
		mat4.multiply(ret, mat);
	}

	if (this.parent) 
	    mat4.multiply(ret, this.parent.getFixtureWorkpieceRef());
	
	return ret;
    },

    getFixtureMountRef : function() {

	var ret;
	if (this.sg.getFixtureMountRef) {
	    ret = this.sg.getFixtureMountRef();
	    if (ret) return ret;
	}

	if (this.parent)
	    return this.parent.getFixtureMountRef();

	return null;
    },
    
    getSetupOrigin : function() {

	var ret;
	if (this.sg.getSetupOrigin) {
	    ret = this.sg.getSetupOrigin();
	    if (ret) return ret;
	}

	if (this.parent)
	    return this.parent.getSetupOrigin();

	return null;
    },
    
});

///////////////////////////////////////

function MachineModelLoader(ms, url, gl) {
    this.ms = ms;
    this.url = url;
}

METHODS(MachineModelLoader, {

    load: function (json) {
	var mach = new MachineModel(json["machine-model"], this.gl, this.url);
	var view = new ViewVolume(this.ms.viewer.canvas);
	view.setViewBbox(mach.getBoundingBox());
	mach.view = view;
	this.ms.machine_models[this.url] = mach;
	this.ms.loading_machine = false;
	this.ms.machine_model = mach;	
    },

    getLastDraw : function() {
	return VIEWER.gl.draw_serial;
    },
    
});
