/*
Copyright 2020 Jonathan Browne.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Start of color-scheme specific code

// The colors to display on the starting screen.
// The generic code below only depends on color; hueRange is just used by getInitialRange().
let initialColors = [
    { // Red
        color: {h: 0, s: 100, l: 50},
        range: {h: {min: -60, max: 30}}
    },
    { // Orange
        color: {h: 30, s: 100, l: 50},
        range: {h: {min: 0, max: 60}}
    },
    { // Yellow
        color: {h: 60, s: 100, l: 50},
        range: {h: {min: 30, max: 90}}
    },
    { // Green
        color: {h: 120, s: 100, l: 30},
        range: {h: {min: 60, max: 180}}
    },
    { // Blue
        color: {h: 240, s: 100, l: 50},
        range: {h: {min: 120, max: 300}}
    },
    { // Purple
        color: {h: 300, s: 100, l: 40},
        range: {h: {min: 240, max: 360}}
    }
];
// The maximum bounds for each key in the range.
// (Hue wraps around indefinitely, so that's unbounded.)
let globalRanges = {h: {min: -Infinity, max: Infinity}, s: {min: 0, max: 100}, l: {min: 0, max: 100}};

// Called to display a color.
function displayColor(element, color) {
    // Hue can wrap around; force it back to between 0 and 360.
    let normalizedHue = color.h % 360;
    if (normalizedHue < 0) normalizedHue += 360;

    // Generate a hex code
    let cssRGB = "#" + hslToRgb(normalizedHue / 360, color.s / 100, color.l / 100).map(x => {
        x = Math.round(x).toString("16");
        if (x.length == 1) x = "0" + x;
        return x;
    }).join("").toUpperCase();

    // And a CSS-compatible hsl() entry
    let cssHSL = "hsl(" + normalizedHue.toFixed(3) + ", " + color.s.toFixed(3) + "%, " + color.l.toFixed(3) + "%)";

    element.label.innerText = cssRGB + "\n" + cssHSL;
    element.style.backgroundColor = cssRGB;
}

// From https://gist.github.com/mjackson/5311256
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [ r * 255, g * 255, b * 255 ];
}

// Everything below this line should be color-scheme independent.

let currentRanges = null;
let currentKey = null;
let currentColors = [];

let title;
let resetButton;

// Displays the title and initial colors, clearing all data.
function reset() {
    title.style.display = null; // Reset to CSS
    resetButton.style.display = "none";
    
    currentRanges = null;
    currentKey = null;
    display(initialColors.map(x => x.color));
}

// Makes a deep clone of obj, such that modifying one in any way has no effect on the other.
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Called when a color is clicked. Calculates and displays new color options.
function clicked(color) {
    let index = currentColors.indexOf(color);
    let nextKey = true;
    if (currentRanges == null) {
        // First color selected
        // Load an initial range
        currentRanges = deepClone(initialColors[index].range);
        for (let key in globalRanges) {
            if (!currentRanges[key]) {
                currentRanges[key] = deepClone(globalRanges[key]);
            }
        }

        // Hide the title and show the reset button
        title.style.display = "none";
        resetButton.style.display = null; // Reset to CSS
    } else {
        let range = currentRanges[currentKey];

        // Calculate the new bounds for the range.
        // This setup allows anything between the two colors next to the one that was clicked.
        // (It helps when I'm trying to decide between two colors; I can pick one and change my mind later.)
        let nextMin = range.min, nextMax = range.max;
        let shiftDir = 0;
        if (index > 0) {
            nextMin = currentColors[index - 1][currentKey];
        } else if (color[currentKey] > globalRanges[currentKey].min) {
            shiftDir--;
        }
        if (index < currentColors.length - 1) {
            nextMax = currentColors[index + 1][currentKey];
        } else if (color[currentKey] < globalRanges[currentKey].max) {
            shiftDir++;
        }

        if (shiftDir == 0) {
            range.min = nextMin;
            range.max = nextMax;
        } else {
            // The user prefers a color on the edge - there might be better colors in that direction.
            // Slide the range in that direction and let them pick again. 
            nextKey = false;
            let shift = (range.max - range.min) / 2;
            range.min += shift * shiftDir;
            if (range.min < globalRanges[currentKey].min) {
                range.min = globalRanges[currentKey].min;
            }
            range.max += shift * shiftDir;
            if (range.max > globalRanges[currentKey].max) {
                range.max = globalRanges[currentKey].max;
            }
        }
    }

    let keys = Object.keys(currentRanges);
    // Save the values for the selected color
    for (let key of keys) currentRanges[key].last = color[key];
    if (nextKey) {
        // Pick a new aspect of the color to tweak
        // This simply cycles to the next element in the array
        currentKey = keys[(keys.indexOf(currentKey) + 1) % keys.length];
    }

    // Pick several values for the key
    let values = [];
    const NUM_OPTIONS = currentColors.length;
    for (let i = 0; i < NUM_OPTIONS; i++) {
        values.push(currentRanges[currentKey].min + (currentRanges[currentKey].max - currentRanges[currentKey].min) * i / (NUM_OPTIONS - 1));
    }
    values.sort((a, b) => parseInt(a) - parseInt(b));

    // Convert numbers to colors and display them
    display(values.map(val => {
        let color = {};
        for (let key in currentRanges) {
            if (key == currentKey) {
                color[key] = val;
            } else {
                color[key] = currentRanges[key].last;
            }
        }
        return color;
    }));
}

let buttons = [];
// Displays a new set of colors.
function display(colors) {
    currentColors = colors;

    // Make sure we have the right number of buttons
    while (buttons.length > colors.length) {
        buttons.pop().remove();
    }
    while (buttons.length < colors.length) {
        const button = document.createElement("div");
        button.classList.add("color");
        button.onclick = () => clicked(button.color);

        const label = document.createElement("div");
        // Make sure clicking the label doesn't count as clicking the color
        // (otherwise it wouldn't be possible to select the color codes)
        label.onclick = e => e.stopPropagation();
        label.classList.add("label");
        button.appendChild(label);
        button.label = label;

        document.getElementById("container").appendChild(button);
        buttons.push(button);
    }

    // Connect the colors to the buttons
    for (let i = 0; i < colors.length; i++) {
        buttons[i].color = colors[i];
        displayColor(buttons[i], colors[i]);
    }
}

window.onload = function() {
    title = document.getElementById("title");
    resetButton = document.getElementById("reset");
    resetButton.onclick = reset;
    reset();
}
