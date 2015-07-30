/* $RCSfile: MachineDriver.js,v $
 * $Revision: 1.5 $ $Date: 2012/11/07 21:11:12 $
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

function MachineDriver(machine)
{
    console.log ("Using algorithm "+machine.algorithm);
    return new MachineDriver.table[machine.algorithm](machine);
}

MachineDriver.table = {};

MachineDriver.register = function(name, ctor) {
    MachineDriver.table[name] = ctor;
}

/***************************************/

function Machine3Axis(mach) {
    this.machine = mach;
}

MachineDriver.register("3-axis", Machine3Axis);

METHODS(Machine3Axis, {

    move : function(tool_len, pos, axis) {
	var machine = this.machine;

	vec3.add(pos, machine.workpiece_loc);
	vec3.subtract(pos, machine.tool_loc);
	

	machine.setAxis("x" ,pos[0]);
	machine.setAxis("y" ,pos[1]);
	machine.setAxis("z" ,pos[2] + tool_len);	
    }
});

/***************************************/

function MachineAC(mach) {
    this.machine = mach;
}

MachineDriver.register("AC", MachineAC);

METHODS(MachineAC, {

    move : function(tool_len, pos, axis) {
	var machine = this.machine;
	
	/* Compute the angles of rotation
	 */
	var i = axis[0];
	var j = axis[1];
	var k = axis[2];
	
	
	var ij = Math.sqrt(i*i + j*j);

	/* Target axis values */
	var a_val;
	var c_val = 0.;
	
	if (ij < 1.e-10) {
	    a_val = 0.;

	} else {
	    var PI_OVER_180 = Math.PI / 180.;
	    
	    var zrot = Math.atan2(i,j) / PI_OVER_180;
	    var xrot = Math.atan2(ij, k)  / PI_OVER_180;

	    a_val = xrot;
	    c_val = zrot;
	}

	machine.setAxis("a", a_val);
	machine.setAxis("c", c_val);

	var xform = mat4.create();
	mat4.identity(xform);
	
	machine.getAxisObject("a").updateTransform(xform);
	machine.getAxisObject("c").updateTransform(xform);

	vec3.add(pos, machine.workpiece_loc);
	
	mat4.multiplyVec3(xform, pos);

	vec3.subtract(pos, machine.tool_loc);
	machine.setAxis("x" ,pos[0]);
	machine.setAxis("y" ,pos[1]);
	machine.setAxis("z" ,pos[2] + tool_len);

    }
    
});


/***************************************/

function MachineBCNutating(mach) {
    this.machine = mach;
}

MachineDriver.register("BCNutating", MachineBCNutating);

