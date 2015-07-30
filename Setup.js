/* $RCSfile: Setup.js,v $
 * $Revision: 1.1 $ $Date: 2012/02/01 17:16:17 $
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

function Setup(builder, id) {
    var ret = builder.make(id, this, "setup");
    if (ret)
	return ret;
    var el = builder.getElement(id);

    this.origin = parse_xform(el["origin"]);
    this.mount_ref = parse_xform(el["mount_ref"]);
    this.workpiece_ref = parse_xform(el["workpiece_ref"]);;

    var ref = el["geometry"];
    this.fixture = new Shape(builder, ref);
}

METHODS (Setup, {
});
