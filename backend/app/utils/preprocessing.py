import pandas as pd
import numpy as np
import logging

#Import Django logger
logger = logging.getLogger(__name__)

def find_last_text_column(df: pd.DataFrame) -> int:
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

def filter_nones(raw_data, grouping_data, filteroption='Percentage', applyin='inTotal', val=70):
    """
    Filters rows from raw_data based on the presence of NaN values.

    Returns:
    - DataFrame: Filtered dataset with original column names (no MultiIndex).
    """
    # print("Running filter_nones function...")

    # Convert raw_data to DataFrame and replace NaNs with None
    df = pd.DataFrame(raw_data)
    
    # Select only numeric columns
    df_numeric = df.select_dtypes(include=[np.number])
    if df_numeric.empty:
        raise ValueError("No numeric columns found in raw_data.")
    
    df_non_numeric = df.select_dtypes(exclude=[np.number])  # Keep non-numeric data

    if isinstance(grouping_data, list):
        grouping_data = {col: group for col,group in zip(df_numeric.columns, grouping_data)}

    # Apply MultiIndex using grouping_data
    df_numeric.columns = pd.MultiIndex.from_tuples([(grouping_data[col], col) for col in df_numeric.columns])

    # Validate input parameters
    if df_numeric is None or val is None:
        raise ValueError("Both 'df' and 'val' must be provided.")

    filteroption = filteroption.lower().replace(' ', '')
    applyin = applyin.lower().replace(' ', '')

    if filteroption not in ['percentage', 'number']:
        raise ValueError("Invalid filteroption. Must be 'Percentage'/'percentage' or 'Number'/'number'.")

    if applyin not in ['intotal', 'ineach', 'ineither']:
        raise ValueError(
            "Invalid applyin option. Must be 'inTotal'/'In Total', 'inEach'/'In Each', or 'inEither'/'In Either'.")

    # Extract high-level indices ('case' and 'control') if MultiIndex is used
    if isinstance(df_numeric.columns, pd.MultiIndex):
        high_level_indices = df_numeric.columns.get_level_values(0).unique()
        high_level_indices = [label.lower() for label in high_level_indices]
        if set(high_level_indices) != {'case', 'control'}:
            raise ValueError("Expected highest level indices to be 'Case' and 'Control'.")
    else:
        high_level_indices = None  # Single-level columns

    # Function to count NaN values per row
    def count_nans(sub_df):
        return sub_df.isna().sum(axis=1)

    # Determine max allowable NaNs
    max_nans = (df_numeric.shape[1] * val) / 100 if filteroption == 'percentage' else val

    # Apply filtering based on selected method
    if applyin == 'intotal':
        mask = count_nans(df_numeric) <= max_nans
        # print("Filtering in total...")

    elif applyin == 'ineach' and high_level_indices is not None:
        mask = (count_nans(df_numeric['case']) <= max_nans) & (count_nans(df_numeric['control']) <= max_nans)
        # print("Filtering in each...")

    elif applyin == 'ineither' and high_level_indices is not None:
        mask = (count_nans(df_numeric['case']) <= max_nans) | (count_nans(df_numeric['control']) <= max_nans)
        # print("Filtering in either...")

    else:
        raise ValueError("Invalid combination of parameters.")

    # Filter numeric and non-numeric data
    df_numeric_filtered = df_numeric[mask]
    df_non_numeric_filtered = df_non_numeric.loc[mask]

    # Reset column names to original (remove MultiIndex)
    df_numeric_filtered.columns = [col[1] for col in df_numeric_filtered.columns]

    # Merge numeric and non-numeric data back
    final_df = pd.concat([df_non_numeric_filtered, df_numeric_filtered], axis=1)
    
    final_df = final_df.replace({np.nan: None})

    # print("Filtering completed.")
    return final_df

def normalize_data(raw_data, reference_entry='iRT-Kit_WR_fusion') -> pd.DataFrame:
    """
    Normalize numeric columns in data_to_norm by dividing them by reference values.

    Parameters:
    - raw_data: Data to be normalized.
    - reference_entry (str): The PG.UniProtIds entry to use as reference. Default is 'iRT-Kit_WR_fusion'.

    Returns:
    - DataFrame: Normalized data.
    """

    # Convert raw_data to DataFrame and replace NaNs with None
    df =  pd.DataFrame(raw_data)

    # Assume first column is non-numeric identifier (e.g., protein/gene names)
    ref_col = df.columns[0]
    reference_row = df[df[ref_col] == reference_entry]
    if reference_row.empty:
        # raise ValueError(f"Reference entry '{reference_entry}' not found in column '{ref_col}'")
        logger.warning(f"Reference entry '{reference_entry}' not found in column '{ref_col}'. Skipping normalization.")
        return df
    
    # Extract numeric columns from the reference row
    reference_data = reference_row.select_dtypes(include=[np.number])
    
    # Check if reference row has any numeric columns
    if reference_data.empty:
        raise ValueError(f"Reference entry '{reference_entry}' has no numeric columns for normalization")

    # Select only numeric columns
    df_numeric = df.select_dtypes(include=[np.number])

    # Perform element-wise division using broadcasting
    normalized_df = df_numeric.div(reference_data.values, axis=1)

    df[normalized_df.columns] = normalized_df

    df = df.replace({np.nan: None})

    return df

def transformation(raw_data):
    transformed_df = pd.DataFrame(raw_data)
    numeric_cols = transformed_df.select_dtypes(include=[np.number]).columns
    transformed_df[numeric_cols] = np.log2(transformed_df[numeric_cols])
    transformed_df = transformed_df.replace({np.nan: None})
    
    return transformed_df

def impute_missing(raw_data: pd.DataFrame, width: float = 0.3, down_shift: float = 1.8) -> pd.DataFrame:
    """
    Impute NaNs in numeric columns using a vectorized, downshifted normal distribution approach.

    Parameters:
    - transformed_data (DataFrame): Log2-transformed data with missing values.
    - width (float): Scale factor for the standard deviation.
    - down_shift (float): Shift factor to subtract from the mean.

    Returns:
    - DataFrame: Imputed data.
    """

    df_all = pd.DataFrame(raw_data)

    # Split numeric and non-numeric
    numeric_df = df_all.select_dtypes(include=[np.number])
    non_numeric_df = df_all.select_dtypes(exclude=[np.number])

    # Convert to NumPy for efficient computation
    mt_x = numeric_df.to_numpy()
    nan_mask = np.isnan(mt_x)

    # Row-wise mean and std, ignoring NaNs
    row_means = np.nanmean(mt_x, axis=1, keepdims=True)
    row_stds = np.nanstd(mt_x, axis=1, keepdims=True)

    # Parameters for imputation
    impute_means = row_means - down_shift * row_stds
    impute_stds = row_stds * width

    # Generate full matrix of imputed values
    rng = np.random.default_rng()
    imputed_values = rng.normal(loc=impute_means, scale=impute_stds, size=mt_x.shape)

    # Copy and fill NaNs only
    imputed_matrix = np.where(nan_mask, imputed_values, mt_x)

    # Convert back to DataFrame
    imputed_numeric_df = pd.DataFrame(imputed_matrix, columns=numeric_df.columns, index=numeric_df.index)

    # Reattach non-numeric data
    imputed_df = pd.concat([non_numeric_df, imputed_numeric_df], axis=1)

    return imputed_df