class ClusterHistogram {
    constructor(data) {
        this.container = d3.select("#histogram-container");
        this.margin = {top: 20, right: 20, bottom: 65, left: 40};
        
        this.init();
        this.render(data, false);
    }
    
    init() {
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
            
        this.xScale = d3.scaleBand()
            .range([0, this.width])
            .domain(["0", "1", "2", "3", "4"]) // 5 clusters
            .padding(0.2);
            
        const clusterLabels = {
            "0": "Balanced",
            "1": "Max Strength",
            "2": "High Cond.",
            "3": "High Strength",
            "4": "Max Cond."
        };
            
        this.xAxisG.call(d3.axisBottom(this.xScale).tickFormat(d => clusterLabels[d]))
            .selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em");
            
        this.yScale = d3.scaleLinear().range([this.height, 0]);
    }
    
    render(data, animate) {
        // Aggregate data
        const counts = {"0":0, "1":0, "2":0, "3":0, "4":0};
        data.forEach(d => {
            counts[d.Cluster.toString()]++;
        });
        
        const chartData = Object.keys(counts).map(k => ({cluster: k, count: counts[k]}));
        
        // Update Y scale
        this.yScale.domain([0, d3.max(chartData, d => d.count)]);
        
        const t = animate ? d3.transition().duration(750) : d3.select(null);
        
        (animate ? this.yAxisG.transition(t) : this.yAxisG)
            .call(d3.axisLeft(this.yScale).ticks(5));
            
        const bars = this.g.selectAll(".bar")
            .data(chartData, d => d.cluster);
            
        bars.exit().remove();
        
        const enterBars = bars.enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => this.xScale(d.cluster))
            .attr("width", this.xScale.bandwidth())
            .attr("y", this.height)
            .attr("height", 0)
            .style("fill", d => clusterColorScale(d.cluster))
            .style("rx", 4)
            .style("opacity", 0.8)
            .on("mouseover", function() {
                d3.select(this).style("opacity", 1);
            })
            .on("mouseout", function() {
                d3.select(this).style("opacity", 0.8);
            });
            
        const merged = enterBars.merge(bars);
        
        if(animate) {
            merged.transition(t)
                .attr("y", d => this.yScale(d.count))
                .attr("height", d => this.height - this.yScale(d.count));
        } else {
            merged
                .attr("y", d => this.yScale(d.count))
                .attr("height", d => this.height - this.yScale(d.count));
        }
        
        // Bar labels
        const labels = this.g.selectAll(".bar-label")
            .data(chartData, d => d.cluster);
            
        labels.exit().remove();
        
        const enterLabels = labels.enter().append("text")
            .attr("class", "bar-label")
            .attr("x", d => this.xScale(d.cluster) + this.xScale.bandwidth() / 2)
            .attr("y", this.height)
            .attr("text-anchor", "middle")
            .style("fill", "var(--text-primary)")
            .style("font-size", "11px");
            
        const mergedLabels = enterLabels.merge(labels);
        
        if(animate) {
            mergedLabels.transition(t)
                .attr("y", d => this.yScale(d.count) - 5)
                .text(d => d.count);
        } else {
            mergedLabels
                .attr("y", d => this.yScale(d.count) - 5)
                .text(d => d.count);
        }
    }
    
    update(filteredData) {
        this.render(filteredData, true);
    }
}
