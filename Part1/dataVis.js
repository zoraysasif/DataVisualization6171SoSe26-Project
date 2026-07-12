/*
* Data Visualization - Framework
* Copyright (C) University of Passau
*   Faculty of Computer Science and Mathematics
*   Chair of Cognitive sensor systems
* Maintenance:
*   2025, Alexander Gall <alexander.gall@uni-passau.de>
*
* All rights reserved.
*/

// scatterplot axes
let xAxis, yAxis, xAxisLabel, yAxisLabel;
// radar chart axes
let radarAxes, radarAxesAngle;

let dimensions = ["dimension 1", "dimension 2", "dimension 3", "dimension 4", "dimension 5", "dimension 6"];
//*HINT: the first dimension is often a label; you can simply remove the first dimension with
// dimensions.splice(0, 1);

// the visual channels we can use for the scatterplot
let channels = ["scatterX", "scatterY", "size"];

// size of the plots
let margin, width, height, radius;
// svg containers
let scatter, radar, dataTable;

// Add additional variables
let globalData = [];
let selectedItems = [];
let idDimension = "";
let colorScale = d3.scaleOrdinal(d3.schemeCategory10);
let x, y, r;
let radarScales = {};


function init() {
    // define size of plots
    margin = {top: 20, right: 20, bottom: 20, left: 50};
    width = 600;
    height = 500;
    radius = width / 2;

    // Start at default tab
    document.getElementById("defaultOpen").click();

	// data table
	dataTable = d3.select('#dataTable');
 
    // scatterplot SVG container and axes
    scatter = d3.select("#sp").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

    // radar chart SVG container and axes
    radar = d3.select("#radar").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

    // read and parse input file
    let fileInput = document.getElementById("upload"), readFile = function () {

        // clear existing visualizations
        clear();

        let reader = new FileReader();
        reader.onloadend = function () {
            console.log("data loaded: ");

            // TODO: parse reader.result data and call the init functions with the parsed data!
            globalData = d3.csvParse(reader.result, d3.autoType);
            
            if (globalData.length > 0) {
                let allKeys = Object.keys(globalData[0]);
                idDimension = allKeys[0];
                dimensions = allKeys.slice(1);
            }

            initVis(globalData);
            CreateDataTable(globalData);
            // TODO: possible place to call the dashboard file for Part 2
            if (typeof initDashboard === "function") {
                initDashboard(globalData);
            }
        };
        reader.readAsBinaryString(fileInput.files[0]);
    };
    fileInput.addEventListener('change', readFile);
}


function initVis(_data){

    // TODO: parse dimensions (i.e., attributes) from input file
    // Dimensions are parsed in reader.onloadend

    // y scalings for scatterplot
    // TODO: set y domain for each dimension
    y = d3.scaleLinear()
        .range([height - margin.bottom - margin.top, margin.top]);

    // x scalings for scatter plot
    // TODO: set x domain for each dimension
    x = d3.scaleLinear()
        .range([margin.left, width - margin.left - margin.right]);

    // radius scalings for radar chart
    // TODO: set radius domain for each dimension
    r = d3.scaleLinear()
        .range([0, radius]);

    // scatterplot axes
    yAxis = scatter.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margin.left + ")")
        .call(d3.axisLeft(y));

    yAxisLabel = yAxis.append("text")
        .style("text-anchor", "middle")
        .attr("y", margin.top / 2)
        .text("x");

    xAxis = scatter.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (height - margin.bottom - margin.top) + ")")
        .call(d3.axisBottom(x));

    xAxisLabel = xAxis.append("text")
        .style("text-anchor", "middle")
        .attr("x", width - margin.right)
        .text("y");

    // radar chart axes
    radarAxesAngle = Math.PI * 2 / dimensions.length;
    let axisRadius = d3.scaleLinear()
        .range([0, radius]);
    let maxAxisRadius = 0.75,
        textRadius = 0.8;
    gridRadius = 0.1;

    // radar axes
    radarAxes = radar.selectAll(".axis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "axis");

    radarAxes.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", function(d, i){ return radarX(axisRadius(maxAxisRadius), i); })
        .attr("y2", function(d, i){ return radarY(axisRadius(maxAxisRadius), i); })
        .attr("class", "line")
        .style("stroke", "black");

    // TODO: render grid lines in gray
    let gridLevels = 5;
    let grid = radar.append("g").attr("class", "gridWrapper");
    for (let j = 0; j < gridLevels; j++) {
        let levelFactor = axisRadius(maxAxisRadius) * ((j + 1) / gridLevels);
        let points = dimensions.map((d, i) => {
            return radarX(levelFactor, i) + "," + radarY(levelFactor, i);
        }).join(" ");
        grid.append("polygon")
            .attr("points", points)
            .style("fill", "none")
            .style("stroke", "lightgray");
    }

    // Initialize radarScales for each dimension
    if (_data && _data.length > 0) {
        dimensions.forEach(dim => {
            radarScales[dim] = d3.scaleLinear()
                .domain(d3.extent(_data, d => d[dim]))
                .range([0, axisRadius(maxAxisRadius)]);
        });
    }

    // TODO: render correct axes labels
    radar.selectAll(".axisLabel")
        .data(dimensions)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", function(d, i){ return radarX(axisRadius(textRadius), i); })
        .attr("y", function(d, i){ return radarY(axisRadius(textRadius), i); })
        .text(d => d);

    // init menu for the visual channels
    channels.forEach(function(c){
        initMenu(c, dimensions);
    });

    // refresh all select menus
    channels.forEach(function(c){
        refreshMenu(c);
    });

    renderScatterplot();
    renderRadarChart();
}

