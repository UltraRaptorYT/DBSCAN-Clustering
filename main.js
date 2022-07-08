const COLOR = [
  "pink",
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "purple",
  "lightslategray",
  "brown",
  "orange",
];

function onload() {
  localStorage.clear();
  sliderChange();
}

function sliderChange() {
  document.getElementById("epsilonValue").innerHTML = Number(
    document.getElementById("epsilon").value
  ).toFixed(2);
  document.getElementById("minPointValue").innerHTML =
    document.getElementById("minPoint").value;
  document.getElementById("clusterRegion").innerHTML = "";
  for (var i of document.getElementsByClassName("dot")) {
    i.removeAttribute("class");
    i.setAttribute("class", "dot");
    i.style.fill = "white";
  }
}

document.getElementById("fileUpload").addEventListener("change", async (e) => {
  document.getElementById("svgCanvas").classList.remove("drawable");
  document.getElementById("toggleDraw").checked = false;
  document.getElementById(
    "scatterPoints"
  ).innerHTML = `<g id="ringRegion"></g><g opacity="0.5" id="clusterRegion"></g>`;
  if (e.target.files.length < 0) {
    return;
  }
  for (var i of e.target.files) {
    var fr = new FileReader();
    fr.readAsText(i);
    fr.onload = async function () {
      var result = fr.result.toString(16);
      // Get data
      if (i.type.search("text/csv") != -1) {
        var arr = csvToArray(result);
        // localStorage.setItem("dataset", JSON.stringify(arr));
        for (var points of arr) {
          document.getElementById("scatterPoints").innerHTML += `<circle
            class="dot"
            r="3.5"
            cx="${points.x}"
            cy="${points.y}"
            style="fill: white; stroke: black; stroke-width: 1px"
          ></circle>`;
        }
        return;
      }
      // Check image if it is the same
      // document.getElementById("text-box").value = result;
      const response = await fetch("./private/check.txt");

      // console.log(await response.json());
    };
  }
});

function csvToArray(str, delimiter = ",") {
  let headers = str.slice(0, str.indexOf("\n")).split(delimiter);
  const rows = str.slice(str.indexOf("\n") + 1).split("\n");
  headers = headers
    .join(",")
    .replace(/[\n\r]+/g, "")
    .split(",");

  let arr = rows.map(function (row) {
    let values = row.split(delimiter);
    values = values
      .join(",")
      .replace(/[\n\r]+/g, "")
      .split(",");
    if (values.join(",").length == 0) {
      return;
    }
    const el = headers.reduce(function (object, header, index) {
      object[header] = Number(values[index]);
      return object;
    }, {});
    return el;
  });
  // remove null values
  arr = arr.filter((n) => {
    return n;
  });
  return arr;
}

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function distanceFunc(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.cx.baseVal.value - p2.cx.baseVal.value, 2) +
      Math.pow(p1.cy.baseVal.value - p2.cy.baseVal.value, 2)
  );
}

