// TODO: remove drawing methods from these.

function euklid_distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function Point(x, y) {
    this.update = function(x, y) {
	this.x = x;
	this.y = y;
    }

    // key to be used in hash tables.
    this.get_key = function() {
	return this.x + ":" + this.y;
    }

    this.update(x, y);
}

function Line(x1, y1, x2, y2) {
    // The canvas coordinate system numbers the space _between_ pixels
    // as full coordinage. Correct for that.
    this.p1 = new Point(x1 + 0.5, y1 + 0.5);
    this.p2 = new Point(x2 + 0.5, y2 + 0.5);

    // While editing: updating second end of the line.
    this.updatePos = function(x2, y2) {
	this.p2.update(x2 + 0.5, y2 + 0.5);
    }

    // Helper for determining selection: how far is the given position from the
    // center text.
    this.distanceToCenter = function(x, y) {
	var centerX = (this.p1.x + this.p2.x)/2;
	var centerY = (this.p1.y + this.p2.y)/2;
	return euklid_distance(centerX, centerY, x, y);
    }

    // -- these draw methods should not be here.

    // Draw a T end-piece at position x, y
    this.draw_t = function(ctx, x, y, remote_x, remote_y) {
	var len = euklid_distance(x, y, remote_x, remote_y);
	if (len < 1) return;
	var dx = remote_x - x;
	var dy = remote_y - y;
	ctx.moveTo(x - end_bracket_len * dy/len, y + end_bracket_len * dx/len);
	ctx.lineTo(x + end_bracket_len * dy/len, y - end_bracket_len * dx/len);
    }

    // Very simple line, as shown in the loupe-view.
    this.draw_loupe_line = function(ctx, off_x, off_y, factor) {
	// these 0.5 offsets seem to look inconclusive on Chrome and Firefox.
	// Need to go deeper.
	ctx.beginPath();
	var x1pos = (this.p1.x - off_x), y1pos = (this.p1.y - off_y);
	var x2pos = (this.p2.x - off_x), y2pos = (this.p2.y - off_y);
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
	var text_len = ctx.measureText(print_text).width + 2 * length_font_pixels;

	// We want to draw the line a little bit shorter, so that the
	// open crosshair cursor has 'free sight'
	var dx = this.p2.x - this.p1.x;
	var dy = this.p2.y - this.p1.y;
	if (pixel_len > 2) {
	    dx = dx * (pixel_len - 2)/pixel_len;
	    dy = dy * (pixel_len - 2)/pixel_len;
	}

	// Background for t-line
	ctx.beginPath();
	ctx.strokeStyle = background_line_style;
	ctx.lineWidth = background_line_width;
	ctx.lineCap = 'round';
	this.draw_t(ctx, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
	ctx.stroke();

	// White background for actual line
	ctx.beginPath();
	ctx.lineCap = 'butt';  // Flat to not bleed into crosshair.
	ctx.moveTo(this.p1.x, this.p1.y);
	ctx.lineTo(this.p1.x + dx, this.p1.y + dy);
	ctx.stroke();

	// t-line and line.
	ctx.beginPath();
	ctx.strokeStyle = '#00F';
	ctx.lineWidth = 1;
	ctx.lineCap = 'butt';
	this.draw_t(ctx, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
	ctx.moveTo(this.p1.x, this.p1.y);
	ctx.lineTo(this.p1.x + dx, this.p1.y + dy);
	ctx.stroke();

	if (pixel_len >= 2) {
	    // White background for text. We're using a short line, so that we
	    // have a nicely rounded box with our line-cap.
	    var text_dx = -text_len/2;
	    var text_dy = -(length_font_pixels + 10)/2;
	    if (pixel_len > 0) {
		text_dx = -dx * text_len/(2 * pixel_len);
		text_dy = -dy * (length_font_pixels + 10)/(2 * pixel_len);
	    }
	    ctx.beginPath();
	    ctx.strokeStyle = background_line_style;
	    ctx.lineWidth = length_font_pixels + 10;
	    ctx.lineCap = 'round';
	    // We added the length_font_pixels above, so remove them here: the
	    // rounding of the stroke will cover that.
	    var background_text_len = text_len/2 - length_font_pixels;
	    ctx.moveTo(this.p1.x + text_dx - background_text_len,
		       this.p1.y + text_dy);
	    ctx.lineTo(this.p1.x + text_dx + background_text_len,
		       this.p1.y + text_dy);
	    ctx.stroke();
	    
	    ctx.beginPath();
	    ctx.fillStyle = '#000';
	    ctx.textBaseline = 'middle';
	    ctx.textAlign = 'center';
	    ctx.fillText(print_text, this.p1.x + text_dx, this.p1.y + text_dy);
	    ctx.stroke();
	}
    }

    // General draw of a measuring line.
    this.draw = function(ctx, length_factor, highlight) {
	var print_text = (length_factor * this.length()).toPrecision(4);

	ctx.beginPath();
	// Some white background.
	if (highlight) {
	    ctx.strokeStyle = background_highlight_line_style;
	} else {
	    ctx.strokeStyle = background_line_style;
	}
	ctx.lineWidth = background_line_width;
	ctx.lineCap = 'round';
	ctx.moveTo(this.p1.x, this.p1.y);
	ctx.lineTo(this.p2.x, this.p2.y);
	this.draw_t(ctx, this.p1.x, this.p1.y, this.p2.x, this.p2.y);	
	this.draw_t(ctx, this.p2.x, this.p2.y, this.p1.x, this.p1.y);	
	ctx.stroke();

	// Background behind text. We're using a short line, so that we
	// have a nicely rounded box with our line-cap.
	ctx.beginPath();
	var text_len = ctx.measureText(print_text).width;
	ctx.lineWidth = length_font_pixels + 10;
	ctx.moveTo((this.p1.x + this.p2.x)/2 - text_len/2 - 10,
		   (this.p1.y + this.p2.y)/2 - length_font_pixels/2);
	ctx.lineTo((this.p1.x + this.p2.x)/2 + text_len/2 + 10,
		   (this.p1.y + this.p2.y)/2 - length_font_pixels/2);
	ctx.stroke();

	ctx.beginPath();
	// actual line
	if (highlight) {
	    ctx.strokeStyle = highlight_line_style;
	} else {
	    ctx.strokeStyle = line_style;
	}
	ctx.lineWidth = 1;
	ctx.moveTo(this.p1.x, this.p1.y);
	ctx.lineTo(this.p2.x, this.p2.y);
	this.draw_t(ctx, this.p1.x, this.p1.y, this.p2.x, this.p2.y);	
	this.draw_t(ctx, this.p2.x, this.p2.y, this.p1.x, this.p1.y);	
	ctx.stroke();

	// .. and text.
	ctx.beginPath();
	ctx.fillStyle = '#000';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillText(print_text, (this.p1.x + this.p2.x)/2,
		     (this.p1.y + this.p2.y)/2 - length_font_pixels/2);
	ctx.stroke();
    }

    this.length = function() {
	return euklid_distance(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }
}

function Angle(center_p, remote_p, line) {
    this.center = center_p;
    this.p = remote_p;
    this.line = line;
    this.angle = undefined;
    this.is_valid = false;

    this.arm_length = function() {
	return euklid_distance(this.center.x, this.center.y,
			       this.p.x, this.p.y);
    }

    // Whenever points change, this needs to be called.
    this.notifyPointsChanged = function() {
	var len = euklid_distance(this.center.x, this.center.y,
				  this.p.x, this.p.y);
	if (len == 0.0) {
	    this.is_valid = false;
	    return;
	}
	var dx = this.p.x - this.center.x;
	var angle = Math.acos(dx/len);
	if (this.p.y > this.center.y) {
	    angle = 2 * Math.PI - angle;
	}
	this.angle = angle;
	this.is_valid = true;
    }

    this.notifyPointsChanged();
}

// Create an arc with the given start and end-angle. If angle is > 180 degrees,
// chooses the shorter arc.
function Arc(angle1, angle2) {
    this.center = angle1.center;
    this.start = angle1.angle;
    this.end = angle2.angle;
    if (this.end < this.start) {
	this.end += 2 * Math.PI;
    }
    // We want the drawn arc use at maximum half the lenght of the arm. That
    // way, two adjacent arcs on each endpoint of the arm are rendered
    // without overlap.
    this.max_radius = Math.min(angle1.arm_length(), angle2.arm_length()) / 2;

    // Printable value in the range [0..360)
    this.angleInDegrees = function() {
	var a = 180.0 * (this.end - this.start) / Math.PI;
	if (a < 0) a += 360;
	return a;
    }
}
