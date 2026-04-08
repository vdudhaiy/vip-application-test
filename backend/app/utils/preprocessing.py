# This module contains functions for preprocessing proteomics data, including filtering, normalization, transformation, and imputation. The functions are designed to be flexible and handle various input formats while ensuring that numeric and non-numeric data are processed appropriately. The module includes error handling to provide informative messages when expected conditions are not met, such as missing reference entries or invalid parameter values. The functions are intended to be used in a pipeline for preparing proteomics data for downstream analysis, such as statistical testing or machine learning.
# -----------------------------
# Libraries
# -----------------------------
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

# -----------------------------
# PREPROCESSING
# -----------------------------
# File Helper
def find_last_leading_text_column(df: pd.DataFrame) -> int:
    """
    Find the index of the last non-numeric column at the start of the DataFrame.

    Parameters:
    - df (DataFrame): The input DataFrame.

    Returns:
    - int: Index of the last non-numeric column.
    """
    # Iterate columns in order. Return the index of the last consecutive
    # non-numeric column that appears before the first numeric column.
    for idx, col in enumerate(df.columns):
        if np.issubdtype(df[col].dtype, np.number):
            # First numeric column found
            if idx == 0:
                # No leading non-numeric columns
                raise ValueError("No non-numeric columns found at the start of the DataFrame.")
            return idx - 1

    # If loop finishes, there were no numeric columns at all.
    raise ValueError("No numeric columns found in the DataFrame; cannot determine last text column.")