METHODS(MachineBCNutating, {

    move : function(tool_len, pos, tool_axis) {
	var machine = this.machine;

	var c_offset = machine.getAxis("c");
	var b_axis = machine.getAxisObject("b")
	var c_axis = machine.getAxisObject("c")
	
	/* The nutating B axis is not parallel to any of the three motion axis,
	 * so things get a little complex.
	 * The first thing we need to do is determine the angle from vertical we
	 * want to tilt the table.  This is done by computing the B axis value
	 * which will rotate the plane's normal to the desired angle.  We can
	 * then rotate the C axis to line up the plane the the disired
	 * direction, and finally ajust the XYZ value to reflect the BC
	 * rotations.
	 *
	 * The tool axis is some angle t from vertical.  We need to determine
	 * the angle theta to rotate the non-orthogonal B axis which will
	 * rotate the Z axis by angle t.
	 *
	 * The rotation of the B axis can be represented as a 3x3 matrix R.
	 * Apply apply R to the Z axis, and get a transformed Z axis.  Then
	 * take the dot product of the transformed and original Z axis to get
	 * the cosine of the angle that the normal was rotated.
	 *
	 *    RZ . Z = cos t
	 *
	 * expanding, we get:
	 *
	 *    [ m1 m2 m3 ] [ 0 ]
	 *    [ m4 m5 m6 ] [ 0 ] . [ 0 0 1 ] = cos t
	 *    [ m7 m8 m9 ] [ 1 ]
	 *
	 *         [ m3 m6 m9 ]  . [ 0 0 1 ] = cos t
	 *
	 *                       m9          = cos t
	 *
	 * The matrix is a general rotation about a given vector.  Such a matrix
	 * is defined at the following location:
	 *  http://en.wikipedia.org/wiki/Rotation_matrix#Rotation_about_an_arbitrary_vector
	 * The one element of that matrix we are interested in (i.e. m9) is:
	 *       2        2
	 *     lz  + (1-lz )cos(theta)
	 *
	 * where lz is the Z component of the rotation axis about which B
	 * rotates; theta is the angle we want to rotate to get a table tilt
	 * of t.
	 *
	 * So we get
	 *       2        2
	 *     lz  + (1-lz )cos(theta) = cos t
	 *
	 * Solving for cos(theta) gives us:
	 *
	 *                             2
	 *                  cos(t) - lz
	 *   cos(theta) = ----------------
	 *                             2
	 *                    1    - lz
	 *
	 * tool_axis[] = (i,j,k), thus cos(t) = k (=tool_axis[2]), as long as
	 * tool_axis[] is normalized.  Proof:
	 *
	 *                        A      2    2    2                  2   2
	 *                       /|     i  + j  + k  = 1   ij = sqrt(i + j )
	 *                      / |
	 *                    1/  |k    t = angle A
	 *                    /   |     cos(t) = k/1 = k
	 *                   /____|
	 *                     ij
	 */

	/* Compute the direction of the B axis in global space.  This is l, as
	 * defined above.
	 */

	var l = b_axis.dir;
	var lz2 = l[2] * l[2];

	var cos_rot = (tool_axis[2] - lz2) / (1-lz2);

	/* Use the negative angle since that will result in greater visibility
	 * for the workpiece.  Either positive or negative will work
	 * mathematically. (remember cos(x) == cos(-x) )
	 */
	var b_angle = -Math.acos(cos_rot);

	var b_offset = (b_angle * 180. / Math.PI);

	/* Now we compute the C rotation.  We need to figure out what angle will
	 * cause the B-transformed tool axis to be vertical.
	 * Or conversely we can take the Z axis, apply the inverse B transform,
	 * to it and and determine the angle in the XY plane between the
	 * original tool axis and the transformed Z axis.
	 * (The two options are geometrically equivalent, but the latter is far
	 * simpler mathematically.)
	 */

	var b_xform = mat4.create();
	mat4.identity(b_xform);
	b_axis.setOffset(b_offset);
	
	b_axis.updateTransform(b_xform);

	var b_inv = mat4.create();
	mat4.inverse(b_xform, b_inv);

	/* Original i and j */
	var o_i = tool_axis[0];
	var o_j = tool_axis[1];
	var o_l = Math.sqrt(o_i*o_i + o_j*o_j);

	if (o_l < EPSILON) {
	    /* Table is horizontal, C is irrelevant, so don't change it. */
	}

	else {
	    var xf_z_axis=vec3.create();
	    var origin = new Float32Array([0., 0., 0.]);
	    
	    mat4.multiplyVec3(b_inv, [0,0,1], xf_z_axis);
	    mat4.multiplyVec3(b_inv, origin);
	    vec3.subtract(xf_z_axis, origin);

	    var xz_i = xf_z_axis[0];
	    var xz_j = xf_z_axis[1];

	    /* length of the i,j components */
	    var xz_l = Math.sqrt(xz_i*xz_i + xz_j*xz_j);

	    console.log ("xl_l="+xz_l);
	    
	    if (xz_l < EPSILON) {
		/* This should have been handled by the above case. This means
		 * that the translated Z axis is vertical -- only possible if
		 * no transformation takes place (or 180 deg)
		 */
		c_offset = 0.;

		console.log ("Zero Z axis -- should not happen\n");
		//	    exit (2);
	    }
	    
	    else {
		/* normalize the IJ values */

		o_i /= o_l;
		o_j /= o_l;

		xz_i /= xz_l;
		xz_j /= xz_l;

		/* We need to find the angle to rotate xf_[ij] so that it lines
		 * up with o_[ij]
		 */

		console.log ("cos c="+ (o_i*xz_i + o_j*xz_j));
		
		var c_angle = Math.acos(o_i*xz_i + o_j*xz_j);

		/* Possibly adjust the sign of the angle.  We do this by looking
		 * at the cross product of the two vectors in the XY plane.
		 * Since the Z components of the input vectors are all zero, the
		 * X and Y components of the cross product will be zero.
		 * Thus, we can look at the sign of the Z component to determine
		 * the sign of the angle.
		 *
		 * The Z cross product of is:
		 *  (o_i,o_j,0) x (xz_i, xz_j, 0) = (0,0, o_i*xz_j-o_j*xz_i)
		 *
		 */
		if (o_i*xz_j < o_j*xz_i) {
		    c_angle = -c_angle;
		}

		c_offset = c_angle * 180. / Math.PI;
	    }
	}

	machine.setAxis("c", c_offset);

	/* B and C axes are now computed.
	 * Figure out what this will do the XYZ */


	/* FIXME: this code is the same as above.  Consider factoring it */
	var xform = mat4.create();
	mat4.identity(xform);
	
	b_axis.updateTransform(xform);
	c_axis.updateTransform(xform);

	vec3.add(pos, machine.workpiece_loc);	
	mat4.multiplyVec3(xform, pos);

	vec3.subtract(pos, machine.tool_loc);

	machine.setAxis("x", pos[0]);
	machine.setAxis("y", pos[1]);
	machine.setAxis("z", pos[2] + tool_len);
    }
});


