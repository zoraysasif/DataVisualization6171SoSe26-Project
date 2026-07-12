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
            
            this.container
                .style("height", expanded ? "700px" : "350px")
                .style("transition", "height 0.3s ease");
            
            d3.select("#toggle-height-btn").text(expanded ? "Retract Height" : "Extend Height");
            
            // Smoothly redraw during transition
            let frames = 0;
            const animate = () => {
                this.redraw();
                frames++;
                if(frames < 20) {
                    requestAnimationFrame(animate);
                } else {
                    // final snap
                    setTimeout(() => this.redraw(), 50);
                }
            };
            requestAnimationFrame(animate);
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
            .style("stroke", "rgba(255,255,255,0.05)");

        // Draw foreground lines (focus)
        this.foreground = this.g.append("g")
            .attr("class", "foreground")
            .selectAll("path")
            .data(this.data)
            .enter().append("path")
            .attr("d", this.path.bind(this))
            .style("fill", "none")
            .style("stroke", d => clusterColorScale(d.Cluster))
            .style("stroke-opacity", 0.4)
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
            .style("text-anchor", "middle")
            .attr("y", -9)
            .text(d => d)
            .style("fill", "var(--text-secondary)")
            .style("font-size", "11px");

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
        // Loop over each dimension
        this.dimensions.forEach(d => {
            // Clear logical extent
            self.extents[d] = null;
            
            // Clear visual brush selection
            const brushGroup = self.g.selectAll(".brush").filter(bd => bd === d);
            if (!brushGroup.empty()) {
                self.y[d].brush.move(brushGroup, null);
            }
        });
        // Force update filter
        self.updateFilter();
    }
    
    redraw() {
        const bounds = this.container.node().getBoundingClientRect();
        const width = bounds.width - this.margin.left - this.margin.right;
        const height = bounds.height - this.margin.top - this.margin.bottom;
        
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
        
        // Update brush extents
        this.g.selectAll(".brush").each(function(d) {
            self.y[d].brush.extent([[-8, 0], [8, height]]);
            d3.select(this).call(self.y[d].brush);
            
            if (self.extents[d]) {
                const maxYPix = self.y[d](self.extents[d][0]); 
                const minYPix = self.y[d](self.extents[d][1]);
                const selection = [maxYPix, minYPix].sort((a,b) => a-b);
                d3.select(this).call(self.y[d].brush.move, selection);
            } else {
                d3.select(this).call(self.y[d].brush.move, null);
            }
        });
    }
}