async function startDBSCAN() {
  if (document.querySelectorAll(".dot").length <= 0) {
    alert("no data points found");
    return;
  }
  if (document.getElementById("svgCanvas").classList.contains("scan")) {
    document.getElementById("svgCanvas").classList.remove("scan");
    document.getElementById("minPoint").disabled = false;
    document.getElementById("toggleDraw").disabled = false;
    document.getElementById("epsilon").disabled = false;
    document.getElementById("fileUpload").disabled = false;
    document.getElementById("start-btn").innerHTML = "START";
    return;
  }
  document.getElementById("start-btn").innerHTML = "FINISH";
  document.getElementById("svgCanvas").classList.add("scan");
  document.getElementById("svgCanvas").classList.remove("drawable");
  document.getElementById("minPoint").disabled = true;
  document.getElementById("toggleDraw").disabled = true;
  document.getElementById("epsilon").disabled = true;
  document.getElementById("fileUpload").disabled = true;
  document.getElementById("toggleDraw").checked = false;
  document.getElementById("clusterRegion").innerHTML = "";
  for (var i of document.getElementsByClassName("dot")) {
    i.removeAttribute("class");
    i.setAttribute("class", "dot");
    i.style.fill = "white";
  }
  var eps = document.getElementById("epsilon").value;
  var minPoint = document.getElementById("minPoint").value;
  var dotList = [
    ...document.getElementById("scatterPoints").getElementsByClassName("dot"),
  ];
  await DBSCANNER(dotList, distanceFunc, eps, minPoint);
  document.getElementById("svgCanvas").classList.remove("scan");
  document.getElementById("minPoint").disabled = false;
  document.getElementById("toggleDraw").disabled = false;
  document.getElementById("epsilon").disabled = false;
  document.getElementById("fileUpload").disabled = false;
  document.getElementById("start-btn").innerHTML = "START";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function DBSCANNER(DB, distanceFunc, eps, minPts) {
  eps *= 22.5;
  let cluster = 0;
  let all = [];
  let vis = [];
  for (let [idx, point] of DB.entries()) {
    if (!document.getElementById("svgCanvas").classList.contains("scan")) {
      return;
    }
    var pointClass = [...point.classList];
    pointClass.splice(pointClass.indexOf("dot"), 1);
    if (pointClass.length != 0) {
      continue;
    }
    var neighbour = RangeQuery(DB, distanceFunc, point, eps);
    if (neighbour.length < minPts) {
      point.classList.add("noise");
      continue;
    }
    cluster++;
    point.classList.add(`C${cluster}`);
    let seedSet = [...neighbour];
    if (!vis[idx]) {
      all.push(point);
      vis[idx] = 1;
    }
    // seedSet.splice(seedSet.indexOf(point), 1);
    for (let [i, seedPoint] of seedSet) {
      if (!document.getElementById("svgCanvas").classList.contains("scan")) {
        return;
      }
      if (!vis[i]) {
        vis[i] = 1;
        all.push(seedPoint);
      }
      if (seedPoint.classList.contains("noise")) {
        seedPoint.classList.add(`NC${cluster}`);
      }
      var seedClass = [...seedPoint.classList];
      seedClass.splice(seedClass.indexOf("dot"), 1);
      if (seedClass.length != 0) {
        continue;
      }
      seedPoint.classList.add(`C${cluster}`);
      var seedNeighbour = RangeQuery(DB, distanceFunc, seedPoint, eps);
      if (seedNeighbour.length >= minPts) {
        Array.prototype.push.apply(seedSet, seedNeighbour);
      }
    }
  }
  var ringSpeed = 100;
  var fillSpeed = 50;
  for await (var point of all) {
    if (!document.getElementById("svgCanvas").classList.contains("scan")) {
      var ringSpeed = 0;
      var fillSpeed = 0;
    }
    var classList = [...point.classList];
    let match = classList.find((e) => {
      return e.includes("C");
    });
    var noise = false;
    var noiseCluster = false;
    if (match != undefined) {
      if (match.includes("N")) {
        noise = true;
        noiseCluster = true;
      }
      match = parseInt(match.split("C")[1]);
    } else {
      noise = true;
      match = 5;
    }
    const points = point;
    const x = point.cx.baseVal.value;
    const y = point.cy.baseVal.value;
    const ringID = DB.indexOf(point);
    document.getElementById("ringRegion").innerHTML += `
              <circle
              class="eps_ball"
              cx="${x}"
              cy="${y}"
              r="${eps}"
              opacity="1"
              style="stroke: ${
                COLOR[match % COLOR.length]
              }; stroke-width: 2; fill:transparent;"
              id="ring${ringID}"
            ></circle>`;
    setTimeout(() => {
      document.getElementById(`ring${ringID}`).remove();
      if (!noise) {
        epsilonRing(x, y, eps, match);
        points.style.fill = COLOR[match % COLOR.length];
      }
      if (noiseCluster) {
        points.style.fill = COLOR[match % COLOR.length];
      }
    }, ringSpeed);
    await sleep(fillSpeed);
  }
  var remaining = [];
  DB.filter((element) => {
    if (!all.includes(element)) {
      remaining.push(element);
    }
  });
  for await (var point of remaining) {
    if (!document.getElementById("svgCanvas").classList.contains("scan")) {
      var ringSpeed = 0;
      var fillSpeed = 0;
    }
    const x = point.cx.baseVal.value;
    const y = point.cy.baseVal.value;
    const ringID = remaining.indexOf(point);
    document.getElementById("ringRegion").innerHTML += `
              <circle
              class="eps_ball"
              cx="${x}"
              cy="${y}"
              r="${eps}"
              opacity="1"
              style="stroke: black; stroke-width: 2; fill:transparent;"
              id="ring${ringID}"
            ></circle>`;
    setTimeout(() => {
      document.getElementById(`ring${ringID}`).remove();
    }, ringSpeed);
    await sleep(fillSpeed);
  }
}

function epsilonRing(x, y, eps, cluster) {
  document.getElementById("clusterRegion").innerHTML += `
              <circle
              class="eps_ball"
              cx="${x}"
              cy="${y}"
              r="${eps}"
              opacity="1"
              style="stroke: ${
                COLOR[cluster % COLOR.length]
              }; stroke-width: 2; fill: ${COLOR[cluster % COLOR.length]}"
            ></circle>`;
}

function RangeQuery(DB, distanceFunc, Q, eps) {
  var neighbour = [];
  for (var [i, val] of DB.entries()) {
    if (distanceFunc(Q, val) <= eps) {
      neighbour.push([i, val]);
    }
  }
  return neighbour;
}

// draw on SVG
document
  .getElementById("svgCanvas")
  .addEventListener("mousedown", function (e) {
    if (!document.getElementById("svgCanvas").classList.contains("drawable")) {
      return;
    }
    // Get the target
    const target = e.target;
    // Get the bounding rectangle of target
    const rect = target.getBoundingClientRect();
    if (target.tagName == "rect") {
      // Mouse position
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (document.getElementById("remove").checked) {
        document.getElementById("scatterPoints").innerHTML += `
        <circle
            class="dot"
            r="3.5"
            cx="${x}"
            cy="${y}"
            style="fill: white; stroke: black; stroke-width: 1px"
          ></circle>
        `;
      }
    } else {
      const x = e.srcElement.cx.baseVal.value;
      const y = e.srcElement.cy.baseVal.value;
      if (document.getElementById("remove").checked) {
        document.getElementById("scatterPoints").innerHTML += `
        <circle
            class="dot"
            r="3.5"
            cx="${x}"
            cy="${y}"
            style="fill: white; stroke: black; stroke-width: 1px"
          ></circle>
        `;
      } else {
        var dotArray = [
          ...document.getElementById("scatterPoints").querySelectorAll(".dot"),
        ];
        for (var i = 0; i < dotArray.length; i++) {
          if (
            dotArray[i].cx.baseVal.value == x &&
            dotArray[i].cy.baseVal.value == y
          ) {
            dotArray[i].remove();
            break;
          }
        }
      }
    }
  });

document.getElementById("toggleDraw").addEventListener("input", () => {
  document.getElementById("svgCanvas").classList.toggle("drawable");
  if (document.getElementById("svgCanvas").classList.contains("drawable")) {
    document.getElementById("clusterRegion").innerHTML = "";
    for (var i of document.getElementsByClassName("dot")) {
      i.removeAttribute("class");
      i.setAttribute("class", "dot");
      i.style.fill = "white";
    }
  }
});

document.getElementById("saveData").addEventListener("click", () => {
  if (document.querySelectorAll(".dot").length <= 0) {
    alert("no data points found");
    return;
  }
  document.getElementById("svgCanvas").classList.remove("drawable");
  document.getElementById("toggleDraw").checked = false;
  var output = "x,y\n";
  for (let point of document.querySelectorAll(".dot")) {
    output += `${point.cx.baseVal.value},${point.cy.baseVal.value}\n`;
  }
  output = output.slice(0, -1);
  download("DBSCANData.csv", output);
});
document.getElementById("clearData").addEventListener("click", () => {
  if (document.getElementById("svgCanvas").classList.contains("scan")) {
    return;
  }
  document.getElementById("fileUpload").value = "";
  document.getElementById("svgCanvas").classList.add("drawable");
  document.getElementById("toggleDraw").checked = true;
  document.getElementById(
    "scatterPoints"
  ).innerHTML = `<g id="ringRegion"></g><g opacity="0.5" id="clusterRegion"></g>`;
});

function download(filename, text) {
  var pom = document.createElement("a");
  pom.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(text)
  );
  pom.setAttribute("download", filename);

  if (document.createEvent) {
    var event = document.createEvent("MouseEvents");
    event.initEvent("click", true, true);
    pom.dispatchEvent(event);
  } else {
    pom.click();
  }
}

document.getElementById("remove").addEventListener("input", () => {
  if (document.getElementById("remove").checked) {
    document.querySelector('label[for="remove"]').innerHTML = `Add`;
  } else {
    document.querySelector('label[for="remove"]').innerHTML = `Remove`;
  }
});
