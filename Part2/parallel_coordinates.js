class ParallelCoordinates {
    constructor(data) {
        this.data = data;
        this.container = d3.select("#parallel-coords-container");
        this.margin = {top: 60, right: 30, bottom: 10, left: 30};
        
        // Setup Canvas
        this.canvas = this.container.append("canvas")
            .style("width", "100%")
            .style("height", "100%");
        this.ctx = this.canvas.node().getContext("2d");

        // Setup SVG
        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
            
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
            
        this.axisGroups = [
            { name: "Mixed Composition [wt.%]", columns: ["Si", "Cu", "Mg", "Fe"] },
            { name: "Manufacturability", columns: ["CSC", "delta_T"] },
            { name: "Microstructure", columns: ["Vf_DIAMOND_A4"] },
            { name: "Mechanical Properties", columns: ["YS(MPa)", "hardness(Vickers)"] },
            { name: "Thermo-Physical Properties", columns: ["Therm.conductivity(W/(mK))", "Linear thermal expansion (1/K)(20.0-300.0degC)"] }
        ];
        
        // Flatten for the rest of the code
        this.dimensions = this.axisGroups.flatMap(g => g.columns);
        
        this.y = {};
        this.x = d3.scalePoint().domain(this.dimensions);
        this.dragging = {};
        this.background = null;
        this.foreground = null;
        this.extents = {}; // store brush extents for each dimension
        
        this.init();
    }
    
    init() {
        const bounds = this.container.node().getBoundingClientRect();
        const width = bounds.width - this.margin.left - this.margin.right;
        const height = bounds.height - this.margin.top - this.margin.bottom;
        
        this.x.range([0, width]);
        
        d3.select("#reset-brushes").on("click", () => this.resetBrushes());
        
        let expanded = false;
        d3.select("#toggle-height-btn").on("click", () => {
            expanded = !expanded;
            
            // Toggle the CSS class which naturally expands the card and container via pure CSS
            d3.select(".parallel-coords-card").classed("expanded-card", expanded);
            
            d3.select("#toggle-height-btn").text(expanded ? "Retract Height" : "Extend Height");
            
            // Execute redraw synchronously
            this.redraw(expanded);
        });
        
        // Create Y scales for each dimension
        this.dimensions.forEach(d => {
            this.y[d] = d3.scaleLinear()
                .domain(d3.extent(this.data, p => +p[d]))
                .range([height, 0]);
            this.extents[d] = null; // init brush extents
        });
        
        // Removed SVG path drawing, will draw on canvas instead in redraw()
            
        // Add axis group headers
        this.groupHeaders = this.g.selectAll(".group-header")
            .data(this.axisGroups)
            .enter().append("g")
            .attr("class", "group-header");
            
        this.groupHeaders.append("rect")
            .attr("class", "group-rect")
            .style("fill", "#0284c7")
            .style("rx", 4);
            
        this.groupHeaders.append("text")
            .attr("class", "group-text")
            .style("text-anchor", "middle")
            .style("fill", "#ffffff")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text(d => d.name);
            
        // Add a group element for each dimension
        const g = this.g.selectAll(".dimension")
            .data(this.dimensions)
            .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${this.x(d)},0)`);

        const self = this;
        const shortNames = {
            "Therm.conductivity(W/(mK))": "Cond. (W/mK)",
            "Linear thermal expansion (1/K)(20.0-300.0degC)": "Therm. Exp.",
            "hardness(Vickers)": "Hardness (HV)",
            "YS(MPa)": "YS (MPa)",
            "Vf_DIAMOND_A4": "Vf_Diamond"
        };

        g.append("g")
            .attr("class", "axis")
            .each(function(d) { d3.select(this).call(d3.axisLeft(self.y[d]).ticks(5)); })
            .append("text")
            .attr("class", "axis-title")
            .style("text-anchor", "middle")
            .attr("y", -9)
            .text(d => shortNames[d] || d);

        // Add and store a brush for each axis
        g.append("g")
            .attr("class", "brush")
            .each(function(d) {
                d3.select(this).call(self.y[d].brush = d3.brushY()
                    .extent([[-8, 0], [8, height]])
                    .on("brush start", self.brush.bind(self))
                    .on("end", self.brushEnd.bind(self))
                );
            })
            .selectAll("rect")
            .attr("x", -8)
            .attr("width", 16);
            
        // Initial layout calculation to position headers and draw everything perfectly
        this.redraw(false);
    }
    
    drawLines(filteredData) {
        const bounds = this.canvas.node().getBoundingClientRect();
        // Setup high-DPI canvas
        const dpr = window.devicePixelRatio || 1;
        this.canvas.attr("width", bounds.width * dpr).attr("height", bounds.height * dpr);
        this.ctx.scale(dpr, dpr);
        this.ctx.clearRect(0, 0, bounds.width, bounds.height);

        // Transform for margin
        this.ctx.save();
        this.ctx.translate(this.margin.left, this.margin.top);

        // Draw background (unfiltered context)
        this.ctx.beginPath();
        this.data.forEach(d => {
            this.dimensions.forEach((p, i) => {
                const x = this.x(p);
                const y = this.y[p](d[p]);
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
        });
        this.ctx.strokeStyle = "rgba(0,0,0,0.015)";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw foreground (filtered context)
        // Group by cluster to minimize strokeStyle changes
        const groups = d3.group(filteredData, d => d.Cluster);
        
        for (const [cluster, clusterData] of groups) {
            this.ctx.beginPath();
            clusterData.forEach(d => {
                this.dimensions.forEach((p, i) => {
                    const x = this.x(p);
                    const y = this.y[p](d[p]);
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                });
            });
            const color = d3.color(clusterColorScale(cluster));
            color.opacity = 0.1;
            this.ctx.strokeStyle = color.toString();
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    brush(event, d) {
        if(event.selection) {
            this.extents[d] = event.selection.map(this.y[d].invert, this.y[d]);
        } else {
            this.extents[d] = null;
        }
        this.updateFilter();
    }
    
    brushEnd(event, d) {
        if(!event.selection) {
            this.extents[d] = null;
        }
        this.updateFilter();
    }
    
    updateFilter() {
        const activeDimensions = this.dimensions.filter(p => this.extents[p] != null);
        const extents = activeDimensions.map(p => this.extents[p]);
        
        let filtered = [];
        this.data.forEach(d => {
            const isActive = activeDimensions.every((p, i) => {
                const val = d[p];
                // Invert array because extent[0] is max value due to Y axis going top to bottom
                return extents[i][1] <= val && val <= extents[i][0];
            });
            if(isActive) filtered.push(d);
        });
        
        this.drawLines(filtered);
        
        // Notify the dashboard controller
        updateGlobalFilter(filtered);
    }
    
    resetBrushes() {
        const self = this;
        // 1. Clear logical extents
        this.dimensions.forEach(d => {
            self.extents[d] = null;
        });

        // 2. Clear visually via D3 brush API safely
        this.g.selectAll(".brush").each(function(d) {
            try {
                self.y[d].brush.move(d3.select(this), null);
            } catch(e) {
                console.error(e);
            }
        });
        
        // 3. Brutal visual DOM wipe to guarantee boxes disappear
        this.g.selectAll(".brush .selection").style("display", "none");
        this.g.selectAll(".brush .handle").style("display", "none");

        // 4. Force update filter
        this.updateFilter();
    }
    
    redraw(expanded = false) {
        const svgBounds = this.svg.node().getBoundingClientRect();
        const width = svgBounds.width - this.margin.left - this.margin.right;
        const height = svgBounds.height - this.margin.top - this.margin.bottom;
        
        this.x.range([0, width]);
        
        this.dimensions.forEach(d => {
            this.y[d].range([height, 0]);
        });
        
        // Draw lines on canvas is handled by updateFilter at the end of redraw
        
        const self = this;
        
        // Update group headers positioning
        this.groupHeaders.selectAll("rect")
            .attr("x", d => {
                if(d.columns.length === 1) return this.x(d.columns[0]) - 45;
                return this.x(d.columns[0]) - 15;
            })
            .attr("y", -45)
            .attr("width", d => {
                if (d.columns.length === 1) return 90;
                return this.x(d.columns[d.columns.length - 1]) - this.x(d.columns[0]) + 30;
            })
            .attr("height", 20);
            
        this.groupHeaders.selectAll("text")
            .attr("x", d => {
                if (d.columns.length === 1) return this.x(d.columns[0]);
                return this.x(d.columns[0]) + (this.x(d.columns[d.columns.length - 1]) - this.x(d.columns[0])) / 2;
            })
            .attr("y", -31);
        
        // Update axes
        this.g.selectAll(".dimension").attr("transform", d => `translate(${this.x(d)},0)`);
        
        this.g.selectAll(".axis").each(function(d) { 
            d3.select(this).call(d3.axisLeft(self.y[d]).ticks(5)); 
        });
        
        // Temporarily disable brush events to prevent massive event firing loops
        this.g.selectAll(".brush").each(function(d) {
            self.y[d].brush.on("brush start", null).on("end", null);
            
            self.y[d].brush.extent([[-8, 0], [8, height]]);
            d3.select(this).call(self.y[d].brush);
            
            if (self.extents[d]) {
                const maxYPix = self.y[d](self.extents[d][0]); 
                const minYPix = self.y[d](self.extents[d][1]);
                const selection = [maxYPix, minYPix].sort((a,b) => a-b);
                d3.select(this).call(self.y[d].brush.move, selection);
            } else {
                d3.select(this).call(self.y[d].brush.move, null);
                d3.select(this).selectAll(".selection").style("display", "none");
                d3.select(this).selectAll(".handle").style("display", "none");
            }
            
            // Re-enable events
            self.y[d].brush
                .on("brush start", self.brush.bind(self))
                .on("end", self.brushEnd.bind(self));
        });
        
        this.updateFilter();
    }
}
