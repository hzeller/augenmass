// Constructor function.
function AugenmassView(canvas) {
    "use strict";
    this.measure_canvas_ = canvas;
    this.measure_ctx_ = this.measure_canvas_.getContext('2d');
    this.model_ = undefined;
    this.controller_ = undefined;
    this.print_factor_ = 1.0;  // Semantically, this one should probably be in the model.

    // Create a fresh measure canvas of the given size.
    this.resetWithSize = function(width, height) {
	this.measure_canvas_.width = width;
	this.measure_canvas_.height = height;
	this.measure_ctx_.font = 'bold ' + length_font_pixels + 'px Sans Serif';

	this.print_factor_ = 1.0;
	// A fresh model.
	this.model_ = new AugenmassModel();
	if (this.controller_ == undefined) {
	    this.controller_ = new AugenmassController(canvas, this);
	}
    }

    this.getUnitsPerPixel = function() { return this.print_factor_; }
    this.setUnitsPerPixel = function(factor) { this.print_factor_ = factor; }

    this.getModel = function() { return this.model_; }
    this.getCanvas = function() { return this.measure_canvas_; }

    // Draw all the lines!
    this.drawAll = function() {
	this.measure_ctx_.clearRect(0, 0, this.measure_canvas_.width,
				    this.measure_canvas_.height);
	this.drawAllNoClear(this.measure_ctx_);
    }

    this.highlightLine = function(line) {
	drawMeasureLine(this.measure_ctx_, line, this.print_factor_, true);
    }

    this.drawAllNoClear = function(ctx) {
	this.measure_ctx_.font = 'bold ' + length_font_pixels + 'px Sans Serif';
	var length_factor = this.print_factor_;
	this.model_.forAllLines(function(line) {
	    drawMeasureLine(ctx, line, length_factor, false);
	});
	if (this.model_.hasEditLine()) {
	    drawEditline(ctx, this.model_.getEditLine(), this.print_factor_);
	}
	this.measure_ctx_.font = angle_font_pixels + "px Sans Serif";
	// Radius_fudge makes the radius of the arc slighly different
	// for all angles around one center so that they are easier
	// to distinguish.
	var radius_fudge = 0;
	var current_point = undefined;
	this.model_.forAllArcs(function(arc) {
	    if (current_point == undefined
		|| current_point.x != arc.center.x
		|| current_point.y != arc.center.y) {
		current_point = arc.center;
		radius_fudge = 0;
	    }
	    drawArc(ctx, arc, (radius_fudge++ % 3) * 3);
	});
    }

    // Write rotated text, aligned to the outside.
    function writeRotatedText(ctx, txt, x, y, radius, angle) {
	ctx.save();
	ctx.beginPath();
	ctx.translate(x, y);
	ctx.strokeStyle = background_line_style;
	ctx.lineWidth = angle_font_pixels;
	ctx.lineCap = 'butt';   // should end flush with the arc.
	ctx.moveTo(0, 0);
	if (angle <= Math.PI/2 || angle > 3 * Math.PI/2) {
	    ctx.rotate(-angle);   // JavaScript, Y U NO turn angles left.
	    ctx.textAlign = 'right';
	    ctx.textBaseline = 'middle';
	    ctx.lineTo(radius, 0);
	    ctx.stroke();
	    ctx.fillText(txt, radius, 0);
	} else {
	    // Humans don't like to read text upside down
	    ctx.rotate(-(angle + Math.PI));
	    ctx.textAlign = 'left';
	    ctx.textBaseline = 'middle';
	    ctx.lineTo(-radius, 0);
	    ctx.stroke();
	    ctx.fillText(txt, -radius, 0);
	}
	ctx.restore();
    }

    function drawArc(ctx, arc, radius_fiddle) {
	var text_len = ctx.measureText("333.3\u00B0").width;
	var radius = text_len + 2 * end_bracket_len + radius_fiddle;
	ctx.beginPath();
	ctx.lineWidth = background_line_width;
	ctx.strokeStyle = background_line_style;
	// Javascript turns angles right not left. Ugh.
	ctx.arc(arc.center.x, arc.center.y, Math.min(radius, arc.max_radius),
		2 * Math.PI - arc.end, 2 * Math.PI - arc.start);
	ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = 1;
	ctx.strokeStyle = "#000";
	ctx.arc(arc.center.x, arc.center.y, Math.min(radius, arc.max_radius),
		2 * Math.PI - arc.end, 2 * Math.PI - arc.start);
	ctx.stroke();

	var middle_angle = (arc.end - arc.start)/2 + arc.start;
	writeRotatedText(ctx, arc.angleInDegrees().toFixed(1) + "\u00B0",
			 arc.center.x, arc.center.y,
			 radius - 2, middle_angle);
    }


    // Draw a T end-piece at position x, y
    function drawT(ctx, x, y, remote_x, remote_y) {
	var len = euklid_distance(x, y, remote_x, remote_y);
	if (len < 1) return;
	var dx = remote_x - x;
	var dy = remote_y - y;
	ctx.moveTo(x - end_bracket_len * dy/len, y + end_bracket_len * dx/len);
	ctx.lineTo(x + end_bracket_len * dy/len, y - end_bracket_len * dx/len);
    }

    // Drawing the line while editing.
    // We only show the t-anchor on the start-side. Also the line is
    // 1-2 pixels shorter where the mouse-cursor is, so that we don't cover
    // anything in the target crosshair.
    function drawEditline(ctx, line, length_factor) {
	var pixel_len = line.length();
	var print_text = (length_factor * pixel_len).toPrecision(4);
	var text_len = ctx.measureText(print_text).width + 2 * length_font_pixels;

	// We want to draw the line a little bit shorter, so that the
	// open crosshair cursor has 'free sight'
	var dx = line.p2.x - line.p1.x;
	var dy = line.p2.y - line.p1.y;
	if (pixel_len > 2) {
	    dx = dx * (pixel_len - 2)/pixel_len;
	    dy = dy * (pixel_len - 2)/pixel_len;
	}

	// Background for t-line
	ctx.beginPath();
	ctx.strokeStyle = background_line_style;
	ctx.lineWidth = background_line_width;
	ctx.lineCap = 'round';
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y);
	ctx.stroke();

	// White background for actual line
	ctx.beginPath();
	ctx.lineCap = 'butt';  // Flat to not bleed into crosshair.
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p1.x + dx, line.p1.y + dy);
	ctx.stroke();

	// t-line and line.
	ctx.beginPath();
	ctx.strokeStyle = '#00F';
	ctx.lineWidth = 1;
	ctx.lineCap = 'butt';
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y);
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p1.x + dx, line.p1.y + dy);
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
	    ctx.moveTo(line.p1.x + text_dx - background_text_len,
		       line.p1.y + text_dy);
	    ctx.lineTo(line.p1.x + text_dx + background_text_len,
		       line.p1.y + text_dy);
	    ctx.stroke();
	    
	    ctx.beginPath();
	    ctx.fillStyle = '#000';
	    ctx.textBaseline = 'middle';
	    ctx.textAlign = 'center';
	    ctx.fillText(print_text, line.p1.x + text_dx, line.p1.y + text_dy);
	    ctx.stroke();
	}
    }

    // General draw of a measuring line.
    function drawMeasureLine(ctx, line, length_factor, highlight) {
	var print_text = (length_factor * line.length()).toPrecision(4);

	ctx.beginPath();
	// Some white background.
	if (highlight) {
	    ctx.strokeStyle = background_highlight_line_style;
	} else {
	    ctx.strokeStyle = background_line_style;
	}
	ctx.lineWidth = background_line_width;
	ctx.lineCap = 'round';
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p2.x, line.p2.y);
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y);	
	drawT(ctx, line.p2.x, line.p2.y, line.p1.x, line.p1.y);	
	ctx.stroke();

	// Background behind text. We're using a short line, so that we
	// have a nicely rounded box with our line-cap.
	ctx.beginPath();
	var text_len = ctx.measureText(print_text).width;
	ctx.lineWidth = length_font_pixels + 10;
	ctx.moveTo((line.p1.x + line.p2.x)/2 - text_len/2 - 10,
		   (line.p1.y + line.p2.y)/2 - length_font_pixels/2);
	ctx.lineTo((line.p1.x + line.p2.x)/2 + text_len/2 + 10,
		   (line.p1.y + line.p2.y)/2 - length_font_pixels/2);
	ctx.stroke();

	ctx.beginPath();
	// actual line
	if (highlight) {
	    ctx.strokeStyle = highlight_line_style;
	} else {
	    ctx.strokeStyle = line_style;
	}
	ctx.lineWidth = 1;
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p2.x, line.p2.y);
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y);	
	drawT(ctx, line.p2.x, line.p2.y, line.p1.x, line.p1.y);	
	ctx.stroke();

	// .. and text.
	ctx.beginPath();
	ctx.fillStyle = '#000';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillText(print_text, (line.p1.x + line.p2.x)/2,
		     (line.p1.y + line.p2.y)/2 - length_font_pixels/2);
	ctx.stroke();
    }
}
