# mtg-detection
Magic: The Gathering broswser based computer vision

This is a collection of functions that are meant to help with the detection of MTG cards in an image. 

### OpenCV
OpenCV is reuired for this to work, it can either be included directly or from their website.

```html
<script async src="https://docs.opencv.org/4.6.0/opencv.js" type="text/javascript"></script>
```

### Structure
- mtg-detection
    - examples - A basic webpage utilizing the strategies used in mtg-detector.js but broken out to allow for showing what each step does
        - index.html
        - index.js
        - style.css
    - test-images - folder containing some example images to test with
    - mtg-detector.js - the module itself
    - readme.md - this file
    - .gitignore