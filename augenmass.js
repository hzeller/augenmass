/* -*- JavaScript -*- */
/*
TODO:
  - figure out how to only partially redraw stuff. Right now, everything
    is redrawn on change (which seems to be fine speed-wise, but feels wasteful)
  - show a cross-hair while moving cursor. Right mouse button allows to
    rotate that cross-hair (stays where it was, and rotation of the X-axis)
    Double-click right: back to straight
  - two modes: draw, select
  - select: left click selects a line (endpoints and center). Shows
    a little square.
  - clicking a square allows to drag it (endpoints: coordinates, center whole
    line)
 */

function euklid_distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function Line(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.updatePos = function(x2, y2) {
	this.x2 = x2;
	this.y2 = y2;
    }

    this.distanceToCenter = function(x, y) {
	var centerX = (this.x2 + this.x1)/2;
	var centerY = (this.y2 + this.y1)/2;
	return euklid_distance(centerX, centerY, x, y);
    }

    this.draw = function(ctx, length_factor, highlight) {
	var Tlen = 15
	var len = this.length();
	var print_text = (length_factor * len).toPrecision(4);
	// Some white background.
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);

	if (!highlight && len > 10) {
	    var dx = this.x2 - this.x1;
	    var dy = this.y2 - this.y1;
	    ctx.moveTo(this.x1, this.y1);
	    ctx.lineTo(this.x1 + Tlen * dy/len, this.y1 - Tlen * dx/len);
	    ctx.moveTo(this.x1, this.y1);
	    ctx.lineTo(this.x1 - Tlen * dy/len, this.y1 + Tlen * dx/len);

	    ctx.moveTo(this.x2, this.y2);
	    ctx.lineTo(this.x2 + Tlen * dy/len, this.y2 - Tlen * dx/len);
	    ctx.moveTo(this.x2, this.y2);
	    ctx.lineTo(this.x2 - Tlen * dy/len, this.y2 + Tlen * dx/len);
	}

	ctx.stroke();

	// Background behind text
	ctx.lineWidth = 20;
	ctx.beginPath();
	ctx.moveTo((this.x1 + this.x2)/2 - 5, (this.y1 + this.y2)/2 - 15);
	ctx.lineTo((this.x1 + this.x2)/2 + ctx.measureText(print_text).width + 10, (this.y1 + this.y2)/2 - 15);
	ctx.stroke();

	// actual line
	if (highlight) {
	    ctx.strokeStyle = 'rgba(0, 0, 255, 1.0)';
	} else {
	    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
	}
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);

	if (len > 10) {
	    var dx = this.x2 - this.x1;
	    var dy = this.y2 - this.y1;
	    ctx.moveTo(this.x1, this.y1);
	    ctx.lineTo(this.x1 + Tlen * dy/len, this.y1 - Tlen * dx/len);
	    ctx.moveTo(this.x1, this.y1);
	    ctx.lineTo(this.x1 - Tlen * dy/len, this.y1 + Tlen * dx/len);

	    ctx.moveTo(this.x2, this.y2);
	    ctx.lineTo(this.x2 + Tlen * dy/len, this.y2 - Tlen * dx/len);
	    ctx.moveTo(this.x2, this.y2);
	    ctx.lineTo(this.x2 - Tlen * dy/len, this.y2 + Tlen * dx/len);
	}

	ctx.fillText(print_text, (this.x1 + this.x2)/2, (this.y1 + this.y2)/2 - 5);
	ctx.stroke();
    }

    this.length = function() {
	return euklid_distance(this.x1, this.y1, this.x2, this.y2);
    }
}

var measure_canvas;
var context;
var print_factor = 1;
var backgroundImage = new Image();
var image_loaded = false;
var lines = new Array();
var current_line = undefined;

function addLine(line) {
    lines[lines.length] = line;
}

function drawAll() {
    if (image_loaded) {
	context.drawImage(backgroundImage, 0, 0);
    } else {
	context.fillStyle = '#FFFFEE';
	context.fillRect(0, 0, 3000, 3000);
	context.fillStyle = '#000';
    }
    for (i=0; i < lines.length; ++i) {
	lines[i].draw(context, print_factor, false);
    }
    if (current_line != undefined) {
	current_line.draw(context, print_factor, true);
    }
}

function moveOp(x, y) {
    if (current_line == undefined)
	return;
    current_line.updatePos(x, y);
    drawAll();
}

function clickOp(x, y) {
    if (current_line == undefined) {
	current_line = new Line(x, y, x, y);
    } else {
	current_line.updatePos(x, y);
	if (current_line.length() > 0)
	    addLine(current_line);
	current_line = undefined;
    }
    drawAll();
}

function doubleClickOp(x, y) {
    var smallest_distance = undefined;
    var selected_line = undefined;
    for (i = 0; i < lines.length; ++i) {
	var this_distance = lines[i].distanceToCenter(x, y);
	if (smallest_distance == undefined || this_distance < smallest_distance) {
	    smallest_distance = this_distance;
	    selected_line = lines[i];
	}
    }

    if (selected_line && smallest_distance < 50) {
	selected_line.draw(context, print_factor, true);
	var orig_len_txt = (print_factor * selected_line.length()).toPrecision(4);
	var new_value_txt = prompt("Length of selected line ?", orig_len_txt);
	if (orig_len_txt != new_value_txt) {
	    var new_value = parseFloat(new_value_txt);
	    if (new_value && new_value > 0) {
		print_factor = new_value / selected_line.length();
	    }
	}
	drawAll();
    }
}

function OnKeyEvent(e) {
    if (e.keyCode == 27 && current_line != undefined) {
	current_line = undefined;
	drawAll();
    }
}

function extract_event_pos(e, callback) {
    var x;
    var y;
    if (e.pageX != undefined && e.pageY != undefined) {
	x = e.pageX;
	y = e.pageY;
    }
    else {
	x = e.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
	y = e.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }
    x -= measure_canvas.offsetLeft;
    y -= measure_canvas.offsetTop;

    callback(x, y);
}

function measure_init(path) {
    measure_canvas = document.getElementById('measure-c');
    context = measure_canvas.getContext('2d');
    context.font = '12pt Sans Serif';
    backgroundImage.onload = function() { image_loaded = true; drawAll(); }

    if (path[0] == "/") {
	path = "file://" + path;
    }

    backgroundImage.src = path;

    measure_canvas.addEventListener("click", function(e) {
	extract_event_pos(e, clickOp);
    });
    measure_canvas.addEventListener("mousemove", function(e) {
	extract_event_pos(e, moveOp);
    });
    measure_canvas.addEventListener("dblclick", function(e) {
	extract_event_pos(e, doubleClickOp);
    });
    document.addEventListener("keydown", OnKeyEvent);

    drawAll();
}