/******************************************/

function MachineBCGantry(mach) {
    this.machine = mach;
}

MachineDriver.register("BCGantry", MachineBCGantry);

METHODS(MachineBCGantry, {

    move : function(tool_len, pos, axis) {

	var machine = this.machine;
	//const double * initial_tool_placement = machine->getInitialToolPlacement();
	var b_axis = machine.getAxisObject("b")
	var c_axis = machine.getAxisObject("c")
	

	/* Compute the angles of rotation
	 */
	var i = -axis[0];
	var j = axis[1];
	var k = axis[2];

	console.log ("axis=" +vec3.str(axis));
	
	var ij = Math.sqrt(i*i + j*j);

	var zrot = 0.;
	var yrot = 0.;

	if (ij > EPSILON) {
	    zrot = Math.atan2(j,i) / PI_OVER_180;
	    yrot = Math.atan2(ij, k)  / PI_OVER_180;
	}

	b_axis.setOffset(yrot);
	c_axis.setOffset(zrot);

	console.log ("yrot="+yrot);
	console.log ("zrot="+zrot);
	
	var xform = mat4.create();
	mat4.identity(xform);

	c_axis.updateTransform(xform);
	b_axis.updateTransform(xform);

	var base_loc = vec3.create();
	mat4.multiplyVec3(xform, machine.tool_loc, base_loc);

	vec3.add(pos, machine.workpiece_loc)
	vec3.subtract(pos, base_loc);
	
	var tool_offset = vec3.create(axis);
	vec3.scale(tool_offset, tool_len);
	vec3.add (pos, tool_offset);

	machine.setAxis("x", pos[0]);
	machine.setAxis("y", pos[1]);
	machine.setAxis("z", pos[2]);
    }
});

/***************************************/

function MachineRobot(mach) {
    this.machine = mach;
}

MachineDriver.register("robot", MachineRobot);

METHODS(MachineRobot, {

    move : function(tool_len, pos, axis) {
	throw new Error ("Robot kinematice not yet implemented");
    }
});

