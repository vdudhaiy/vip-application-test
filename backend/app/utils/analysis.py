# Proteomics Statistical Analysis Module
# Fully optimized for log2-transformed, normalized, and imputed data

import pandas as pd
import numpy as np
import logging
from itertools import combinations
from scipy.stats import ttest_ind, f_oneway, f
from statsmodels.stats.multitest import multipletests
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import pdist

logger = logging.getLogger(__name__)

# -------------------------------
# T-Tests Log2-aware Fold Change
# -------------------------------
def final_data_analysis(raw_df, group_labels, protein_gene, reference_group=None):
    """
    Perform statistical testing on proteomics data.

    - If 2 groups → Welch's t-test
    - If >2 groups → Welch's ANOVA (gating), then pairwise t-tests vs reference group

    The input data is expected to be log2-transformed.

    Parameters:
    - raw_df: expression dataframe (first column = protein ID)
    - group_labels: list of group labels aligned to sample columns
    - protein_gene: dataframe mapping Protein → gene metadata
    - reference_group: optional reference group label used as the
            denominator/baseline for log2 fold-change (log2FC) calculations.
            For >2 groups: ANOVA is used as gating test; if reference_group is specified,
            pairwise t-tests are computed vs that reference group.
            If None, fallback to ANOVA p-values (not recommended for >2 groups).
    
    Returns:
    - DataFrame with statistics + log2 fold change + q-values (BH-FDR)
    - For >2 groups with reference_group: p-values are from pairwise t-tests vs reference
    """
    # Log length of group labels and number of sample columns for debugging
    logger.debug("Length of group_labels: %s", len(group_labels))
    logger.debug("Number of sample columns in raw_df: %s", raw_df.shape[1] - 1)

    df = pd.DataFrame(raw_df).copy()
    if df.shape[1] < 2:
        raise ValueError("raw_df must contain an identifier column and at least one numeric column.")

    # Split identifier vs numeric expression matrix
    protein_ids = df.iloc[:, 0]
    expr = df.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")

    logger.debug("Value scale check")
    logger.debug("Min value: %s", np.nanmin(expr.to_numpy()))
    logger.debug("Max value: %s", np.nanmax(expr.to_numpy()))

    if len(group_labels) != expr.shape[1]:
        raise ValueError("Length of group_labels must match number of expression columns.")

    groups_ordered = list(dict.fromkeys(group_labels))

    # Validate reference group if provided
    if reference_group is not None:
        if reference_group not in groups_ordered:
            raise ValueError(f"reference_group '{reference_group}' not found in group_labels.")
    group_to_cols = {
        group: [col for col, lbl in zip(expr.columns, group_labels) if lbl == group]
        for group in groups_ordered
    }

    def _welch_anova(values_by_group):
        # Implementation based on Welch (1951); falls back to one-way ANOVA if ill-conditioned.
        k = len(values_by_group)
        ns = np.array([len(v) for v in values_by_group], dtype=float)
        means = np.array([np.nanmean(v) if len(v) > 0 else np.nan for v in values_by_group], dtype=float)
        variances = np.array([np.nanvar(v, ddof=1) if len(v) > 1 else np.nan for v in values_by_group], dtype=float)

        if np.any(ns < 2) or np.any(~np.isfinite(variances)):
            # Not enough data for Welch ANOVA, fall back to standard ANOVA (still Welch-ish because of equal_var=False elsewhere)
            try:
                return f_oneway(*values_by_group)
            except Exception:
                return np.nan, np.nan

        weights = ns / variances
        w_sum = np.sum(weights)
        grand_mean = np.sum(weights * means) / w_sum

        numerator = np.sum(weights * (means - grand_mean) ** 2) / (k - 1)

        denom_correction = np.sum((1.0 / (ns - 1.0)) * (1.0 - (weights / w_sum)) ** 2)
        denominator = 1.0 + (2.0 * (k - 2.0) / (k**2 - 1.0)) * denom_correction

        if denominator <= 0:
            return np.nan, np.nan

        f_stat = numerator / denominator
        df1 = k - 1
        df2 = (k**2 - 1.0) / (3.0 * denom_correction)

        if not np.isfinite(df2) or df2 <= 0:
            return np.nan, np.nan

        p_val = 1.0 - f.cdf(f_stat, df1, df2)
        return f_stat, p_val

    stats_list = []
    p_values = []
    log2fcs = []
    group_means = {group: [] for group in groups_ordered}

    for _, row in expr.iterrows():
        row_groups = []
        row_group_means = {}
        for group in groups_ordered:
            cols = group_to_cols[group]
            vals = row[cols].dropna().to_numpy(dtype=float)
            row_groups.append(vals)
            mean_val = np.nanmean(vals) if len(vals) else np.nan
            group_means[group].append(mean_val)
            row_group_means[group] = mean_val

        # --- Test statistic / p-value ---
        if len(groups_ordered) == 2:
            # 2 groups: use t-test
            g1_vals, g2_vals = row_groups
            stat, p_val = ttest_ind(g1_vals, g2_vals, equal_var=False, nan_policy="omit")
        else:
            # >2 groups: use ANOVA as gating test, then compute pairwise t-test vs reference
            anova_stat, anova_pval = _welch_anova(row_groups)
            
            # Compute pairwise t-test against reference group
            if reference_group is not None:
                ref_mean = row_group_means.get(reference_group, np.nan)
                ref_idx = groups_ordered.index(reference_group)
                ref_vals = row_groups[ref_idx]
                
                # Find non-reference group with largest effect
                max_p_val = 1.0
                best_stat = np.nan
                for other_idx, grp in enumerate(groups_ordered):
                    if grp == reference_group:
                        continue
                    other_vals = row_groups[other_idx]
                    # t-test: other vs reference
                    t_stat, t_pval = ttest_ind(other_vals, ref_vals, equal_var=False, nan_policy="omit")
                    # Use the most significant pairwise comparison
                    if np.isfinite(t_pval) and t_pval < max_p_val:
                        max_p_val = t_pval
                        best_stat = t_stat
                
                stat = best_stat
                p_val = max_p_val
            else:
                # No reference: use ANOVA (not ideal for multi-group)
                stat, p_val = anova_stat, anova_pval

        # --- Log2 fold-change (log2FC) ---
        if reference_group is not None:
            ref_mean = row_group_means.get(reference_group, np.nan)
            if np.isfinite(ref_mean):
                # Compute differences vs reference; choose the group with
                # the largest absolute deviation from the reference.
                # log2FC = other - ref (positive = upregulated in other group)
                diffs = []
                for grp in groups_ordered:
                    if grp == reference_group:
                        continue
                    other_mean = row_group_means.get(grp, np.nan)
                    if np.isfinite(other_mean):
                        diffs.append(other_mean - ref_mean)

                if len(diffs) == 0:
                    log2fc = np.nan
                elif len(diffs) == 1:
                    # 2-group case: unique non-reference group
                    log2fc = diffs[0]
                else:
                    # Multi-group case: take the largest absolute change
                    diffs_arr = np.asarray(diffs, dtype=float)
                    log2fc = diffs_arr[np.argmax(np.abs(diffs_arr))]
            else:
                log2fc = np.nan
        else:
            # Legacy behavior when no reference group is specified
            if len(groups_ordered) == 2:
                g1_vals, g2_vals = row_groups
                log2fc = (np.nanmean(g2_vals) - np.nanmean(g1_vals)) if (len(g1_vals) and len(g2_vals)) else np.nan
            else:
                means = np.array([row_group_means[g] for g in groups_ordered], dtype=float)
                if np.all(~np.isfinite(means)):
                    log2fc = np.nan
                else:
                    log2fc = np.nanmax(means) - np.nanmin(means)

        stats_list.append(stat)
        p_values.append(p_val)
        log2fcs.append(log2fc)

    p_values_array = np.array(p_values, dtype=float)
    q_values = np.full_like(p_values_array, np.nan, dtype=float)
    finite_mask = np.isfinite(p_values_array)
    if finite_mask.any():
        _, q_vals_corrected, _, _ = multipletests(p_values_array[finite_mask], method="fdr_bh")
        q_values[finite_mask] = q_vals_corrected

    result_df = pd.DataFrame({
        "Protein": protein_ids,
        "statistic": stats_list,
        "p_value": p_values_array,
        "q_value": q_values,
        "log2FC": log2fcs,
    })

    logger.debug("groups_ordered: %s", groups_ordered)

    for group in groups_ordered:
        result_df[f"mean_{group}"] = group_means[group]

    # Attach gene metadata if provided
    if protein_gene is not None and isinstance(protein_gene, pd.DataFrame):
        result_df = result_df.merge(protein_gene, how="left", on="Protein")

    result_df = result_df.sort_values("q_value", na_position="last").reset_index(drop=True)
    return result_df


