import pandas as pd
from sklearn.cluster import KMeans

print("Loading dataset...")
# Load the dataset (tsv)
df = pd.read_csv('Dataset_VisContest_Rapid_Alloy_development_v3.txt', sep='\t', encoding='latin1')

print(f"Original dataset size: {df.shape}")

# Handle missing values by dropping them or filling. 
# Many thermal properties might have NaN if a phase doesn't exist.
# We will fill NaNs with 0 for phase related, or drop rows if essential targets are NaN.
df = df.fillna(0)

# Compute derived values: Total Volume fraction of specific phases
vf_columns = [col for col in df.columns if col.startswith('Vf_')]
df['Total_Vf_Phases'] = df[vf_columns].sum(axis=1)

# Clean column names to avoid encoding issues with degree symbols in Javascript
df.columns = [c.replace('°', 'deg') for c in df.columns]

# Perform KMeans clustering based on key inputs and properties
features_for_clustering = [
    'YS(MPa)', 'hardness(Vickers)', 'Density(g/cm3)', 'Therm.conductivity(W/(mK))',
    'KS1295[%]', '6082[%]', '2024[%]', 'bat-box[%]', '3003[%]', '4032[%]'
]

print("Applying KMeans clustering...")
kmeans = KMeans(n_clusters=5, random_state=42)

# De-fragment the dataframe to prevent silent failures in Pandas
df = df.copy()

df['Cluster'] = kmeans.fit_predict(df[features_for_clustering])

print("Sampling dataset to 3000 rows...")
# Sample the dataset to 3000 rows, preserving the cluster distribution
# The safest way is to sample indices and then loc them
sampled_indices = []
for cluster_id in range(5):
    cluster_data = df[df['Cluster'] == cluster_id]
    sampled_indices.extend(cluster_data.sample(min(len(cluster_data), 600), random_state=42).index)

sampled_df = df.loc[sampled_indices].copy()

# Save the sampled dataframe to CSV for D3 to use
output_file = 'dashboard_data.csv'
sampled_df.to_csv(output_file, index=False)

print(f"Preprocessed dataset saved to {output_file} with size {sampled_df.shape}")
