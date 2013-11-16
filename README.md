Augenmaß
========

Given a background photo, this tool allows you to draw lines on top of it whose relative
lengths in pixel are shown. Double-clicking on a line allows you to set a
'reference size', all the other numbers are adjusted accordingly.

Use this for instance by taking a picture of something with a ruler in the
same focus; use the ruler to set a reference size and now you have correct
measurements for the other parts in the picture.

In this example, we mark a known distance (40mm) so that we can get the value
for the distance to be measured (12.70mm).
![sample-image][sample-image]

Basic UI:
   * Open [augenmass.html](https://rawgithub.com/hzeller/augenmass/master/augenmass.html) in your browser.
   * Choose background image file.
     (Nothing is uploaded anywhere, this is just used locally by your browser).
   * Draw lines on top of your background image. First click first point, second
     click second point. ESC key if you want to cancel the current line.
   * The loupe shows a magnified view of the area the mouse cursor is covering.
   * Double-click on a number to enter some value. The other lines are
     automatically re-calculated according to that factor.
   * If you start the line exactly where another one stopped, the angle between the
     lines is indicated. The loupe functionality will help you match the points.
     ![Triangles...][angle-image]
   * You can download the result as transparent overlay PNG image.

(Note, I don't really know JavaScript, this is essentially my first JavaScript experiment.
if you see things to improve, just send me a pull request. See also TODOs for inspiration).

[sample-image]: https://github.com/hzeller/augenmass/raw/master/sample-image/augenmass.png
[angle-image]: https://github.com/hzeller/augenmass/raw/master/sample-image/angles.png