# -------------------------------
# Top Protein Selection
# -------------------------------
def select_top_proteins(results_df: pd.DataFrame, n: int = 20, by: str = "p_value", use_abs_log2fc: bool = True):
    """Select the top N proteins from the results dataframe.

    Parameters
    ----------
    results_df : pd.DataFrame
        Output from `final_data_analysis`. Must contain a `Protein` column and
        either `p_value` or `log2FC` depending on the chosen metric.
    n : int
        Number of proteins to return (default 20).
    by : {"p_value", "log2FC"}
        Metric to use for ranking. "p_value" selects smallest p-values first;
        "log2FC" selects largest fold-changes (by absolute value by default).
    use_abs_log2fc : bool
        When ``by == "log2FC"``, rank by ``abs(log2FC)`` if True, otherwise by
        raw ``log2FC`` (descending).

    Returns
    -------
    list
        Ordered list of protein identifiers.
    """

    if "Protein" not in results_df.columns:
        raise ValueError("results_df must contain a 'Protein' column.")

    if by not in {"p_value", "log2FC"}:
        raise ValueError("'by' must be either 'p_value' or 'log2FC'.")

    df = results_df.copy()

    if by == "p_value":
        if "p_value" not in df.columns:
            raise ValueError("results_df must contain a 'p_value' column when by='p_value'.")
        df = df.sort_values("p_value", ascending=True)
    else:  # by == "log2FC"
        if "log2FC" not in df.columns:
            raise ValueError("results_df must contain a 'log2FC' column when by='log2FC'.")
        if use_abs_log2fc:
            df = df.reindex(df["log2FC"].abs().sort_values(ascending=False).index)
        else:
            df = df.sort_values("log2FC", ascending=False)

    # Get unique proteins in order (drop duplicates while preserving order)
    proteins = df["Protein"].drop_duplicates().dropna().tolist()
    return proteins[:n]


