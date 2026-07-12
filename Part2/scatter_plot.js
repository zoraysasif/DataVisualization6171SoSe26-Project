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

        const bounds = this.container.node().getBoundingClientRect();
        this.width = bounds.width - this.margin.left - this.margin.right;
        this.height = bounds.height - this.margin.top - this.margin.bottom;
        
        this.svg = this.container.append("svg")
            .attr("width", bounds.width)
            .attr("height", bounds.height);
            
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
        
        // Update scales
        this.xScale.domain(d3.extent(this.globalData, d => d[this.xDim])).nice();
        this.yScale.domain(d3.extent(this.globalData, d => d[this.yDim])).nice();
        
        const t = animate ? d3.transition().duration(750) : d3.select(null);
        
        (animate ? this.xAxisG.transition(t) : this.xAxisG)
            .call(d3.axisBottom(this.xScale));
            
        (animate ? this.yAxisG.transition(t) : this.yAxisG)
            .call(d3.axisLeft(this.yScale));
            
        const circles = this.g.selectAll("circle").data(data, d => d.id);
        
        circles.exit().remove();
        
        const enterCircles = circles.enter().append("circle")
            .attr("r", 4)
            .attr("cx", d => this.xScale(d[this.xDim]))
            .attr("cy", d => this.yScale(d[this.yDim]))
            .style("fill", d => clusterColorScale(d.Cluster))
            .style("opacity", 0.6)
            .style("stroke", "rgba(0,0,0,0.5)")
            .style("stroke-width", 0.5)
            .on("mouseover", this.handleMouseOver.bind(this))
            .on("mouseout", this.handleMouseOut.bind(this))
            .on("click", (e, d) => handleCandidateSelection(d));
            
        const merged = enterCircles.merge(circles);
        
        if(animate) {
            merged.transition(t)
                .attr("cx", d => this.xScale(d[this.xDim]))
                .attr("cy", d => this.yScale(d[this.yDim]));
        } else {
            merged
                .attr("cx", d => this.xScale(d[this.xDim]))
                .attr("cy", d => this.yScale(d[this.yDim]));
        }
        
        this.highlightSelected(selectedCandidates);
    }
    
    update(filteredData) {
        this.render(filteredData, false);
    }
    
    highlightSelected(selected) {
        const selectedIds = new Set(selected.map(s => s.id));
        
        this.g.selectAll("circle")
            .style("opacity", d => selectedIds.has(d.id) ? 1 : 0.6)
            .style("stroke", d => selectedIds.has(d.id) ? "#fff" : "rgba(0,0,0,0.5)")
            .style("stroke-width", d => selectedIds.has(d.id) ? 2 : 0.5)
            .attr("r", d => selectedIds.has(d.id) ? 7 : 4)
            .style("fill", d => {
                if(selectedIds.has(d.id)) {
                    const selIdx = selected.findIndex(s => s.id === d.id);
                    return candidateColorScale(selIdx);
                }
                return clusterColorScale(d.Cluster);
            });
    }
    
    handleMouseOver(event, d) {
        d3.select(event.currentTarget)
            .style("stroke", "#fff")
            .style("stroke-width", 2);
            
        const tooltip = d3.select(".tooltip");
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
            <b>${d.id}</b><br/>
            Cluster: ${d.Cluster}<br/>
            ${this.xDim}: ${d[this.xDim].toFixed(2)}<br/>
            ${this.yDim}: ${d[this.yDim].toFixed(2)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    }
    
    handleMouseOut(event, d) {
        const isSelected = selectedCandidates.find(s => s.id === d.id);
        
        d3.select(event.currentTarget)
            .style("stroke", isSelected ? "#fff" : "rgba(0,0,0,0.5)")
            .style("stroke-width", isSelected ? 2 : 0.5);
            
        d3.select(".tooltip").transition().duration(500).style("opacity", 0);
    }
}
