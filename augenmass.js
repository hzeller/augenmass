/* -*- JavaScript -*- */
/*
TODO:
  - draw current line in separate canvas to simplify redraw.
  - show a cross-hair while moving cursor. Right mouse button allows to
    rotate that cross-hair (stays where it was, and rotation of the X-axis)
    Double-click right: back to straight
  - two modes: draw, select
  - select: left click selects a line (endpoints and center). Shows
    a little square.
  - clicking a square allows to drag it (endpoints: coordinates, center whole
    line)
 */

var text_font_pixels = 18;

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

    // Draw a T end-piece at position x, y
    this.draw_t = function(ctx, x, y, remote_x, remote_y) {
	var Tlen = 15
	var len = euklid_distance(x, y, remote_x, remote_y);
	if (len < 1) return;
	var dx = remote_x - x;
	var dy = remote_y - y;
	ctx.moveTo(x - Tlen * dy/len, y + Tlen * dx/len);
	ctx.lineTo(x + Tlen * dy/len, y - Tlen * dx/len);
    }

    // Drawing the line, but with a t-anchor only on the start-side
    // and 1-2 pixels shorter, so that we don't cover anything in the
    // target crosshair.
    this.draw_editline = function(ctx, length_factor) {
	var len = this.length();
	var print_text = (length_factor * len).toPrecision(4);
	var text_len = ctx.measureText(print_text).width + 2 * text_font_pixels;

	// We want to draw the line a little bit shorter, so that the
	// open crosshair cursor has 'free sight'
	var dx = this.x2 - this.x1;
	var dy = this.y2 - this.y1;
	if (len > 2) {
	    dx = dx * (len - 2)/len;
	    dy = dy * (len - 2)/len;
	}

	// White background for t-line
	ctx.beginPath();
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
	ctx.lineWidth = 10;
	ctx.lineCap = 'round';
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);
	ctx.stroke();

	// White background for actual line
	ctx.beginPath();
	ctx.lineCap = 'butt';  // Flat to not bleed into crosshair.
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x1 + dx, this.y1 + dy);
	ctx.stroke();

	// t-line and line.
	ctx.beginPath();
	ctx.strokeStyle = '#00F';
	ctx.lineWidth = 1;
	ctx.lineCap = 'butt';
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x1 + dx, this.y1 + dy);
	ctx.stroke();

	if (len >= 2) {
	    // White background for text. We're using a short line, so that we
	    // have a nicely rounded box with our line-cap.
	    var text_dx = -text_len/2;
	    var text_dy = -(text_font_pixels + 10)/2;
	    if (len > 0) {
		text_dx = -dx * text_len/(2 * len);
		text_dy = -dy * (text_font_pixels + 10)/(2 * len);
	    }
	    ctx.beginPath();
	    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
	    ctx.lineWidth = text_font_pixels + 10;
	    ctx.lineCap = 'round';
	    // We added the text_font_pixels above, so remove them here: the
	    // rounding of the stroke will cover that.
	    var background_text_len = text_len/2 - text_font_pixels;
	    ctx.moveTo(this.x1 + text_dx - background_text_len,
		       this.y1 + text_dy);
	    ctx.lineTo(this.x1 + text_dx + background_text_len,
		       this.y1 + text_dy);
	    ctx.stroke();
	    
	    ctx.beginPath();
	    ctx.fillStyle = '#000';
	    ctx.textBaseline = 'middle';
	    ctx.textAlign = 'center';
	    ctx.fillText(print_text, this.x1 + text_dx, this.y1 + text_dy);
	    ctx.stroke();
	}
    }

    this.draw = function(ctx, length_factor, highlight) {
	var len = this.length();
	var print_text = (length_factor * len).toPrecision(4);

	ctx.beginPath();
	// Some white background.
	if (highlight) {
	    ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
	} else {
	    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
	}
	ctx.lineWidth = 10;
	ctx.lineCap = 'round';
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);	
	this.draw_t(ctx, this.x2, this.y2, this.x1, this.y1);	
	ctx.stroke();

	// Background behind text. We're using a short line, so that we
	// have a nicely rounded box with our line-cap.
	ctx.beginPath();
	var text_len = ctx.measureText(print_text).width;
	ctx.lineWidth = text_font_pixels + 10;
	ctx.moveTo((this.x1 + this.x2)/2 - text_len/2 - 10,
		   (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.lineTo((this.x1 + this.x2)/2 + text_len/2 + 10,
		   (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.stroke();

	ctx.beginPath();
	// actual line
	if (highlight) {
	    ctx.strokeStyle = 'rgba(0, 0, 255, 1.0)';
	} else {
	    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
	}
	ctx.lineWidth = 1;
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);	
	this.draw_t(ctx, this.x2, this.y2, this.x1, this.y1);	
	ctx.stroke();

	// .. and text.
	ctx.beginPath();
	ctx.fillStyle = '#000';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillText(print_text, (this.x1 + this.x2)/2,
		     (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.stroke();
    }

    this.length = function() {
	return euklid_distance(this.x1, this.y1, this.x2, this.y2);
    }
}

var measure_canvas;
var context;
var print_factor;
var lines;
var current_line;
var start_line_time;

function addLine(line) {
    lines[lines.length] = line;
}

function clearDirtyRegion() {
    // TODO: actually record the dirty region.
    context.clearRect(0, 0, measure_canvas.width, measure_canvas.height);
}

function drawAll() {
    clearDirtyRegion();
    for (i=0; i < lines.length; ++i) {
	lines[i].draw(context, print_factor, false);
    }
    if (current_line != undefined) {
	current_line.draw_editline(context, print_factor);
    }
}

function moveOp(x, y) {
    if (current_line == undefined)
	return;
    current_line.updatePos(x, y);
    drawAll();
}

function clickOp(x, y) {
    var now = new Date().getTime();
    if (current_line == undefined) {
	current_line = new Line(x, y, x, y);
	start_line_time = now;
    } else {
	current_line.updatePos(x, y);
	// Make sure that this was not a double-click event.
	// (are there better ways ?)
	if (current_line.length() > 50
	    || (current_line.length() > 0 && (now - start_line_time) > 500)) {
	    addLine(current_line);
	}

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

function init_measure_canvas(width, height) {
    measure_canvas.width = width;
    measure_canvas.height = height;
    context.font = 'bold ' + text_font_pixels + 'px Sans Serif';

    print_factor = 1;
    lines = new Array();
    current_line = undefined;
    start_line_time = 0;
}

function measure_init() {
    measure_canvas = document.getElementById('measure');
    context = measure_canvas.getContext('2d');
    init_measure_canvas(100, 100);

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

    var chooser = document.getElementById("file-chooser");
    chooser.addEventListener("change", function(e) {
	change_background(chooser);
    });
}

function change_background(chooser) {
    if (chooser.value == "" || !chooser.files[0].type.match(/image.*/))
	return;

    var img_reader = new FileReader();
    img_reader.readAsDataURL(chooser.files[0]);
    img_reader.onload = function(e) {
	var backgroundImage = new Image();
	// Image loading in the background canvas. Once we have the image, we
	// can size the canvases to a proper size.
	var background_canvas = document.getElementById('background-img');
	backgroundImage.onload = function() {
	    var bg_context = background_canvas.getContext('2d');
	    background_canvas.width = backgroundImage.width;
	    background_canvas.height = backgroundImage.height;
	    bg_context.drawImage(backgroundImage, 0, 0);
	    
	    init_measure_canvas(backgroundImage.width, backgroundImage.height);

	    // First successful image load: remove now unnecessary clutter.
	    document.getElementById('helptext').style.visibility = "hidden";
	}
	backgroundImage.src = e.target.result;
    }
}