# Filter
def filter_nones(raw_data, grouping_data, filteroption='percentage', applyin='inTotal', val=70):
    """
    Filters rows from raw_data based on the presence of NaN values in numeric columns, using grouping information to apply different thresholds if needed. 

    Example usage:
    filtered_data = filter_nones(spec_data_numeric, case_control, filteroption='Percentage', applyin='inTotal', val=70)
    This would filter out any rows that do not have more than 70% non-NaN values across all numeric columns, regardless of groupings.

    Parameters:
    - raw_data: The dataset to filter (can be a DataFrame or array-like).
    - grouping_data: A list or dictionary that maps columns to 'Case'/'Control' groups for MultiIndexing.
    - filteroption: 'Percentage' or 'Number' to specify the filtering method.
    - applyin: 'inTotal', 'inEach', or 'inEither' to specify how to apply the filter.
    - val: The threshold value for filtering (percentage or number of allowed NaNs).

    Returns:
    - DataFrame: Filtered dataset with original column names (no MultiIndex).
    """
    df = pd.DataFrame(raw_data)

    # -----------------------------
    # Separate numeric/non-numeric
    # -----------------------------
    df_numeric = df.select_dtypes(include=[np.number])
    df_non_numeric = df.select_dtypes(exclude=[np.number])

    logger.debug(
        "Initial shape: %s, Numeric columns: %s, Non-numeric columns: %s",
        df.shape,
        df_numeric.shape[1],
        df_non_numeric.shape[1],
    )

    if df_numeric.empty:
        raise ValueError("No numeric columns found in raw_data.")

    # -----------------------------
    # Normalize input parameters
    # -----------------------------
    filteroption = filteroption.lower().replace(" ", "")
    applyin = applyin.lower().replace(" ", "")

    if filteroption not in ["percentage", "number"]:
        raise ValueError("filteroption must be 'Percentage' or 'Number'.")

    if applyin not in ["intotal", "ineach", "ineither"]:
        raise ValueError("applyin must be 'inTotal', 'inEach', or 'inEither'.")

    if val is None:
        raise ValueError("Threshold value 'val' must be provided.")

    # -----------------------------
    # Handle grouping_data formats
    # -----------------------------
    if isinstance(grouping_data, list):
        logger.debug("Grouping data provided as list with length %s.", len(grouping_data))
        logger.debug("Number of numeric columns: %s", df_numeric.shape[1])
        
        if len(grouping_data) != len(df_numeric.columns):
            raise ValueError("Length of grouping_data list must match number of numeric columns.")
        grouping_data = dict(zip(df_numeric.columns, grouping_data))
    else:
        raise ValueError("grouping_data must be list.")

    # Validate that all numeric columns have group labels
    missing_cols = set(df_numeric.columns) - set(grouping_data.keys())
    if missing_cols:
        raise ValueError(f"Missing group labels for columns: {missing_cols}")

    # -----------------------------
    # Create MultiIndex
    # -----------------------------
    df_numeric.columns = pd.MultiIndex.from_tuples(
        [(grouping_data[col], col) for col in df_numeric.columns]
    )

    groups = df_numeric.columns.get_level_values(0).unique()

    # -----------------------------
    # Helper: count NaNs per row
    # -----------------------------
    def count_nans(sub_df):
        return sub_df.isna().sum(axis=1)

    # -----------------------------
    # Determine max allowable NaNs
    # Example: val = 70% means that at least 70% of values must be non-NaN, so max NaNs = 30% of columns.
    # -----------------------------
    if filteroption == "percentage":
        max_nans_total = (df_numeric.shape[1] * (100 - val)) / 100
    else:
        max_nans_total = val

    # -----------------------------
    # Apply filtering logic
    # -----------------------------
    if applyin == "intotal":
        # Entry is kept if it meets the threshold across all numeric columns, ignoring groups. We can simply count NaNs across the entire numeric DataFrame.
        mask = count_nans(df_numeric) <= max_nans_total

    else:
        group_masks = []

        for group in groups:
            group_df = df_numeric[group]

            if filteroption == "percentage":
                max_nans_group = (group_df.shape[1] * (100 - val)) / 100
            else:
                max_nans_group = val

            group_masks.append(count_nans(group_df) <= max_nans_group)

        if applyin == "ineach":
            # Entry is kept only if it meets the threshold in every group, so we take the logical AND of the group masks.
            mask = np.logical_and.reduce(group_masks)

        elif applyin == "ineither":
            # Entry is kept if it meets the threshold in at least one group, so we take the logical OR of the group masks.
            mask = np.logical_or.reduce(group_masks)

    # -----------------------------
    # Apply mask
    # -----------------------------
    df_numeric_filtered = df_numeric[mask]
    df_non_numeric_filtered = df_non_numeric.loc[mask]

    # Restore original column names
    df_numeric_filtered.columns = [col[1] for col in df_numeric_filtered.columns]

    final_df = pd.concat([df_non_numeric_filtered, df_numeric_filtered], axis=1)

    return final_df

# Normalization
def reference_normalization(raw_data, reference_entry='iRT-Kit_WR_fusion') -> pd.DataFrame:
    """
    Normalize numeric columns in data_to_norm by dividing them by reference values.

    Parameters:
    - raw_data: Data to be normalized.
    - reference_entry (str): The PG.UniProtIds entry to use as reference. Default is 'iRT-Kit_WR_fusion'.

    Returns:
    - DataFrame: Normalized data.
    """

    # Convert raw_data to DataFrame
    df = pd.DataFrame(raw_data)

    # Ensure measurement columns (all columns except the first identifier column)
    # are coerced to numeric dtype. Non-numeric values will become NaN so that
    # pandas recognizes numeric columns correctly.
    if df.shape[1] > 1:
        df.iloc[:, 1:] = df.iloc[:, 1:].apply(pd.to_numeric, errors='coerce')

    # Assume first column is the identifier (e.g., protein/gene names)
    ref_col = df.columns[0]
    reference_row = df[df[ref_col] == reference_entry]

    if reference_row.empty:
        # Reference not found — return original dataframe (with coerced numeric cols)
        logger.warning(
            "Reference entry '%s' not found in column '%s'. Skipping normalization.",
            reference_entry,
            ref_col,
        )
        return df

    # Extract numeric columns from the reference row
    reference_numeric = reference_row.select_dtypes(include=[np.number])
    if reference_numeric.empty:
        raise ValueError(
            f"Reference entry '{reference_entry}' has no numeric columns for normalization. "
            "Try checking data types or whitespace in the reference identifier.")

    # Select numeric columns for full dataframe and divide by reference (first matching row)
    df_numeric = df.select_dtypes(include=[np.number])
    ref_series = reference_numeric.iloc[0]

    # Align by column names and perform element-wise division
    normalized_df = df_numeric.div(ref_series, axis=1)

    df[normalized_df.columns] = normalized_df

    # Exclude the reference row from the output
    df = df[df[ref_col] != reference_entry]

    # Keep NaNs for downstream numeric processing; do not convert to Python None here.
    return df

