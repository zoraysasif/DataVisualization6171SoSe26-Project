# Alloy Discovery Dashboard (Data Visualization Project)

This project is a comprehensive data visualization tool built for the "Data Visualization" course. It is divided into two main parts, demonstrating progression from basic interactive visualizations to a highly advanced, performance-optimized, and customized dashboard for exploring metallurgical data.

## Part 1: Basic Visualization Framework
Located in the `Part1/` directory, this part serves as the foundational framework, introducing core interactions and basic D3.js charting.

### Key Features of Part 1:
- **Data Loading:** An interface to upload and parse CSV data dynamically into the browser.
- **Data Table:** Renders the parsed data into an interactive HTML table.
- **Configurable Scatterplot:** Allows the user to dynamically select which dimensions of the data should be mapped to the X-axis, Y-axis, and the radius (size) of the scatterplot points.
- **Interactive Radar Chart:** Clicking on data points in the scatter plot selects those specific candidates and visualizes their multidimensional footprint on a comparative Radar Chart.

## Part 2: Advanced Alloy Discovery Dashboard
Located in the `Part2/` directory, this part is a complete, domain-specific dashboard optimized for Automotive Engine Block Design. It handles massive datasets (over 300,000 candidate alloys) and applies machine learning algorithms to facilitate complex decision-making.

### Key Features of Part 2:
- **Machine Learning Preprocessing (Python):** 
  - A `preprocess.py` script ingests the raw dataset, cleans missing values, computes derived features (like total volume fractions), and runs a **K-Means clustering algorithm** to group alloys into 5 distinct "families" (e.g., Max Strength, High Conductivity). 
  - Outputs a fully prepared `dashboard_data.csv` ready for real-time web visualization.
- **Interactive Parallel Coordinates Chart:** 
  - Allows users to visualize the entire dataset across multiple domains: Composition, Manufacturability, Microstructure, Mechanical, and Thermo-Physical properties.
  - Supports "Brushing" (click and drag on axes) to globally filter the dataset in real-time.
- **High-Performance Canvas Scatter Plot:**
  - Automatically updates based on the Parallel Coordinates filters.
  - Due to the massive scale of the dataset (324,000+ rows), the SVG rendering was completely migrated to **HTML5 `<canvas>`** to guarantee 60 FPS performance.
  - Utilizes a `d3.quadtree` algorithm to instantly detect mouse hovers over specific dots without relying on DOM elements.
- **Radar Chart Comparison:** 
  - Clicking on specific candidates in the scatter plot populates a dynamic Radar Chart, allowing engineers to directly compare the precise trade-offs between a handful of selected alloys.
- **Cluster Distribution Histogram:** 
  - A bar chart summarizing the current distribution of the filtered candidates across the 5 machine-learned alloy families, giving users a high-level overview of the dataset's composition.
- **Modern UI/UX:** 
  - A fully custom, clean, and responsive "Light Mode" user interface with descriptive tooltips and contextual explanations of the data.

## Running the Dashboard

1. **Preprocess the Data:** Navigate to the `Part2/` directory and run the python script to generate the clustered dataset (this may take a minute due to the size of the data):
   ```bash
   cd Part2
   python preprocess.py
   ```
2. **Start a Local Server:** Due to CORS restrictions when loading local CSV files in the browser, start a local HTTP server in the `Part2/` directory:
   ```bash
   python -m http.server 8000
   ```
3. **Open the Dashboard:** Open your web browser and navigate to:
   ```
   http://localhost:8000
   ```
