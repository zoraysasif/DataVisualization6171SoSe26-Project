let globalData = [];
let filteredData = [];
let selectedCandidates = []; // For radar chart

// Chart instances
let parallelCoords, scatterPlot, radarChart, clusterHistogram;

// Shared Color scale for clusters optimized for dark background
const clusterColorScale = d3.scaleOrdinal()
    .domain([0, 1, 2, 3, 4])
    .range(["#00f5d4", "#f15bb5", "#fee440", "#00bbf9", "#9b5de5"]);

// A shared color scale for selected candidates (up to 5) with high contrast
const candidateColorScale = d3.scaleOrdinal()
    .range(["#ff3366", "#20e2e2", "#ffc300", "#c77dff", "#06d6a0"]);

function initDashboard() {
    // Append tooltip div to body
    d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Load dataset
    d3.csv("dashboard_data.csv").then(data => {
        // Parse numerical values
        data.forEach((d, i) => {
            d.id = "Alloy_" + i;
            for(let key in d) {
                if(key !== "id") {
                    d[key] = +d[key];
                }
            }
        });
        
        globalData = data;
        filteredData = data;
        
        document.getElementById('total-count').innerText = globalData.length;
        document.getElementById('filtered-count').innerText = filteredData.length;
        
        // Initialize charts
        parallelCoords = new ParallelCoordinates(globalData);
        scatterPlot = new ScatterPlot(globalData);
        radarChart = new RadarChart();
        clusterHistogram = new ClusterHistogram(globalData);
    }).catch(err => console.error("Error loading CSV:", err));
}

// Called by Parallel Coordinates when brush changes
function updateGlobalFilter(brushedData) {
    filteredData = brushedData;
    document.getElementById('filtered-count').innerText = filteredData.length;
    
    // Update dependent charts
    if (scatterPlot) scatterPlot.update(filteredData);
    if (clusterHistogram) clusterHistogram.update(filteredData);
    
    // Remove selected candidates that are no longer in filtered data
    const validIds = new Set(filteredData.map(d => d.id));
    const originalLen = selectedCandidates.length;
    selectedCandidates = selectedCandidates.filter(d => validIds.has(d.id));
    if(selectedCandidates.length !== originalLen) {
        if (radarChart) radarChart.update(selectedCandidates);
        if (scatterPlot) scatterPlot.highlightSelected(selectedCandidates);
    }
}

// Called by Scatter Plot when a point is clicked
function handleCandidateSelection(candidate) {
    const index = selectedCandidates.findIndex(d => d.id === candidate.id);
    if(index > -1) {
        selectedCandidates.splice(index, 1);
    } else {
        if(selectedCandidates.length < 5) {
            selectedCandidates.push(candidate);
        } else {
            alert("Maximum of 5 candidates can be compared in the radar chart.");
            return;
        }
    }
    
    scatterPlot.highlightSelected(selectedCandidates);
    radarChart.update(selectedCandidates);
}

// Called by Radar Chart Legend
function handleCandidateDeselection(candidateId) {
    selectedCandidates = selectedCandidates.filter(d => d.id !== candidateId);
    scatterPlot.highlightSelected(selectedCandidates);
    radarChart.update(selectedCandidates);
}