def divide_normalization(raw_data, divisor) -> pd.DataFrame:
    """
    Normalize numeric columns in data_to_norm by dividing them by either Mean/Median/Mode.

    Parameters:
    - raw_data: Data to be normalized.
    - divisor (str): 'Mean', 'Median', or 'Mode' to use as divisor.
    Returns:
    - DataFrame: Normalized data.
    """
    # Convert raw_data to DataFrame and replace NaNs with None
    df = pd.DataFrame(raw_data)

    # Select only numeric columns
    df_numeric = df.select_dtypes(include=[np.number])

    if divisor == 'mean':
        divisor_values = df_numeric.mean()
    elif divisor == 'median':
        divisor_values = df_numeric.median()
    elif divisor == 'mode':
        divisor_values = df_numeric.mode().iloc[0]
    else:
        raise ValueError("Divisor must be 'Mean', 'Median', or 'Mode'.")

    # Perform element-wise division
    normalized_df = df_numeric.div(divisor_values, axis=1)

    df[normalized_df.columns] = normalized_df

    # df = df.replace({np.nan: None})

    return df

def subtract_normalization(raw_data, subtractor) -> pd.DataFrame:
    """
    Normalize numeric columns in data_to_norm by subtracting either Mean/Median/Mode.

    Parameters:
    - raw_data: Data to be normalized.
    - subtractor (str): 'Mean', 'Median', or 'Mode' to use as subtractor.

    Returns:
    - DataFrame: Normalized data.
    """
    # Convert raw_data to DataFrame and replace NaNs with None
    df = pd.DataFrame(raw_data)

    # Select only numeric columns
    df_numeric = df.select_dtypes(include=[np.number])

    if subtractor == 'mean':
        subtractor_values = df_numeric.mean()
    elif subtractor == 'median':
        subtractor_values = df_numeric.median()
    elif subtractor == 'mode':
        subtractor_values = df_numeric.mode().iloc[0]
    else:
        raise ValueError("Subtractor must be 'Mean', 'Median', or 'Mode'.")

    # Perform element-wise subtraction
    normalized_df = df_numeric.subtract(subtractor_values, axis=1)

    df[normalized_df.columns] = normalized_df

    # df = df.replace({np.nan: None})

    return df

def zscore_normalization(raw_data) -> pd.DataFrame:
    """
    Normalize numeric columns in data_to_norm using Z-Score normalization.

    Parameters:
    - raw_data: Data to be normalized.

    Returns:
    - DataFrame: Normalized data.
    """
    # Convert raw_data to DataFrame and replace NaNs with None
    df = pd.DataFrame(raw_data)

    # Select only numeric columns
    df_numeric = df.select_dtypes(include=[np.number])

    # Perform Z-Score normalization
    normalized_df = (df_numeric - df_numeric.mean()) / df_numeric.std()

    df[normalized_df.columns] = normalized_df

    # df = df.replace({np.nan: None})

    return df

