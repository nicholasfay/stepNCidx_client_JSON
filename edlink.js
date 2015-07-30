"use strict"

var TREENODE;

function init() {
    load_links();
}

function change_href(input)
{
    var val = input.value;

    console.log ("Old text="+input.link.href);
    console.log ("New text="+val);
    
    input.link.href = val;

    TREENODE.updateLinks();
}

function change_text(input)
{
    var val = input.value;
    if (val == "")
	val = null;

    console.log ("Old text="+input.link.text);
    console.log ("New text="+val);

    input.link.text = val;
    TREENODE.updateLinks();
}

function add_link(b)
{
    var url = b.form.link.value;
    var text = b.form.text.value;

    TREENODE.addLink(url, text, true);
    load_links();
}

function delete_link(i)
{
    TREENODE.links.splice(i, 1);
    TREENODE.updateLinks();
    load_links();
}


function load_links()
{    
    var doc = document;
    var table = doc.getElementById("edit");

    var i;

    console.log ("Rows="+table.rows.length);
    
    while (table.rows.length > 1) {
     	var row = table.rows[1];
	
     	row.parentNode.removeChild(row);
    }
    
    var links = TREENODE.getLinks();
    var td;
    var input;

    if (links) {
	for (var i=0; i<links.length; i++) {
	
	    var link = links[i];
	
	    var tr = doc.createElement("tr");
	    tr.link_idx = i;
	    table.appendChild(tr);

	    td = doc.createElement("td");
	    tr.appendChild(td);
	    input = doc.createElement("input");
	    input.size = 40;
	    input.type="text";
	    input.name="ed_href";
	    input.value=link.href;
	    input.link=link;
	    input.onchange = function() {
		change_href(this);
	    }
	    
	    td.appendChild(input);
	    
	    td = doc.createElement("td");
	    tr.appendChild(td);
	    input = doc.createElement("input");
	    input.type="text";
	    input.name="ed_text";
	    input.value=link.text;
	    input.link=link;
	    input.onchange = function() {
		change_text(this);
	    }
	    td.appendChild(input);
	    
	    td = doc.createElement("td");
	    tr.appendChild(td);	
	    input = doc.createElement("input");
	    input.type = "button";
	    input.name = "add";
	    input.value= "X";
	    
	    input.idx = i;
	    input.onclick = function() {
		delete_link(this.idx);
	    };
	    td.appendChild(input);	
	}
    }
	    
    tr = doc.createElement("tr");
    table.appendChild(tr);
	
    td = doc.createElement("td");
    tr.appendChild(td);
    input = doc.createElement("input");
    input.size = 40;
    input.type="text";
    input.name="link";
    td.appendChild(input);

    td = doc.createElement("td");
    tr.appendChild(td);
    input = doc.createElement("input");
    input.type="text";
    input.name="text";
    td.appendChild(input);

    td = doc.createElement("td");
    tr.appendChild(td);	
    input = doc.createElement("input");
    input.type = "button";
    input.name = "add";
    input.value= "+";
    input.onclick = function() {
	add_link(this);	
    }
    
    td.appendChild(input);	

}