// clear visualizations before loading a new file
function clear(){
    scatter.selectAll("*").remove();
    radar.selectAll("*").remove();
    dataTable.selectAll("*").remove();
}

//Create Table
function CreateDataTable(_data) {
    if (!_data || _data.length === 0) return;

    // TODO: create table and add class
    let table = dataTable.append("table")
        .attr("class", "dataTableClass");

    // TODO: add headers, row & columns
    let thead = table.append("thead");
    let tbody = table.append("tbody");

    let columns = [idDimension].concat(dimensions);

    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .attr("class", "tableHeaderClass")
        .text(d => d);

    let rows = tbody.selectAll("tr")
        .data(_data)
        .enter()
        .append("tr");

    rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column) {
                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append("td")
        .attr("class", "tableBodyClass")
        .text(d => d.value);

    // TODO: add mouseover event
    rows.on("mouseover", function(event, d) {
        d3.select(this).style("background-color", "yellow");
    })
    .on("mouseout", function(event, d) {
        d3.select(this).style("background-color", null);
    });
}
function renderScatterplot(){
    if (!globalData || globalData.length === 0) return;

    // TODO: get domain names from menu and label x- and y-axis
    let xDim = readMenu("scatterX");
    let yDim = readMenu("scatterY");
    let sizeDim = readMenu("size");

    // TODO: re-render axes
    x.domain(d3.extent(globalData, d => d[xDim])).nice();
    y.domain(d3.extent(globalData, d => d[yDim])).nice();

    xAxis.transition().duration(1000).call(d3.axisBottom(x));
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    xAxisLabel.text(xDim);
    yAxisLabel.text(yDim);

    let rScale = d3.scaleSqrt()
        .domain(d3.extent(globalData, d => d[sizeDim]))
        .range([3, 15]);

    // TODO: render dots
    let dots = scatter.selectAll(".dot")
        .data(globalData, d => d[idDimension]);

    dots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 0)
        .attr("cx", d => x(d[xDim]))
        .attr("cy", d => y(d[yDim]))
        .style("fill", "black")
        .style("opacity", 0.6)
        .on("click", handleDotClick)
        .merge(dots)
        .transition().duration(1000)
        .attr("cx", d => x(d[xDim]))
        .attr("cy", d => y(d[yDim]))
        .attr("r", d => rScale(d[sizeDim]))
        .style("fill", function(d) {
            let index = selectedItems.findIndex(item => item[idDimension] === d[idDimension]);
            if (index > -1) {
                return colorScale(d[idDimension]);
            }
            return "black";
        })
        .style("opacity", function(d) {
            let index = selectedItems.findIndex(item => item[idDimension] === d[idDimension]);
            if (index > -1 || selectedItems.length === 0) {
                return 0.8;
            }
            return 0.2;
        });

    dots.exit().remove();
}

