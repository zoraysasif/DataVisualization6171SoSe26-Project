class ParallelCoordinates {
    constructor(data) {
        this.data = data;
        this.container = d3.select("#parallel-coords-container");
        this.margin = {top: 30, right: 10, bottom: 10, left: 0};
        
        // Setup SVG
        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
            
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
            
        // Selected dimensions
        this.dimensions = [
            "KS1295[%]", "6082[%]", "2024[%]", "bat-box[%]", "3003[%]", "4032[%]",
            "YS(MPa)", "hardness(Vickers)", "Density(g/cm3)", "Therm.conductivity(W/(mK))"
        ];
        
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
            
            // Execute redraw after CSS transition completes to snap axes into new height
            setTimeout(() => {
                this.redraw(expanded);
            }, 310);
        });
        
        // Create Y scales for each dimension
        this.dimensions.forEach(d => {
            this.y[d] = d3.scaleLinear()
                .domain(d3.extent(this.data, p => +p[d]))
                .range([height, 0]);
            this.extents[d] = null; // init brush extents
        });
        
        // Draw background lines (context)
        this.background = this.g.append("g")
            .attr("class", "background")
            .selectAll("path")
            .data(this.data)
            .enter().append("path")
            .attr("d", this.path.bind(this))
            .style("fill", "none")
            .style("stroke", "rgba(255,255,255,0.02)");

        // Draw foreground lines (focus)
        this.foreground = this.g.append("g")
            .attr("class", "foreground")
            .selectAll("path")
            .data(this.data)
            .enter().append("path")
            .attr("d", this.path.bind(this))
            .style("fill", "none")
            .style("stroke", d => clusterColorScale(d.Cluster))
            .style("stroke-opacity", 0.3)
            .style("stroke-width", 1.5);
            
        // Add a group element for each dimension
        const g = this.g.selectAll(".dimension")
            .data(this.dimensions)
            .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${this.x(d)},0)`);

        const self = this;
        g.append("g")
            .attr("class", "axis")
            .each(function(d) { d3.select(this).call(d3.axisLeft(self.y[d]).ticks(5)); })
            .append("text")
            .attr("class", "axis-title")
            .style("text-anchor", "middle")
            .attr("y", -9)
            .text(d => d);

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
    }
    
    path(d) {
        return d3.line()(this.dimensions.map(p => [this.x(p), this.y[p](d[p])]));
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
        this.foreground.style("display", d => {
            const isActive = activeDimensions.every((p, i) => {
                const val = d[p];
                // Invert array because extent[0] is max value due to Y axis going top to bottom
                return extents[i][1] <= val && val <= extents[i][0];
            });
            if(isActive) filtered.push(d);
            return isActive ? null : "none";
        });
        
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
        const bounds = this.container.node().getBoundingClientRect();
        const width = bounds.width - this.margin.left - this.margin.right;
        
        // Use explicit height instead of relying on DOM bounding boxes which might be delayed
        const expectedTotalHeight = expanded ? 700 : 350;
        const height = expectedTotalHeight - this.margin.top - this.margin.bottom;
        
        this.x.range([0, width]);
        
        this.dimensions.forEach(d => {
            this.y[d].range([height, 0]);
        });
        
        // Update paths
        this.background.attr("d", this.path.bind(this));
        this.foreground.attr("d", this.path.bind(this));
        
        const self = this;
        
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