def normalize_data(raw_data, reference=None, method='reference') -> pd.DataFrame:
    """
    Normalize numeric columns in data based on the specified method.

    Parameters:
    - raw_data: Data to be normalized.
    - reference (str): Reference data for normalization. Eg. reference protein, mean/median/mode values, etc. depending on the method chosen.
    - method (str): Normalization method. Default is 'reference'.

    Returns:
    - DataFrame: Normalized data.
    """

    if method.lower() == 'reference':
        return reference_normalization(raw_data, reference_entry=reference)
    elif method.lower() == "divide":
        divisor = reference.lower() if isinstance(reference, str) else reference
        return divide_normalization(raw_data, divisor)
    elif method.lower() == "subtract":
        subtractor = reference.lower() if isinstance(reference, str) else reference
        return subtract_normalization(raw_data, subtractor)
    elif method.lower() == "z-score":
        return zscore_normalization(raw_data)
    else:
        raise ValueError("Invalid normalization method specified.")

# Transformation
def transformation(raw_data, epsilon=1e-6) -> pd.DataFrame:
    """
    Apply log2 transformation to numeric columns with a small epsilon to avoid -inf values.
    
    Parameters:
        raw_data (pd.DataFrame): DataFrame containing numeric data.
        epsilon (float): Small value added to avoid log2(0). Default is 1e-6 to preserve signal in low-expression regions.
    
    Returns:
        pd.DataFrame: Log2-transformed DataFrame.
    """
    transformed_df = pd.DataFrame(raw_data)
    
    # Select numeric columns
    numeric_cols = transformed_df.select_dtypes(include=[np.number]).columns
    
    # Apply log2 transformation with epsilon
    transformed_df[numeric_cols] = np.log2(transformed_df[numeric_cols] + epsilon)
    
    return transformed_df

# Imputation
def impute_missing(
    raw_data: pd.DataFrame,
    width: float = 0.3,
    down_shift: float = 1.8,
    random_state: int | None = 0,
) -> pd.DataFrame:
    """
    Impute NaNs in numeric columns by drawing from a downshifted normal distribution per row.

    Parameters:
    - raw_data (DataFrame): Data with missing numeric values.
    - width (float): Scale factor applied to each row's standard deviation.
    - down_shift (float): Multiplier of the row standard deviation subtracted from the row mean.

    Returns:
    - DataFrame: Imputed data with original non-numeric columns preserved.
    """

    df_all = pd.DataFrame(raw_data)

    # Separate numeric and non-numeric columns
    numeric_df = df_all.select_dtypes(include=[np.number])
    non_numeric_df = df_all.select_dtypes(exclude=[np.number])

    # Work in NumPy for speed
    mt_x = numeric_df.to_numpy(dtype=float)
    nan_mask = np.isnan(mt_x)

    # Row-wise mean and sample standard deviation (ddof=1 matches R's rowSds)
    row_means = np.nanmean(mt_x, axis=1, keepdims=True)
    row_stds = np.nanstd(mt_x, axis=1, ddof=1, keepdims=True)

    # Parameters for the imputation distribution
    impute_means = row_means - down_shift * row_stds
    impute_stds = row_stds * width

    # Fill NaNs row-by-row
    imputed_matrix = mt_x.copy()
    rng = np.random.default_rng(random_state)

    for i in range(mt_x.shape[0]):
        missing_cols = np.where(nan_mask[i])[0]
        if missing_cols.size:
            draws = rng.normal(loc=impute_means[i, 0], scale=impute_stds[i, 0], size=missing_cols.size)
            imputed_matrix[i, missing_cols] = draws

    # Convert back to DataFrame
    imputed_numeric_df = pd.DataFrame(imputed_matrix, columns=numeric_df.columns, index=numeric_df.index)

    # Combine with non-numeric columns (non-numeric first to mirror bind_cols)
    imputed_df = pd.concat([non_numeric_df, imputed_numeric_df], axis=1)

    # Log summary of imputation
    logger.info("Imputation complete. Total imputed values: %s", nan_mask.sum())
    logger.info("Number of rows with imputed values: %s", (nan_mask.sum(axis=1) > 0).sum())

    return imputed_df