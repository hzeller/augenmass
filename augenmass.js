/* -*- JavaScript -*- */
/*
 * potential TODO
 * - draw current line in separate canvas to simplify redraw (and faster).
 * - two modes: draw, select
 * - select: left click selects a line (endpoints and center). Highlight;
 *   del deletes.
 * - clean up. Put things with their own state in objects.
 * - shift + mouse movement: only allow for discrete 360/16 angles.
 * - provide a 'reference straight line' defining the 0 degree angle.
 * - 'collision detection' for length labels.
 * - download should return a PDF with the compressed background image and
 *   vector lines on top (or SVG).
 */

// Some constants.
var white_background_style = 'rgba(255, 255, 255, 0.4)';
var text_font_pixels = 18;
var loupe_magnification = 7;

function euklid_distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function Line(x1, y1, x2, y2) {
    // The canvas coordinate system numbers the space _between_ pixels
    // as full coordinage. Correct for that.
    this.x1 = x1 + 0.5;
    this.y1 = y1 + 0.5;
    this.x2 = x2 + 0.5;
    this.y2 = y2 + 0.5;

    // While editing: updating second end of the line.
    this.updatePos = function(x2, y2) {
	this.x2 = x2 + 0.5;
	this.y2 = y2 + 0.5;
    }

    // Helper for determining selection: how far is the given position from the
    // center text.
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

    // Very simple line, as shown in the loupe-view.
    this.draw_loupe_line = function(ctx, off_x, off_y, factor) {
	// these 0.5 offsets seem to look inconclusive on Chrome and Firefox.
	// Need to go deeper.
	ctx.beginPath();
	var x1pos = (this.x1 - off_x), y1pos = (this.y1 - off_y);
	var x2pos = (this.x2 - off_x), y2pos = (this.y2 - off_y);
	ctx.moveTo(x1pos * factor, y1pos * factor);
	ctx.lineTo(x2pos * factor, y2pos * factor);
	ctx.stroke();
	// We want circles that circumreference the pixel in question.
	ctx.beginPath();
	ctx.arc(x1pos * factor + 0.5, y1pos * factor + 0.5,
		1.5 * factor/2, 0, 2*Math.PI);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x2pos * factor + 0.5, y2pos * factor + 0.5,
		1.5 * factor/2, 0, 2*Math.PI);
	ctx.stroke();
    }

    // Drawing the line while editing.
    // We only show the t-anchor on the start-side. Also the line is
    // 1-2 pixels shorter where the mouse-cursor is, so that we don't cover
    // anything in the target crosshair.
    this.draw_editline = function(ctx, length_factor) {
	var pixel_len = this.length();
	var print_text = (length_factor * pixel_len).toPrecision(4);
	var text_len = ctx.measureText(print_text).width + 2 * text_font_pixels;

	// We want to draw the line a little bit shorter, so that the
	// open crosshair cursor has 'free sight'
	var dx = this.x2 - this.x1;
	var dy = this.y2 - this.y1;
	if (pixel_len > 2) {
	    dx = dx * (pixel_len - 2)/pixel_len;
	    dy = dy * (pixel_len - 2)/pixel_len;
	}

	// White background for t-line
	ctx.beginPath();
	ctx.strokeStyle = white_background_style;
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

	if (pixel_len >= 2) {
	    // White background for text. We're using a short line, so that we
	    // have a nicely rounded box with our line-cap.
	    var text_dx = -text_len/2;
	    var text_dy = -(text_font_pixels + 10)/2;
	    if (pixel_len > 0) {
		text_dx = -dx * text_len/(2 * pixel_len);
		text_dy = -dy * (text_font_pixels + 10)/(2 * pixel_len);
	    }
	    ctx.beginPath();
	    ctx.strokeStyle = white_background_style;
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

    // General draw of a measuring line.
    this.draw = function(ctx, length_factor, highlight) {
	var print_text = (length_factor * this.length()).toPrecision(4);

	ctx.beginPath();
	// Some white background.
	if (highlight) {
	    ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
	} else {
	    ctx.strokeStyle = white_background_style;
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
var measure_ctx;
var loupe_canvas;
var loupe_ctx;
var print_factor;
var lines;
var current_line;
var start_line_time;
var backgroundImage;  // if loaded.

// We show different help levels. After each stage the user successfully
// performs, the next level is shown. Once the user managed all of them,
// we're fading into silency.
HelpLevelEnum = {
    HELP_FILE_LOADING:  0,
    HELP_START_LINE:    1,
    HELP_FINISH_LINE:   2,
    HELP_SET_LEN:       3,
    HELP_YOU_ARE_EXPERT_NOW: 4
};

var last_help_level = -1;
function updateHelpLevel(requested_level) {
    if (requested_level < last_help_level)
	return;
    last_help_level = requested_level;
    var help_text = undefined;
    switch (requested_level) {
    case HelpLevelEnum.HELP_FILE_LOADING:
	help_text = "(Only your browser reads the image. It is not uploaded anywhere.)"
	break;
    case HelpLevelEnum.HELP_START_LINE:
	help_text = "Click somewhere to start a line.";
	break;
    case HelpLevelEnum.HELP_FINISH_LINE:
	help_text = "A second click finishes the line. Or Cancel with 'Esc'.";
	break;
    case HelpLevelEnum.HELP_SET_LEN:
	help_text = "Double click on length to set relative size.";
	break;
    case HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW:
	help_text = "Congratulations - you are an expert now!";
	break;
    }
    if (help_text != undefined) {
	var helptext_span = document.getElementById('helptext');
	while (helptext_span.firstChild) {
	    helptext_span.removeChild(helptext.firstChild);
	}
	helptext_span.appendChild(document.createTextNode(help_text));

	if (requested_level == HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW) {
	    helptext_span.style.transition = "opacity 10s";
	    helptext_span.style.opacity = 0;
	}
    }
}

// Add a new measuring line to the list.
function addLine(line) {
    lines[lines.length] = line;
}

// Draw all the lines!
function drawAll() {
    measure_ctx.clearRect(0, 0, measure_canvas.width, measure_canvas.height);
    drawAllNoClear(measure_ctx);
}

function drawAllNoClear(ctx) {
    for (i=0; i < lines.length; ++i) {
	lines[i].draw(ctx, print_factor, false);
    }
    if (current_line != undefined) {
	current_line.draw_editline(ctx, print_factor);
    }
}

// Helper to show the 'corner hooks' in the loupe display.
function showQuadBracket(loupe_ctx, loupe_size, bracket_len) {
    loupe_ctx.moveTo(0, bracket_len);                 // top left.
    loupe_ctx.lineTo(bracket_len, bracket_len);
    loupe_ctx.lineTo(bracket_len, 0);
    loupe_ctx.moveTo(0, loupe_size - bracket_len);   // bottom left.
    loupe_ctx.lineTo(bracket_len, loupe_size - bracket_len);
    loupe_ctx.lineTo(bracket_len, loupe_size);
    loupe_ctx.moveTo(loupe_size - bracket_len, 0);     // top right.
    loupe_ctx.lineTo(loupe_size - bracket_len, bracket_len);
    loupe_ctx.lineTo(loupe_size, bracket_len);         // bottom right.
    loupe_ctx.moveTo(loupe_size - bracket_len, loupe_size);
    loupe_ctx.lineTo(loupe_size - bracket_len, loupe_size - bracket_len);
    loupe_ctx.lineTo(loupe_size, loupe_size - bracket_len);
}

function showLoupe(x, y) {
    if (backgroundImage === undefined || loupe_ctx === undefined)
	return;

    // if we can fit the loupe right of the image, let's do it. Otherwise
    // it is in the top left corner, with some volatility to escape the cursor.
    var frame_x = x - scrollLeft();
    var frame_y = y - scrollTop();
    if (backgroundImage.width + loupe_canvas.width + 20
	< document.body.clientWidth) {
	// Lens fits comfortably on the right
	loupe_canvas.style.left = backgroundImage.width + 20
    } else {
	if (frame_x < 1.1 * loupe_canvas.width
	    && frame_y < 1.1 * loupe_canvas.height) {
	    loupe_canvas.style.left = (1.4 * loupe_canvas.width) + "px";
	} else if (frame_x > 1.2 * loupe_canvas.width
		   || frame_y > 1.2 * loupe_canvas.height) {
	    // Little hysteresis on transitioning back
	    loupe_canvas.style.left = "10px";
	}
    }

    var loupe_size = loupe_ctx.canvas.width;
    var img_max_x = backgroundImage.width - 1;
    var img_max_y = backgroundImage.height - 1;
    // The size of square we want to enlarge.
    var crop_size = loupe_size/loupe_magnification;
    var start_x = x - crop_size/2;
    var start_y = y - crop_size/2;
    var off_x = 0, off_y = 0;
    if (start_x < 0) { off_x = -start_x; start_x = 0; }
    if (start_y < 0) { off_y = -start_y; start_y = 0; }
    var end_x = x + crop_size/2;
    var end_y = y + crop_size/2;
    end_x = end_x < img_max_x ? end_x : img_max_x;
    end_y = end_y < img_max_y ? end_y : img_max_y;
    var crop_w = (end_x - start_x) + 1;
    var crop_h = (end_y - start_y) + 1;
    loupe_ctx.fillStyle = "#777";
    loupe_ctx.fillRect(0, 0, loupe_size, loupe_size);
    off_x -= 0.5;
    off_y -= 0.5;
    loupe_ctx.drawImage(backgroundImage,
			start_x, start_y, crop_w, crop_h,
			off_x * loupe_magnification, off_y * loupe_magnification,
			loupe_magnification * crop_w,
			loupe_magnification * crop_h);

    loupe_ctx.beginPath();
    loupe_ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    loupe_ctx.lineWidth = 1;
    // draw four brackets enclosing the pixel in question.
    var bracket_len = (loupe_size - loupe_magnification)/2;
    showQuadBracket(loupe_ctx, loupe_size, bracket_len);
    loupe_ctx.stroke();
    loupe_ctx.beginPath();
    loupe_ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    showQuadBracket(loupe_ctx, loupe_size, bracket_len - 1);
    loupe_ctx.stroke();

    loupe_ctx.beginPath();
    loupe_ctx.fillStyle = "#000";
    loupe_ctx.fillText("(" + x + "," + y + ")", 10, 30);
    loupe_ctx.stroke();

    // Draw all the lines in the loupe; better 'high resolution' view.
    loupe_ctx.strokeStyle = '#00F';
    var l_off_x = x - crop_size/2 + 0.5
    var l_off_y = y - crop_size/2 + 0.5;
    for (i=0; i < lines.length; ++i) {
	lines[i].draw_loupe_line(loupe_ctx, l_off_x, l_off_y,
				 loupe_magnification);
    }
    if (current_line != undefined) {
	current_line.draw_loupe_line(loupe_ctx, l_off_x, l_off_y,
				     loupe_magnification);
    }
}

var fading_loupe_timer;
function showFadingLoupe(x, y) {
    if (fading_loupe_timer != undefined)
	clearTimeout(fading_loupe_timer);   // stop scheduled fade-out.
    loupe_canvas.style.transition = "left 0.3s, opacity 0s";
    loupe_canvas.style.opacity = 1;
    showLoupe(x, y);
    // Stay a couple of seconds, then fade away.
    fading_loupe_timer = setTimeout(function() {
	loupe_canvas.style.transition = "left 0.3s, opacity 5s";
	loupe_canvas.style.opacity = 0;
    }, 8000);
}

function moveOp(x, y) {
    if (current_line != undefined) {
	current_line.updatePos(x, y);
    }
    showFadingLoupe(x, y);
    if (current_line == undefined)
	return;
    drawAll();
}

function clickOp(x, y) {
    var now = new Date().getTime();
    if (current_line == undefined) {
	current_line = new Line(x, y, x, y);
	start_line_time = now;
	updateHelpLevel(HelpLevelEnum.HELP_FINISH_LINE);
    } else {
	current_line.updatePos(x, y);
	// Make sure that this was not a double-click event.
	// (are there better ways ?)
	if (current_line.length() > 50
	    || (current_line.length() > 0 && (now - start_line_time) > 500)) {
	    addLine(current_line);
	    updateHelpLevel(HelpLevelEnum.HELP_SET_LEN);
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
	selected_line.draw(measure_ctx, print_factor, true);
	var orig_len_txt = (print_factor * selected_line.length()).toPrecision(4);
	var new_value_txt = prompt("Length of selected line ?", orig_len_txt);
	if (orig_len_txt != new_value_txt) {
	    var new_value = parseFloat(new_value_txt);
	    if (new_value && new_value > 0) {
		print_factor = new_value / selected_line.length();
	    }
	}
	updateHelpLevel(HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW);
	drawAll();
    }
}

function OnKeyEvent(e) {
    if (e.keyCode == 27 && current_line != undefined) {  // ESC key.
	current_line = undefined;
	drawAll();
    }
}

function scrollTop() {
    return document.body.scrollTop + document.documentElement.scrollTop;
}

function scrollLeft() {
    return document.body.scrollLeft + document.documentElement.scrollLeft;
}

function extract_event_pos(e, callback) {
    // browser and scroll-independent extraction of mouse cursor in canvas.
    var x, y;
    if (e.pageX != undefined && e.pageY != undefined) {
	x = e.pageX;
	y = e.pageY;
    }
    else {
	x = e.clientX + scrollLeft();
	y = e.clientY + scrollY();
    }
    x -= measure_canvas.offsetLeft;
    y -= measure_canvas.offsetTop;

    callback(x, y);
}

// Create a fresh measure canvas of the given size.
function init_measure_canvas(width, height) {
    measure_canvas.width = width;
    measure_canvas.height = height;
    measure_ctx.font = 'bold ' + text_font_pixels + 'px Sans Serif';

    print_factor = 1;
    lines = new Array();
    current_line = undefined;
    start_line_time = 0;
}

// Init function. Call once on page-load.
function measure_init() {
    updateHelpLevel(HelpLevelEnum.HELP_FILE_LOADING);
    measure_canvas = document.getElementById('measure');
    measure_ctx = measure_canvas.getContext('2d');

    loupe_canvas = document.getElementById('loupe');
    loupe_ctx = loupe_canvas.getContext('2d');
    // We want to see the pixels:
    loupe_ctx.imageSmoothingEnabled = false;
    loupe_ctx.mozImageSmoothingEnabled = false;
    loupe_ctx.webkitImageSmoothingEnabled = false;

    init_measure_canvas(100, 100);   // Some default until we have an image.

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
	load_background_image(chooser);
    });

    var download_link = document.getElementById('download-result');
    download_link.addEventListener('click', function() {
	download_result(download_link) },  false);
    document.getElementById('download-form').style.opacity = 0;
    download_link.style.cursor = "default";
}

function init_download(filename) {
    var pos = filename.lastIndexOf(".");
    if (pos > 0) {
	filename = filename.substr(0, pos);
    }
    var download_link = document.getElementById('download-result');
    download_link.download = "augenmass-" + filename + ".png";
    download_link.style.cursor = "pointer";
    document.getElementById('download-form').style.opacity = 1;
}

function download_result(download_link) {
    if (backgroundImage === undefined)
	return;
    var with_background_checkbox = document.getElementById('include-background');
    if (with_background_checkbox.checked == true) {
	// We temporarily use the measure canvas to combine everything.
	measure_ctx.drawImage(backgroundImage, 0, 0);
	drawAllNoClear(measure_ctx);
    } else {
	drawAll();
    }
    download_link.href = measure_canvas.toDataURL('image/png');
}

function load_background_image(chooser) {
    if (chooser.value == "" || !chooser.files[0].type.match(/image.*/))
	return;

    var img_reader = new FileReader();
    img_reader.readAsDataURL(chooser.files[0]);
    img_reader.onload = function(e) {
	var new_img = new Image();
	// Image loading in the background canvas. Once we have the image, we
	// can size the canvases to a proper size.
	var background_canvas = document.getElementById('background-img');
	new_img.onload = function() {
	    var bg_context = background_canvas.getContext('2d');
	    background_canvas.width = new_img.width;
	    background_canvas.height = new_img.height;
	    bg_context.drawImage(new_img, 0, 0);
	    
	    init_measure_canvas(new_img.width, new_img.height);

	    updateHelpLevel(HelpLevelEnum.HELP_START_LINE);
	    backgroundImage = new_img;
	    init_download(chooser.files[0].name);
	}
	new_img.src = e.target.result;
    }
}
