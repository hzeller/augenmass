Augenmaß
========

Given a background photo, you can draw lines on top of it whose relative
length is shown. Double-clicking on a line allows you to set a
'reference size', all the other numbers are adjusted accordingly.

Use this for instance by taking a picture of something with a ruler in the
same focus; use the ruler to set a reference size and now you have correct
measurements for the other parts in the picture.

In this example, we mark a known distance (40mm) so that we can get the value
for the distance to be measured (12.70mm).
![sample-image][sample-image]

Basic UI:
   * Open augenmass.html with a browser.
   * Enter path (or URI) to background image. Press the `Measure` button.
   * Draw lines. First click first point, second click second point. ESC key if
     you want to cancel the current line.
   * Double-click on a number to enter some value. The other lines are
     automatically re-calculated according to that factor.

(Note, I don't really know JavaScript; if you see things to improve, just send
me a pull request).

[sample-image]: https://github.com/hzeller/augenmass/raw/master/sample-image/augenmass.png
