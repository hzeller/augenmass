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

function AugenmassView(canvas) {
    this.measure_canvas_ = canvas;
    this.measure_ctx_ = this.measure_canvas_.getContext('2d');
    this.model_ = undefined;
    this.controller_ = undefined;

    // Create a fresh measure canvas of the given size.
    this.resetWithSize = function(width, height) {
	this.measure_canvas_.width = width;
	this.measure_canvas_.height = height;
	this.measure_ctx_.font = 'bold ' + length_font_pixels + 'px Sans Serif';

	print_factor = 1;
	// A fresh model.
	this.model_ = new AugenmassModel();
	if (this.controller_ == undefined) {
	    this.controller_ = new AugenmassController(canvas, this);
	}
    }

    this.getModel = function() { return this.model_; }
    this.getCanvas = function() { return this.measure_canvas_; }

    // Draw all the lines!
    this.drawAll = function() {
	this.measure_ctx_.clearRect(0, 0, this.measure_canvas_.width,
				    this.measure_canvas_.height);
	this.drawAllNoClear(this.measure_ctx_);
    }

    this.highlightLine = function(line) {
	line.draw(this.measure_ctx_, print_factor, true);
    }

    this.drawAllNoClear = function(ctx) {
	this.measure_ctx_.font = 'bold ' + length_font_pixels + 'px Sans Serif';
	this.model_.forAllLines(function(line) {
	    line.draw(ctx, print_factor, false);
	});
	if (this.model_.hasEditLine()) {
	    this.model_.getEditLine().draw_editline(ctx, print_factor);
	}
	this.measure_ctx_.font = angle_font_pixels + "px Sans Serif";
	var count = 0;
	this.model_.forAllArcs(function(arc) {
	    drawArc(ctx, arc, (count++ % 3) * 3);
	});
    }
}
