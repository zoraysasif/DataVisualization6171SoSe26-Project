class ScatterPlot {
    constructor(data) {
        this.globalData = data;
        this.currentData = data;
        this.container = d3.select("#scatter-plot-container");
        this.margin = {top: 20, right: 20, bottom: 40, left: 50};
        
        this.dims = [
            "YS(MPa)", "hardness(Vickers)", "Density(g/cm3)", "Therm.conductivity(W/(mK))", 
            "El.conductivity(S/m)", "Total_Vf_Phases", "KS1295[%]", "6082[%]"
        ];
        
        this.xDim = "YS(MPa)";
        this.yDim = "hardness(Vickers)";
        this.hoveredCandidate = null;
        
        this.init();
    }
    
    init() {
        // Populate selectors
        const xSelect = d3.select("#scatterX");
        const ySelect = d3.select("#scatterY");
        
        this.dims.forEach(d => {
            xSelect.append("option").attr("value", d).text(d);
            ySelect.append("option").attr("value", d).text(d);
        });
        
        xSelect.property("value", this.xDim).on("change", (e) => {
            this.xDim = e.target.value;
            this.render(this.currentData, true);
        });
        
        ySelect.property("value", this.yDim).on("change", (e) => {
            this.yDim = e.target.value;
            this.render(this.currentData, true);
        });

        // Setup Canvas
        this.canvas = this.container.append("canvas")
            .style("width", "100%")
            .style("height", "100%");
        this.ctx = this.canvas.node().getContext("2d");

        const bounds = this.canvas.node().getBoundingClientRect();
        this.width = bounds.width - this.margin.left - this.margin.right;
        this.height = bounds.height - this.margin.top - this.margin.bottom;
        
        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
            
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
            
        this.xAxisG = this.g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${this.height})`);
            
        this.yAxisG = this.g.append("g")
            .attr("class", "axis");
            
        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);
        
        this.render(this.currentData, false);
    }
    
    render(data, animate) {
        this.currentData = data;
        
        const bounds = this.canvas.node().getBoundingClientRect();
        this.width = bounds.width - this.margin.left - this.margin.right;
        this.height = bounds.height - this.margin.top - this.margin.bottom;

        this.xScale.range([0, this.width]);
        this.yScale.range([this.height, 0]);
        
        // Update scales
        this.xScale.domain(d3.extent(this.globalData, d => d[this.xDim])).nice();
        this.yScale.domain(d3.extent(this.globalData, d => d[this.yDim])).nice();
        
        this.xAxisG.attr("transform", `translate(0,${this.height})`);

        const t = animate ? d3.transition().duration(750) : d3.select(null);
        
        (animate ? this.xAxisG.transition(t) : this.xAxisG)
            .call(d3.axisBottom(this.xScale));
            
        (animate ? this.yAxisG.transition(t) : this.yAxisG)
            .call(d3.axisLeft(this.yScale));
            
        // Render Canvas
        this.drawDots();
        
        // Setup quadtree for interactions
        this.quadtree = d3.quadtree()
            .x(d => this.xScale(d[this.xDim]))
            .y(d => this.yScale(d[this.yDim]))
            .addAll(data);
            
        // Clean up previous event listeners if any
        this.canvas.on("mousemove", null).on("click", null).on("mouseout", null);
            
        this.canvas.on("mousemove", (event) => {
            const [mouseX, mouseY] = d3.pointer(event, this.canvas.node());
            const x = mouseX - this.margin.left;
            const y = mouseY - this.margin.top;
            
            // Find nearest point within 15px radius
            const nearest = this.quadtree.find(x, y, 15);
            
            if (nearest) {
                if (this.hoveredCandidate !== nearest) {
                    this.handleMouseOver(event, nearest, mouseX, mouseY);
                } else {
                    // Update tooltip position slightly
                    d3.select(".tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            } else {
                if (this.hoveredCandidate) this.handleMouseOut();
            }
        });
        
        this.canvas.on("mouseout", () => {
            if (this.hoveredCandidate) this.handleMouseOut();
        });

        this.canvas.on("click", (event) => {
            const [mouseX, mouseY] = d3.pointer(event, this.canvas.node());
            const x = mouseX - this.margin.left;
            const y = mouseY - this.margin.top;
            const nearest = this.quadtree.find(x, y, 15);
            if(nearest) {
                handleCandidateSelection(nearest);
            }
        });
    }

    drawDots() {
        const bounds = this.canvas.node().getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.attr("width", bounds.width * dpr).attr("height", bounds.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.clearRect(0, 0, bounds.width, bounds.height);

        this.ctx.translate(this.margin.left, this.margin.top);

        const selectedIds = new Set(selectedCandidates.map(s => s.id));

        // Group dots by cluster to batch rendering
        const groups = d3.group(this.currentData, d => d.Cluster);
        
        for (const [cluster, clusterData] of groups) {
            this.ctx.beginPath();
            clusterData.forEach(d => {
                if (selectedIds.has(d.id)) return; // Skip selected
                const cx = this.xScale(d[this.xDim]);
                const cy = this.yScale(d[this.yDim]);
                
                this.ctx.moveTo(cx + 3, cy);
                this.ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
            });
            const color = d3.color(clusterColorScale(cluster));
            color.opacity = 0.5;
            this.ctx.fillStyle = color.toString();
            this.ctx.fill();
        }

        // Draw selected dots on top
        selectedCandidates.forEach((d, i) => {
            const cx = this.xScale(d[this.xDim]);
            const cy = this.yScale(d[this.yDim]);
            
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
            this.ctx.fillStyle = candidateColorScale(i);
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = "#fff";
            this.ctx.stroke();
        });
        
        // Draw hovered dot highlight
        if (this.hoveredCandidate) {
            const cx = this.xScale(this.hoveredCandidate[this.xDim]);
            const cy = this.yScale(this.hoveredCandidate[this.yDim]);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = "#fff";
            this.ctx.stroke();
        }
    }
    
    update(filteredData) {
        this.render(filteredData, false);
    }
    
    highlightSelected(selected) {
        this.drawDots();
    }
    
    handleMouseOver(event, d, mouseX, mouseY) {
        this.hoveredCandidate = d;
        this.drawDots();
            
        const tooltip = d3.select(".tooltip");
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`
            <b>${d.id}</b><br/>
            Cluster: ${d.Cluster}<br/>
            ${this.xDim}: ${d[this.xDim].toFixed(2)}<br/>
            ${this.yDim}: ${d[this.yDim].toFixed(2)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    }
    
    handleMouseOut() {
        this.hoveredCandidate = null;
        this.drawDots();
            
        d3.select(".tooltip").transition().duration(200).style("opacity", 0);
    }
}
