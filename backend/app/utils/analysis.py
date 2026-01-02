import logging
import pandas as pd
import numpy as np
from scipy.stats import ttest_ind, norm
from statsmodels.stats.multitest import multipletests

#Import Django logger
logger = logging.getLogger(__name__)

def final_data_r1(raw_df, case_control, protein_gene):    
    # Assume first column is non-numeric identifier (e.g., protein/gene names)
    raw_df = raw_df.set_index(raw_df.columns[0])

    non_numeric_cols = [col for col in raw_df.columns if not np.issubdtype(raw_df[col].dtype, np.number)]
    expression_df = raw_df.drop(columns=non_numeric_cols)

    # Melt the expression data to long format
    data_long = expression_df.melt(ignore_index=False, var_name='Patient', value_name='Value')
    data_long.reset_index(inplace=True)
    data_long.rename(columns={data_long.columns[0]: 'Protein'}, inplace=True)

    # Map case/control group to patients
    patient_df = pd.DataFrame({'Patient': expression_df.columns, 'Case_Control': case_control})
    data_long = pd.merge(data_long, patient_df, on='Patient')

    # Group and perform t-tests
    results = []
    for protein, group_data in data_long.groupby('Protein'):
        case_values = group_data[group_data['Case_Control'] == 'Case']['Value'].dropna()
        control_values = group_data[group_data['Case_Control'] == 'Control']['Value'].dropna()

        if len(case_values) > 1 and len(control_values) > 1:
            try:
                t_stat, p_val = ttest_ind(case_values, control_values, equal_var=False)
                log2fd = np.mean(case_values) - np.mean(control_values)
                mean_diff = 2 ** np.mean(case_values) - 2 ** np.mean(control_values)
            except:
                t_stat, p_val, log2fd, mean_diff = np.nan, np.nan, np.nan, np.nan
        else:
            t_stat, p_val, log2fd, mean_diff = np.nan, np.nan, np.nan, np.nan

        results.append({
            'Protein': protein,
            't_statistic': 0 if np.isnan(t_stat) else t_stat,
            'p_value': p_val,
            'log2fd': log2fd,
            'mean_difference': mean_diff
        })

    ttest_results = pd.DataFrame(results)
    merged = pd.merge(protein_gene, ttest_results, on='Protein', how='left')

    # Derive two-tailed p-values from t-statistic as done in R
    derived_p = 2 * norm.sf(np.abs(merged['t_statistic'].fillna(0)))
    
    # Apply Benjamini-Hochberg FDR correction (approx. global q-value)
    _, q_values, _, _ = multipletests(derived_p, method='fdr_bh')
    merged['q_value'] = q_values

    # Display head of merged dataframe for debugging
    # logger.debug(f"Merged DataFrame head:\n{merged.head()}")

    return merged

def prepare_volcano(result_df, log2fc_thresh=1.0, qval_thresh=0.05, max_neg_log_p=15):
    df = result_df.copy()

    df = df.dropna(subset=['log2fd', 'p_value'])
    
    # Calculate -log10 p-values
    df['-log10(p_value)'] = -np.log10(df['p_value'].replace(0, np.nextafter(0, 1)))
    
    df['-log10(p_value)'] = df['-log10(p_value)'].clip(upper=max_neg_log_p)
    
    df['Significant'] = (abs(df['log2fd']) > log2fc_thresh) & (df['q_value'] < qval_thresh)
    
    volcano_data = df[['Protein', 'log2fd', '-log10(p_value)', 
                       'Significant', 'q_value', 'p_value']].copy()
    
    volcano_data.rename(columns={'-log10(p_value)': '-log10(q_value)'}, inplace=True)
    
    return {
        "volcano_data": volcano_data.to_dict(orient='records'),
        "thresholds": {
            "log2fc_thresh": log2fc_thresh,
            "qval_thresh": qval_thresh,
            "-log10_qval_thresh": -np.log10(qval_thresh),
            "max_y_value": max_neg_log_p
        }
    }

def prepare_heatmap(raw_df, top_proteins, case_control):
    # Assume first column is non-numeric identifier (e.g., protein/gene names)
    expression_df = raw_df.set_index(raw_df.columns[0])
    
    subset = expression_df.loc[expression_df.index.intersection(top_proteins)]

    # Optional: row-wise normalization (z-scoring)
    subset = subset.apply(lambda row: (row - row.mean()) / row.std(), axis=1)

    heatmap_matrix = subset.values.tolist()
    row_labels = subset.index.tolist()
    col_labels = subset.columns.tolist()
    group_labels = [{'patient': col, 'group': group} for col, group in zip(col_labels, case_control)]

    return {
        "matrix": heatmap_matrix,
        "row_labels": row_labels,
        "column_labels": col_labels,
        "group_labels": group_labels
    }