function handleDotClick(event, d) {
    let index = selectedItems.findIndex(item => item[idDimension] === d[idDimension]);
    if (index > -1) {
        selectedItems.splice(index, 1);
    } else {
        if (selectedItems.length < 10) {
            selectedItems.push(d);
        } else {
            console.log("Max 10 items selected.");
        }
    }
    renderScatterplot();
    renderRadarChart();
}

function renderRadarChart(){

    // TODO: show selected items in legend
    let legendContainer = d3.select("#legend");
    let legendItems = legendContainer.selectAll(".legend-item")
        .data(selectedItems, d => d[idDimension]);

    let legendEnter = legendItems.enter()
        .append("div")
        .attr("class", "legend-item");

    legendEnter.append("span")
        .attr("class", "color-circle")
        .style("background-color", d => colorScale(d[idDimension]));

    legendEnter.append("span")
        .style("margin-left", "5px")
        .text(d => d[idDimension]);

    legendEnter.append("span")
        .attr("class", "close")
        .text("x")
        .on("click", function(event, d) {
            handleDotClick(null, d);
        });

    legendItems.exit().remove();

    // TODO: render polylines in a unique color
    let radarLine = d3.lineRadial()
        .angle((d, i) => radarAngle(i))
        .radius(d => radarScales[d.dimension](d.value))
        .curve(d3.curveLinearClosed);

    let radarPaths = radar.selectAll(".radar-path")
        .data(selectedItems, d => d[idDimension]);

    radarPaths.enter()
        .append("path")
        .attr("class", "radar-path")
        .style("fill", d => colorScale(d[idDimension]))
        .style("fill-opacity", 0.1)
        .style("stroke", d => colorScale(d[idDimension]))
        .style("stroke-width", 2)
        .attr("d", d => {
            let pathData = dimensions.map(dim => ({dimension: dim, value: d[dim]}));
            return radarLine(pathData);
        })
        .merge(radarPaths)
        .transition().duration(1000)
        .attr("d", d => {
            let pathData = dimensions.map(dim => ({dimension: dim, value: d[dim]}));
            return radarLine(pathData);
        });

    radarPaths.exit().remove();

    // Render data marks (dots) on radar chart
    let radarPointsData = [];
    selectedItems.forEach(item => {
        dimensions.forEach((dim, i) => {
            radarPointsData.push({
                id: item[idDimension],
                dimension: dim,
                value: item[dim],
                index: i
            });
        });
    });

    let radarPoints = radar.selectAll(".radar-point")
        .data(radarPointsData, d => d.id + "-" + d.dimension);

    radarPoints.enter()
        .append("circle")
        .attr("class", "radar-point")
        .attr("r", 3)
        .style("fill", d => colorScale(d.id))
        .attr("cx", d => radarX(radarScales[d.dimension](d.value), d.index))
        .attr("cy", d => radarY(radarScales[d.dimension](d.value), d.index))
        .merge(radarPoints)
        .transition().duration(1000)
        .attr("cx", d => radarX(radarScales[d.dimension](d.value), d.index))
        .attr("cy", d => radarY(radarScales[d.dimension](d.value), d.index));

    radarPoints.exit().remove();
}


function radarX(radius, index){
    return radius * Math.cos(radarAngle(index));
}

function radarY(radius, index){
    return radius * Math.sin(radarAngle(index));
}

function radarAngle(index){
    return radarAxesAngle * index - Math.PI / 2;
}

// init scatterplot select menu
function initMenu(id, entries) {
    $("select#" + id).empty();

    entries.forEach(function (d) {
        $("select#" + id).append("<option>" + d + "</option>");
    });

    $("#" + id).selectmenu({
        select: function () {
            renderScatterplot();
        }
    });
}

// refresh menu after reloading data
function refreshMenu(id){
    $( "#"+id ).selectmenu("refresh");
}

// read current scatterplot parameters
function readMenu(id){
    return $( "#" + id ).val();
}

// switches and displays the tabs
function openPage(pageName,elmnt,color) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].style.backgroundColor = "";
    }
    document.getElementById(pageName).style.display = "block";
    elmnt.style.backgroundColor = color;
}
