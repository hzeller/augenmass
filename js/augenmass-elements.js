// Some useful function to have :)
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

    this.length = function() {
	return euklid_distance(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }
}

// Represents the (CCW) angle of the line between "center_p" center point and
// point "remote_p" with respect to the horizontal line.
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

    // Whenever points change, this needs to be called to re-calculate the
    // angle.
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

// Represents an arc with the given start and end-angle. Does not react
// on updates in the angle object.
function Arc(angle1, angle2) {
    this.center = angle1.center;
    this.start = angle1.angle;
    this.end = angle2.angle;
    if (this.end < this.start) {
	this.end += 2 * Math.PI;
    }

    // Hint for the drawing.
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