# -------------------------------
# Protein-Level Aggregation
# -------------------------------
def aggregate_expression_to_protein_level(expr_df: pd.DataFrame, protein_ids: pd.Series, aggregation_method: str = "mean") -> tuple:
    """
    Aggregate expression data to protein level (collapsing isoforms/variants).

    Parameters
    ----------
    expr_df : pd.DataFrame
        Expression matrix (rows = data rows, columns = samples).
    protein_ids : pd.Series
        Protein IDs corresponding to each row.
    aggregation_method : str
        Method for aggregation: "mean" (default) or "median".

    Returns
    -------
    tuple
        - aggregated_expr: DataFrame with rows = unique proteins, columns = samples
        - aggregated_protein_ids: Series with unique protein IDs
    """
    combined_df = expr_df.copy()
    combined_df['_protein_id'] = protein_ids.values
    
    if aggregation_method == "median":
        aggregated = combined_df.groupby('_protein_id').median()
    else:  # default to mean
        aggregated = combined_df.groupby('_protein_id').mean()
    
    aggregated_protein_ids = pd.Series(aggregated.index, index=range(len(aggregated)))
    
    return aggregated, aggregated_protein_ids


# -------------------------------
# Volcano Plot Preparation
# -------------------------------
def prepare_volcano(results_df: pd.DataFrame, log2fc_thresh: float = 0.58, qval_thresh: float = 0.05, pval_thresh: float = 0.05):
    """
    Prepare volcano plot payload for a two-group comparison.

    Parameters
    ----------
    results_df : pd.DataFrame
        Output from `final_data_analysis` for a two-group design. Must contain
        `Protein`, `log2FC`, `p_value`, and `q_value` columns.
    log2fc_thresh : float
        Absolute log2 fold-change threshold (default ≈ log2(1.5)).
    qval_thresh : float
        Benjamini–Hochberg FDR threshold.
    pval_thresh : float
        Raw p-value threshold for visual reference.

    Returns
    -------
    dict
        - volcano_data: DataFrame with classification metadata for plotting
        - thresholds: dict of the thresholds used
    """

    required_cols = {"Protein", "log2FC", "p_value", "q_value"}
    missing = required_cols - set(results_df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = results_df.copy()
    df["neg_log10_p_value"] = -np.log10(df["p_value"])

    def _categorize(row):
        sig_q = row["q_value"] <= qval_thresh
        sig_fc = np.abs(row["log2FC"]) >= log2fc_thresh
        if sig_q and sig_fc:
            return "q_and_fc"
        if sig_fc:
            return "fc_only"
        if sig_q:
            return "q_only"
        return "ns"

    df["category"] = df.apply(_categorize, axis=1)

    payload = {
        "volcano_data": df,
        "thresholds": {
            "log2fc": log2fc_thresh,
            "qval": qval_thresh,
            "pval": pval_thresh,
        },
    }

    return payload


def prepare_pairwise_volcanos(
    raw_df: pd.DataFrame,
    group_labels,
    protein_gene: pd.DataFrame = None,
    reference_group: str = None,
    log2fc_thresh: float = 0.58,
    qval_thresh: float = 0.05,
    pval_thresh: float = 0.05,
):
    """
    Build volcano-ready payloads comparing each non-reference group against a reference group.

    Parameters
    ----------
    raw_df : pd.DataFrame
        Expression matrix; first column is Protein ID, remaining columns are samples.
    group_labels : list-like
        Group label for each sample column (same order as columns 1..n).
    protein_gene : pd.DataFrame, optional
        Metadata keyed by `Protein` to merge into the outputs.
    reference_group : str, optional
        Group to use as the baseline for all contrasts. Defaults to the first
        unique label order if not provided.
    log2fc_thresh, qval_thresh, pval_thresh : float
        Thresholds used for classification and plotting.

    Returns
    -------
    dict
        Mapping contrast label (e.g., "Treatment_vs_Control") to a payload with
        volcano data and thresholds.
    """

    df = pd.DataFrame(raw_df).copy()
    protein_ids = df.iloc[:, 0]
    expr = df.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")

    if len(group_labels) != expr.shape[1]:
        raise ValueError("Length of group_labels must match number of expression columns.")

    groups_ordered = list(dict.fromkeys(group_labels))
    if len(groups_ordered) < 2:
        raise ValueError("prepare_pairwise_volcanos requires at least two groups.")

    ref = reference_group or groups_ordered[0]
    if ref not in groups_ordered:
        raise ValueError(f"reference_group '{ref}' not found in group_labels.")

    groups_to_compare = [g for g in groups_ordered if g != ref]
    if not groups_to_compare:
        raise ValueError("No non-reference groups available for pairwise volcano preparation.")

    payloads = {}

    for other in groups_to_compare:
        cols_other = [col for col, lbl in zip(expr.columns, group_labels) if lbl == other]
        cols_ref = [col for col, lbl in zip(expr.columns, group_labels) if lbl == ref]

        other_matrix = expr[cols_other]
        ref_matrix = expr[cols_ref]

        log2fcs = []
        p_values = []
        stats_list = []
        for idx in range(expr.shape[0]):
            v_other = other_matrix.iloc[idx].dropna().to_numpy(dtype=float)
            v_ref = ref_matrix.iloc[idx].dropna().to_numpy(dtype=float)
            stat, p_val = ttest_ind(v_other, v_ref, equal_var=False, nan_policy="omit")
            log2fc = (np.nanmean(v_other) - np.nanmean(v_ref)) if (len(v_other) and len(v_ref)) else np.nan
            stats_list.append(stat)
            p_values.append(p_val)
            log2fcs.append(log2fc)

        p_values_array = np.array(p_values, dtype=float)
        q_values = np.full_like(p_values_array, np.nan, dtype=float)
        mask = np.isfinite(p_values_array)
        if mask.any():
            _, q_corr, _, _ = multipletests(p_values_array[mask], method="fdr_bh")
            q_values[mask] = q_corr

        contrast_df = pd.DataFrame({
            "Protein": protein_ids,
            "statistic": stats_list,
            "p_value": p_values_array,
            "q_value": q_values,
            "log2FC": log2fcs,
            f"mean_{other}": other_matrix.mean(axis=1).to_numpy(),
            f"mean_{ref}": ref_matrix.mean(axis=1).to_numpy(),
        })

        if protein_gene is not None and isinstance(protein_gene, pd.DataFrame):
            contrast_df = contrast_df.merge(protein_gene, how="left", on="Protein")

        contrast_df["neg_log10_p_value"] = -np.log10(contrast_df["p_value"])

        def _categorize(row):
            sig_q = row["q_value"] <= qval_thresh
            sig_fc = np.abs(row["log2FC"]) >= log2fc_thresh
            if sig_q and sig_fc:
                return "q_and_fc"
            if sig_fc:
                return "fc_only"
            if sig_q:
                return "q_only"
            return "ns"

        contrast_df["category"] = contrast_df.apply(_categorize, axis=1)

        label = f"{other}_vs_{ref}"
        # DEBUG: counts of significant hits split by direction (matches volcano plot tallies)
        sig_mask = contrast_df["category"] == "q_and_fc"
        sig_down = int((sig_mask & (contrast_df["log2FC"] < 0)).sum())
        sig_up = int((sig_mask & (contrast_df["log2FC"] > 0)).sum())
        sig_total = int(sig_mask.sum())
        logger.debug(
            "[%s] significant_total=%s, downregulated=%s, upregulated=%s",
            label,
            sig_total,
            sig_down,
            sig_up,
        )
        # Also print the total number of entries
        logger.debug("[%s] total_proteins=%s", label, len(contrast_df))

        payloads[label] = {
            "volcano_data": contrast_df,
            "thresholds": {
                "log2fc": log2fc_thresh,
                "qval": qval_thresh,
                "pval": pval_thresh,
            },
        }

    return payloads



# -------------------------------
# Heatmap Preparation
# -------------------------------
def prepare_heatmap(raw_df: pd.DataFrame, proteins, group_labels, row_zscore: bool = True, aggregate_to_protein_level: bool = True, aggregation_method: str = "mean"):
    """
    Prepare a clustered expression matrix for heatmap visualization.

    Parameters
    ----------
    raw_df : pd.DataFrame
        Expression matrix with first column as Protein ID.
    proteins : list-like
        Protein IDs to include (order preserved after clustering).
    group_labels : list-like
        Group label for each sample column (same order as columns 1..n).
    row_zscore : bool
        Apply row-wise z-score scaling before clustering to enhance contrast.
    aggregate_to_protein_level : bool
        If True (default), aggregate expression data to protein level (collapsing isoforms).
        If False, keep isoform-level data.
    aggregation_method : str
        Method for aggregation: "mean" (default) or "median".

    Returns
    -------
    dict
        - matrix: clustered expression matrix (rows=proteins or isoforms, cols=samples)
        - row_order: order of proteins/isoforms after clustering
        - col_order: order of samples (grouped by provided labels)
    """

    import logging
    logger = logging.getLogger(__name__)
    
    df = pd.DataFrame(raw_df).copy()
    if df.shape[1] < 2:
        raise ValueError("raw_df must contain an identifier column and at least one sample column.")

    protein_ids = df.iloc[:, 0]
    expr = df.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")

    if len(group_labels) != expr.shape[1]:
        raise ValueError("Length of group_labels must match number of expression columns.")

    # Keep only requested proteins
    protein_set = set(proteins)
    mask = protein_ids.isin(protein_set)
    expr = expr.loc[mask].reset_index(drop=True)
    protein_ids = protein_ids.loc[mask].reset_index(drop=True)

    if len(expr) == 0:
        raise ValueError(f"No proteins from {proteins} found in raw_df.")

    logger.info(f"[HEATMAP] Filtered to {len(proteins)} proteins: {len(expr)} rows ({len(expr)/len(proteins):.1f} rows/protein avg)")

    # Optionally aggregate to protein level
    if aggregate_to_protein_level:
        expr, protein_ids = aggregate_expression_to_protein_level(expr, protein_ids, aggregation_method=aggregation_method)
        expr = expr.reset_index(drop=True)
        protein_ids = protein_ids.reset_index(drop=True)
        logger.info(f"[HEATMAP] Aggregated to protein level using {aggregation_method}: {len(expr)} unique proteins")


    # Order columns by group appearance
    groups_ordered = list(dict.fromkeys(group_labels))
    col_order = []
    for grp in groups_ordered:
        col_order.extend([col for col, lbl in zip(expr.columns, group_labels) if lbl == grp])

    expr = expr[col_order]

    matrix = expr.copy()
    matrix.index = protein_ids.values

    # Drop rows that cannot yield finite correlations (all NaN, <2 finite points, or zero variance)
    finite_counts = np.isfinite(matrix).sum(axis=1)
    variance = matrix.var(axis=1)  # pandas var handles NaN automatically
    valid_mask = (finite_counts >= 2) & (variance > 0)
    matrix = matrix.loc[valid_mask]
    
    if len(matrix) == 0:
        raise ValueError("No valid rows after filtering (need at least 2 finite values per protein and variance > 0).")

    # Apply z-score normalization
    if row_zscore:
        row_means = matrix.mean(axis=1)
        row_stds = matrix.std(axis=1)
        # Avoid division by zero; set std=1 where std is 0 or NaN
        row_stds = row_stds.replace(0, np.nan)
        matrix = matrix.subtract(row_means, axis=0).divide(row_stds, axis=0)

    # Replace inf with NaN, then fill NaN with 0 for clustering
    matrix = matrix.replace([np.inf, -np.inf], np.nan).fillna(0)

    # Create group lookup from the already-ordered columns
    group_lookup = {col: lbl for col, lbl in zip(col_order, group_labels)}

    # Cluster columns within each group to maintain group contiguity
    grouped_col_order = []
    for grp in groups_ordered:
        grp_cols = [c for c in matrix.columns if group_lookup.get(c) == grp]
        
        if len(grp_cols) > 1:
            try:
                sub = matrix[grp_cols]
                col_dist = pdist(sub.T, metric="correlation")
                
                # Check if distances are valid
                if not np.isfinite(col_dist).all():
                    # If correlation clustering fails, use Euclidean distance instead
                    col_dist = pdist(sub.T, metric="euclidean")
                    if not np.isfinite(col_dist).all():
                        logger.warning("Could not cluster columns for group '%s'; using original order.", grp)
                        grouped_col_order.extend(grp_cols)
                        continue
                
                col_link = linkage(col_dist, method="average")
                ordered_idx = leaves_list(col_link)
                grp_cols = [grp_cols[i] for i in ordered_idx]
            except Exception as e:
                logger.warning("Column clustering failed for group '%s': %s. Using original order.", grp, e)
        
        grouped_col_order.extend(grp_cols)

    matrix = matrix[grouped_col_order]

    # Hierarchical clustering on rows
    # IMPORTANT: Keep integer position order, don't convert to labels yet
    # (because we have duplicate protein IDs in the index, .loc[] with duplicates will return multiple matching rows)
    row_order_positions = list(range(matrix.shape[0]))  # Integer positions: [0, 1, 2, ..., n-1]
    
    if matrix.shape[0] > 1:
        try:
            distances = pdist(matrix, metric="correlation")
            
            # Check if distances are valid
            if not np.isfinite(distances).all():
                # If correlation clustering fails, use Euclidean distance
                distances = pdist(matrix, metric="euclidean")
                if not np.isfinite(distances).all():
                    logger.warning("Could not cluster rows; using original protein order.")
                else:
                    linkage_matrix = linkage(distances, method="average")
                    order = leaves_list(linkage_matrix)
                    row_order_positions = order.tolist() if hasattr(order, 'tolist') else list(order)
            else:
                linkage_matrix = linkage(distances, method="average")
                order = leaves_list(linkage_matrix)
                row_order_positions = order.tolist() if hasattr(order, 'tolist') else list(order)
        except Exception as e:
            logger.warning("Row clustering failed: %s. Using original protein order.", e)
    
    # Reorder matrix by clustered rows USING INTEGER POSITIONS (.iloc) NOT LABELS (.loc)
    # This is critical: .loc[] with duplicate index labels would expand rows unexpectedly
    matrix = matrix.iloc[row_order_positions]
    
    # Extract row labels in the new order for response
    row_order = matrix.index.tolist()

    # Group labels aligned to the final column order
    col_group_labels = [group_lookup[c] for c in matrix.columns]

    # Calculate value range for color scale
    matrix_min = matrix.min().min()
    matrix_max = matrix.max().max()
    
    # Add some padding for better color scale
    value_range = max(abs(matrix_min), abs(matrix_max))

    payload = {
        "matrix": matrix,
        "row_order": row_order,
        "col_order": matrix.columns.tolist(),
        "col_group_labels": col_group_labels,
        "value_range": {
            "min": float(matrix_min),
            "max": float(matrix_max),
            "symmetric_range": float(value_range)
        }
    }

    logger.info(f"[HEATMAP] Final matrix: {matrix.shape[0]} rows × {matrix.shape[1]} columns")
    return payload


def prepare_pairwise_heatmaps(raw_df: pd.DataFrame, proteins, group_labels, row_zscore: bool = True):
    """
    Build heatmap payloads comparing each pair of groups.

    Parameters
    ----------
    raw_df : pd.DataFrame
        Expression matrix; first column is Protein ID, remaining columns are samples.
    proteins : list-like
        Protein IDs to include in heatmaps.
    group_labels : list-like
        Group label for each sample column (same order as columns 1..n).
    row_zscore : bool
        Apply row-wise z-score scaling before clustering.

    Returns
    -------
    dict
        Mapping comparison label (e.g., "GroupA_vs_GroupB") to a heatmap payload.
    """

    df = pd.DataFrame(raw_df).copy()
    protein_ids = df.iloc[:, 0]
    expr = df.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")

    if len(group_labels) != expr.shape[1]:
        raise ValueError("Length of group_labels must match number of expression columns.")

    groups_ordered = list(dict.fromkeys(group_labels))
    if len(groups_ordered) < 2:
        raise ValueError("prepare_pairwise_heatmaps requires at least two groups.")

    payloads = {}

    # Iterate through all pairs of groups
    for grp1, grp2 in combinations(groups_ordered, 2):
        # Get column indices for each group
        cols_grp1 = [col for col, lbl in zip(expr.columns, group_labels) if lbl == grp1]
        cols_grp2 = [col for col, lbl in zip(expr.columns, group_labels) if lbl == grp2]
        
        # Create a subset dataframe with these columns and protein IDs
        subset_cols = cols_grp1 + cols_grp2
        subset_expr = expr[subset_cols]
        subset_df = pd.concat([protein_ids.to_frame(), subset_expr], axis=1)
        
        # Create group labels for this pair
        pair_group_labels = [grp1] * len(cols_grp1) + [grp2] * len(cols_grp2)
        
        # Prepare heatmap for this pair
        try:
            heatmap_payload = prepare_heatmap(subset_df, proteins, pair_group_labels, row_zscore=row_zscore)
            label = f"{grp1}_vs_{grp2}"
            payloads[label] = heatmap_payload
        except Exception as e:
            logger.warning("Could not prepare heatmap for %s vs %s: %s", grp1, grp2, e)
            continue

    return payloads
