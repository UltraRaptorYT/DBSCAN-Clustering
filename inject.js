var output = [];

for (var points of document.querySelectorAll(".dot")) {
  output.push({ x: points.cx.baseVal.value, y: points.cy.baseVal.value });
}

console.log(output);

