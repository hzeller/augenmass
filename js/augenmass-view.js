// Constructor function.
function AugenmassView(canvas) {
    "use strict";
    this.measure_canvas_ = canvas;
    this.measure_ctx_ = this.measure_canvas_.getContext('2d');
    this.model_ = undefined;
    this.controller_ = undefined;
    this.print_factor_ = 1.0;  // Semantically, this one should probably be in the model.
    this.show_deltas_ = false;
    this.show_angles_ = true;

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
    this.setShowDeltas = function(b) { this.show_deltas_ = b; }
    this.setShowAngles = function(b) { this.show_angles_ = b; }

    this.getModel = function() { return this.model_; }
    this.getCanvas = function() { return this.measure_canvas_; }

    // Draw all the lines!
    this.drawAll = function() {
	this.measure_ctx_.clearRect(0, 0, this.measure_canvas_.width,
				    this.measure_canvas_.height);
	this.drawAllNoClear(this.measure_ctx_);
    }

    this.highlightLine = function(line) {
	drawMeasureLine(this.measure_ctx_, line, this.print_factor_, this.show_deltas_,
			true);
    }

    this.drawAllNoClear = function(ctx) {
	this.measure_ctx_.font = 'bold ' + length_font_pixels + 'px Sans Serif';
	var length_factor = this.print_factor_;
	var show_deltas = this.show_deltas_;
	this.model_.forAllLines(function(line) {
	    drawMeasureLine(ctx, line, length_factor, show_deltas, false);
	});
	if (this.model_.hasEditLine()) {
	    var line = this.model_.getEditLine();
	    drawEditline(ctx, line, this.print_factor_);
	    if (this.show_deltas_) {
		drawDeltaLine(ctx, line, this.print_factor_);
	    }
	}
	if (this.show_angles_) {
	    this.measure_ctx_.font = angle_font_pixels + "px Sans Serif";
	    // Radius_fudge makes the radius of the arc slighly different
	    // for all angles around one center so that they are easier
	    // to distinguish.
	    var radius_fudge = 0;
	    var current_point = undefined;
	    var any_arc = false;
	    this.model_.forAllArcs(function(arc) {
		if (current_point == undefined
		    || current_point.x != arc.center.x
		    || current_point.y != arc.center.y) {
		    current_point = arc.center;
		    radius_fudge = 0;
		}
		drawArc(ctx, arc, (radius_fudge++ % 3) * 3);
		any_arc = true;
	    });
	    if (any_arc) {
		help_system.achievementUnlocked(HelpLevelEnum.DONE_ADD_ANGLE);
	    }
	}
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


    // Draw a perpendicular (to the line) end-piece ("T") at position x, y.
    function drawT(ctx, x, y, remote_x, remote_y, t_len, optional_gap) {
	var len = euklid_distance(x, y, remote_x, remote_y);
	if (len < 1) return;
	var dx = remote_x - x;
	var dy = remote_y - y;
	if (optional_gap === undefined) {
	    ctx.moveTo(x - t_len * dy/len, y + t_len * dx/len);
	    ctx.lineTo(x + t_len * dy/len, y - t_len * dx/len);
	} else {
	    ctx.moveTo(x - t_len * dy/len, y + t_len * dx/len);
	    ctx.lineTo(x - optional_gap * dy/len, y + optional_gap * dx/len);
	    ctx.moveTo(x + t_len * dy/len, y - t_len * dx/len);
	    ctx.lineTo(x + optional_gap * dy/len, y - optional_gap * dx/len);
	}
    }

    // Drawing the line while editing.
    // We only show the t-anchor on the start-side. Also the line is
    // 1-2 pixels shorter where the mouse-cursor is, so that we don't cover
    // anything in the target crosshair.
    function drawEditline(ctx, line, length_factor) {
	var pixel_len = line.length();

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
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y,
	     end_bracket_len);
	ctx.stroke();

	// White background for actual line
	ctx.beginPath();
	ctx.lineCap = 'butt';  // Flat to not bleed into crosshair.
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p1.x + dx, line.p1.y + dy);
	ctx.stroke();

	// t-line ...
	ctx.beginPath();
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 0.5;
	ctx.lineCap = 'butt';
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y, 50);
	// Leave a little gap at the line where the cursor is to leave
	// free view to the surroundings.
	drawT(ctx, line.p2.x, line.p2.y, line.p1.x, line.p1.y, 50, 10);
	ctx.stroke();

	// ... and actual line.
	ctx.beginPath();
	ctx.strokeStyle = '#00F';
	ctx.lineWidth = 1;
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p1.x + dx, line.p1.y + dy);
	ctx.stroke();

	if (pixel_len >= 2) {
	    var print_text = (length_factor * pixel_len).toPrecision(4);
	    var text_len = ctx.measureText(print_text).width + 2 * length_font_pixels;
	    // Print label.
	    // White background for text. We're using a short line, so that we
	    // have a nicely rounded box with our line-cap.
	    var text_dx = -text_len/2;
	    var text_dy = -(length_font_pixels + 10)/2;
	    if (pixel_len > 0) {
		text_dx = -dx * text_len/(2 * pixel_len);
		text_dy = -dy * (length_font_pixels + 10)/(2 * pixel_len);
	    }
	    writeLabel(ctx, print_text, line.p1.x + text_dx, line.p1.y + text_dy,
		       "center");
	}
    }

    // General draw of a measuring line.
    function drawMeasureLine(ctx, line, length_factor, show_deltas, highlight) {
	var print_text = (length_factor * line.length()).toPrecision(4);
	if (show_deltas && line.p1.x != line.p2.x && line.p1.y != line.p2.y) {
	    var dx = length_factor * (line.p2.x - line.p1.x);
	    var dy = length_factor * (line.p1.y - line.p2.y);
	    print_text += "; \u0394=(" + Math.abs(dx).toPrecision(4) + ", "
		+ Math.abs(dy).toPrecision(4) + ")";
	}
	ctx.beginPath();
	// Some contrast background.
	if (highlight) {
	    ctx.strokeStyle = background_highlight_line_style;
	} else {
	    ctx.strokeStyle = background_line_style;
	}
	ctx.lineWidth = background_line_width;
	ctx.lineCap = 'round';
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p2.x, line.p2.y);
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y,
	     end_bracket_len);	
	drawT(ctx, line.p2.x, line.p2.y, line.p1.x, line.p1.y,
	     end_bracket_len);	
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
	drawT(ctx, line.p1.x, line.p1.y, line.p2.x, line.p2.y,
	     end_bracket_len);	
	drawT(ctx, line.p2.x, line.p2.y, line.p1.x, line.p1.y,
	     end_bracket_len);
	ctx.stroke();

	// .. and text.
	var a = new Angle(line.p1, line.p2, line);
	var slope_upwards = ((a.angle > 0 && a.angle < Math.PI/2)
			     || (a.angle > Math.PI && a.angle < 3 * Math.PI/2));
	var flat_angle = Math.PI/10;
	var flat_slope = ((a.angle > 0 && a.angle < flat_angle)
			  || (a.angle > Math.PI/2 && a.angle < (Math.PI/2 + flat_angle)));
	writeLabel(ctx, print_text,
		   (line.p1.x + line.p2.x)/2, (line.p1.y + line.p2.y)/2 - 10,
		   flat_slope ? "center" : (slope_upwards ? "right" : "left"));
    }

    // Write a label with a contrasty background.
    function writeLabel(ctx, txt, x, y, alignment) {
	ctx.font = 'bold ' + length_font_pixels + 'px Sans Serif';
	ctx.textBaseline = 'middle';
	ctx.textAlign = alignment;

	ctx.beginPath();
	var dx = ctx.measureText(txt).width;
	ctx.lineWidth = length_font_pixels + 5;  // TODO: find from style.
	ctx.lineCap = 'round';
	ctx.strokeStyle = background_line_style;
	var line_x = x;
	if (alignment == 'center') {
	    line_x -= dx/2;
	}
	else if (alignment == 'right') {
	    line_x -= dx;
	}
	ctx.moveTo(line_x, y);
	ctx.lineTo(line_x + dx, y);
	ctx.stroke();
	ctx.fillStyle = '#000';
	ctx.fillText(txt, x, y);
    }

    function drawDeltaLine(ctx, line, length_factor, highlight) {
	if (line.p1.x == line.p2.x || line.p1.y == line.p2.y)
	    return;

	var non_overlap_target = 30;
	var dy = line.p2.y - line.p1.y;
	var dx = line.p2.x - line.p1.x;
	ctx.beginPath();
	ctx.lineWidth = 0.5;
	ctx.strokeStyle = "#000";
	ctx.moveTo(line.p1.x, line.p1.y);
	ctx.lineTo(line.p2.x, line.p1.y);
	if (Math.abs(dy) > non_overlap_target) {
	    var line_y = line.p1.y + dy - ((dy < 0) ? -non_overlap_target : non_overlap_target);
	    ctx.lineTo(line.p2.x, line_y);
	}
	ctx.stroke();

	var hor_len = length_factor * Math.abs(dx);
	var hor_align = "center";
	if (dx <= 0 && dx > -80) hor_align = "right";
	else if (dx >= 0 && dx < 80) hor_align = "left";
	writeLabel(ctx, hor_len.toPrecision(4), (line.p1.x + line.p2.x)/2,
		   line.p1.y + ((dy > 0) ? -20 : 20), hor_align);
	var vert_len = length_factor * Math.abs(dy);
	writeLabel(ctx, vert_len.toPrecision(4),
		   line.p2.x + (dx > 0 ? 10 : -10),
		   (line.p1.y + line.p2.y)/2,
		   line.p1.x < line.p2.x ? "left" : "right");
    }
}
