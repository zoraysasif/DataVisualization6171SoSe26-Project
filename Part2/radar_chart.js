class RadarChart {
    constructor() {
        this.container = d3.select("#radar-chart-container");
        this.legendContainer = d3.select("#radar-legend");
        this.margin = {top: 40, right: 40, bottom: 40, left: 40};
        
        this.features = [
            "YS(MPa)", "hardness(Vickers)", "Density(g/cm3)", 
            "Therm.conductivity(W/(mK))", "Total_Vf_Phases", "El.conductivity(S/m)"
        ];
        
        this.init();
    }
    
    init() {
        const bounds = this.container.node().getBoundingClientRect();
        this.width = bounds.width - this.margin.left - this.margin.right;
        this.height = bounds.height - this.margin.top - this.margin.bottom;
        this.radius = Math.min(this.width, this.height) / 2;
        
        this.svg = this.container.append("svg")
            .attr("width", bounds.width)
            .attr("height", bounds.height);
            
        this.g = this.svg.append("g")
            .attr("transform", `translate(${bounds.width/2},${bounds.height/2})`);
            
        // Calculate max values for normalization based on globalData
        this.maxValues = {};
        this.features.forEach(f => {
            this.maxValues[f] = d3.max(globalData, d => d[f]) || 1;
        });
        
        this.angleScale = d3.scaleBand()
            .range([0, 2 * Math.PI])
            .domain(this.features);
            
        this.radiusScale = d3.scaleLinear()
            .range([0, this.radius])
            .domain([0, 1]); // Normalized 0 to 1
            
        this.drawGrid();
        this.drawAxes();
    }
    
    drawGrid() {
        const levels = 4;
        const levelG = this.g.append("g").attr("class", "grid-levels");
        
        for(let level = 1; level <= levels; level++) {
            const r = (this.radius / levels) * level;
            
            levelG.append("circle")
                .attr("r", r)
                .style("fill", "none")
                .style("stroke", "rgba(0,0,0,0.15)")
                .style("stroke-dasharray", "4,4");
        }
    }
    
    drawAxes() {
        const axisG = this.g.append("g").attr("class", "radar-axes");
        
        this.features.forEach(f => {
            const angle = this.angleScale(f);
            
            // Draw axis line
            axisG.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", this.radiusScale(1) * Math.cos(angle - Math.PI/2))
                .attr("y2", this.radiusScale(1) * Math.sin(angle - Math.PI/2))
                .style("stroke", "rgba(0,0,0,0.2)")
                .style("stroke-width", "1px");
                
            // Draw axis label
            axisG.append("text")
                .attr("x", (this.radius + 15) * Math.cos(angle - Math.PI/2))
                .attr("y", (this.radius + 15) * Math.sin(angle - Math.PI/2))
                .text(f)
                .style("text-anchor", "middle")
                .style("alignment-baseline", "middle")
                .style("fill", "var(--text-secondary)")
                .style("font-size", "10px");
        });
    }
    
    update(selected) {
        // Clear previous paths
        this.g.selectAll(".radar-area").remove();
        this.g.selectAll(".radar-stroke").remove();
        this.g.selectAll(".radar-point").remove();
        this.legendContainer.selectAll("*").remove();
        
        if(!selected || selected.length === 0) return;
        
        const line = d3.lineRadial()
            .angle(d => this.angleScale(d.feature))
            .radius(d => this.radiusScale(d.value))
            .curve(d3.curveLinearClosed);
            
        selected.forEach((d, i) => {
            const color = candidateColorScale(i);
            
            const normalizedData = this.features.map(f => ({
                feature: f,
                value: d[f] / this.maxValues[f]
            }));
            
            // Area
            this.g.append("path")
                .datum(normalizedData)
                .attr("class", "radar-area")
                .attr("d", line)
                .style("fill", color)
                .style("fill-opacity", 0.2)
                .on("mouseover", function() {
                    d3.select(this).style("fill-opacity", 0.5);
                })
                .on("mouseout", function() {
                    d3.select(this).style("fill-opacity", 0.2);
                });
                
            // Stroke
            this.g.append("path")
                .datum(normalizedData)
                .attr("class", "radar-stroke")
                .attr("d", line)
                .style("fill", "none")
                .style("stroke", color)
                .style("stroke-width", 2);
                
            // Points
            this.g.selectAll(".radar-point-" + i)
                .data(normalizedData)
                .enter().append("circle")
                .attr("class", "radar-point radar-point-" + i)
                .attr("r", 4)
                .attr("cx", p => this.radiusScale(p.value) * Math.cos(this.angleScale(p.feature) - Math.PI/2))
                .attr("cy", p => this.radiusScale(p.value) * Math.sin(this.angleScale(p.feature) - Math.PI/2))
                .style("fill", color)
                .style("stroke", "#fff")
                .style("stroke-width", 1)
                .on("mouseover", (event, p) => {
                    const tooltip = d3.select(".tooltip");
                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`
                        <b>${d.id}</b><br/>
                        ${p.feature}: ${d[p.feature].toFixed(2)}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    d3.select(".tooltip").transition().duration(500).style("opacity", 0);
                });
                
            // Add to legend
            const legendItem = this.legendContainer.append("div")
                .attr("class", "legend-item")
                .on("click", () => handleCandidateDeselection(d.id));
                
            legendItem.append("div")
                .attr("class", "legend-color")
                .style("background", color);
                
            legendItem.append("span")
                .text(`${d.id} ✖`);
        });
    }
}
